'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Compass, Home, Timer } from 'lucide-react';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { SCENES } from '@/lib/os-prototype/scene';
import { usePhase } from '@/lib/os-prototype/usePhase';
import { useDemoStore } from '@/lib/demo/demoStore';
import { useDemoCompanies, useIsSaimorHq } from '@/lib/hooks/useIsSaimorInternal';

function switchDemo(id: string | null) {
  if (id === useDemoStore.getState().demoCompanyId) return;
  if (!window.confirm('Arbeitsbereich wechseln? Offene Ansichten und lokale Entwürfe werden geschlossen. Speichere deine Arbeit vorher.')) return;
  useDemoStore.getState().setDemoCompany(id);
}

/**
 * Firmen-Schalter nur für SAIMÔR-HQ: die echte Firma heißt einfach „SAIMÔR“, darunter die
 * is_demo-Firmen aus CORE. Die Wahl lebt nur in dieser Sitzung (sessionStorage).
 */
export function DemoSwitch() {
  const hq = useIsSaimorHq();
  const companies = useDemoCompanies(hq);
  const current = useDemoStore((s) => s.demoCompanyId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  if (!hq || (!companies.length && !current)) return null;
  const label = current ? companies.find((c) => c.id === current)?.name ?? 'Demo' : 'SAIMÔR';
  return (
    <div className="os-context__demoswitch" ref={ref} data-testid="demo-switch">
      <button type="button" className="os-company-pill" aria-haspopup="menu" aria-expanded={open} aria-label={`Firma wählen: ${label}`} onClick={() => setOpen((v) => !v)}>
        <span className="os-company-pill__mark" aria-hidden>{label.charAt(0)}</span>
        <span className="os-company-pill__name">{label}</span>
        <ChevronDown size={12} aria-hidden />
      </button>
      {open ? <div className="os-company-menu" role="menu"><CompanyOptions onPick={() => setOpen(false)} /></div> : null}
    </div>
  );
}

/** Firmenliste (echte Firma + is_demo-Firmen); im Firmen-Menü am Desktop und im Status-Menü am Phone. */
export function CompanyOptions({ onPick }: { onPick?: () => void }) {
  const hq = useIsSaimorHq();
  const companies = useDemoCompanies(hq);
  const current = useDemoStore((s) => s.demoCompanyId);
  if (!hq || (!companies.length && !current)) return null;
  const pick = (id: string | null) => { switchDemo(id); onPick?.(); };
  return (
    <div className="os-company-options" data-testid="company-options">
      <div className="os-company-options__label">Firma</div>
      <button type="button" role="menuitemradio" aria-checked={!current} onClick={() => pick(null)}>SAIMÔR{!current ? <Check size={13} aria-hidden /> : null}</button>
      {companies.filter((c, i, a) => c.id === current || a.findIndex((x) => x.name === c.name) === i).map((c) => (
        <button key={c.id} type="button" role="menuitemradio" aria-checked={current === c.id} onClick={() => pick(c.id)}>
          <span>{c.name}<em> · Demo</em></span>{current === c.id ? <Check size={13} aria-hidden /> : null}
        </button>
      ))}
    </div>
  );
}

/** Ruhiges Band, solange eine Demo-Firma offen ist – mit einem Weg zurück zur echten Firma. */
export function DemoBanner() {
  const current = useDemoStore((s) => s.demoCompanyId);
  const companies = useDemoCompanies(Boolean(current));
  if (!current) return null;
  const name = companies.find((c) => c.id === current)?.name;
  return (
    <div className="os-demo-banner" role="note" data-testid="demo-banner">
      <span>Demo{name ? ` · ${name}` : ''}</span>
      <button type="button" onClick={() => switchDemo(null)} data-testid="demo-back">zurück zu SAIMÔR</button>
    </div>
  );
}

/**
 * Kontext-Kapsel oben: nur noch die Ebene (Heute / Universe). Instanz, Organisation, Rolle,
 * CORE-Zustand, Uhr und Szene liegen im Status-Menü (Marius, 24.10.: „bissl unübersichtlich“).
 */
export function ContextCapsule({ activeId, navigate }: { activeId: string; navigate: (id: string) => void }) {
  return (
    <div className="os-context" data-testid="context-capsule">
      <div className="os-context__capsule">
        <span className="os-context__seg" role="group" aria-label="Ebene">
          <button type="button" aria-pressed={activeId === 'today'} onClick={() => navigate('today')}><Home size={12} aria-hidden /> Heute</button>
          <button type="button" aria-pressed={activeId === 'universe'} onClick={() => navigate('universe')}><Compass size={12} aria-hidden /> Universe</button>
        </span>
      </div>
    </div>
  );
}

/**
 * Status-Menü: ein kleiner Punkt (grün = alles gut, gelb = Problem). Auf Hover/Klick zeigt es
 * Organisation, Person/Rolle, CORE-Zustand, Instanz und Uhr/Szene (öffnet das Control Center).
 */
export function StatusMenu({ org, userName, role, core, coreOk, internal = false }: { org: string; userName?: string | null; role?: string | null; core?: string | null; coreOk: boolean; internal?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeT = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const focusUntil = useOsShellStore((s) => s.focusUntil);
  const enter = () => { if (closeT.current) clearTimeout(closeT.current); setOpen(true); };
  const leave = () => { closeT.current = setTimeout(() => setOpen(false), 180); };
  return (
    <div className="os-status" ref={ref} onMouseEnter={enter} onMouseLeave={leave} data-testid="status-menu">
      <button type="button" className="os-status__btn" aria-haspopup="true" aria-expanded={open} aria-label={`Status: ${org}`} onClick={() => setOpen((v) => !v)}>
        <span className={`os-status__dot${coreOk ? '' : ' os-status__dot--warn'}`} aria-hidden />
        {focusUntil ? <ContextClock internal={internal} /> : null}
        <ChevronDown size={12} aria-hidden />
      </button>
      {open ? (
        <div className="os-status__menu" role="menu">
          <div className="os-status__org">{org}</div>
          {userName || role ? <div className="os-status__row">{[userName, role].filter(Boolean).join(' · ')}</div> : null}
          {core ? <div className={`os-status__row${coreOk ? '' : ' os-status__row--warn'}`}>{core}</div> : null}
          {internal ? <div className="os-status__row os-status__faint">Lokale Instanz</div> : null}
          {!focusUntil ? <ContextClock internal={internal} /> : null}
        </div>
      ) : null}
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
