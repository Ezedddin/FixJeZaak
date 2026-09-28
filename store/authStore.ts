import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { User } from '@/types';
import { generateId } from '@/utils/id';

interface AuthState {
  hasCompletedOnboarding: boolean;
  isAuthenticated: boolean;
  user: User | null;
  hasHydrated: boolean;
  completeOnboarding: () => void;
  login: (email?: string) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

/** There is no account backend yet: the user lives on this device only. */
function createLocalUser(email?: string): User {
  const name = email ? email.split('@')[0] : 'Gast';
  return {
    id: generateId('user'),
    name,
    initials: name.slice(0, 2).toUpperCase(),
    email: email ?? '',
    createdAt: new Date().toISOString(),
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      isAuthenticated: false,
      user: null,
      hasHydrated: false,
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      login: (email) =>
        set((state) => ({
          isAuthenticated: true,
          hasCompletedOnboarding: true,
          // Keep the existing local user (and its id, which links backend
          // cases) when the same person logs in again on this device.
          user: state.user && (!email || state.user.email === email) ? state.user : createLocalUser(email),
        })),
      logout: () => set({ isAuthenticated: false, user: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'fixjezaak/auth',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
