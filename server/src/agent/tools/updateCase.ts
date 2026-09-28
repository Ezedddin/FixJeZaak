import { z } from 'zod';
import { db } from '../../db.js';
import { mergeFactsAndValidate } from '../facts.js';
import { ToolValidationError, type ToolDefinition } from './types.js';

// Deliberately excludes "approved" — the agent can never mark a case
// approved. Only the explicit human-approval REST endpoint can do that.
const ALLOWED_STATUSES = [
  'collecting_info',
  'analyzing',
  'needs_user_input',
  'ready_for_action',
  'awaiting_approval',
  'closed',
] as const;

const schema = z.object({
  caseId: z.string().min(1),
  corrections: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  status: z.enum(ALLOWED_STATUSES).optional(),
});
type Input = z.infer<typeof schema>;

export const updateCaseTool: ToolDefinition<Input> = {
  name: 'update_case',
  description:
    'Verwerk correcties die de gebruiker zelf heeft gegeven op eerder geëxtraheerde gegevens, en/of werk de status van de zaak bij. Correcties worden altijd opgeslagen met bron "user_provided" — de gebruiker is eindautoriteit over zijn eigen feiten. Kan de status NOOIT op "approved" zetten.',
  inputSchema: {
    type: 'object',
    properties: {
      caseId: { type: 'string' },
      corrections: {
        type: 'object',
        description: 'Veld -> nieuwe waarde, zoals de gebruiker die zelf heeft opgegeven.',
      },
      status: { type: 'string', enum: [...ALLOWED_STATUSES] },
    },
    required: ['caseId'],
  },
  validate(raw) {
    const result = schema.safeParse(raw);
    if (!result.success) throw new ToolValidationError(result.error.message);
    return result.data;
  },
  async handler(input) {
    let facts = undefined;
    let ruleFlags = undefined;
    if (input.corrections && Object.keys(input.corrections).length > 0) {
      const newFacts = Object.fromEntries(
        Object.entries(input.corrections).map(([key, value]) => [
          key,
          { value, source: 'user_provided' as const, needsConfirmation: false },
        ]),
      );
      const merged = await mergeFactsAndValidate(input.caseId, newFacts);
      facts = merged.facts;
      ruleFlags = merged.ruleFlags;
    }

    if (input.status) {
      await db.case.update({ where: { id: input.caseId }, data: { status: input.status } });
    }

    return { updated: true, facts, ruleFlags, status: input.status };
  },
};
