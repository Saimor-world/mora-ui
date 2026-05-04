// lib/store/radarStore.ts
// Ephemeral per-session state for proactive Mora radar notifications.
// No persistence — data is always fresh from the API via useRadar().

import { create } from 'zustand';

export interface RadarNotification {
  id: string;
  signal_type: string;
  title: string;
  body: string;
  tier: 'inform' | 'suggest';
  status: 'pending' | 'seen' | 'dismissed';
  entity_id?: string;
  entity_type?: string;
  created_at: string;
}

interface RadarStoreState {
  notifications: RadarNotification[];
  unreadCount: number;
  setNotifications: (notifications: RadarNotification[], unreadCount: number) => void;
  markSeen: (id: string) => void;
  dismiss: (id: string) => void;
}

export const useRadarStore = create<RadarStoreState>((set) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications, unreadCount) =>
    set({ notifications, unreadCount }),

  markSeen: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, status: 'seen' as const } : n,
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => n.status === 'pending').length,
      };
    }),

  dismiss: (id) =>
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => n.status === 'pending').length,
      };
    }),
}));
