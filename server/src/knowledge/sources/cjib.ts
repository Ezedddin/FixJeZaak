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
      'Tegen een verkeersboete onder de Wet Mulder (WAHV), die via het CJIB wordt geïnd, kun je binnen 6 weken na de dagtekening van de beschikking beroep instellen bij de officier van justitie. Het CJIB geeft op zijn website aan hoe je dat doet.',
    sourceUrl: 'https://www.cjib.nl',
    sourceName: 'CJIB',
  },
  {
    title: 'Zekerheidstelling',
    snippet:
      'Voordat de officier van justitie een beroep tegen een Mulder-boete in behandeling neemt, moet je in de regel het boetebedrag als zekerheid betalen. Wordt het beroep toegewezen, dan krijg je dat bedrag terug.',
    sourceUrl: 'https://www.cjib.nl',
    sourceName: 'CJIB',
  },
  {
    title: 'Vervolgstap na afwijzing',
    snippet:
      'Wijst de officier van justitie het beroep af, dan kun je binnen 6 weken beroep instellen bij de kantonrechter.',
    sourceUrl: 'https://www.cjib.nl',
    sourceName: 'CJIB',
  },
  {
    title: 'Bezwaartermijn gemeentelijke parkeerbelasting',
    snippet:
      'Tegen een naheffingsaanslag parkeerbelasting van een gemeente kun je binnen 6 weken na dagtekening bezwaar maken bij de gemeente (heffingsambtenaar).',
    sourceUrl: 'https://www.rijksoverheid.nl/onderwerpen/bezwaar-en-beroep',
    sourceName: 'Rijksoverheid — Bezwaar en beroep',
  },
];
