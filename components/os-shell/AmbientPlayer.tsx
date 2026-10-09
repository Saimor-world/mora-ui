'use client';
import { useEffect, useRef } from 'react';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import type { SceneId } from '@/lib/os-prototype/scene';

/**
 * V1.5 Ambient je Tagesphase. Aus ist der Standard; Start nur durch eine
 * Nutzer-Geste (Schalter) – damit gelten die Autoplay-Regeln der Browser.
 * Phasenwechsel blendet weich über (mit reduzierter Bewegung: harter Wechsel,
 * aber leise). Loops: public/ambient/<phase>.mp3 (synthetisch erzeugt,
 * siehe Doku §27 – Marius kann eigene Musik gleichen Namens ablegen).
 */
export function AmbientPlayer({ phase }: { phase: SceneId }) {
  const on = useOsShellStore((s) => s.audioOn);
  const volume = useOsShellStore((s) => s.audioVolume);
  const ref = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!ref.current) { ref.current = new Audio(); ref.current.loop = true; ref.current.preload = 'none'; }
    const a = ref.current;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const target = Math.max(0, Math.min(1, volume)) * (reduced ? 0.7 : 1);
    const fade = (to: number, done?: () => void) => {
      if (fadeRef.current) window.clearInterval(fadeRef.current);
      if (reduced) { a.volume = to; done?.(); return; }
      fadeRef.current = window.setInterval(() => {
        const d = to - a.volume;
        if (Math.abs(d) < 0.02) { a.volume = to; if (fadeRef.current) window.clearInterval(fadeRef.current); done?.(); return; }
        a.volume = Math.max(0, Math.min(1, a.volume + Math.sign(d) * 0.02));
      }, 60);
    };
    if (!on) { fade(0, () => a.pause()); return; }
    const src = `/ambient/${phase}.mp3`;
    if (!a.src.endsWith(src)) {
      fade(0, () => { a.src = src; a.volume = 0; a.play().then(() => fade(target)).catch(() => useOsShellStore.getState().setAudioOn(false)); });
    } else {
      if (a.paused) { a.volume = 0; a.play().then(() => fade(target)).catch(() => useOsShellStore.getState().setAudioOn(false)); } else fade(target);
    }
  }, [on, phase, volume]);

  useEffect(() => () => { ref.current?.pause(); }, []);
  return null;
}
