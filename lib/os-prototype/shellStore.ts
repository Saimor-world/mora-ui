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
  /** V1.4: planet the Universe should focus when it opens (department id). */
  universeFocus: string | null;
  setUniverseFocus(id: string | null): void;
  /** V1.4: query Wissen should start with (e.g. from the palette or a planet). */
  knowledgeQuery: string | null;
  setKnowledgeQuery(q: string | null): void;
  /** V1.4: keyboard shortcut overlay (?). */
  shortcutsOpen: boolean;
  setShortcutsOpen(open: boolean): void;
  /** V1.4 (aus dem Legacy-OS): Control Center. */
  controlOpen: boolean;
  setControlOpen(open: boolean): void;
  /** V1.4 (aus dem Legacy-OS): Focus Mode bis Zeitpunkt (ms), sonst null. */
  focusUntil: number | null;
  setFocusUntil(t: number | null): void;
}

export const useOsShellStore = create<OsShellState>((set) => ({
  controlOpen: false,
  setControlOpen: (controlOpen) => set({ controlOpen }),
  focusUntil: null,
  setFocusUntil: (focusUntil) => set({ focusUntil }),
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
  universeFocus: null,
  setUniverseFocus: (id) => set({ universeFocus: id }),
  knowledgeQuery: null,
  setKnowledgeQuery: (q) => set({ knowledgeQuery: q }),
  shortcutsOpen: false,
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
}));
