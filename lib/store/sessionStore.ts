// lib/store/sessionStore.ts
// Ephemeral session state. Populated from useUserProfile query via useEffect.
// Zero async actions.

import { create } from 'zustand';
import type { User, Permissions, OperationalSessionPatch } from '@/lib/types/mora';
import { ROLE_PERMISSIONS, getPermissions } from '@/lib/types/mora';

interface SessionState {
  user: User | null;
  permissions: Permissions;
  hasBooted: boolean;
  isLoggingOut: boolean;

  setUser(user: User | null): void;
  patchOperationalSession(patch: OperationalSessionPatch): void;
  updateUserSettings(settings: Record<string, unknown>): void;
  setHasBooted(booted: boolean): void;
  setIsLoggingOut(v: boolean): void;
  resetStore(): void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  permissions: ROLE_PERMISSIONS.demo,
  hasBooted: false,
  isLoggingOut: false,

  setUser: (user) => {
    if (user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mora_session', 'active');
        localStorage.setItem('last_user_name', user.name);
      }
      set({ user, permissions: getPermissions(user.role) });
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mora_session');
        localStorage.removeItem('last_user_name');
      }
      set({ user: null, permissions: ROLE_PERMISSIONS.demo });
    }
  },

  patchOperationalSession: (patch) =>
    set((state) =>
      state.user ? { user: { ...state.user, ...patch } } : state
    ),

  updateUserSettings: (settings) =>
    set((state) =>
      state.user
        ? { user: { ...state.user, settings: { ...(state.user.settings ?? {}), ...settings } } }
        : state
    ),

  setHasBooted: (booted) => set({ hasBooted: booted }),
  setIsLoggingOut: (v) => set({ isLoggingOut: v }),

  resetStore: () =>
    set({ user: null, permissions: ROLE_PERMISSIONS.demo, hasBooted: false, isLoggingOut: false }),
}));
