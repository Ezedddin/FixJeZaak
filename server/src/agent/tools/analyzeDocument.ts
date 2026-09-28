import fs from 'node:fs/promises';
import { z } from 'zod';
import { db } from '../../db.js';
import { toJson } from '../../utils/json.js';
import { buildDocumentContentBlock, callClaudeJSON } from '../claudeClient.js';
import { ToolValidationError, type ToolDefinition } from './types.js';

const schema = z.object({ caseId: z.string().min(1), documentId: z.string().min(1) });
type Input = z.infer<typeof schema>;

interface DocumentUnderstanding {
  readable: boolean;
  documentType: string;
  notes: string;
}

/** Stage 1 of document processing: can we actually read this, and what is
 * it? Kept separate from structured extraction (stage 2) so an unreadable
 * upload fails fast with a clear message instead of silently producing
 * empty/garbage structured fields. */
export const analyzeDocumentTool: ToolDefinition<Input> = {
  name: 'analyze_document',
  description:
    'Analyseer een geüpload document op hoofdlijnen: is het leesbaar, en wat voor soort document is het? Roep dit aan vóór extract_case_information. Als het document niet leesbaar is, vraag de gebruiker om opnieuw te uploaden in plaats van door te gaan met extractie.',
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
    const document = await db.document.findUnique({ where: { id: input.documentId } });
    if (!document || document.caseId !== input.caseId) return { error: 'document_not_found' };

    let base64: string;
    try {
      const buffer = await fs.readFile(document.storagePath);
      base64 = buffer.toString('base64');
    } catch {
      return {
        readable: false,
        documentType: 'unknown',
        notes: 'Bestand kon niet worden gelezen van schijf.',
      };
    }

    try {
      const parsed = await callClaudeJSON<DocumentUnderstanding>({
        system:
          'Je beoordeelt alleen of een document leesbaar is en wat voor type document het is. Je haalt hier geen inhoudelijke gegevens uit. Antwoord als JSON: {"readable": boolean, "documentType": string, "notes": string}.',
        content: [
          buildDocumentContentBlock(document.mimeType, base64),
          {
            type: 'text',
            text: 'Is dit document leesbaar? Wat voor soort document is dit (bijvoorbeeld: verkeersboete, parkeerboete, brief, onbekend)? Geef een korte, feitelijke notitie.',
          },
        ],
        maxTokens: 300,
      });

      await db.document.update({
        where: { id: document.id },
        data: { extracted: toJson({ understanding: parsed }) },
      });

      return { ...parsed };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[analyze_document] failed:', error);
      return {
        readable: false,
        documentType: 'unknown',
        notes: 'De documentanalyse is momenteel niet beschikbaar. Probeer het straks opnieuw.',
      };
    }
  },
};
