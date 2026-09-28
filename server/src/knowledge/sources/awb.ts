import type { KnowledgeResult } from '../../types.js';

const SOURCE = { sourceUrl: 'https://www.rijksoverheid.nl/onderwerpen/bezwaar-en-beroep', sourceName: 'Rijksoverheid — Bezwaar en beroep' };

/**
 * General administrative-law (Awb) procedure for objecting to a government
 * decision. Hand-written summaries of the statute, kept procedural.
 * ⚠️ To be reviewed by a jurist before being relied on for real advice.
 */
export const AWB_KNOWLEDGE: KnowledgeResult[] = [
  {
    title: 'Bezwaartermijn overheidsbesluit',
    snippet:
      'Tegen een besluit van een bestuursorgaan (bijvoorbeeld de gemeente, UWV, Belastingdienst/Toeslagen of DUO) kun je bezwaar maken. De bezwaartermijn is zes weken en begint op de dag na de dagtekening van het besluit (art. 6:7 en 6:8 Awb).',
    ...SOURCE,
  },
  {
    title: 'Inhoud van een bezwaarschrift',
    snippet:
      'Een bezwaarschrift wordt ondertekend en bevat ten minste de naam en het adres van de indiener, de datum, een omschrijving van het besluit waartegen het bezwaar is gericht, en de gronden van het bezwaar (art. 6:5 Awb).',
    ...SOURCE,
  },
  {
    title: 'Te laat ingediend bezwaar',
    snippet:
      'Een te laat ingediend bezwaar wordt in principe niet-ontvankelijk verklaard, tenzij de indiener redelijkerwijs niet kan worden verweten dat hij te laat is (art. 6:11 Awb).',
    ...SOURCE,
  },
  {
    title: 'Horen en beslistermijn',
    snippet:
      'Voordat het bestuursorgaan op het bezwaar beslist, krijg je in de regel de gelegenheid om te worden gehoord (art. 7:2 Awb). Het bestuursorgaan beslist binnen zes weken, of binnen twaalf weken als er een bezwaaradviescommissie is; verdaging met zes weken is mogelijk (art. 7:10 Awb).',
    ...SOURCE,
  },
];
