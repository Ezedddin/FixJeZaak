export type CaseStrength = 'sterk' | 'redelijk' | 'zwak' | 'onvoldoende_informatie';

export interface Analysis {
  id: string;
  caseId: string;
  strength: CaseStrength;
  summary: string;
  inFavor: string[];
  potentialIssues: string[];
  counterArgument: string;
  advice: string;
  /** Knowledge sources the backend grounded this assessment in. */
  sources?: Array<{ title: string; snippet: string; sourceUrl: string; sourceName: string }>;
  createdAt: string;
}

export type ArgumentStrength = 'sterk' | 'gemiddeld' | 'zwak';

export interface LegalArgument {
  id: string;
  title: string;
  explanation: string;
  strength: ArgumentStrength;
}

export type RecommendedActionType =
  | 'bezwaar'
  | 'informatie_opvragen'
  | 'zelf_contact'
  | 'jurist_meekijken';

export interface RecommendedAction {
  id: string;
  type: RecommendedActionType;
  title: string;
  description: string;
  recommended: boolean;
  durationLabel: string;
  requirementsLabel: string;
  ctaLabel: string;
}

