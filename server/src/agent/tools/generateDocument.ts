import { z } from 'zod';
import { db } from '../../db.js';
import { runRules } from '../../rules/engine.js';
import type { CaseFacts, KnowledgeResult } from '../../types.js';
import { createPendingAction } from '../actions.js';
import { callClaudeJSON } from '../claudeClient.js';
import { searchKnowledge } from '../../knowledge/index.js';
import { ToolValidationError, type ToolDefinition } from './types.js';

const schema = z.object({
  caseId: z.string().min(1),
  documentType: z.literal('bezwaarschrift'),
});
type Input = z.infer<typeof schema>;

function factsToText(facts: CaseFacts): string {
  return Object.entries(facts)
    .map(([key, fact]) => `${key}: ${fact.value} (bron: ${fact.source})`)
    .join('\n');
}

export const generateDocumentTool: ToolDefinition<Input> = {
  name: 'generate_document',
  description:
    'Stel een concept-bezwaarschrift op, uitsluitend gebaseerd op gevalideerde feiten van de zaak en teruggevonden kennisbronnen. Weigert als er nog blokkerende validatiefouten of ontbrekende verplichte velden zijn — vraag dan eerst om die informatie. Het resultaat is altijd een concept dat de gebruiker apart moet goedkeuren; er wordt niets verzonden.',
  inputSchema: {
    type: 'object',
    properties: {
      caseId: { type: 'string' },
      documentType: { type: 'string', enum: ['bezwaarschrift'] },
    },
    required: ['caseId', 'documentType'],
  },
  validate(raw) {
    const result = schema.safeParse(raw);
    if (!result.success) throw new ToolValidationError(result.error.message);
    return result.data;
  },
  async handler(input) {
    const kase = await db.case.findUnique({ where: { id: input.caseId } });
    if (!kase) return { error: 'case_not_found' };

    const facts = (kase.facts as CaseFacts | null) ?? {};
    const ruleFlags = runRules(kase.caseType, facts);
    const blockingErrors = ruleFlags.filter((r) => r.severity === 'error');
    if (blockingErrors.length > 0) {
      return {
        generated: false,
        reason: 'blocking_rule_errors',
        ruleFlags: blockingErrors,
      };
    }

    const needsConfirmation = Object.entries(facts).filter(([, fact]) => fact.needsConfirmation);
    if (needsConfirmation.length > 0) {
      return {
        generated: false,
        reason: 'unconfirmed_fields',
        fields: needsConfirmation.map(([key]) => key),
      };
    }

    const authority = (facts.authority?.value as string) ?? 'de instantie';
    const offence = (facts.offence?.value as string) ?? '';
    const knowledge: KnowledgeResult[] = await searchKnowledge(`bezwaartermijn ${offence}`, kase.caseType);

    let paragraphs: string[];
    try {
      const result = await callClaudeJSON<{ paragraphs: string[] }>({
        system:
          'Je schrijft een formeel, feitelijk Nederlands bezwaarschrift. Gebruik UITSLUITEND de gegeven feiten en kennisbronnen. Verzin geen wetsartikelen of bezwaargronden die niet in de meegegeven kennis staan. Als er geen relevante kennisbron is meegegeven, baseer het bezwaar dan puur op de feitelijke onjuistheid/onderbouwing en vraag om heroverweging, zonder een specifieke wettelijke grondslag te noemen. Antwoord als JSON: {"paragraphs": string[]} — elke alinea een apart element.',
        content: `Gevalideerde feiten van de zaak:\n${factsToText(facts)}\n\nRelevante kennisbronnen:\n${
          knowledge.length > 0
            ? knowledge.map((k) => `- ${k.snippet} (${k.sourceName})`).join('\n')
            : 'Geen relevante kennisbron gevonden — noem geen specifieke wettelijke termijn of grondslag.'
        }\n\nSchrijf het bezwaarschrift als losse alinea's.`,
        maxTokens: 900,
      });
      paragraphs = result.paragraphs;
    } catch (error) {
      return { generated: false, reason: 'generation_failed', message: (error as Error).message };
    }

    const action = await createPendingAction(input.caseId, 'prepare_objection', {
      recipient: authority,
      paragraphs,
      usedFacts: Object.keys(facts),
      usedKnowledge: knowledge.map((k) => ({ title: k.title, sourceUrl: k.sourceUrl })),
    });

    return { generated: true, actionId: action.id, paragraphs, sources: knowledge };
  },
};
