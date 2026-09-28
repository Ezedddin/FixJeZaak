import type { KnowledgeResult } from '../../types.js';

/**
 * Static, hand-curated reference entries about the Dutch traffic-fine
 * objection procedure. These are deliberately kept generic and procedural —
 * no invented article numbers, no case-specific legal conclusions.
 *
 * ⚠️ This is a stub, not a legal knowledge base: it exists so the agent has
 * *something real and attributed* to cite instead of inventing legal
 * grounds, and so the codebase has a clear seam to plug in a maintained
 * source (official wetten.overheid.nl content, a reviewed legal database,
 * or real RAG over verified documents) before this is used for real advice.
 */
export const CJIB_KNOWLEDGE: KnowledgeResult[] = [
  {
    title: 'Bezwaartermijn CJIB-verkeersboete',
    snippet:
      'Tegen een verkeersboete die via het CJIB is opgelegd (Wet Mulder / WAHV) kun je binnen 6 weken na de dagtekening van de beschikking beroep instellen bij het CJIB.',
    sourceUrl: 'https://www.cjib.nl/onderwerpen/beroep-aantekenen',
    sourceName: 'CJIB — Beroep aantekenen',
  },
  {
    title: 'Vervolgstap na afwijzing',
    snippet:
      'Als het beroep bij het CJIB wordt afgewezen, kun je in beroep gaan bij de kantonrechter. Hier zijn geen extra kosten aan verbonden.',
    sourceUrl: 'https://www.cjib.nl/onderwerpen/beroep-aantekenen',
    sourceName: 'CJIB — Beroep aantekenen',
  },
  {
    title: 'Bezwaartermijn gemeentelijke parkeerbelasting',
    snippet:
      'Tegen een naheffingsaanslag parkeerbelasting van een gemeente kun je binnen 6 weken na dagtekening bezwaar maken bij de gemeente (heffingsambtenaar).',
    sourceUrl: 'https://www.rijksoverheid.nl/onderwerpen/bezwaar-en-beroep',
    sourceName: 'Rijksoverheid — Bezwaar en beroep',
  },
];
