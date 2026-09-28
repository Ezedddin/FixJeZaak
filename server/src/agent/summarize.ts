import { caseTypeConfig } from '../caseTypes/index.js';
import type { CaseFacts } from '../types.js';

/**
 * Deterministic (non-LLM) template for summarizing extracted facts back to
 * the user. Kept template-based rather than model-generated so the summary
 * can never drift from what was actually extracted and validated.
 */
export function summarizeExtraction(
  caseType: string,
  facts: CaseFacts,
  fieldsNeedingConfirmation: string[],
): string {
  const labels = Object.fromEntries((caseTypeConfig(caseType)?.fields ?? []).map((f) => [f.key, f.label]));
  const lines = Object.entries(facts)
    .filter(([key]) => labels[key])
    .map(([key, fact]) => `- ${labels[key]}: ${fact.value}`);

  if (lines.length === 0) {
    return 'Ik kon geen gegevens uit dit document halen. Kun je een duidelijkere foto of scan uploaden?';
  }

  let message = `Ik heb de volgende gegevens uit je document gehaald:\n\n${lines.join('\n')}\n\nKlopt dit?`;
  if (fieldsNeedingConfirmation.length > 0) {
    const confirmLabels = fieldsNeedingConfirmation.map((key) => labels[key] ?? key).join(', ');
    message += `\n\nIk ben minder zeker over: ${confirmLabels}. Controleer deze velden extra goed.`;
  }
  return message;
}
