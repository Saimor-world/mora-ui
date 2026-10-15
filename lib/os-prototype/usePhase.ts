'use client';
import { useEffect, useState } from 'react';
import { useOsShellStore } from './shellStore';
import { sceneFor, type SceneId } from './scene';
import { persistRitualSettings } from '@/lib/os/ritualMode';

/** Effektive Tagesphase (Override aus Einstellungen, sonst nach Uhrzeit). */
export function usePhase(): { phase: SceneId; auto: boolean; mounted: boolean } {
  const override = useOsShellStore((s) => s.phaseOverride);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
  const phase = override ?? (now ? sceneFor(now).id : 'build');
  // Die Legacy-Ebenen (MoraLivingBackground, TemporalAtmosphere, RitualSceneStyler)
  // lesen die Ritual-Szene – wir schreiben dieselbe Phase hinein, statt zu kopieren.
  useEffect(() => { if (now) persistRitualSettings(null, { ritualSceneId: phase, ritualAutoTime: !override }); }, [phase, override, now]);
  return { phase, auto: !override, mounted: now !== null };
}
