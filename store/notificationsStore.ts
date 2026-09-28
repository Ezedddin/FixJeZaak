import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AppNotification } from '@/types';

interface NotificationsState {
  notifications: AppNotification[];
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      notifications: [],
      addNotification: (notification) =>
        set((state) => ({ notifications: [notification, ...state.notifications] })),
      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      markAllAsRead: () =>
        set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, read: true })) })),
    }),
    {
      name: 'fixjezaak/notifications',
      storage: createJSONStorage(() => AsyncStorage),
      // v1: drop the demo notifications that earlier versions shipped with.
      version: 1,
      migrate: (persisted) => {
        const state = persisted as { notifications?: AppNotification[] };
        return {
          ...state,
          notifications: (state.notifications ?? []).filter((n) => !/^notif_\d+$/.test(n.id)),
        } as NotificationsState;
      },
    },
  ),
);

export function unreadCount(notifications: AppNotification[]): number {
  return notifications.filter((n) => !n.read).length;
}
