import type { CaseFacts, RuleResult } from '../types.js';
import { trafficFineRules } from './trafficFines/index.js';
import type { Rule } from './types.js';

/** Registry of rule sets per case type. Adding a new case type (parking,
 * tax, subscriptions, consumer rights, ...) means adding one entry here and
 * a new `rules/<caseType>/index.ts` — nothing else in the agent changes. */
const RULES_BY_CASE_TYPE: Record<string, Rule[]> = {
  boete: trafficFineRules,
};

export function runRules(caseType: string, facts: CaseFacts): RuleResult[] {
  const rules = RULES_BY_CASE_TYPE[caseType];
  if (!rules) {
    return [
      {
        code: 'unsupported_case_type',
        severity: 'info',
        message: `Er zijn nog geen validatieregels voor zaaktype "${caseType}".`,
      },
    ];
  }
  return rules.flatMap((rule) => rule(facts));
}
