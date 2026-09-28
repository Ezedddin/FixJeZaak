/**
 * Client for the FixJeZaak backend (server/) — the real agent architecture:
 * document understanding, structured extraction, deterministic rules,
 * knowledge retrieval, and a tool-using Claude agent with a human-approval
 * gate. All AI calls go through here — the app holds no API key of its own.
 *
 * Calls throw when the backend is missing or unreachable; callers catch that
 * and tell the user, never substitute made-up data.
 */

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const isBackendConfigured = Boolean(BACKEND_URL);

export type BackendCaseType = 'boete' | string;

export interface BackendCaseFact {
  value: string | number;
  source: 'document' | 'user_provided' | 'ai_inference' | 'external_knowledge';
  confidence?: number;
  tier?: 'high' | 'medium' | 'low';
  needsConfirmation: boolean;
  documentId?: string;
}

export type BackendCaseFacts = Record<string, BackendCaseFact>;

export interface BackendAction {
  id: string;
  caseId: string;
  type: string;
  status: string;
  payload: {
    recipient?: string;
    paragraphs?: string[];
    usedFacts?: string[];
    usedKnowledge?: Array<{ title: string; sourceUrl: string }>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BackendDocument {
  id: string;
  caseId: string;
  filename: string;
  mimeType: string;
  extracted?: unknown;
}

export interface BackendCase {
  id: string;
  userId: string;
  caseType: string;
  status: string;
  facts?: BackendCaseFacts | null;
  ruleFlags?: unknown;
  documents?: BackendDocument[];
  actions?: BackendAction[];
}

class BackendUnavailableError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BACKEND_URL) throw new BackendUnavailableError('EXPO_PUBLIC_BACKEND_URL ontbreekt.');

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers:
        init?.body && !(init.body instanceof FormData)
          ? { 'content-type': 'application/json', ...init.headers }
          : init?.headers,
    });
  } catch (error) {
    throw new BackendUnavailableError(`Backend niet bereikbaar: ${(error as Error).message}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Backend-fout (${response.status}): ${text.slice(0, 300)}`);
  }
  return (await response.json()) as T;
}

async function createCase(userId: string, caseType: BackendCaseType): Promise<BackendCase> {
  const result = await request<{ case: BackendCase } | BackendCase>('/cases', {
    method: 'POST',
    body: JSON.stringify({ userId, caseType }),
  });
  return 'case' in result ? result.case : result;
}

async function getCase(caseId: string): Promise<BackendCase> {
  const result = await request<{ case: BackendCase } | BackendCase>(`/cases/${caseId}`);
  return 'case' in result ? result.case : result;
}

interface SendMessageResult {
  reply: string;
  case: BackendCase;
}

async function sendMessage(caseId: string, message: string): Promise<SendMessageResult> {
  return request<SendMessageResult>(`/cases/${caseId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

interface UploadableFile {
  base64: string;
  mimeType: string;
  filename: string;
}

interface UploadDocumentResult {
  document: BackendDocument;
  analysis?: { readable: boolean; documentType: string; notes: string } | null;
  extraction?: {
    extracted?: Record<string, unknown>;
    mergedFacts?: BackendCaseFacts;
    fieldsNeedingConfirmation?: string[];
    lowConfidenceFieldsNotYetTrusted?: string[];
    error?: string;
  };
  reply?: string;
  case?: BackendCase;
  warning?: string;
}

/** Converts a base64 payload (already read from disk by the caller) into a
 * Blob so it can go into multipart FormData — RN's fetch supports data URIs
 * for this without any native module. */
async function uploadDocument(caseId: string, file: UploadableFile): Promise<UploadDocumentResult> {
  const blob = await (await fetch(`data:${file.mimeType};base64,${file.base64}`)).blob();
  const form = new FormData();
  form.append('file', blob, file.filename);
  return request<UploadDocumentResult>(`/cases/${caseId}/documents`, {
    method: 'POST',
    body: form,
  });
}

async function confirmFacts(
  caseId: string,
  facts: Record<string, string | number>,
): Promise<{ facts: BackendCaseFacts; ruleFlags: BackendRuleResult[] }> {
  return request(`/cases/${caseId}/facts/confirm`, {
    method: 'POST',
    body: JSON.stringify({ facts }),
  });
}

export interface BackendRuleResult {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

export interface BackendAssessment {
  strength: 'sterk' | 'redelijk' | 'zwak' | 'onvoldoende_informatie';
  summary: string;
  inFavor: string[];
  potentialIssues: string[];
  counterArgument: string;
  advice: string;
  ruleFlags: BackendRuleResult[];
  sources: Array<{ title: string; snippet: string; sourceUrl: string; sourceName: string }>;
}

async function analyzeCase(
  caseId: string,
  input: { description?: string; hasEvidence: boolean },
): Promise<BackendAssessment> {
  return request(`/cases/${caseId}/analysis`, { method: 'POST', body: JSON.stringify(input) });
}

export type BackendLetterResult =
  | { generated: true; actionId: string; title: string; recipient: string; paragraphs: string[] }
  | { generated: false; reason: string; fields?: string[]; ruleFlags?: BackendRuleResult[] };

async function generateLetter(caseId: string): Promise<BackendLetterResult> {
  return request(`/cases/${caseId}/letter`, { method: 'POST' });
}

export interface CaseTypeInfo {
  id: string;
  label: string;
  documentHint: string;
  fields: Array<{ key: string; label: string; kind: 'text' | 'number' | 'date' }>;
  requiredFields: string[];
  recipientField: string;
  referenceField: string | null;
  deadlineField: string | null;
  letterTitle: string;
}

async function getCaseType(caseType: string): Promise<CaseTypeInfo> {
  return request(`/case-types/${caseType}`);
}

async function classifyIntake(text: string): Promise<{ category: string; title: string }> {
  return request('/intake/classify', { method: 'POST', body: JSON.stringify({ text }) });
}

export interface BackendProfessional {
  id: string;
  name: string;
  initials: string;
  role: string;
}

async function listProfessionals(): Promise<BackendProfessional[]> {
  return request('/professionals');
}

export interface BookingRequest {
  userId: string;
  professionalId: string;
  option: '15min' | '30min' | 'volledige_review';
  name: string;
  email: string;
  phone?: string;
  question: string;
}

async function createBooking(booking: BookingRequest): Promise<{ id: string; status: string }> {
  return request('/bookings', { method: 'POST', body: JSON.stringify(booking) });
}

export type BackendContractAnalysis =
  | { readable: false; reason: string }
  | {
      readable: true;
      summary: string;
      clauses: Array<{
        title: string;
        risk: 'hoog' | 'gemiddeld' | 'laag';
        explanation: string;
        suggestion?: string | null;
      }>;
    };

async function analyzeContract(file: UploadableFile): Promise<BackendContractAnalysis> {
  const blob = await (await fetch(`data:${file.mimeType};base64,${file.base64}`)).blob();
  const form = new FormData();
  form.append('file', blob, file.filename);
  return request('/tools/contract-analysis', { method: 'POST', body: form });
}

export interface ContractDraftInput {
  contractType: string;
  ownName: string;
  counterparty: string;
  startDate: string;
  description: string;
}

async function draftContract(input: ContractDraftInput): Promise<{ title: string; paragraphs: string[] }> {
  return request('/tools/contract-draft', { method: 'POST', body: JSON.stringify(input) });
}

export interface ConversationScenario {
  situation: string;
  counterpartyRole: string;
}

async function conversationPrep(
  scenario: ConversationScenario,
): Promise<{ sections: Array<{ title: string; items: string[] }> }> {
  return request('/tools/conversation-prep', { method: 'POST', body: JSON.stringify(scenario) });
}

async function roleplayTurn(
  scenario: ConversationScenario,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<{ reply: string }> {
  return request('/tools/roleplay', { method: 'POST', body: JSON.stringify({ ...scenario, messages }) });
}

async function approveAction(
  caseId: string,
  actionId: string,
  paragraphs?: string[],
): Promise<{ action: BackendAction }> {
  return request(`/cases/${caseId}/actions/${actionId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ paragraphs }),
  });
}

async function rejectAction(caseId: string, actionId: string): Promise<{ action: BackendAction }> {
  return request(`/cases/${caseId}/actions/${actionId}/reject`, { method: 'POST' });
}

export const backendClient = {
  isConfigured: isBackendConfigured,
  createCase,
  getCase,
  sendMessage,
  uploadDocument,
  confirmFacts,
  analyzeCase,
  generateLetter,
  getCaseType,
  classifyIntake,
  listProfessionals,
  createBooking,
  analyzeContract,
  draftContract,
  conversationPrep,
  roleplayTurn,
  approveAction,
  rejectAction,
};
