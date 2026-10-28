'use client';
import { useEffect, useState } from 'react';
import type { SpiritMood } from '@/components/world/MoraSpirit';

/** Stimmung der MÔRA in der Dock-Homebase: kommt aus der Eingabe „Frag MÔRA“ (Fokus/Tippen → hört zu, Stream → denkt/spricht, Antwort → freut sich). */
const EVT = 'mora:hub-mood';
export function emitHubMood(mood: SpiritMood) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<SpiritMood>(EVT, { detail: mood }));
}
export function useHubMood(): SpiritMood {
  const [mood, setMood] = useState<SpiritMood>('idle');
  useEffect(() => {
    const on = (e: Event) => setMood((e as CustomEvent<SpiritMood>).detail);
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return mood;
}
/** Platz in der Dock-Homebase, in den die Universe-Eingabe gerendert wird. */
export const DOCK_ASK_SLOT = 'os-dock-ask';
