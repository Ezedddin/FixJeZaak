import type { CaseFacts, RuleResult } from '../../types.js';
import { factNumber, factValue, type Rule } from '../types.js';

const REQUIRED_FIELDS = ['authority', 'offence', 'fine_amount', 'reference_number'];

const requiredFieldsPresent: Rule = (facts: CaseFacts): RuleResult[] => {
  const results: RuleResult[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (facts[field] === undefined) {
      results.push({
        code: 'missing_required_field',
        severity: 'error',
        message: `Verplicht veld "${field}" ontbreekt nog.`,
        field,
      });
    }
  }
  return results;
};

const invalidAmount: Rule = (facts: CaseFacts): RuleResult[] => {
  const amount = factNumber(facts, 'fine_amount');
  if (amount === undefined) return [];
  if (amount < 0) {
    return [
      {
        code: 'invalid_amount',
        severity: 'error',
        message: 'Het boetebedrag kan niet negatief zijn.',
        field: 'fine_amount',
      },
    ];
  }
  if (amount > 10000) {
    return [
      {
        code: 'unusual_amount',
        severity: 'warning',
        message: 'Dit boetebedrag is ongebruikelijk hoog — controleer of dit klopt.',
        field: 'fine_amount',
      },
    ];
  }
  return [];
};

const speedConsistency: Rule = (facts: CaseFacts): RuleResult[] => {
  const measured = factNumber(facts, 'measured_speed');
  const allowed = factNumber(facts, 'allowed_speed');
  if (measured === undefined || allowed === undefined) return [];
  if (measured <= allowed) {
    return [
      {
        code: 'possible_inconsistency',
        severity: 'warning',
        message:
          'De gemeten snelheid is niet hoger dan de toegestane snelheid — dat is inconsistent voor een snelheidsovertreding. Controleer de gegevens.',
        field: 'measured_speed',
      },
    ];
  }
  return [];
};

const correctedSpeedConsistency: Rule = (facts: CaseFacts): RuleResult[] => {
  const measured = factNumber(facts, 'measured_speed');
  const corrected = factNumber(facts, 'corrected_speed');
  if (measured === undefined || corrected === undefined) return [];
  if (corrected > measured) {
    return [
      {
        code: 'inconsistent_correction',
        severity: 'warning',
        message:
          'De gecorrigeerde snelheid is hoger dan de gemeten snelheid — normaal is de correctie juist lager. Controleer de gegevens.',
        field: 'corrected_speed',
      },
    ];
  }
  return [];
};

const dateValidity: Rule = (facts: CaseFacts): RuleResult[] => {
  const rawDate = factValue<string>(facts, 'date');
  if (!rawDate) return [];
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return [
      {
        code: 'invalid_date',
        severity: 'error',
        message: 'De datum op het document kon niet worden gelezen als een geldige datum.',
        field: 'date',
      },
    ];
  }
  if (parsed.getTime() > Date.now()) {
    return [
      {
        code: 'future_date',
        severity: 'warning',
        message: 'De datum op het document ligt in de toekomst — controleer of dit klopt.',
        field: 'date',
      },
    ];
  }
  return [];
};

const objectionDeadline: Rule = (facts: CaseFacts): RuleResult[] => {
  const raw = factValue<string>(facts, 'objection_deadline');
  if (!raw) return [];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return [];
  if (parsed.getTime() < Date.now()) {
    return [
      {
        code: 'deadline_passed',
        severity: 'warning',
        message: 'De bezwaartermijn voor deze zaak lijkt al verstreken.',
        field: 'objection_deadline',
      },
    ];
  }
  return [];
};

export const trafficFineRules: Rule[] = [
  requiredFieldsPresent,
  invalidAmount,
  speedConsistency,
  correctedSpeedConsistency,
  dateValidity,
  objectionDeadline,
];
