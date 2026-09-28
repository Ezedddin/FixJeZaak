import type {
  DocumentSource,
  DocumentVaultCategory,
  ExtractedField,
  LegalDocument,
} from '@/types';
import { generateId } from '@/utils/id';
import { backendClient, type BackendCaseFacts } from './backendClient';

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

const DOCUMENT_FIELD_LABELS: Record<string, string> = {
  authority: 'Instantie',
  offence: 'Overtreding',
  date: 'Datum',
  location: 'Locatie',
  measured_speed: 'Gemeten snelheid',
  allowed_speed: 'Toegestane snelheid',
  corrected_speed: 'Gecorrigeerde snelheid',
  fine_amount: 'Bedrag',
  reference_number: 'Kenmerk',
  objection_deadline: 'Deadline bezwaar',
};

/** Builds the review list: trusted facts plus the low-confidence fields the
 * backend withheld from the case. Those are shown too (flagged) so the user
 * can confirm or correct them — confirming is what makes them trusted. */
export function fieldLabel(key: string): string {
  return DOCUMENT_FIELD_LABELS[key] ?? key;
}

function toExtractedFields(
  facts: BackendCaseFacts,
  extracted: Record<string, unknown> = {},
  lowConfidenceKeys: string[] = [],
): ExtractedField[] {
  const trusted = Object.entries(facts).map(([key, fact]) => ({
    key,
    label: DOCUMENT_FIELD_LABELS[key] ?? key,
    value: String(fact.value),
    editable: true,
    needsConfirmation: fact.needsConfirmation,
  }));
  const withheld = lowConfidenceKeys
    .filter((key) => !(key in facts) && extracted[key] !== null && extracted[key] !== undefined)
    .map((key) => ({
      key,
      label: DOCUMENT_FIELD_LABELS[key] ?? key,
      value: String(extracted[key]),
      editable: true,
      needsConfirmation: true,
    }));
  return [...trusted, ...withheld];
}

/**
 * Reads a photographed/scanned document through the backend pipeline:
 * analyze_document (readability) → extract_case_information (confidence-tiered
 * facts) → deterministic rules. There is no fallback data — an unreadable
 * document or unreachable backend is reported to the user as such.
 */
async function analyzeDocumentImage(
  input: DocumentImageInput,
  backendCaseId: string | undefined,
): Promise<DocumentAnalysisOutcome> {
  if (!backendCaseId) return { ok: false, reason: 'unavailable', message: UNAVAILABLE_MESSAGE };

  let result;
  try {
    result = await backendClient.uploadDocument(backendCaseId, {
      base64: input.base64,
      mimeType: input.mediaType,
      filename: input.filename ?? `document.${input.mediaType === 'application/pdf' ? 'pdf' : 'jpg'}`,
    });
  } catch {
    return { ok: false, reason: 'unavailable', message: UNAVAILABLE_MESSAGE };
  }

  if (!result.analysis) return { ok: false, reason: 'unavailable', message: UNAVAILABLE_MESSAGE };
  if (!result.analysis.readable || !result.extraction?.mergedFacts) {
    return { ok: false, reason: 'unreadable', message: UNREADABLE_MESSAGE };
  }

  const fields = toExtractedFields(
    result.extraction.mergedFacts,
    result.extraction.extracted,
    result.extraction.lowConfidenceFieldsNotYetTrusted,
  );
  if (fields.length === 0) return { ok: false, reason: 'unreadable', message: UNREADABLE_MESSAGE };

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
