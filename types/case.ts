import type { Analysis, RecommendedAction } from './analysis';
import type { Evidence } from './evidence';
import type { GeneratedLegalDocument, LegalDocument } from './document';

export type CaseCategory =
  | 'boete'
  | 'werk'
  | 'contract'
  | 'wonen'
  | 'aankopen'
  | 'geld'
  | 'overheid'
  | 'anders';

/**
 * Case lifecycle. Screens key their UI off this, so keep it a strict
 * linear-ish progression rather than a free-form status string.
 */
export type CaseStatus =
  | 'new'
  | 'gathering_info'
  | 'analysing'
  | 'action_required'
  | 'ready_to_submit'
  | 'submitted'
  | 'waiting_response'
  | 'response_received'
  | 'resolved';

export type CaseOutcome = 'gewonnen' | 'verloren' | 'deels' | 'ingetrokken';

export type CaseEventType =
  | 'aangemaakt'
  | 'document'
  | 'bewijs'
  | 'analyse'
  | 'verzonden'
  | 'reactie'
  | 'afgerond'
  | 'notitie';

export interface CaseEvent {
  id: string;
  type: CaseEventType;
  date: string;
  title: string;
  description?: string;
}

export interface LegalCase {
  id: string;
  title: string;
  category: CaseCategory;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  deadline?: string;
  counterparty?: string;
  description: string;
  amountAtStake?: number;
  amountSaved?: number;
  documents: LegalDocument[];
  evidence: Evidence[];
  analysis?: Analysis;
  recommendedActions: RecommendedAction[];
  selectedActionId?: string;
  generatedDocument?: GeneratedLegalDocument;
  timeline: CaseEvent[];
  nextAction: string;
  outcome?: CaseOutcome;
  /** The other party's reply, as read by the backend. */
  responseAnalysis?: {
    outcome: 'toegewezen' | 'deels_toegewezen' | 'afgewezen' | 'onduidelijk';
    summary: string;
    reasons: string[];
    nextSteps: string[];
    sources?: Array<{ title: string; snippet: string; sourceUrl: string; sourceName: string }>;
  };
  /** Id of the linked case in the FixJeZaak backend (agent, rules, approval
   * gate). Absent until linking succeeded (e.g. the backend was unreachable). */
  backendCaseId?: string;
}
