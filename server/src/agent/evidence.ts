import { db } from '../db.js';

/** Short descriptions of the evidence the user uploaded for a case, as read
 * by the model when it was uploaded. Used as grounding for assessment and
 * letters — the model only gets what the evidence was read to show. */
export async function evidenceSummaries(caseId: string): Promise<string[]> {
  const documents = await db.document.findMany({
    where: { caseId, kind: 'evidence' },
    orderBy: { createdAt: 'asc' },
  });
  return documents
    .map((d) => (d.extracted as { evidenceSummary?: string } | null)?.evidenceSummary)
    .filter((summary): summary is string => Boolean(summary));
}
