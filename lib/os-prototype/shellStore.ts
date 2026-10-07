'use client';
import { create } from 'zustand';

/**
 * UI-only state of the OS prototype shell (no server data, no persistence).
 * Server state lives in React Query hooks inside features/*.
 */
export interface OsShellState {
  activeFeatureId: string;
  moraOpen: boolean;
  paletteOpen: boolean;
  /** Free-text context a surface publishes for MÔRA (e.g. "Finance · Profit Center"). */
  surfaceContext: string | null;
  /** Text handed to MÔRA (e.g. from the command palette); the user still presses send. */
  moraDraft: string | null;
  setMoraDraft(text: string | null): void;
  setActiveFeature(id: string): void;
  setMoraOpen(open: boolean): void;
  toggleMora(): void;
  setPaletteOpen(open: boolean): void;
  setSurfaceContext(context: string | null): void;
}

export const useOsShellStore = create<OsShellState>((set) => ({
  activeFeatureId: 'today',
  moraOpen: false,
  paletteOpen: false,
  surfaceContext: null,
  moraDraft: null,
  setMoraDraft: (text) => set({ moraDraft: text }),
  setActiveFeature: (id) => set({ activeFeatureId: id, surfaceContext: null }),
  setMoraOpen: (open) => set({ moraOpen: open }),
  toggleMora: () => set((s) => ({ moraOpen: !s.moraOpen })),
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  setSurfaceContext: (context) => set({ surfaceContext: context }),
}));
