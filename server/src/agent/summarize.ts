import type { CaseFacts } from '../types.js';

/**
 * Deterministic (non-LLM) template for summarizing extracted facts back to
 * the user. Kept template-based rather than model-generated so the summary
 * can never drift from what was actually extracted and validated.
 */
const FIELD_LABELS: Record<string, string> = {
  authority: 'Instantie',
  offence: 'Overtreding',
  date: 'Datum',
  location: 'Locatie',
  measured_speed: 'Gemeten snelheid',
  allowed_speed: 'Toegestane snelheid',
  corrected_speed: 'Gecorrigeerde snelheid',
  fine_amount: 'Bedrag',
  reference_number: 'Kenmerk',
  objection_deadline: 'Bezwaartermijn',
};

export function summarizeExtraction(facts: CaseFacts, fieldsNeedingConfirmation: string[]): string {
  const lines = Object.entries(facts)
    .filter(([key]) => FIELD_LABELS[key])
    .map(([key, fact]) => `- ${FIELD_LABELS[key]}: ${fact.value}`);

  if (lines.length === 0) {
    return 'Ik kon geen gegevens uit dit document halen. Kun je een duidelijkere foto of scan uploaden?';
  }

  let message = `Ik heb de volgende gegevens uit je document gehaald:\n\n${lines.join('\n')}\n\nKlopt dit?`;
  if (fieldsNeedingConfirmation.length > 0) {
    const labels = fieldsNeedingConfirmation.map((key) => FIELD_LABELS[key] ?? key).join(', ');
    message += `\n\nIk ben minder zeker over: ${labels}. Controleer deze velden extra goed.`;
  }
  return message;
}
