'use client';
import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';
import { ShellStaticBackdrop } from '@/components/os/shell/ShellStaticBackdrop';
import { MoraLivingBackground } from '@/components/mora/MoraLivingBackground';
import { RitualSceneStyler } from '@/components/os/RitualSceneStyler';
import { useAmbientCapability } from '@/lib/hooks/useAmbientCapability';

/*
 * V1.1 atmosphere — reuses the real legacy layers, no copies.
 *
 *  mode 'calm'     (Heute, MÔRA, Finance, Post, Wissen, Einstellungen, Labs):
 *                   ShellStaticBackdrop + the same deep-space image, heavily
 *                   blurred and darkened, strong veil. No stars, no motion.
 *  mode 'universe' (#universe): the dimming lifts (CSS transition, none with
 *                   reduced motion), MoraLivingBackground + muted
 *                   RitualSceneStyler come in, StarField and TemporalAtmosphere
 *                   mount lazily on idle — only on desktop (>= 900px), without
 *                   prefers-reduced-motion and without Save-Data.
 *                   UniverseView itself brings UniverseAmbientField (the photo
 *                   in full strength).
 */
const StarField = dynamic(() => import('@/components/visual/StarField').then((m) => ({ default: m.StarField })), { ssr: false });
const TemporalAtmosphere = dynamic(() => import('@/components/os/TemporalAtmosphere').then((m) => ({ default: m.TemporalAtmosphere })), { ssr: false });

export type AtmosphereMode = 'calm' | 'universe';

function useWideViewport(min = 900) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const check = () => setWide(window.innerWidth >= min);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [min]);
  return wide;
}

export function OsAtmosphere({ mode, look = 'kosmos' }: { mode: AtmosphereMode; look?: 'kosmos' | 'klar' }) {
  const capability = useAmbientCapability();
  const wide = useWideViewport();
  const universe = mode === 'universe';
  const kosmos = look === 'kosmos';
  // V1.5: Kosmos zeigt auf ALLEN Flächen die helle Legacy-Home-Atmosphäre
  // (MoraLivingBackground + TemporalAtmosphere + RitualSceneStyler, wie MoraShell).
  // Klar: ruhige Phasen-Fläche, kein Bildraum, keine Bewegung.
  const motion = kosmos && capability.enableHeavy && capability.heavyReady && wide;

  return (
    <div className="os-atmo" data-testid="os-universe-layer" data-mode={mode} data-look={look} data-motion={motion ? 'on' : 'off'} aria-hidden>
      <div className="os-atmo__phase" />
      {kosmos ? <div className="os-atmo__base"><ShellStaticBackdrop /></div> : null}
      {kosmos ? <div className="os-atmo__plate" data-testid="os-atmo-plate" /> : null}
      <div className="os-atmo__living" data-testid="os-atmo-living">{kosmos ? <MoraLivingBackground /> : null}</div>
      {motion ? (
        <div className="os-atmo__motion" data-testid="os-atmo-motion">
          <StarField density={capability.density === "low" ? "low" : "medium"} opacity={0.4} />
          <div className="os-atmo__temporal"><TemporalAtmosphere /></div>
        </div>
      ) : null}
      {kosmos ? <RitualSceneStyler muted={universe} /> : null}
      <div className="os-atmo__veil" />
    </div>
  );
}
