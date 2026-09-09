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
  /**
   * Ephemeral identity epoch. It changes whenever the authenticated principal changes
   * or the session is explicitly reset, so in-flight reads from an older session can
   * never be committed into the new one.
   */
  sessionGeneration: number;

  setUser(user: User | null): void;
  patchOperationalSession(patch: OperationalSessionPatch): void;
  updateUserSettings(settings: Record<string, unknown>): void;
  setHasBooted(booted: boolean): void;
  setIsLoggingOut(v: boolean): void;
  resetStore(): void;
}

function principalKey(user: User | null): string {
  if (!user) return 'anonymous';
  return `${user.tenant_id ?? 'tenant-unknown'}:${user.id}`;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  permissions: ROLE_PERMISSIONS.demo,
  hasBooted: false,
  isLoggingOut: false,
  sessionGeneration: 0,

  setUser: (user) => {
    const previousUser = get().user;
    const principalChanged = principalKey(previousUser) !== principalKey(user);

    if (user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mora_session', 'active');
        localStorage.setItem('last_user_name', user.name);
      }
      set((state) => ({
        user,
        permissions: getPermissions(user.role),
        sessionGeneration: principalChanged ? state.sessionGeneration + 1 : state.sessionGeneration,
      }));
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mora_session');
        localStorage.removeItem('last_user_name');
      }
      set((state) => ({
        user: null,
        permissions: ROLE_PERMISSIONS.demo,
        sessionGeneration: principalChanged ? state.sessionGeneration + 1 : state.sessionGeneration,
      }));
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
    set((state) => ({
      user: null,
      permissions: ROLE_PERMISSIONS.demo,
      hasBooted: false,
      isLoggingOut: false,
      sessionGeneration: state.sessionGeneration + 1,
    })),
}));
