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
  /** V1.5: Look (Kosmos/Klar), Phasen-Override, Ambient-Audio – lokal gespeichert. */
  /** V1.6: Einstellungen in einem bestimmten Abschnitt öffnen (z. B. „sources“). */
  settingsSection: string | null;
  setSettingsSection(id: string | null): void;
  look: 'kosmos' | 'klar';
  setLook(l: 'kosmos' | 'klar'): void;
  phaseOverride: 'flow' | 'build' | 'lounge' | 'night' | null;
  setPhaseOverride(p: 'flow' | 'build' | 'lounge' | 'night' | null): void;
  audioOn: boolean;
  setAudioOn(on: boolean): void;
  audioVolume: number;
  setAudioVolume(v: number): void;
}

const LS = { look: 'saimor_os_look', phase: 'saimor_os_phase_override', audio: 'saimor_os_ambient_on', vol: 'saimor_os_ambient_volume' } as const;
function lsGet(k: string): string | null { try { return typeof window === 'undefined' ? null : window.localStorage.getItem(k); } catch { return null; } }
function lsSet(k: string, v: string | null) { try { if (typeof window === 'undefined') return; if (v === null) window.localStorage.removeItem(k); else window.localStorage.setItem(k, v); } catch { /* privat-modus */ } }
const PHASES = ['flow', 'build', 'lounge', 'night'] as const;
function initialPhase(): OsShellState['phaseOverride'] {
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search).get('phase');
    if (q && (PHASES as readonly string[]).includes(q)) return q as OsShellState['phaseOverride'];
  }
  const v = lsGet(LS.phase); return v && (PHASES as readonly string[]).includes(v) ? (v as OsShellState['phaseOverride']) : null;
}
function initialLook(): 'kosmos' | 'klar' {
  if (typeof window !== 'undefined') { const q = new URLSearchParams(window.location.search).get('look'); if (q === 'klar' || q === 'kosmos') return q; }
  return lsGet(LS.look) === 'klar' ? 'klar' : 'kosmos';
}

export const useOsShellStore = create<OsShellState>((set) => ({
  look: initialLook(),
  setLook: (look) => { lsSet(LS.look, look); set({ look }); },
  phaseOverride: initialPhase(),
  setPhaseOverride: (phaseOverride) => { lsSet(LS.phase, phaseOverride); set({ phaseOverride }); },
  // Audio startet nie von selbst: Autoplay-Regeln + bewusste Entscheidung.
  audioOn: false,
  setAudioOn: (audioOn) => { lsSet(LS.audio, audioOn ? '1' : '0'); set({ audioOn }); },
  audioVolume: Number(lsGet(LS.vol) ?? '0.35') || 0.35,
  setAudioVolume: (audioVolume) => { lsSet(LS.vol, String(audioVolume)); set({ audioVolume }); },
  controlOpen: false,
  setControlOpen: (controlOpen) => set({ controlOpen }),
  focusUntil: null,
  setFocusUntil: (focusUntil) => set({ focusUntil }),
  settingsSection: null,
  setSettingsSection: (settingsSection) => set({ settingsSection }),
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
