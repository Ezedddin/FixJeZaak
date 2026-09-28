import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  Analysis,
  CaseCategory,
  ChatMessage,
  EvidenceStatus,
  ExtractedField,
  GeneratedLegalDocument,
  LegalDocument,
  RecommendedAction,
} from '@/types';

interface IntakeState {
  category: CaseCategory | null;
  title: string;
  description: string;
  chatMessages: ChatMessage[];
  answeredStepIds: string[];
  uploadedDocument: LegalDocument | null;
  extractedFields: ExtractedField[];
  evidenceStatus: EvidenceStatus;
  analysis: Analysis | null;
  recommendedActions: RecommendedAction[];
  selectedActionId: string | null;
  generatedDocument: GeneratedLegalDocument | null;
  caseId: string | null;

  startIntake: (input: { category: CaseCategory; title: string; description: string }) => void;
  addChatMessage: (message: ChatMessage) => void;
  markStepAnswered: (stepId: string) => void;
  setUploadedDocument: (doc: LegalDocument | null) => void;
  setExtractedFields: (fields: ExtractedField[]) => void;
  updateExtractedField: (key: string, value: string) => void;
  setEvidenceStatus: (status: EvidenceStatus) => void;
  setAnalysis: (analysis: Analysis) => void;
  setRecommendedActions: (actions: RecommendedAction[]) => void;
  selectAction: (actionId: string) => void;
  setGeneratedDocument: (doc: GeneratedLegalDocument) => void;
  setCaseId: (id: string) => void;
  reset: () => void;
}

const initialState = {
  category: null as CaseCategory | null,
  title: '',
  description: '',
  chatMessages: [] as ChatMessage[],
  answeredStepIds: [] as string[],
  uploadedDocument: null as LegalDocument | null,
  extractedFields: [] as ExtractedField[],
  evidenceStatus: 'ontbreekt' as EvidenceStatus,
  analysis: null as Analysis | null,
  recommendedActions: [] as RecommendedAction[],
  selectedActionId: null as string | null,
  generatedDocument: null as GeneratedLegalDocument | null,
  caseId: null as string | null,
};

export const useIntakeStore = create<IntakeState>()(
  persist(
    (set) => ({
      ...initialState,

      startIntake: ({ category, title, description }) =>
        set({ ...initialState, category, title, description }),

      addChatMessage: (message) =>
        set((state) => ({ chatMessages: [...state.chatMessages, message] })),

      markStepAnswered: (stepId) =>
        set((state) => ({ answeredStepIds: [...state.answeredStepIds, stepId] })),

      setUploadedDocument: (doc) => set({ uploadedDocument: doc }),

      setExtractedFields: (fields) => set({ extractedFields: fields }),

      updateExtractedField: (key, value) =>
        set((state) => ({
          extractedFields: state.extractedFields.map((field) =>
            field.key === key ? { ...field, value } : field,
          ),
        })),

      setEvidenceStatus: (status) => set({ evidenceStatus: status }),

      setAnalysis: (analysis) => set({ analysis }),

      setRecommendedActions: (actions) => set({ recommendedActions: actions }),

      selectAction: (actionId) => set({ selectedActionId: actionId }),

      setGeneratedDocument: (doc) => set({ generatedDocument: doc }),

      setCaseId: (id) => set({ caseId: id }),

      reset: () => set({ ...initialState }),
    }),
    {
      name: 'fixjezaak/intake',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
