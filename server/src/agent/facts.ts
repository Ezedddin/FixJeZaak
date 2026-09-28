import { db } from '../db.js';
import { runRules } from '../rules/engine.js';
import type { CaseFact, CaseFacts } from '../types.js';
import { toJson } from '../utils/json.js';

/** Merges new facts into a case's stored facts and re-runs the deterministic
 * rule engine, persisting both. This is the only place Case.facts is
 * written, so provenance/confidence handling stays consistent everywhere. */
export async function mergeFactsAndValidate(
  caseId: string,
  newFacts: Record<string, CaseFact>,
): Promise<{ facts: CaseFacts; ruleFlags: ReturnType<typeof runRules> }> {
  const kase = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  const existing = (kase.facts as CaseFacts | null) ?? {};
  const merged: CaseFacts = { ...existing, ...newFacts };
  const ruleFlags = runRules(kase.caseType, merged);

  await db.case.update({
    where: { id: caseId },
    data: { facts: toJson(merged), ruleFlags: toJson(ruleFlags) },
  });

  return { facts: merged, ruleFlags };
}

const NUMERIC_FIELDS = new Set(['fine_amount', 'measured_speed', 'allowed_speed', 'corrected_speed']);

/** Turns user-typed text like "€ 78,30" or "104 km/u" into a number for the
 * fields the rules do arithmetic on; anything unparseable stays as text so
 * the rules simply skip it rather than validate a wrong number. */
function normalizeValue(key: string, value: string | number): string | number {
  if (!NUMERIC_FIELDS.has(key) || typeof value === 'number') return value;
  const match = value.replace(/\./g, '').replace(',', '.').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : value;
}

/**
 * Records that the user has reviewed the extracted fields in the app. A value
 * the user left unchanged keeps its document provenance but no longer needs
 * confirmation; a changed (or newly supplied) value becomes "user_provided".
 * Either way the user is the final authority over their own facts.
 */
export async function confirmFacts(caseId: string, values: Record<string, string | number>) {
  const kase = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  const existing = (kase.facts as CaseFacts | null) ?? {};

  const confirmed: Record<string, CaseFact> = {};
  for (const [key, rawValue] of Object.entries(values)) {
    if (rawValue === '') continue;
    const value = normalizeValue(key, rawValue);
    const previous = existing[key];
    confirmed[key] =
      previous && String(previous.value) === String(value)
        ? { ...previous, needsConfirmation: false }
        : { value, source: 'user_provided', needsConfirmation: false };
  }

  return mergeFactsAndValidate(caseId, confirmed);
}
