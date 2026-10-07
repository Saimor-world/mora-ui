'use client';
import React, { useEffect, useState } from 'react';
import { Compass, Home, Timer } from 'lucide-react';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { SCENES } from '@/lib/os-prototype/scene';
import { usePhase } from '@/lib/os-prototype/usePhase';

/**
 * Aus dem Legacy-OS übernommen: die Kontext-Kapsel oben (Instanz · Organisation ·
 * Demo · Home/Universe) und die Uhr-Pille mit MÔRA-Szene. Verbessert: echte
 * Schalter statt Deko, Focus-Restzeit direkt in der Pille, Tastatur-erreichbar.
 */
export function ContextCapsule({ activeId, navigate, org, demo }: { activeId: string; navigate: (id: string) => void; org: string; demo: boolean }) {
  return (
    <div className="os-context" data-testid="context-capsule">
      <div className="os-context__capsule">
        <span className="os-context__chip">Lokale Instanz</span>
        <span className="os-context__org">{org}</span>
        {demo ? <span className="os-context__demo">Demo</span> : null}
        <span className="os-context__scope">Organisation</span>
        <span className="os-context__seg" role="group" aria-label="Ebene">
          <button type="button" aria-pressed={activeId === 'today'} onClick={() => navigate('today')}><Home size={12} aria-hidden /> Heute</button>
          <button type="button" aria-pressed={activeId === 'universe'} onClick={() => navigate('universe')}><Compass size={12} aria-hidden /> Universe</button>
        </span>
      </div>
    </div>
  );
}

/** Uhr-Pille mit MÔRA-Szene bzw. Focus-Restzeit; öffnet das Control Center. */
export function ContextClock() {
  const [now, setNow] = useState(() => new Date());
  const focusUntil = useOsShellStore((s) => s.focusUntil);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 15_000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!focusUntil) return;
    const t = setInterval(() => { setNow(new Date()); if (Date.now() >= focusUntil) useOsShellStore.getState().setFocusUntil(null); }, 1000);
    return () => clearInterval(t);
  }, [focusUntil]);
  const { phase } = usePhase();
  const scene = SCENES.find((x) => x.id === phase) ?? SCENES[1];
  const left = focusUntil ? Math.max(0, focusUntil - now.getTime()) : 0;
  const mm = String(Math.floor(left / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  return (
      <button type="button" className="os-context__clock" onClick={() => useOsShellStore.getState().setControlOpen(true)} aria-label="Control Center öffnen" data-testid="context-clock">
        <span className="os-context__live" aria-hidden />
        {focusUntil ? <><Timer size={12} aria-hidden /> <span data-testid="focus-left">{mm}:{ss}</span> · Focus</> : <>{now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}<span className="os-context__scene"> · MÔRA · {scene.label.toUpperCase()}</span></>}
      </button>
  );
}
