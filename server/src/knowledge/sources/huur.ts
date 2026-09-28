import type { KnowledgeResult } from '../../types.js';

const HUURCOMMISSIE = { sourceUrl: 'https://www.huurcommissie.nl', sourceName: 'Huurcommissie' };
const LOKET = { sourceUrl: 'https://www.juridischloket.nl', sourceName: 'Het Juridisch Loket' };

/**
 * Tenancy-law basics. Hand-written summaries.
 * ⚠️ To be reviewed by a jurist before being relied on for real advice.
 */
export const HUUR_KNOWLEDGE: KnowledgeResult[] = [
  {
    title: 'Onderhoud en gebreken',
    snippet:
      'De verhuurder moet gebreken aan de woning verhelpen, tenzij dat onmogelijk is of kosten vergt die redelijkerwijs niet van hem kunnen worden verwacht. Kleine herstellingen komen voor rekening van de huurder (art. 7:206 en 7:217 BW).',
    ...LOKET,
  },
  {
    title: 'Borg terugbetalen',
    snippet:
      'Voor huurcontracten vanaf 1 juli 2023 (Wet goed verhuurderschap) is de borg maximaal twee keer de kale maandhuur, en moet de verhuurder de borg binnen 14 dagen na het einde van de huur terugbetalen, of binnen 30 dagen als hij kosten voor schade verrekent.',
    ...LOKET,
  },
  {
    title: 'Huurverhoging',
    snippet:
      'Een voorstel tot huurverhoging moet de verhuurder uiterlijk twee maanden voor de ingangsdatum schriftelijk doen (art. 7:252 BW).',
    ...LOKET,
  },
  {
    title: 'Huurcommissie',
    snippet:
      'Bij geschillen over onder meer de huurprijs, servicekosten, huurverhoging of onderhoudsgebreken kan de huurder in veel gevallen een procedure starten bij de Huurcommissie.',
    ...HUURCOMMISSIE,
  },
];
