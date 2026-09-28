import fs from 'node:fs/promises';
import { z } from 'zod';
import { db } from '../../db.js';
import { mergeFactsAndValidate } from '../facts.js';
import { CASE_TYPES, caseTypeConfig } from '../../caseTypes/index.js';
import { tierFor, type CaseFact } from '../../types.js';
import { toJson } from '../../utils/json.js';
import { buildDocumentContentBlock, callClaudeJSON } from '../claudeClient.js';
import { ToolValidationError, type ToolDefinition } from './types.js';

const schema = z.object({ caseId: z.string().min(1), documentId: z.string().min(1) });
type Input = z.infer<typeof schema>;

interface RawExtraction {
  confidence: Partial<Record<string, number>>;
  [key: string]: unknown;
}

export const extractCaseInformationTool: ToolDefinition<Input> = {
  name: 'extract_case_information',
  description:
    'Haal gestructureerde gegevens uit een reeds als leesbaar bevestigd document (bijv. instantie of wederpartij, bedrag, datum, kenmerk). Vul alleen in wat daadwerkelijk op het document staat — laat een veld leeg (null) als het er niet op staat, verzin niets. Geef bij elk ingevuld veld een confidence tussen 0 en 1.',
  inputSchema: {
    type: 'object',
    properties: { caseId: { type: 'string' }, documentId: { type: 'string' } },
    required: ['caseId', 'documentId'],
  },
  validate(raw) {
    const result = schema.safeParse(raw);
    if (!result.success) throw new ToolValidationError(result.error.message);
    return result.data;
  },
  async handler(input) {
    const document = await db.document.findUnique({ where: { id: input.documentId }, include: { case: true } });
    if (!document || document.caseId !== input.caseId) return { error: 'document_not_found' };
    const config = caseTypeConfig(document.case.caseType) ?? CASE_TYPES.anders;
    const fieldKeys = config.fields.map((f) => f.key);
    const fieldList = config.fields.map((f) => `${f.key} (${f.label})`).join(', ');

    let base64: string;
    try {
      const buffer = await fs.readFile(document.storagePath);
      base64 = buffer.toString('base64');
    } catch {
      return { error: 'file_unreadable' };
    }

    let raw: RawExtraction;
    try {
      raw = await callClaudeJSON<RawExtraction>({
        system: `Je haalt uitsluitend gegevens uit het document die daadwerkelijk zichtbaar zijn. Vul een veld nooit in op basis van aannames — laat het dan op null staan. Mogelijke velden: ${fieldList}. Datums als JJJJ-MM-DD waar mogelijk; bedragen en snelheden als getal zonder eenheid. Antwoord als JSON object met deze velden (null waar niet aanwezig) plus een "confidence" object dat per ingevuld veld een getal tussen 0 en 1 geeft.`,
        content: [
          buildDocumentContentBlock(document.mimeType, base64),
          {
            type: 'text',
            text: `Dit is ${config.documentDescription}. Haal de gevraagde velden eruit.`,
          },
        ],
        maxTokens: 700,
      });
    } catch (error) {
      return { error: 'extraction_failed', message: (error as Error).message };
    }

    const newFacts: Record<string, CaseFact> = {};
    for (const key of fieldKeys) {
      const value = raw[key];
      if (value === null || value === undefined || value === '') continue;
      const confidence = raw.confidence?.[key] ?? 0.5;
      const tier = tierFor(confidence);
      newFacts[key] = {
        value: value as string | number,
        source: 'document',
        confidence,
        tier,
        needsConfirmation: tier !== 'high',
        documentId: document.id,
      };
    }

    await db.document.update({ where: { id: document.id }, data: { extracted: toJson(raw) } });

    // Low-confidence fields are kept in the document's raw extraction but
    // deliberately withheld from Case.facts until the user confirms them —
    // they must not be treated as trusted facts yet.
    const trustedFacts = Object.fromEntries(
      Object.entries(newFacts).filter(([, fact]) => fact.tier !== 'low'),
    );
    const lowConfidenceFields = Object.entries(newFacts)
      .filter(([, fact]) => fact.tier === 'low')
      .map(([key]) => key);

    const { facts, ruleFlags } = await mergeFactsAndValidate(input.caseId, trustedFacts);

    return {
      extracted: raw,
      mergedFacts: facts,
      ruleFlags,
      fieldsNeedingConfirmation: Object.entries(newFacts)
        .filter(([, fact]) => fact.needsConfirmation)
        .map(([key]) => key),
      lowConfidenceFieldsNotYetTrusted: lowConfidenceFields,
    };
  },
};
