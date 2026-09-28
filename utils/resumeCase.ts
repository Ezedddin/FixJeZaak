import type { LegalCase } from '@/types';

type WizardRoute =
  | '/case/new/upload'
  | '/case/new/document-analysis'
  | '/case/new/missing-evidence'
  | '/case/new/analysis'
  | '/case/new/strategy'
  | '/case/new/document-preview'
  | '/documents/contract-analysis';

/** Where a case that was left halfway should continue, or null when the
 * wizard is done (letter approved or further). */
export function resumeRoute(legalCase: LegalCase): WizardRoute | null {
  const doc = legalCase.generatedDocument;
  if (doc && doc.status !== 'concept') return null;
  if (['submitted', 'waiting_response', 'response_received', 'resolved'].includes(legalCase.status)) return null;

  if (legalCase.category === 'contract') return '/documents/contract-analysis';
  if (doc) return '/case/new/document-preview';
  if (legalCase.recommendedActions.length > 0) return '/case/new/strategy';
  if (legalCase.analysis) return '/case/new/analysis';
  if (legalCase.reviewFields?.length) return '/case/new/missing-evidence';
  if (legalCase.documents.some((d) => d.extractedFields?.length)) return '/case/new/document-analysis';
  return '/case/new/upload';
}
