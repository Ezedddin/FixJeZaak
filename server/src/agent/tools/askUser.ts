import { z } from 'zod';
import { db } from '../../db.js';
import { toJson } from '../../utils/json.js';
import { ToolValidationError, type ToolDefinition } from './types.js';

const schema = z.object({
  caseId: z.string().min(1),
  question: z.string().min(3).max(500),
  options: z.array(z.string()).max(6).optional(),
});
type Input = z.infer<typeof schema>;

export const askUserTool: ToolDefinition<Input> = {
  name: 'ask_user',
  description:
    'Registreer dat de zaak niet verder kan zonder aanvullende informatie van de gebruiker. Gebruik dit wanneer een verplicht gegeven ontbreekt of een extractie onzeker is. Stel de vraag ZELF ook gewoon in je antwoord aan de gebruiker — deze tool bewaart de vraag alleen bij de zaak.',
  inputSchema: {
    type: 'object',
    properties: {
      caseId: { type: 'string' },
      question: { type: 'string' },
      options: { type: 'array', items: { type: 'string' } },
    },
    required: ['caseId', 'question'],
  },
  validate(raw) {
    const result = schema.safeParse(raw);
    if (!result.success) throw new ToolValidationError(result.error.message);
    return result.data;
  },
  async handler(input) {
    const kase = await db.case.findUnique({ where: { id: input.caseId } });
    if (!kase) return { error: 'case_not_found' };
    const existing = (kase.questions as Array<Record<string, unknown>> | null) ?? [];
    const questions = [
      ...existing,
      { question: input.question, options: input.options ?? [], askedAt: new Date().toISOString() },
    ];
    await db.case.update({
      where: { id: input.caseId },
      data: { questions: toJson(questions), status: 'needs_user_input' },
    });
    return { recorded: true };
  },
};
