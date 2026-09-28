const DUTCH_MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

function iso(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/** Reads a date the way people (and letters) write it — "2026-09-21",
 * "21-09-2026", "21/9/2026" or "21 september 2026" — as YYYY-MM-DD.
 * Returns null for anything it can't read with certainty. */
export function parseDateInput(text: string): string | null {
  const value = text.trim().toLowerCase();
  let m = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));
  m = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return iso(Number(m[3]), Number(m[2]), Number(m[1]));
  m = value.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (m) {
    const month = DUTCH_MONTHS.indexOf(m[2]) + 1;
    if (month > 0) return iso(Number(m[3]), month, Number(m[1]));
  }
  return null;
}
