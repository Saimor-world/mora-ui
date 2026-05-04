// lib/store/orbStore.ts
// Real-time orb awareness state.
// MindLoop subscription is the only legitimate async here.
// QueryCache event bridge is wired externally in lib/queryClient.tsx.

import { create } from 'zustand';
import type { OrbState as OrbStateValue } from '@/lib/api/awarenessClient';

interface OrbStoreState {
  orbState: OrbStateValue;
  speculativeState: OrbStateValue | undefined;
  speculativeUntil: number | undefined;
  lastAnswerSource: 'memory' | 'context' | 'inference' | null;
  lastAnswerSourceMode: string | null;
  lastAnswerScopeLabel: string | null;

  hasProactiveAlert: boolean;

  setOrbState(state: OrbStateValue): void;
  setSpeculativeState(state: OrbStateValue, ttlMs?: number): void;
  clearSpeculativeState(): void;
  setAnswerProvenance(
    source: 'memory' | 'context' | 'inference' | null,
    mode: string | null,
    label: string | null,
  ): void;
  setProactiveAlert(val: boolean): void;
  initializeMindLoop(): void;
}

// Module-level guard — prevents duplicate MindLoop subscriptions if
// multiple components call initializeMindLoop() on mount.
let mindLoopInitialized = false;

export const useOrbStore = create<OrbStoreState>((set, get) => ({
  orbState: 'idle',
  speculativeState: undefined,
  speculativeUntil: undefined,
  lastAnswerSource: null,
  lastAnswerSourceMode: null,
  lastAnswerScopeLabel: null,
  hasProactiveAlert: false,

  setOrbState: (state) => {
    const { speculativeState, speculativeUntil } = get();
    const now = Date.now();
    // PollGuard: don't overwrite speculative state during its window
    if (speculativeState && speculativeUntil && speculativeUntil > now) return;
    set({ orbState: state });
  },

  setSpeculativeState: (state, ttlMs = 1200) =>
    set({
      speculativeState: state,
      speculativeUntil: Date.now() + ttlMs,
      orbState: state,
    }),

  clearSpeculativeState: () =>
    set({ speculativeState: undefined, speculativeUntil: undefined }),

  setAnswerProvenance: (source, mode, label) =>
    set({ lastAnswerSource: source, lastAnswerSourceMode: mode, lastAnswerScopeLabel: label }),

  setProactiveAlert: (val) => set({ hasProactiveAlert: val }),

  initializeMindLoop: () => {
    if (mindLoopInitialized) return;
    mindLoopInitialized = true;
    // Lazy dynamic import keeps initialization one-way without the deprecated require path.
    void import('@/lib/intelligence/mindLoop').then(({ mindLoop }) => {
      mindLoop.subscribe((level: OrbStateValue) => {
        get().setOrbState(level);
      });
    });
  },
}));
