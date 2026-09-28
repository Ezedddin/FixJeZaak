import type { KnowledgeResult } from '../../types.js';

const SOURCE = { sourceUrl: 'https://www.juridischloket.nl', sourceName: 'Het Juridisch Loket' };

/**
 * Debt-collection basics for consumers. Hand-written summaries.
 * ⚠️ To be reviewed by a jurist before being relied on for real advice.
 */
export const INCASSO_KNOWLEDGE: KnowledgeResult[] = [
  {
    title: 'Veertiendagenbrief',
    snippet:
      'Een schuldeiser mag bij een consument pas incassokosten rekenen na een aanmaning waarin de consument 14 dagen krijgt om alsnog te betalen, met vermelding van de kosten als hij dat niet doet (art. 6:96 lid 6 BW).',
    ...SOURCE,
  },
  {
    title: 'Maximale incassokosten',
    snippet:
      'Voor consumenten zijn de incassokosten wettelijk begrensd: 15% over de eerste € 2.500, 10% over de volgende € 2.500, 5% over de volgende € 5.000, 1% over de volgende € 190.000 en 0,5% over het meerdere, met een minimum van € 40 en een maximum van € 6.775 (Besluit vergoeding voor buitengerechtelijke incassokosten).',
    ...SOURCE,
  },
  {
    title: 'Verjaring',
    snippet:
      'Een betalingsvordering uit een consumentenkoop verjaart na twee jaar (art. 7:28 BW); veel andere periodieke betalingen, zoals huur en rente, na vijf jaar (art. 3:308 BW). De schuldeiser kan de verjaring stuiten, bijvoorbeeld met een schriftelijke aanmaning.',
    ...SOURCE,
  },
  {
    title: 'Vordering betwisten',
    snippet:
      'Vind je een vordering niet (helemaal) terecht, dan kun je die schriftelijk en gemotiveerd betwisten bij de schuldeiser of het incassobureau en om een onderbouwing vragen.',
    ...SOURCE,
  },
];
