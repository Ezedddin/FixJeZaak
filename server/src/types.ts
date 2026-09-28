/** Where a piece of information came from — always kept alongside the value
 * itself so the agent (and the UI) can distinguish fact from inference. */
export type FactSource = 'document' | 'user_provided' | 'ai_inference' | 'external_knowledge';

export type ConfidenceTier = 'high' | 'medium' | 'low';

export function tierFor(confidence: number): ConfidenceTier {
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

/** A single extracted/known fact, with provenance. This is the atomic unit
 * that flows from document extraction into Case.facts. */
export interface CaseFact {
  value: string | number;
  source: FactSource;
  confidence?: number; // only meaningful when source === 'document' or 'ai_inference'
  tier?: ConfidenceTier;
  needsConfirmation: boolean;
  documentId?: string;
}

export type CaseFacts = Record<string, CaseFact>;

export type CaseStatus =
  | 'collecting_info'
  | 'analyzing'
  | 'needs_user_input'
  | 'ready_for_action'
  | 'awaiting_approval'
  | 'approved'
  | 'closed';

export interface RuleResult {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

export interface KnowledgeResult {
  title: string;
  snippet: string;
  sourceUrl: string;
  sourceName: string;
}
