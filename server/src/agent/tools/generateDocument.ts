import { z } from 'zod';
import { CASE_TYPES, caseTypeConfig } from '../../caseTypes/index.js';
import { db } from '../../db.js';
import { knowledgeFor } from '../../knowledge/index.js';
import { runRules } from '../../rules/engine.js';
import type { CaseFacts } from '../../types.js';
import { createPendingAction } from '../actions.js';
import { callClaudeJSON } from '../claudeClient.js';
import { ToolValidationError, type ToolDefinition } from './types.js';

const schema = z.object({
  caseId: z.string().min(1),
  // Kept for backwards compatibility with earlier tool calls; the kind of
  // letter is determined by the case type, not by the model.
  documentType: z.string().max(50).optional(),
});
type Input = z.infer<typeof schema>;

function factsToText(facts: CaseFacts, labels: Record<string, string>): string {
  return Object.entries(facts)
    .map(([key, fact]) => `${labels[key] ?? key}: ${fact.value} (bron: ${fact.source})`)
    .join('\n');
}

export const generateDocumentTool: ToolDefinition<Input> = {
  name: 'generate_document',
  description:
    'Stel een conceptbrief op die past bij het type zaak (bijv. bezwaarschrift, brief aan werkgever of verhuurder, ingebrekestelling, reactie op een vordering), uitsluitend gebaseerd op gevalideerde feiten van de zaak en de kennisbronnen. Weigert als er nog blokkerende validatiefouten of onbevestigde velden zijn — vraag dan eerst om die informatie. Het resultaat is altijd een concept dat de gebruiker apart moet goedkeuren; er wordt niets verzonden.',
  inputSchema: {
    type: 'object',
    properties: {
      caseId: { type: 'string' },
    },
    required: ['caseId'],
  },
  validate(raw) {
    const result = schema.safeParse(raw);
    if (!result.success) throw new ToolValidationError(result.error.message);
    return result.data;
  },
  async handler(input) {
    const kase = await db.case.findUnique({ where: { id: input.caseId } });
    if (!kase) return { error: 'case_not_found' };
    const config = caseTypeConfig(kase.caseType) ?? CASE_TYPES.anders;
    const labels = Object.fromEntries(config.fields.map((f) => [f.key, f.label]));

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

    const recipient = (facts[config.recipientField]?.value as string | undefined) ?? 'de wederpartij';
    const knowledge = knowledgeFor(kase.caseType);

    let paragraphs: string[];
    try {
      const result = await callClaudeJSON<{ paragraphs: string[] }>({
        system: `Je schrijft een formele, feitelijke Nederlandse brief namens de gebruiker: een ${config.letter.title.toLowerCase()} aan ${recipient}. ${config.letter.instructions}
Gebruik UITSLUITEND de gegeven feiten en kennisbronnen. Verzin geen wetsartikelen of juridische gronden die niet in de meegegeven kennis staan, en noem geen feiten die niet zijn gegeven. Gegevens die ontbreken maar in een brief horen (zoals naam, adres of handtekening van de gebruiker) vul je niet in maar geef je aan als [INVULLEN: omschrijving].
Als er geen relevante kennisbron is meegegeven, baseer de brief dan puur op de feiten, zonder een specifieke wettelijke grondslag te noemen. Antwoord als JSON: {"paragraphs": string[]} — elke alinea een apart element.`,
        content: `Gevalideerde feiten van de zaak:\n${factsToText(facts, labels)}\n\nRelevante kennisbronnen:\n${
          knowledge.length > 0
            ? knowledge.map((k) => `- ${k.snippet} (${k.sourceName})`).join('\n')
            : 'Geen relevante kennisbron gevonden — noem geen specifieke wettelijke termijn of grondslag.'
        }\n\nSchrijf de brief als losse alinea's.`,
        maxTokens: 1500,
      });
      paragraphs = result.paragraphs;
    } catch (error) {
      return { generated: false, reason: 'generation_failed', message: (error as Error).message };
    }

    const action = await createPendingAction(input.caseId, config.letter.actionType, {
      title: config.letter.title,
      recipient,
      paragraphs,
      usedFacts: Object.keys(facts),
      usedKnowledge: knowledge.map((k) => ({ title: k.title, sourceUrl: k.sourceUrl })),
    });

    return { generated: true, actionId: action.id, title: config.letter.title, recipient, paragraphs, sources: knowledge };
  },
};
