export type EvidenceStatus = 'ontbreekt' | 'geupload' | 'overgeslagen';

export interface Evidence {
  id: string;
  caseId: string;
  title: string;
  explanation: string;
  status: EvidenceStatus;
  documentId?: string;
}
