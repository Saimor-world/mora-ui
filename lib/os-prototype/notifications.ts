'use client';
import { create } from 'zustand';
import { toast } from 'sonner';

/**
 * Minimal notification service for the OS prototype.
 * One bus for all features: surfaces call `notify()`, the shell renders the tray.
 * Ephemeral by design (session memory only) — CORE remains the source of truth
 * for anything that must survive a reload.
 */
export type OsNotificationTone = 'info' | 'safe' | 'warning' | 'critical' | 'ai';

export interface OsNotification {
  id: string;
  title: string;
  body?: string;
  tone: OsNotificationTone;
  source: string; // feature id
  createdAt: number;
  read: boolean;
}

interface NotificationState {
  items: OsNotification[];
  push(n: Omit<OsNotification, 'id' | 'createdAt' | 'read'>): OsNotification;
  markAllRead(): void;
  clear(): void;
}

let counter = 0;

export const useOsNotifications = create<NotificationState>((set) => ({
  items: [],
  push: (n) => {
    const item: OsNotification = { ...n, id: `osn-${Date.now()}-${counter++}`, createdAt: Date.now(), read: false };
    set((s) => ({ items: [item, ...s.items].slice(0, 50) }));
    return item;
  },
  markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
  clear: () => set({ items: [] }),
}));

export function notify(n: Omit<OsNotification, 'id' | 'createdAt' | 'read'>, options: { toast?: boolean } = {}) {
  const item = useOsNotifications.getState().push(n);
  if (options.toast) {
    const fn = n.tone === 'critical' ? toast.error : n.tone === 'warning' ? toast.warning : toast;
    fn(n.title, n.body ? { description: n.body } : undefined);
  }
  return item;
}
