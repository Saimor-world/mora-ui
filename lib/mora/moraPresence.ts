'use client';
import { create } from 'zustand';

/**
 * Wo ist MÔRA gerade? Es gibt genau EINE MÔRA im OS (im Dock-Hügel gerendert).
 * Andere Orte rendern keine eigene Figur, sondern setzen hier nur ein Ziel;
 * die eine Instanz fliegt per Transform dorthin und wieder zurück.
 */
export type MoraTarget = { kind: 'dock' } | { kind: 'anchor'; selector: string; reason?: string };

type MoraPresenceState = {
  target: MoraTarget;
  goTo: (selector: string, reason?: string) => void;
  goHome: () => void;
};

export const useMoraPresence = create<MoraPresenceState>((set) => ({
  target: { kind: 'dock' },
  goTo: (selector, reason) => set({ target: { kind: 'anchor', selector, reason } }),
  goHome: () => set({ target: { kind: 'dock' } }),
}));

/** Versatz (px) vom Heimatpunkt zur Mitte des Ziel-Ankers; null = zu Hause bleiben. */
export function flightOffset(home: DOMRect, anchor: DOMRect | null): { x: number; y: number } | null {
  if (!anchor || (anchor.width === 0 && anchor.height === 0)) return null;
  return {
    x: Math.round(anchor.left + anchor.width / 2 - (home.left + home.width / 2)),
    y: Math.round(anchor.top + anchor.height / 2 - (home.top + home.height / 2)),
  };
}
