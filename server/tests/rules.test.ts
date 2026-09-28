import { describe, expect, it } from 'vitest';
import { runRules } from '../src/rules/engine.js';
import type { CaseFacts } from '../src/types.js';

function fact(value: string | number): CaseFacts[string] {
  return { value, source: 'document', needsConfirmation: false };
}

describe('deterministic rule engine — missing fields (scenario 2)', () => {
  it('flags every missing required field as a blocking error', () => {
    const facts: CaseFacts = { authority: fact('CJIB') };
    const flags = runRules('boete', facts);
    const missing = flags.filter((f) => f.code === 'missing_required_field');
    expect(missing.map((f) => f.field).sort()).toEqual(
      ['offence', 'fine_amount', 'reference_number'].sort(),
    );
    expect(missing.every((f) => f.severity === 'error')).toBe(true);
  });

  it('reports no missing-field errors once all required fields are present', () => {
    const facts: CaseFacts = {
      authority: fact('CJIB'),
      offence: fact('speeding'),
      fine_amount: fact(180),
      reference_number: fact('ABC123'),
    };
    const flags = runRules('boete', facts);
    expect(flags.filter((f) => f.code === 'missing_required_field')).toHaveLength(0);
  });

  it('returns an info flag instead of inventing rules for an unsupported case type', () => {
    const flags = runRules('werk', {});
    expect(flags).toEqual([
      expect.objectContaining({ code: 'unsupported_case_type', severity: 'info' }),
    ]);
  });
});

describe('deterministic rule engine — contradictory fields (scenario 3)', () => {
  it('flags measured speed not exceeding allowed speed as inconsistent', () => {
    const facts: CaseFacts = { measured_speed: fact(80), allowed_speed: fact(100) };
    const flags = runRules('boete', facts);
    expect(flags).toContainEqual(
      expect.objectContaining({ code: 'possible_inconsistency', severity: 'warning' }),
    );
  });

  it('does not flag a genuine speeding case as inconsistent', () => {
    const facts: CaseFacts = { measured_speed: fact(120), allowed_speed: fact(100) };
    const flags = runRules('boete', facts);
    expect(flags.filter((f) => f.code === 'possible_inconsistency')).toHaveLength(0);
  });

  it('flags a corrected speed that is higher than the measured speed', () => {
    const facts: CaseFacts = { measured_speed: fact(120), corrected_speed: fact(125) };
    const flags = runRules('boete', facts);
    expect(flags).toContainEqual(
      expect.objectContaining({ code: 'inconsistent_correction', severity: 'warning' }),
    );
  });

  it('flags a negative fine amount as an error, and an unusually large one as a warning', () => {
    expect(runRules('boete', { fine_amount: fact(-10) })).toContainEqual(
      expect.objectContaining({ code: 'invalid_amount', severity: 'error' }),
    );
    expect(runRules('boete', { fine_amount: fact(50000) })).toContainEqual(
      expect.objectContaining({ code: 'unusual_amount', severity: 'warning' }),
    );
  });

  it('flags an objection deadline that has already passed', () => {
    const facts: CaseFacts = { objection_deadline: fact('2020-01-01') };
    const flags = runRules('boete', facts);
    expect(flags).toContainEqual(expect.objectContaining({ code: 'deadline_passed' }));
  });
});
