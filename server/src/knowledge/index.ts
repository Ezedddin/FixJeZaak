import type { KnowledgeResult } from '../types.js';
import { CJIB_KNOWLEDGE } from './sources/cjib.js';

/** Registry of knowledge sources per case type. Adding a real RAG-backed
 * source later means implementing this same `search` shape and registering
 * it here — nothing else in the agent needs to change. */
const KNOWLEDGE_BY_CASE_TYPE: Record<string, KnowledgeResult[]> = {
  boete: CJIB_KNOWLEDGE,
};

function scoreMatch(query: string, entry: KnowledgeResult): number {
  const q = query.toLowerCase();
  const haystack = `${entry.title} ${entry.snippet}`.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 3);
  if (words.length === 0) return 0;
  const hits = words.filter((word) => haystack.includes(word)).length;
  return hits / words.length;
}

/**
 * Keyword-overlap lookup over the static knowledge stub. Deliberately
 * simple — this is the seam where real retrieval (embeddings + a verified
 * legal corpus) plugs in later without changing the caller's contract.
 * Returns an empty array when nothing matches well enough; callers must
 * treat that as "no source found," never fill the gap with invented text.
 */
export async function searchKnowledge(query: string, caseType: string): Promise<KnowledgeResult[]> {
  const entries = KNOWLEDGE_BY_CASE_TYPE[caseType] ?? [];
  return entries
    .map((entry) => ({ entry, score: scoreMatch(query, entry) }))
    .filter(({ score }) => score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ entry }) => entry);
}
