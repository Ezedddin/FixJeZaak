import { useAuthStore } from '@/store/authStore';
import type {
  Analysis,
  CaseCategory,
  CaseEvent,
  GeneratedLegalDocument,
  LegalCase,
  RecommendedAction,
} from '@/types';
import { generateId } from '@/utils/id';
import { backendClient } from './backendClient';
import { fieldLabelFor, loadCaseType } from './caseTypes';

interface CreateCaseInput {
  category: CaseCategory;
  title: string;
  description: string;
}

function createCase(input: CreateCaseInput): LegalCase {
  const now = new Date().toISOString();
  const event: CaseEvent = {
    id: generateId('evt'),
    type: 'aangemaakt',
    date: now,
    title: 'Zaak aangemaakt',
  };
  return {
    id: generateId('case'),
    title: input.title,
    category: input.category,
    status: 'gathering_info',
    createdAt: now,
    updatedAt: now,
    description: input.description,
    documents: [],
    evidence: [],
    recommendedActions: [],
    timeline: [event],
    nextAction: 'Vertel wat er is gebeurd',
  };
}

/** Creates the matching case in the real backend (agent, rules, approval
 * gate) and links it by id. Best-effort: callers treat `undefined` as "no
 * backend link yet" and retry linking before the next backend call. */
async function linkBackendCase(legalCase: LegalCase): Promise<string | undefined> {
  if (!backendClient.isConfigured) return undefined;
  try {
    const userId = useAuthStore.getState().user?.id ?? 'demo-user';
    const backendCase = await backendClient.createCase(userId, legalCase.category);
    return backendCase.id;
  } catch {
    return undefined;
  }
}

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; message: string };

const BACKEND_UNAVAILABLE =
  'FixJeZaak kan de server op dit moment niet bereiken. Controleer je internetverbinding en probeer het opnieuw.';

interface AnalyzeCaseInput {
  backendCaseId?: string;
  description?: string;
  hasEvidence: boolean;
}

/** Assesses case strength on the backend, grounded in the confirmed facts,
 * the deterministic rules and retrieved knowledge. */
async function analyzeCase(input: AnalyzeCaseInput): Promise<ServiceResult<Analysis>> {
  if (!input.backendCaseId) return { ok: false, message: BACKEND_UNAVAILABLE };
  try {
    const assessment = await backendClient.analyzeCase(input.backendCaseId, {
      description: input.description,
      hasEvidence: input.hasEvidence,
    });
    return {
      ok: true,
      value: {
        id: generateId('analysis'),
        caseId: '',
        createdAt: new Date().toISOString(),
        strength: assessment.strength,
        summary: assessment.summary,
        inFavor: assessment.inFavor,
        potentialIssues: assessment.potentialIssues,
        counterArgument: assessment.counterArgument,
        advice: assessment.advice,
        sources: assessment.sources,
      },
    };
  } catch {
    return {
      ok: false,
      message: 'De analyse van je zaak is niet gelukt. Probeer het over een moment opnieuw.',
    };
  }
}

/** The approaches the app can actually carry out today: drafting the letter
 * that fits the case type, or having one of the juristen look at it. */
function getRecommendedActions(letterTitle: string): RecommendedAction[] {
  return [
    {
      id: generateId('action_brief'),
      type: 'bezwaar',
      title: `${letterTitle} opstellen`,
      description: `FixJeZaak stelt een concept op met de gegevens die jij hebt bevestigd. Jij controleert het en keurt het goed.`,
      recommended: true,
      durationLabel: 'Reactietermijn verschilt per wederpartij',
      requirementsLabel: 'Bevestigde gegevens van je zaak',
      ctaLabel: 'Stel concept op',
    },
    {
      id: generateId('action_jurist'),
      type: 'jurist_meekijken',
      title: 'Jurist laten meekijken',
      description: 'Vraag Hasan of Ezeddin om je zaak te bekijken voordat je verdergaat.',
      recommended: false,
      durationLabel: 'Afhankelijk van beschikbaarheid',
      requirementsLabel: 'Je contactgegevens en je vraag',
      ctaLabel: 'Vraag een jurist',
    },
  ];
}

interface GenerateDocumentInput {
  caseId: string;
  caseType: string;
  subject: string;
  reference?: string;
  /** Confirmed case facts as "Label: waarde" lines, shown under "Gebruikte feiten". */
  facts: string[];
  backendCaseId?: string;
}

/** Drafts the objection through the backend's generate_document tool
 * (rule-validated, refuses on unconfirmed facts). The result is always a
 * draft pending explicit approval. A refusal is explained to the user. */
async function generateLegalDocument(
  input: GenerateDocumentInput,
): Promise<ServiceResult<GeneratedLegalDocument>> {
  if (!input.backendCaseId) return { ok: false, message: BACKEND_UNAVAILABLE };
  const failed = 'Het opstellen van je brief is niet gelukt. Probeer het opnieuw.';

  let result;
  try {
    result = await backendClient.generateLetter(input.backendCaseId);
  } catch {
    return { ok: false, message: failed };
  }

  if (!result.generated) {
    const info = await loadCaseType(input.caseType);
    const label = (key: string) => fieldLabelFor(info, key);
    if (result.reason === 'unconfirmed_fields' && result.fields?.length) {
      return { ok: false, message: `Bevestig eerst deze gegevens: ${result.fields.map(label).join(', ')}.` };
    }
    if (result.reason === 'blocking_rule_errors' && result.ruleFlags?.length) {
      const missing = result.ruleFlags.filter((r) => r.field).map((r) => label(r.field!));
      return {
        ok: false,
        message:
          missing.length > 0
            ? `Er ontbreken nog gegevens: ${missing.join(', ')}. Vul ze aan bij je gegevens.`
            : result.ruleFlags.map((r) => r.message).join(' '),
      };
    }
    return { ok: false, message: failed };
  }

  return {
    ok: true,
    value: {
      id: generateId('gendoc'),
      caseId: input.caseId,
      title: result.title,
      recipient: result.recipient,
      subject: input.subject,
      reference: input.reference,
      paragraphs: result.paragraphs,
      usedFacts: input.facts,
      attachments: [result.title],
      status: 'concept',
      createdAt: new Date().toISOString(),
      backendActionId: result.actionId,
    },
  };
}

interface ApproveDocumentInput {
  backendCaseId?: string;
  backendActionId?: string;
  /** The final text, including any edits the user made in the preview. */
  paragraphs: string[];
}

/** Records the user's explicit approval of the final letter. This is the ONLY
 * call that can move the backend action to "approved" — the agent itself has
 * no tool that can do this. Nothing is sent to the authority. */
async function approveDocument(input: ApproveDocumentInput): Promise<ServiceResult<null>> {
  if (!input.backendCaseId || !input.backendActionId) return { ok: false, message: BACKEND_UNAVAILABLE };
  try {
    await backendClient.approveAction(input.backendCaseId, input.backendActionId, input.paragraphs);
    return { ok: true, value: null };
  } catch {
    return { ok: false, message: 'Goedkeuren is niet gelukt. Probeer het opnieuw.' };
  }
}

export const caseService = {
  createCase,
  linkBackendCase,
  analyzeCase,
  getRecommendedActions,
  generateLegalDocument,
  approveDocument,
};
