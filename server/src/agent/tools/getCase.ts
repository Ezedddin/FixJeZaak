import { z } from 'zod';
import { db } from '../../db.js';
import { ToolValidationError, type ToolDefinition } from './types.js';

const schema = z.object({ caseId: z.string().min(1) });
type Input = z.infer<typeof schema>;

export const getCaseTool: ToolDefinition<Input> = {
  name: 'get_case',
  description:
    'Haal de actuele, opgeslagen staat van de zaak op: gevalideerde feiten, regel-signalen, openstaande vragen en acties. Roep dit ALTIJD aan voordat je feiten van de zaak noemt of een document genereert — vertrouw niet op wat eerder in het gesprek leek te zijn gezegd.',
  inputSchema: {
    type: 'object',
    properties: { caseId: { type: 'string' } },
    required: ['caseId'],
  },
  validate(raw) {
    const result = schema.safeParse(raw);
    if (!result.success) throw new ToolValidationError(result.error.message);
    return result.data;
  },
  async handler(input) {
    const kase = await db.case.findUnique({
      where: { id: input.caseId },
      include: { documents: true, actions: true },
    });
    if (!kase) return { error: 'case_not_found' };
    return {
      id: kase.id,
      caseType: kase.caseType,
      status: kase.status,
      facts: kase.facts ?? {},
      ruleFlags: kase.ruleFlags ?? [],
      questions: kase.questions ?? [],
      documents: kase.documents.map((d) => ({
        id: d.id,
        filename: d.filename,
        hasExtraction: d.extracted != null,
      })),
      actions: kase.actions.map((a) => ({ id: a.id, type: a.type, status: a.status })),
    };
  },
};
