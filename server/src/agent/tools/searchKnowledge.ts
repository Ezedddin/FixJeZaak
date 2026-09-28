import { z } from 'zod';
import { db } from '../../db.js';
import { searchKnowledge } from '../../knowledge/index.js';
import { ToolValidationError, type ToolDefinition } from './types.js';

const schema = z.object({
  caseId: z.string().min(1),
  query: z.string().min(3).max(300),
});
type Input = z.infer<typeof schema>;

export const searchKnowledgeTool: ToolDefinition<Input> = {
  name: 'search_knowledge',
  description:
    'Zoek in betrouwbare externe kennisbronnen (bijv. CJIB-procedures) naar informatie relevant voor deze vraag. Gebruik dit voordat je iets zegt over procedures, termijnen of vervolgstappen. Als dit niets teruggeeft, mag je NIET zelf iets verzinnen — zeg dan dat je het niet kunt vinden.',
  inputSchema: {
    type: 'object',
    properties: {
      caseId: { type: 'string' },
      query: { type: 'string', description: 'Korte zoekvraag, bv. "bezwaartermijn CJIB"' },
    },
    required: ['caseId', 'query'],
  },
  validate(raw) {
    const result = schema.safeParse(raw);
    if (!result.success) throw new ToolValidationError(result.error.message);
    return result.data;
  },
  async handler(input) {
    const kase = await db.case.findUnique({ where: { id: input.caseId } });
    if (!kase) return { error: 'case_not_found' };
    const results = await searchKnowledge(input.query, kase.caseType);
    return { found: results.length > 0, results };
  },
};
