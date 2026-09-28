import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  Analysis,
  CaseEvent,
  CaseStatus,
  Evidence,
  GeneratedLegalDocument,
  LegalCase,
  LegalDocument,
  RecommendedAction,
} from '@/types';
import { generateId } from '@/utils/id';

interface CasesState {
  cases: LegalCase[];
  addCase: (legalCase: LegalCase) => void;
  patchCase: (id: string, patch: Partial<LegalCase>) => void;
  addTimelineEvent: (id: string, event: Omit<CaseEvent, 'id'>) => void;
  addDocument: (id: string, doc: LegalDocument) => void;
  updateDocument: (caseId: string, docId: string, patch: Partial<LegalDocument>) => void;
  upsertEvidence: (caseId: string, evidence: Evidence) => void;
  setAnalysis: (caseId: string, analysis: Analysis) => void;
  setRecommendedActions: (caseId: string, actions: RecommendedAction[]) => void;
  selectAction: (caseId: string, actionId: string) => void;
  setGeneratedDocument: (caseId: string, doc: GeneratedLegalDocument) => void;
  approveGeneratedDocument: (caseId: string) => void;
  setStatus: (caseId: string, status: CaseStatus, nextAction?: string) => void;
  submitCase: (caseId: string) => void;
}

const DEMO_CASE_IDS = [
  'case_parkeerboete_amsterdam',
  'case_arbeidsovereenkomst',
  'case_ontslag_werkgever',
  'case_garantie_laptop',
  'case_parkeerboete_utrecht',
  'case_parkeerboete_denhaag',
];

function touch(legalCase: LegalCase): LegalCase {
  return { ...legalCase, updatedAt: new Date().toISOString() };
}

export const useCasesStore = create<CasesState>()(
  persist(
    (set) => ({
      cases: [],

      addCase: (legalCase) => set((state) => ({ cases: [legalCase, ...state.cases] })),

      patchCase: (id, patch) =>
        set((state) => ({
          cases: state.cases.map((c) => (c.id === id ? touch({ ...c, ...patch }) : c)),
        })),

      addTimelineEvent: (id, event) =>
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === id
              ? touch({ ...c, timeline: [...c.timeline, { ...event, id: generateId('evt') }] })
              : c,
          ),
        })),

      addDocument: (id, doc) =>
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === id ? touch({ ...c, documents: [...c.documents, doc] }) : c,
          ),
        })),

      updateDocument: (caseId, docId, patch) =>
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? touch({
                  ...c,
                  documents: c.documents.map((d) => (d.id === docId ? { ...d, ...patch } : d)),
                })
              : c,
          ),
        })),

      upsertEvidence: (caseId, evidence) =>
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id !== caseId) return c;
            const exists = c.evidence.some((e) => e.id === evidence.id);
            return touch({
              ...c,
              evidence: exists
                ? c.evidence.map((e) => (e.id === evidence.id ? evidence : e))
                : [...c.evidence, evidence],
            });
          }),
        })),

      setAnalysis: (caseId, analysis) =>
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId ? touch({ ...c, analysis: { ...analysis, caseId } }) : c,
          ),
        })),

      setRecommendedActions: (caseId, actions) =>
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId ? touch({ ...c, recommendedActions: actions }) : c,
          ),
        })),

      selectAction: (caseId, actionId) =>
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId ? touch({ ...c, selectedActionId: actionId }) : c,
          ),
        })),

      setGeneratedDocument: (caseId, doc) =>
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId ? touch({ ...c, generatedDocument: doc, status: 'ready_to_submit' }) : c,
          ),
        })),

      approveGeneratedDocument: (caseId) =>
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId && c.generatedDocument
              ? touch({
                  ...c,
                  status: 'action_required',
                  generatedDocument: { ...c.generatedDocument, status: 'goedgekeurd' },
                  timeline: [
                    ...c.timeline,
                    {
                      id: generateId('evt'),
                      type: 'notitie',
                      date: new Date().toISOString(),
                      title: `${c.generatedDocument.title} goedgekeurd`,
                    },
                  ],
                  nextAction: `Verstuur je brief naar ${c.generatedDocument.recipient}`,
                })
              : c,
          ),
        })),

      setStatus: (caseId, status, nextAction) =>
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId ? touch({ ...c, status, nextAction: nextAction ?? c.nextAction }) : c,
          ),
        })),

      submitCase: (caseId) =>
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id !== caseId) return c;
            const now = new Date().toISOString();
            return touch({
              ...c,
              status: 'waiting_response',
              generatedDocument: c.generatedDocument
                ? { ...c.generatedDocument, status: 'verzonden' }
                : c.generatedDocument,
              timeline: [
                ...c.timeline,
                { id: generateId('evt'), type: 'verzonden', date: now, title: 'Brief verstuurd' },
                { id: generateId('evt'), type: 'notitie', date: now, title: 'Wachten op reactie' },
              ],
              nextAction: 'Wacht op de reactie van de instantie',
            });
          }),
        })),

    }),
    {
      name: 'fixjezaak/cases',
      storage: createJSONStorage(() => AsyncStorage),
      // v1: the store no longer ships with demo cases — drop them from
      // devices that persisted them, keep everything the user created.
      version: 1,
      migrate: (persisted) => {
        const state = persisted as { cases?: LegalCase[] };
        return {
          ...state,
          cases: (state.cases ?? []).filter((c) => !DEMO_CASE_IDS.includes(c.id)),
        } as CasesState;
      },
    },
  ),
);

export function selectCaseById(cases: LegalCase[], id: string | undefined): LegalCase | undefined {
  if (!id) return undefined;
  return cases.find((c) => c.id === id);
}
