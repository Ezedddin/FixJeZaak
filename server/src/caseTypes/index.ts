import type { ActionType } from '../agent/actions.js';

export type FieldKind = 'text' | 'number' | 'date';

export interface CaseFieldDef {
  key: string;
  label: string;
  kind: FieldKind;
}

/**
 * Everything that differs between case types lives here: which facts we
 * extract, which are required, who the letter goes to and what kind of letter
 * it is. Extraction, rules, summaries, letter generation and the app's review
 * screen all read from this one registry.
 */
export interface CaseTypeConfig {
  id: string;
  label: string;
  /** Shown on the upload screen: which document the user should add. */
  documentHint: string;
  /** Tells the extraction model what kind of document to expect. */
  documentDescription: string;
  fields: CaseFieldDef[];
  requiredFields: string[];
  /** Fact holding the letter's addressee. */
  recipientField: string;
  /** Fact holding the counterparty's reference/kenmerk, if any. */
  referenceField?: string;
  /** Fact holding a deadline the user must act before, if any. */
  deadlineField?: string;
  letter: {
    title: string;
    actionType: ActionType;
    instructions: string;
  };
}

const text = (key: string, label: string): CaseFieldDef => ({ key, label, kind: 'text' });
const number = (key: string, label: string): CaseFieldDef => ({ key, label, kind: 'number' });
const date = (key: string, label: string): CaseFieldDef => ({ key, label, kind: 'date' });

export const CASE_TYPES: Record<string, CaseTypeConfig> = {
  boete: {
    id: 'boete',
    label: 'Boete',
    documentHint: 'Upload de beschikking of brief van je boete.',
    documentDescription: 'een Nederlandse verkeers- of parkeerboete (beschikking of naheffingsaanslag)',
    fields: [
      text('authority', 'Instantie'),
      text('offence', 'Overtreding'),
      date('date', 'Datum'),
      text('location', 'Locatie'),
      number('measured_speed', 'Gemeten snelheid'),
      number('allowed_speed', 'Toegestane snelheid'),
      number('corrected_speed', 'Gecorrigeerde snelheid'),
      number('fine_amount', 'Bedrag'),
      text('reference_number', 'Kenmerk'),
      date('objection_deadline', 'Deadline bezwaar'),
    ],
    requiredFields: ['authority', 'offence', 'fine_amount', 'reference_number'],
    recipientField: 'authority',
    referenceField: 'reference_number',
    deadlineField: 'objection_deadline',
    letter: {
      title: 'Bezwaarschrift',
      actionType: 'prepare_objection',
      instructions: 'Het is een bezwaar (of beroep) tegen de opgelegde boete, met een verzoek om de boete te vernietigen.',
    },
  },
  overheid: {
    id: 'overheid',
    label: 'Overheidsbesluit',
    documentHint: 'Upload de brief met het besluit (bijvoorbeeld van de gemeente, UWV, Belastingdienst of DUO).',
    documentDescription: 'een besluit van een Nederlandse overheidsinstantie (gemeente, UWV, Belastingdienst/Toeslagen, DUO of vergelijkbaar)',
    fields: [
      text('authority', 'Instantie'),
      text('decision_subject', 'Onderwerp besluit'),
      date('decision_date', 'Datum besluit'),
      text('reference_number', 'Kenmerk'),
      number('amount', 'Bedrag'),
      date('objection_deadline', 'Deadline bezwaar'),
      text('issue', 'Waarom ben je het er niet mee eens?'),
    ],
    requiredFields: ['authority', 'decision_subject', 'decision_date', 'issue'],
    recipientField: 'authority',
    referenceField: 'reference_number',
    deadlineField: 'objection_deadline',
    letter: {
      title: 'Bezwaarschrift',
      actionType: 'prepare_objection',
      instructions:
        'Het is een bezwaarschrift tegen het besluit. Noem het besluit (datum, kenmerk, onderwerp) en de redenen waarom de gebruiker het er niet mee eens is, en vraag het besluit te herzien.',
    },
  },
  werk: {
    id: 'werk',
    label: 'Werk',
    documentHint: 'Upload de brief, e-mail of het contract van je werkgever waar het om gaat.',
    documentDescription: 'een brief, e-mail, loonstrook of overeenkomst in een arbeidsrelatie (werkgever en werknemer)',
    fields: [
      text('employer', 'Werkgever'),
      text('issue', 'Waar gaat het om?'),
      date('document_date', 'Datum document'),
      number('amount', 'Bedrag'),
      date('deadline', 'Deadline'),
    ],
    requiredFields: ['employer', 'issue'],
    recipientField: 'employer',
    deadlineField: 'deadline',
    letter: {
      title: 'Brief aan werkgever',
      actionType: 'prepare_letter',
      instructions:
        'Het is een zakelijke brief van de werknemer aan de werkgever. Beschrijf de kwestie, wat de werknemer verwacht of vraagt, en vraag om een schriftelijke reactie binnen een redelijke termijn.',
    },
  },
  wonen: {
    id: 'wonen',
    label: 'Wonen',
    documentHint: 'Upload je huurcontract of de brief van je verhuurder.',
    documentDescription: 'een huurcontract of brief tussen huurder en verhuurder',
    fields: [
      text('landlord', 'Verhuurder'),
      text('rental_address', 'Huuradres'),
      text('issue', 'Waar gaat het om?'),
      number('amount', 'Bedrag'),
      date('document_date', 'Datum document'),
      date('deadline', 'Deadline'),
    ],
    requiredFields: ['landlord', 'issue'],
    recipientField: 'landlord',
    deadlineField: 'deadline',
    letter: {
      title: 'Brief aan verhuurder',
      actionType: 'prepare_letter',
      instructions:
        'Het is een zakelijke brief van de huurder aan de verhuurder. Beschrijf de kwestie, wat de huurder vraagt, en geef een redelijke termijn om te reageren of het probleem op te lossen.',
    },
  },
  aankopen: {
    id: 'aankopen',
    label: 'Aankoop',
    documentHint: 'Upload je bon, factuur of orderbevestiging.',
    documentDescription: 'een aankoopbon, factuur of orderbevestiging van een consumentenaankoop',
    fields: [
      text('seller', 'Verkoper'),
      text('product', 'Product of dienst'),
      date('purchase_date', 'Aankoopdatum'),
      number('amount', 'Aankoopbedrag'),
      text('order_number', 'Ordernummer'),
      text('issue', 'Wat is het probleem?'),
    ],
    requiredFields: ['seller', 'product', 'issue'],
    recipientField: 'seller',
    referenceField: 'order_number',
    letter: {
      title: 'Ingebrekestelling',
      actionType: 'prepare_letter',
      instructions:
        'Het is een ingebrekestelling van de consument aan de verkoper: beschrijf het probleem, vraag om herstel, vervanging of terugbetaling, en geef een redelijke termijn (bijvoorbeeld 14 dagen) om dat te doen.',
    },
  },
  geld: {
    id: 'geld',
    label: 'Geld',
    documentHint: 'Upload de factuur, aanmaning of brief van het incassobureau.',
    documentDescription: 'een factuur, aanmaning of incassobrief',
    fields: [
      text('creditor', 'Schuldeiser of incassobureau'),
      number('amount', 'Hoofdsom'),
      number('collection_costs', 'Incassokosten'),
      date('invoice_date', 'Factuurdatum'),
      text('reference_number', 'Kenmerk'),
      date('deadline', 'Betaaltermijn'),
      text('issue', 'Waarom klopt dit niet?'),
    ],
    requiredFields: ['creditor', 'amount', 'issue'],
    recipientField: 'creditor',
    referenceField: 'reference_number',
    deadlineField: 'deadline',
    letter: {
      title: 'Reactie op vordering',
      actionType: 'prepare_letter',
      instructions:
        'Het is een schriftelijke, gemotiveerde betwisting van (een deel van) de vordering. Vraag om een onderbouwing van de vordering en de kosten, en vraag de incasso op te schorten zolang de betwisting loopt.',
    },
  },
  anders: {
    id: 'anders',
    label: 'Anders',
    documentHint: 'Upload de brief of het document waar het om gaat.',
    documentDescription: 'een brief, e-mail of document in een juridisch geschil',
    fields: [
      text('counterparty', 'Wederpartij'),
      text('issue', 'Waar gaat het om?'),
      date('document_date', 'Datum document'),
      number('amount', 'Bedrag'),
      text('reference_number', 'Kenmerk'),
      date('deadline', 'Deadline'),
    ],
    requiredFields: ['counterparty', 'issue'],
    recipientField: 'counterparty',
    referenceField: 'reference_number',
    deadlineField: 'deadline',
    letter: {
      title: 'Brief',
      actionType: 'prepare_letter',
      instructions:
        'Het is een zakelijke brief van de gebruiker aan de wederpartij. Beschrijf de kwestie feitelijk, zeg wat de gebruiker vraagt, en vraag om een reactie binnen een redelijke termijn.',
    },
  },
};

export function caseTypeConfig(caseType: string): CaseTypeConfig | undefined {
  return CASE_TYPES[caseType];
}

export function fieldLabel(caseType: string, key: string): string {
  return caseTypeConfig(caseType)?.fields.find((f) => f.key === key)?.label ?? key;
}
