import { z } from 'zod';
import { db } from '../../db.js';
import { runRules } from '../../rules/engine.js';
import type { CaseFacts } from '../../types.js';
import { toJson } from '../../utils/json.js';
import { ToolValidationError, type ToolDefinition } from './types.js';

const schema = z.object({ caseId: z.string().min(1) });
type Input = z.infer<typeof schema>;

export const validateCaseTool: ToolDefinition<Input> = {
  name: 'validate_case',
  description:
    'Voer de deterministische validatieregels uit over de huidige feiten van de zaak (geen LLM-redenatie). Geeft eventuele ontbrekende velden, inconsistenties of ongeldige waarden terug. Gebruik dit voordat je een advies of document baseert op de feiten.',
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
    const kase = await db.case.findUnique({ where: { id: input.caseId } });
    if (!kase) return { error: 'case_not_found' };
    const facts = (kase.facts as CaseFacts | null) ?? {};
    const ruleFlags = runRules(kase.caseType, facts);
    await db.case.update({ where: { id: input.caseId }, data: { ruleFlags: toJson(ruleFlags) } });
    return { ruleFlags, hasBlockingErrors: ruleFlags.some((r) => r.severity === 'error') };
  },
};
