import { CASE_TYPES } from '../caseTypes/index.js';
import type { CaseFacts, RuleResult } from '../types.js';
import { collectionCostsWithinLimit, genericRules, objectionPeriodFromDecisionDate } from './generic.js';
import { trafficFineRules } from './trafficFines/index.js';
import type { Rule } from './types.js';

/** Rule sets per case type. Traffic fines keep their dedicated set (speed
 * checks etc.); every other type gets the generic rules from its field
 * definitions plus any type-specific checks. */
const RULES_BY_CASE_TYPE: Record<string, Rule[]> = {
  boete: trafficFineRules,
  overheid: [...genericRules(CASE_TYPES.overheid), objectionPeriodFromDecisionDate],
  werk: genericRules(CASE_TYPES.werk),
  wonen: genericRules(CASE_TYPES.wonen),
  aankopen: genericRules(CASE_TYPES.aankopen),
  geld: [...genericRules(CASE_TYPES.geld), collectionCostsWithinLimit],
  anders: genericRules(CASE_TYPES.anders),
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
