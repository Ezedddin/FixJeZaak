import { z } from 'zod';
import { ALLOWED_ACTION_TYPES, createPendingAction } from '../actions.js';
import { ToolValidationError, type ToolDefinition } from './types.js';

const schema = z.object({
  caseId: z.string().min(1),
  type: z.enum(ALLOWED_ACTION_TYPES),
  summary: z.string().min(1).max(2000),
});
type Input = z.infer<typeof schema>;

export const prepareActionTool: ToolDefinition<Input> = {
  name: 'prepare_action',
  description:
    'Zet een consequente actie klaar voor menselijke goedkeuring (nog niet uitgevoerd). Gebruik dit alleen voor acties zonder gegenereerde documenttekst — voor een bezwaarschrift gebruik je generate_document, die deze stap intern al doet. De status wordt altijd "pending_approval"; de gebruiker moet dit apart, buiten dit gesprek om, goedkeuren voordat er iets naar buiten gaat.',
  inputSchema: {
    type: 'object',
    properties: {
      caseId: { type: 'string' },
      type: { type: 'string', enum: [...ALLOWED_ACTION_TYPES] },
      summary: { type: 'string', description: 'Korte omschrijving van de voorgestelde actie.' },
    },
    required: ['caseId', 'type', 'summary'],
  },
  validate(raw) {
    const result = schema.safeParse(raw);
    if (!result.success) throw new ToolValidationError(result.error.message);
    return result.data;
  },
  async handler(input) {
    const action = await createPendingAction(input.caseId, input.type, { summary: input.summary });
    return { actionId: action.id, status: action.status };
  },
};
