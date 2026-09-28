import { colors } from '@/constants/theme';
import type { CaseStatus, EvidenceStatus, DocumentStatus } from '@/types';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const toneColors: Record<StatusTone, { fg: string; bg: string; border: string }> = {
  success: { fg: colors.success, bg: colors.successBg, border: colors.successBorder },
  warning: { fg: colors.warning, bg: colors.warningBg, border: colors.warningBorder },
  danger: { fg: colors.danger, bg: colors.dangerBg, border: colors.dangerBorder },
  info: { fg: colors.info, bg: colors.infoBg, border: colors.infoBorder },
  neutral: { fg: colors.neutral, bg: colors.neutralBg, border: colors.neutralBorder },
};

const CASE_STATUS_META: Record<CaseStatus, { label: string; tone: StatusTone }> = {
  new: { label: 'Nieuw', tone: 'info' },
  gathering_info: { label: 'Intake bezig', tone: 'info' },
  analysing: { label: 'Analyseren…', tone: 'info' },
  action_required: { label: 'Actie vereist', tone: 'warning' },
  ready_to_submit: { label: 'Klaar om te versturen', tone: 'warning' },
  submitted: { label: 'Verzonden', tone: 'info' },
  waiting_response: { label: 'Wachten op reactie', tone: 'info' },
  response_received: { label: 'Reactie ontvangen', tone: 'warning' },
  resolved: { label: 'Afgerond', tone: 'success' },
};

export function caseStatusMeta(status: CaseStatus): { label: string; tone: StatusTone } {
  return CASE_STATUS_META[status];
}

const CASE_ACTION_LABEL: Record<CaseStatus, string> = {
  new: 'Verder gaan',
  gathering_info: 'Verder gaan',
  analysing: 'Bekijk voortgang',
  action_required: 'Bekijk actie',
  ready_to_submit: 'Bekijk voorstel',
  submitted: 'Bekijk status',
  waiting_response: 'Bekijk status',
  response_received: 'Bekijk reactie',
  resolved: 'Bekijk dossier',
};

export function caseActionLabel(status: CaseStatus): string {
  return CASE_ACTION_LABEL[status];
}

const EVIDENCE_STATUS_META: Record<EvidenceStatus, { label: string; tone: StatusTone }> = {
  ontbreekt: { label: 'Ontbreekt', tone: 'warning' },
  geupload: { label: 'Geüpload', tone: 'success' },
  overgeslagen: { label: 'Overgeslagen', tone: 'neutral' },
};

export function evidenceStatusMeta(status: EvidenceStatus): { label: string; tone: StatusTone } {
  return EVIDENCE_STATUS_META[status];
}

const DOCUMENT_STATUS_META: Record<DocumentStatus, { label: string; tone: StatusTone }> = {
  uploading: { label: 'Uploaden…', tone: 'info' },
  analyzing: { label: 'Analyseren…', tone: 'info' },
  analyzed: { label: 'Geanalyseerd', tone: 'success' },
  error: { label: 'Mislukt', tone: 'danger' },
  klaar: { label: 'Klaar', tone: 'neutral' },
};

export function documentStatusMeta(status: DocumentStatus): { label: string; tone: StatusTone } {
  return DOCUMENT_STATUS_META[status];
}
