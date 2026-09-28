import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LegalDocument } from '@/types';

interface DocumentsState {
  vaultDocuments: LegalDocument[];
  addVaultDocument: (doc: LegalDocument) => void;
}

export const useDocumentsStore = create<DocumentsState>()(
  persist(
    (set) => ({
      vaultDocuments: [],
      addVaultDocument: (doc) =>
        set((state) => ({ vaultDocuments: [doc, ...state.vaultDocuments] })),
    }),
    {
      name: 'fixjezaak/documents',
      storage: createJSONStorage(() => AsyncStorage),
      // v1: drop the demo vault documents that earlier versions shipped with.
      version: 1,
      migrate: (persisted) => {
        const state = persisted as { vaultDocuments?: LegalDocument[] };
        const demoIds = ['doc_huurcontract', 'doc_loonstrook', 'doc_paspoort', 'doc_nda_freelance'];
        return {
          ...state,
          vaultDocuments: (state.vaultDocuments ?? []).filter((d) => !demoIds.includes(d.id)),
        } as DocumentsState;
      },
    },
  ),
);
