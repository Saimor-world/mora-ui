// Universe v2 – ein Bewegungssystem für das ganze OS.
// Drei Kurven, vier Dauern, ein Ton. Alles andere leitet sich daraus ab.
import { isBellMuted } from './morgen';

export const MOTION = {
  ease: {
    /** Standard für Auftritte: schnell an, weich aus. */
    out: 'cubic-bezier(0.22, 1, 0.36, 1)',
    /** Kamera-Fahrten (Zoom in Planeten, Wechsel Home ↔ Universe). */
    cinematic: 'cubic-bezier(0.65, 0, 0.35, 1)',
    /** Antippen, Drücken. */
    press: 'cubic-bezier(0.2, 0, 0, 1)',
  },
  duration: { tap: 120, ui: 280, enter: 1200, ambient: 9000 },
  /** Auftritts-Reihenfolge im Universe (Sekunden). */
  stagger: { greeting: 0, constellation: 0.6, constellationStep: 0.25, comet: 1.4, proposal: 1.8, ask: 2.2 },
  zoom: { total: 1150 },
} as const;

/** Leiser Luftzug beim Flug in einen Planeten – gefiltertes Rauschen, 0,5 s. Respektiert die Glocken-Stummschaltung. */
export function playZoomTone(): void {
  if (typeof window === 'undefined' || isBellMuted()) return;
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.6);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(1400, t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.018, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    src.connect(f).connect(g).connect(ctx.destination); src.start(t); src.stop(t + 0.6);
    setTimeout(() => ctx.close?.(), 900);
  } catch { /* Ton ist Zierde, nie Pflicht */ }
}
