import type { CaseTypeConfig } from '../caseTypes/index.js';
import type { CaseFacts, RuleResult } from '../types.js';
import { factNumber, factValue, type Rule } from './types.js';

/** Rules every case type gets, driven by its field definitions: required
 * facts present, amounts not negative, dates parseable and not in the future,
 * and the case's deadline not yet passed. */
export function genericRules(config: CaseTypeConfig): Rule[] {
  const requiredFieldsPresent: Rule = (facts) =>
    config.requiredFields
      .filter((field) => facts[field] === undefined)
      .map((field) => ({
        code: 'missing_required_field',
        severity: 'error' as const,
        message: `Verplicht veld "${field}" ontbreekt nog.`,
        field,
      }));

  const nonNegativeAmounts: Rule = (facts) =>
    config.fields
      .filter((f) => f.kind === 'number')
      .filter((f) => (factNumber(facts, f.key) ?? 0) < 0)
      .map((f) => ({
        code: 'invalid_amount',
        severity: 'error' as const,
        message: `${f.label} kan niet negatief zijn.`,
        field: f.key,
      }));

  const validDates: Rule = (facts) => {
    const results: RuleResult[] = [];
    for (const f of config.fields.filter((field) => field.kind === 'date' && field.key !== config.deadlineField)) {
      const raw = factValue<string>(facts, f.key);
      if (!raw) continue;
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) continue; // free-text dates are fine; we just can't check them
      if (parsed.getTime() > Date.now()) {
        results.push({
          code: 'future_date',
          severity: 'warning',
          message: `${f.label} ligt in de toekomst — controleer of dit klopt.`,
          field: f.key,
        });
      }
    }
    return results;
  };

  const deadlineNotPassed: Rule = (facts) => {
    if (!config.deadlineField) return [];
    const raw = factValue<string>(facts, config.deadlineField);
    if (!raw) return [];
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() >= Date.now()) return [];
    return [
      {
        code: 'deadline_passed',
        severity: 'warning',
        message: 'De deadline voor deze zaak lijkt al verstreken.',
        field: config.deadlineField,
      },
    ];
  };

  return [requiredFieldsPresent, nonNegativeAmounts, validDates, deadlineNotPassed];
}

const SIX_WEEKS_MS = 42 * 24 * 60 * 60 * 1000;

/** Government decisions: the Awb objection period is six weeks from the
 * decision date (art. 6:7/6:8 Awb). Only a warning — the stated deadline on
 * the letter, if any, is leading. */
export const objectionPeriodFromDecisionDate: Rule = (facts: CaseFacts) => {
  if (facts.objection_deadline) return [];
  const raw = factValue<string>(facts, 'decision_date');
  if (!raw) return [];
  const decided = new Date(raw);
  if (Number.isNaN(decided.getTime())) return [];
  if (Date.now() - decided.getTime() <= SIX_WEEKS_MS) return [];
  return [
    {
      code: 'objection_period_possibly_passed',
      severity: 'warning',
      message:
        'Het besluit is meer dan zes weken oud. De bezwaartermijn is doorgaans zes weken na de dagtekening — controleer of je nog op tijd bent.',
      field: 'decision_date',
    },
  ];
};

/** Statutory maximum for consumer collection costs (BIK staffel). */
export function maxCollectionCosts(principal: number): number {
  const brackets: Array<[number, number]> = [
    [2500, 0.15],
    [2500, 0.1],
    [5000, 0.05],
    [190000, 0.01],
    [Infinity, 0.005],
  ];
  let remaining = principal;
  let total = 0;
  for (const [size, rate] of brackets) {
    if (remaining <= 0) break;
    const part = Math.min(remaining, size);
    total += part * rate;
    remaining -= part;
  }
  return Math.min(Math.max(total, 40), 6775);
}

export const collectionCostsWithinLimit: Rule = (facts: CaseFacts) => {
  const principal = factNumber(facts, 'amount');
  const costs = factNumber(facts, 'collection_costs');
  if (principal === undefined || costs === undefined) return [];
  const max = maxCollectionCosts(principal);
  if (costs <= max + 0.005) return [];
  return [
    {
      code: 'collection_costs_above_limit',
      severity: 'warning',
      message: `De incassokosten (€ ${costs.toFixed(2)}) lijken hoger dan het wettelijk maximum voor consumenten bij deze hoofdsom (€ ${max.toFixed(2)}).`,
      field: 'collection_costs',
    },
  ];
};
