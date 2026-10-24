'use client';
import React, { useEffect, useState } from 'react';
import { Compass, Home, Timer } from 'lucide-react';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { SCENES } from '@/lib/os-prototype/scene';
import { usePhase } from '@/lib/os-prototype/usePhase';
import { useDemoStore } from '@/lib/demo/demoStore';
import { useDemoCompanies, useIsSaimorHq } from '@/lib/hooks/useIsSaimorInternal';

/**
 * Demo-Schalter nur für SAIMÔR-HQ: listet alle is_demo-Firmen aus CORE.
 * Standard ist die echte SAIMÔR-Firma; die Wahl lebt nur in dieser Sitzung (sessionStorage).
 */
export function DemoSwitch() {
  const hq = useIsSaimorHq();
  const companies = useDemoCompanies(hq);
  const current = useDemoStore((s) => s.demoCompanyId);
  const setDemo = useDemoStore((s) => s.setDemoCompany);
  if (!hq || (!companies.length && !current)) return null;
  return (
    <label className="os-context__demoswitch" data-testid="demo-switch">
      <span className="sr-only">Demo wählen</span>
      <select aria-label="Demo wählen" value={current ?? ''} onChange={(e) => setDemo(e.target.value || null)}>
        <option value="">SAIMÔR (echt)</option>
        {companies.map((c) => <option key={c.id} value={c.id}>Demo · {c.name}</option>)}
      </select>
    </label>
  );
}

/**
 * Aus dem Legacy-OS übernommen: die Kontext-Kapsel oben (Instanz · Organisation ·
 * Demo · Home/Universe) und die Uhr-Pille mit MÔRA-Szene. Verbessert: echte
 * Schalter statt Deko, Focus-Restzeit direkt in der Pille, Tastatur-erreichbar.
 */
export function ContextCapsule({ activeId, navigate, org, demo, internal = false }: { activeId: string; navigate: (id: string) => void; org: string; demo: boolean; internal?: boolean }) {
  return (
    <div className="os-context" data-testid="context-capsule">
      <div className="os-context__capsule">
        {internal ? <span className="os-context__chip">Lokale Instanz</span> : null}
        <span className="os-context__org">{org}</span>
        {demo ? <span className="os-context__demo" data-testid="demo-badge">Demo</span> : null}
        <DemoSwitch />
        <span className="os-context__seg" role="group" aria-label="Ebene">
          <button type="button" aria-pressed={activeId === 'today'} onClick={() => navigate('today')}><Home size={12} aria-hidden /> Heute</button>
          <button type="button" aria-pressed={activeId === 'universe'} onClick={() => navigate('universe')}><Compass size={12} aria-hidden /> Universe</button>
        </span>
      </div>
    </div>
  );
}

/** Uhr-Pille mit MÔRA-Szene bzw. Focus-Restzeit; öffnet das Control Center. */
export function ContextClock({ internal = false }: { internal?: boolean } = {}) {
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
        {focusUntil ? <><Timer size={12} aria-hidden /> <span data-testid="focus-left">{mm}:{ss}</span> · Focus</> : <>{now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}{internal ? <span className="os-context__scene"> · MÔRA · {scene.label.toUpperCase()}</span> : null}</>}
      </button>
  );
}
