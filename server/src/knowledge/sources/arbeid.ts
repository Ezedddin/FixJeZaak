import type { KnowledgeResult } from '../../types.js';

const ONTSLAG = { sourceUrl: 'https://www.rijksoverheid.nl/onderwerpen/ontslag', sourceName: 'Rijksoverheid — Ontslag' };
const LOKET = { sourceUrl: 'https://www.juridischloket.nl', sourceName: 'Het Juridisch Loket' };

/**
 * Employment-law basics (Burgerlijk Wetboek boek 7). Hand-written summaries.
 * ⚠️ To be reviewed by a jurist before being relied on for real advice.
 */
export const ARBEID_KNOWLEDGE: KnowledgeResult[] = [
  {
    title: 'Ontslag alleen via UWV, kantonrechter of met instemming',
    snippet:
      'Een werkgever kan een vast contract niet zomaar eenzijdig beëindigen. Hij heeft toestemming van het UWV nodig (bij bedrijfseconomische redenen of langdurige ziekte) of ontbinding door de kantonrechter, tenzij de werknemer instemt of er sprake is van ontslag op staande voet.',
    ...ONTSLAG,
  },
  {
    title: 'Bedenktermijn vaststellingsovereenkomst',
    snippet:
      'Een schriftelijke beëindigingsovereenkomst (vaststellingsovereenkomst) mag de werknemer binnen 14 dagen na ondertekening zonder opgave van redenen ontbinden. Staat dat recht niet in de overeenkomst, dan is de termijn drie weken (art. 7:670b BW).',
    ...ONTSLAG,
  },
  {
    title: 'Transitievergoeding',
    snippet:
      'Bij ontslag op initiatief van de werkgever, of als een tijdelijk contract op initiatief van de werkgever niet wordt verlengd, heeft de werknemer in de regel recht op een transitievergoeding, ook bij een kort dienstverband (art. 7:673 BW). Uitzonderingen gelden onder meer bij ernstig verwijtbaar handelen van de werknemer.',
    ...ONTSLAG,
  },
  {
    title: 'Aanzegverplichting tijdelijk contract',
    snippet:
      'Bij een tijdelijk contract van zes maanden of langer moet de werkgever uiterlijk een maand voor het einde schriftelijk laten weten of het contract wordt verlengd. Doet hij dat niet of te laat, dan heeft de werknemer recht op een vergoeding van maximaal één maandloon (art. 7:668 BW).',
    ...LOKET,
  },
  {
    title: 'Te laat betaald loon',
    snippet:
      'Betaalt de werkgever het loon te laat, dan kan de werknemer naast het loon een wettelijke verhoging van maximaal 50% vorderen (art. 7:625 BW), plus wettelijke rente.',
    ...LOKET,
  },
];
