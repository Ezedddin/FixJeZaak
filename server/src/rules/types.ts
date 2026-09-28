import type { CaseFacts, RuleResult } from '../types.js';

/** A rule is pure, deterministic, and never calls the LLM — it only reasons
 * over already-extracted facts. This is the layer that enforces "the model
 * doesn't get to decide what a boete legally means." */
export type Rule = (facts: CaseFacts) => RuleResult[];

export function factValue<T = string | number>(facts: CaseFacts, key: string): T | undefined {
  return facts[key]?.value as T | undefined;
}

export function factNumber(facts: CaseFacts, key: string): number | undefined {
  const value = facts[key]?.value;
  if (value === undefined) return undefined;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : undefined;
}
