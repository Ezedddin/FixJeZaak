import type { KnowledgeResult } from '../../types.js';

const SOURCE = { sourceUrl: 'https://www.consuwijzer.nl', sourceName: 'ConsuWijzer (ACM)' };

/**
 * Consumer-sales basics (Burgerlijk Wetboek boek 6 en 7). Hand-written
 * summaries. ⚠️ To be reviewed by a jurist before being relied on for real advice.
 */
export const CONSUMENT_KNOWLEDGE: KnowledgeResult[] = [
  {
    title: 'Wettelijke garantie (conformiteit)',
    snippet:
      'Een product moet de eigenschappen hebben die je op grond van de koop mocht verwachten (art. 7:17 BW). Is dat niet zo, dan kun je kosteloos herstel of vervanging eisen; lukt dat niet (binnen redelijke termijn), dan prijsvermindering of ontbinding (art. 7:21 en 7:22 BW). Dit geldt naast een eventuele fabrieksgarantie.',
    ...SOURCE,
  },
  {
    title: 'Bewijsvermoeden eerste jaar',
    snippet:
      'Bij een consumentenkoop wordt vermoed dat een gebrek dat binnen één jaar na aflevering aan het licht komt er bij aflevering al was; de verkoper moet dan het tegendeel bewijzen (art. 7:18 lid 2 BW, voor aankopen vanaf 1 januari 2022).',
    ...SOURCE,
  },
  {
    title: 'Gebrek tijdig melden',
    snippet:
      'Een consument moet een gebrek binnen bekwame tijd na ontdekking melden bij de verkoper; een melding binnen twee maanden na ontdekking is in elk geval tijdig (art. 7:23 BW).',
    ...SOURCE,
  },
  {
    title: 'Herroepingsrecht bij online kopen',
    snippet:
      'Bij aankopen op afstand (bijvoorbeeld online) mag je de koop in de regel binnen 14 dagen na ontvangst zonder opgave van redenen ontbinden. De verkoper moet dan binnen 14 dagen na de ontbinding terugbetalen (art. 6:230o en 6:230r BW).',
    ...SOURCE,
  },
  {
    title: 'Ingebrekestelling',
    snippet:
      'Voordat je een koop kunt ontbinden of schadevergoeding kunt vorderen, moet je de verkoper in de regel eerst schriftelijk in gebreke stellen en een redelijke termijn geven om alsnog na te komen (art. 6:82 BW).',
    ...SOURCE,
  },
];
