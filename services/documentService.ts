import type {
  DocumentSource,
  DocumentVaultCategory,
  ExtractedField,
  LegalDocument,
} from '@/types';
import { generateId } from '@/utils/id';
import { backendClient, type BackendCaseFacts, type CaseTypeInfo } from './backendClient';
import { loadCaseType } from './caseTypes';

interface CreateDocumentInput {
  name: string;
  category: DocumentVaultCategory;
  source: DocumentSource;
  caseId?: string;
  mimeType?: string;
  fileSizeLabel?: string;
}

function createDocument(input: CreateDocumentInput): LegalDocument {
  return {
    id: generateId('doc'),
    name: input.name,
    category: input.category,
    source: input.source,
    status: 'analyzing',
    mimeType: input.mimeType ?? 'application/pdf',
    fileSizeLabel: input.fileSizeLabel ?? '—',
    uploadedAt: new Date().toISOString(),
    caseId: input.caseId,
  };
}


interface DocumentImageInput {
  base64: string;
  mediaType: string;
  filename?: string;
}

/** Formats the backend accepts — anything else is rejected before upload. */
export const READABLE_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export type DocumentAnalysisOutcome =
  | { ok: true; documentTitle: string; fields: ExtractedField[] }
  | { ok: false; reason: 'unreadable' | 'unavailable'; message: string };

const UNREADABLE_MESSAGE =
  'We konden je document niet goed lezen. Maak een duidelijkere foto: leg de brief plat neer, zorg voor goed licht en zet alle tekst in beeld.';
const UNAVAILABLE_MESSAGE =
  'Je document kan op dit moment niet worden geanalyseerd. Controleer je internetverbinding en probeer het opnieuw.';

/**
 * Builds the review list for a case type: every field the category uses, in
 * its order. Values come from the backend's trusted facts, then from the
 * low-confidence extraction the backend withheld (flagged, so the user checks
 * them), and "issue" falls back to the user's own description. Anything else
 * stays empty for the user to fill in.
 */
export function buildReviewFields(
  info: CaseTypeInfo,
  options: {
    facts?: BackendCaseFacts;
    extracted?: Record<string, unknown>;
    lowConfidenceKeys?: string[];
    description?: string;
  } = {},
): ExtractedField[] {
  const { facts = {}, extracted = {}, lowConfidenceKeys = [], description } = options;
  return info.fields.map((field) => {
    const fact = facts[field.key];
    if (fact) {
      return { key: field.key, label: field.label, value: String(fact.value), editable: true, needsConfirmation: fact.needsConfirmation };
    }
    const withheld = extracted[field.key];
    if (lowConfidenceKeys.includes(field.key) && withheld !== null && withheld !== undefined) {
      return { key: field.key, label: field.label, value: String(withheld), editable: true, needsConfirmation: true };
    }
    if (field.key === 'issue' && description?.trim()) {
      return { key: field.key, label: field.label, value: description.trim(), editable: true, needsConfirmation: true };
    }
    return { key: field.key, label: field.label, value: '', editable: true };
  });
}

/**
 * Reads a photographed/scanned document through the backend pipeline:
 * analyze_document (readability) → extract_case_information (confidence-tiered
 * facts) → deterministic rules. There is no fallback data — an unreadable
 * document or unreachable backend is reported to the user as such.
 */
async function analyzeDocumentImage(
  input: DocumentImageInput,
  context: { backendCaseId?: string; caseType: string; description?: string },
): Promise<DocumentAnalysisOutcome> {
  const info = await loadCaseType(context.caseType);
  if (!context.backendCaseId || !info) return { ok: false, reason: 'unavailable', message: UNAVAILABLE_MESSAGE };

  let result;
  try {
    result = await backendClient.uploadDocument(context.backendCaseId, {
      base64: input.base64,
      mimeType: input.mediaType,
      filename: input.filename ?? `document.${input.mediaType === 'application/pdf' ? 'pdf' : 'jpg'}`,
    });
  } catch {
    return { ok: false, reason: 'unavailable', message: UNAVAILABLE_MESSAGE };
  }

  if (!result.analysis) return { ok: false, reason: 'unavailable', message: UNAVAILABLE_MESSAGE };
  const extraction = result.extraction;
  if (!result.analysis.readable || !extraction?.mergedFacts) {
    return { ok: false, reason: 'unreadable', message: UNREADABLE_MESSAGE };
  }

  const readAnything = info.fields.some(
    (f) => extraction.mergedFacts![f.key] || (extraction.lowConfidenceFieldsNotYetTrusted ?? []).includes(f.key),
  );
  if (!readAnything) return { ok: false, reason: 'unreadable', message: UNREADABLE_MESSAGE };

  const fields = buildReviewFields(info, {
    facts: extraction.mergedFacts,
    extracted: extraction.extracted,
    lowConfidenceKeys: extraction.lowConfidenceFieldsNotYetTrusted,
    description: context.description,
  });
  return { ok: true, documentTitle: result.analysis.documentType, fields };
}

/** Sends the fields the user reviewed (and possibly edited) to the backend,
 * which marks them confirmed/user-provided and re-runs the rules. Returns
 * false when the backend could not be reached. */
async function confirmExtractedFields(backendCaseId: string, fields: ExtractedField[]): Promise<boolean> {
  try {
    await backendClient.confirmFacts(
      backendCaseId,
      Object.fromEntries(fields.map((field) => [field.key, field.value.trim()])),
    );
    return true;
  } catch {
    return false;
  }
}

export const documentService = {
  createDocument,
  analyzeDocumentImage,
  confirmExtractedFields,
};
