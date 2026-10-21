'use client';

/**
 * Universe v2 – „Der Morgen“ als leise Ebene ÜBER dem echten Universe.
 * Kein eigener Raum: Hintergrund, Planeten und Dock bleiben unverändert.
 * Die Ebene liest nur die Positionen der echten Planeten (data-planet-name)
 * und hängt kleine Sternbilder mit Quellenzeile daran.
 */
import { getMoraPresence, setMoraPresence } from '@/lib/universe/moraPresence';
import React, { useCallback, useEffect, useState } from 'react';
import { coreGet } from '@/lib/api/http';
import { usePaneStore } from '@/lib/store/paneStore';
import { CAMERA, MOTION, playZoomTone } from '@/lib/universe/motion';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { firstNameOf } from '@/lib/os/businessLanguage';
import type { MoraMode } from '@/lib/mora/moraModes';
import { approve, approveLabel, canApprove, type ApproveOutcome } from '@/lib/universe/approve';
import { ModePicker, MoraSpaceAnswer, useMoraSpace } from '@/components/universe/MoraSpaceAnswer';
import { planetForSource } from '@/lib/universe/spaceAnswer';
import { UV, TYPE, dateEyebrow } from '@/lib/universe/tokens';

function linkedPlanets(sources: { title?: string; kind?: string }[], names: string[]): string[] {
  return Array.from(new Set(sources.slice(0, 3).map((x) => planetForSource(x, names)).filter((i): i is number => i !== null).map((i) => names[i])));
}

type Item = { title: string; source: string; area?: string };
type Proposal = { id: string; label: string; reason: string; sources: string[]; undo?: string; confirm_token?: string; execution?: { verified?: boolean; endpoint?: string } };
type Today = { text?: string; items: Item[]; proposal: Proposal | null; nebel?: string[] };
export type DayPhase = 'morgen' | 'tag' | 'abend' | 'nacht';
type Anchor = { name: string; x: number; y: number; r: number };

const unwrap = (r: any) => (r && typeof r === 'object' && 'data' in r && Object.keys(r).length <= 2 ? r.data : r);

export function phaseForHour(h: number): DayPhase {
  if (h >= 5 && h < 11) return 'morgen';
  if (h >= 11 && h < 17) return 'tag';
  if (h >= 17 && h < 22) return 'abend';
  return 'nacht';
}

/** Leichter Farbschleier über dem bestehenden Hintergrund – nie deckend. */
const TINT: Record<DayPhase, string> = {
  morgen: 'radial-gradient(ellipse at 50% 30%, rgba(255,196,128,0.10), transparent 60%)',
  tag: 'radial-gradient(ellipse at 50% 40%, rgba(180,210,255,0.05), transparent 65%)',
  abend: 'radial-gradient(ellipse at 50% 70%, rgba(214,120,90,0.12), transparent 65%), linear-gradient(to bottom, transparent, rgba(40,10,30,0.18))',
  nacht: 'linear-gradient(to bottom, rgba(2,4,14,0.42), rgba(2,4,14,0.30))',
};
const GREETING: Record<DayPhase, string> = {
  morgen: 'Guten Morgen{name}.', tag: 'Ein ruhiger Tag.', abend: 'Guten Abend{name}.', nacht: 'Gute Nacht{name}.',
};

// Keine Beispielinhalte im HQ: „Heute“ kommt nur aus CORE /v3/mora/today (auch lokal).

function isDemo(): boolean {
  if (typeof window === 'undefined') return false;
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return local && (/(?:^|;\s*)mora_session=local_demo_fallback/.test(document.cookie) || new URLSearchParams(window.location.search).get('demo') === '1');
}

function readPhase(): DayPhase {
  if (typeof window !== 'undefined' && isDemo()) {
    const p = new URLSearchParams(window.location.search).get('phase');
    if (p === 'morgen' || p === 'tag' || p === 'abend' || p === 'nacht') return p;
  }
  return phaseForHour(new Date().getHours());
}

const AREA_HINTS: [RegExp, RegExp][] = [
  [/finanz|buchhalt|rechnung|bank|umsatz/i, /finanz|wirtschaft|finance/i],
  [/kalender|termin|post|mail|eingang/i, /post|termin|kalender|mail/i],
  [/werkstatt|freigabe|github|deploy|engineering/i, /werkstatt|engineering|technik|product/i],
  [/wissen|dokument|leitfaden/i, /wissen|knowledge/i],
  [/wache|nightwatch|server/i, /wache|watch/i],
];

/** Ordnet jeden Punkt dem passenden echten Planeten zu (Bereich → Quelle → Reihenfolge). */
export function assignToPlanets<T extends { title: string; source: string; area?: string }>(items: T[], planets: string[]): (number | null)[] {
  const used = new Set<number>();
  const pick = (test: (name: string) => boolean) => {
    const i = planets.findIndex((n, k) => !used.has(k) && test(n));
    if (i >= 0) used.add(i);
    return i >= 0 ? i : null;
  };
  const res = items.map((it) => {
    if (it.area) { const i = pick((n) => n.toLowerCase() === it.area!.toLowerCase()); if (i !== null) return i; }
    const hint = AREA_HINTS.find(([src]) => src.test(it.source + ' ' + it.title));
    return hint ? pick((n) => hint[1].test(n)) : null;
  });
  return res.map((r) => (r !== null ? r : pick(() => true)));
}

export function MorgenOverlay() {
  const sessionFirstName = firstNameOf(useSessionStore((state) => state.user));
  const [phase, setPhase] = useState<DayPhase>('morgen');
  const [demo, setDemo] = useState(false);
  const [today, setToday] = useState<Today | 'nebel' | null>(null);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [vw, setVw] = useState(1440);
  const [zoom, setZoom] = useState<{ x: number; y: number; r: number; key: number } | null>(null);
  const [ask, setAsk] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const openPane = usePaneStore((st) => st.openPane);
  const paneOpen = usePaneStore((st) => st.panes.some((x: any) => !x.minimized));
  const coreMode = useNavStore((st) => st.coreMode);
  const viewLevel = useNavStore((st) => st.viewLevel);
  const [mode, setMode] = useState<MoraMode>('denken');
  const [askFocus, setAskFocus] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(t); }, []);
  // Rückweg aus Home: Home-Begrüßung blendet erst aus, dann erscheint diese (gestaffelt, nie beide zugleich).
  const [returned, setReturned] = useState(0);
  const wasNear = React.useRef(false);
  const space = useMoraSpace(demo);
  // MÔRAs Kern zeigt, was sie gerade tut: hört zu (Fragezeile fokussiert), denkt (Anfrage läuft), fertig (Antwort da).
  useEffect(() => {
    const cur = getMoraPresence().state;
    if (space.state.status === 'thinking') setMoraPresence({ state: 'thinking' });
    else if (space.state.status === 'answer' && cur === 'thinking') setMoraPresence({ state: 'done' });
    else if (askFocus && (cur === 'calm' || cur === 'done')) setMoraPresence({ state: 'listening' });
    else if (!askFocus && (cur === 'listening' || cur === 'thinking')) setMoraPresence({ state: 'calm' });
  }, [askFocus, space.state.status]);
  const modeRef = React.useRef(mode); modeRef.current = mode;
  // „Im Fenster weiter": das Gespräch aus dem Raum wandert mit – nichts wird neu gefragt.
  const openWindow = useCallback((q: string) => {
    const messages = space.history.length ? space.history.map((m) => ({ ...m, mode: modeRef.current }))
      : [{ role: 'user' as const, content: q, mode: modeRef.current }];
    openPane({ id: 'chat-main', type: 'chat', title: 'MÔRA', size: { width: 560, height: 640 }, data: { transcript: { id: `uv2-${Date.now()}`, messages } } });
    space.close();
  }, [openPane, space]);
  const [morningOutcome, setMorningOutcome] = useState<ApproveOutcome | 'running' | null>(null);
  const askRef = React.useRef(space.ask); askRef.current = space.ask;
  useEffect(() => {
    const onAsk = (e: Event) => { const q = String((e as CustomEvent).detail || '').trim(); if (q) askRef.current(q, modeRef.current); };
    window.addEventListener('uv2:ask', onAsk);
    return () => window.removeEventListener('uv2:ask', onAsk);
  }, []);
  useEffect(() => {
    if (space.state.status === 'idle') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') space.close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [space]);

  // Kinematischer Flug in einen Planeten: der Klick auf einen echten Planeten
  // öffnet eine Iris aus seinem Mittelpunkt (650 ms), dann klärt sich der Raum (500 ms).
  useEffect(() => {
    let last: { x: number; y: number; r: number } | null = null;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const el = t?.closest?.('[data-testid^="territory-"]') as HTMLElement | null;
      if (el) {
        // Erster Klick wählt nur aus – Position merken, noch nicht fliegen.
        const body = el.querySelector<HTMLElement>('.saimor-territory-body') || el;
        const r = body.getBoundingClientRect();
        last = { x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.max(r.width, r.height) / 2 };
        return;
      }
      if (!t?.closest?.('[data-uv2-open]') || !last) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      setZoom({ ...last, key: Date.now() });
      playZoomTone();
      window.setTimeout(() => setZoom(null), MOTION.zoom.total);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    setPhase(readPhase());
    const d = isDemo(); setDemo(d);
    // Nur lokal im Demo-Modus: Fenster für Screenshot-Durchläufe öffnen/schließen.
    if (d) Object.assign(window as any, { __uv2panes: usePaneStore });
    coreGet('/v3/mora/today').then((r) => setToday(unwrap(r))).catch(() => setToday('nebel'));
  }, []);

  // Solange eine Antwort offen ist und Planeten ausweichen, wird nicht neu gemessen –
  // sonst misst das Overlay die verschobenen Planeten und schaukelt sich auf.
  const frozenRef = React.useRef(false);
  frozenRef.current = space.state.status !== 'idle';
  const measure = useCallback(() => {
    setVw(window.innerWidth);
    if (frozenRef.current) return;
    setDetailOpen(!!document.querySelector('[data-testid="planet-detail"]'));
    // Echte Planeten des Universe: Organisationsfeld (data-mora-label) oder PlanetLayer (data-planet-name)
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="territory-"], [data-testid^="locked-territory-"], [data-planet-name]'));
    setAnchors(els.map((el) => {
      const body = el.querySelector<HTMLElement>('.saimor-territory-body') || el;
      const r = body.getBoundingClientRect();
      return { name: el.dataset.moraLabel || el.dataset.planetName || '', x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.max(r.width, r.height) / 2 };
    }).filter((a) => a.r > 4 && a.r < 200));
  }, []);

  useEffect(() => {
    measure();
    const t = window.setInterval(measure, 1500);
    window.addEventListener('resize', measure);
    return () => { window.clearInterval(t); window.removeEventListener('resize', measure); };
  }, [measure]);

  useEffect(() => {
    if (coreMode === 'home' && viewLevel === 'core') wasNear.current = true;
    else if (wasNear.current) { wasNear.current = false; setReturned((r) => r + 1); }
  }, [coreMode, viewLevel]);

  const data = today && today !== 'nebel' ? today : null;
  const night = phase === 'nacht';
  const cx = vw / 2;
  // Sternbilder hängen an echten Planeten, in fester Reihenfolge von oben nach unten.
  const usable = [...anchors].sort((a, b) => a.y - b.y || a.x - b.x);
  const items = night ? [] : (data?.items ?? []).slice(0, Math.min(4, usable.length));
  // Autonomie: was heute wichtig ist, zählt auch im Feld (gleiche Quelle, gleiche Wahrheit).
  const areasKey = items.map((it) => it.area || '').join('|');
  useEffect(() => {
    const areas = areasKey.split('|').filter(Boolean);
    (window as unknown as { __uv2TodayAreas?: string[] }).__uv2TodayAreas = areas;
    window.dispatchEvent(new CustomEvent('uv2:today-areas', { detail: areas }));
  }, [areasKey]);
  const quiet = space.state.status !== 'idle';
  const slots = assignToPlanets(items, usable.map((a) => a.name));
  const watch = anchors.find((a) => /wache|watch/i.test(a.name));
  // Ist eine Planetenkarte offen, tritt der Vorschlag zurück – nie zwei Glasflächen übereinander.
  const showComet = !night && phase !== 'abend' && !!data?.proposal && !dismissed && !detailOpen && !quiet;

  // Nur im Universe (wenn echte Planeten sichtbar sind) – sonst bleibt das OS unberührt.
  const iris = zoom && (
    <div key={zoom.key} className="pointer-events-none fixed inset-0 z-[40]" data-testid="uv2-zoom" aria-hidden>
      <div className="absolute rounded-full" style={{ left: zoom.x - zoom.r, top: zoom.y - zoom.r, width: zoom.r * 2, height: zoom.r * 2,
        background: 'radial-gradient(circle, rgba(8,12,22,0.97) 0%, rgba(8,12,22,0.93) 58%, rgba(255,214,160,0.22) 66%, transparent 71%)',
        boxShadow: '0 0 80px 20px rgba(255,214,160,0.18)',
        animation: `uv2iris ${MOTION.zoom.total}ms ${MOTION.ease.cinematic} both` }} />
      <style>{`@keyframes uv2iris{0%{transform:scale(1);opacity:0}20%{opacity:1}55%{transform:scale(${Math.ceil((2 * Math.hypot(vw, 900)) / Math.max(8, zoom.r))});opacity:1}100%{transform:scale(${Math.ceil((2 * Math.hypot(vw, 900)) / Math.max(8, zoom.r))});opacity:0}}`}</style>
    </div>
  );
  // Kamera nah (Home): nur MÔRAs Licht bleibt – groß, warm, hinter der Begrüßung von Home.
  const near = coreMode === 'home' && viewLevel === 'core';
  // Das Nahbild (Home) zeichnet CoreLayer selbst – MÔRAs Licht liegt dort zwischen Universe und Home.
  if (near) return iris || null;
  if (anchors.length === 0) return iris || null;
  const answering = space.state.status !== 'idle';

  const n = items.length;
  const proposal = showComet ? data?.proposal ?? null : null;
  const SUB: Record<DayPhase, string> = {
    morgen: n ? `${n === 1 ? 'Eine Sache ist' : `${['', '', 'Zwei', 'Drei', 'Drei'][n]} Dinge sind`} heute wichtig.${proposal ? ' Eine wartet auf dich.' : ''}` : 'Nichts drängt heute.',
    tag: n ? 'Nur was sich bewegt, leuchtet.' : 'Alles ruhig.',
    abend: 'Der Tag legt sich. Was offen ist, wartet bis morgen.',
    nacht: 'Alles ruht bis morgen.',
  };
  const ease = UV.easeOut;
  const wide = vw >= 1100;
  // Editorial: links die Spalte, rechts der Kosmos. Der Kranz rückt dafür nach rechts.
  // Ab 1280 trägt das 12er-Raster (universe-v2.css) die Zonen: das Feld sitzt
  // bereits in den Spalten 4–9, darum keine zusätzliche Verschiebung mehr.
  const shift = vw >= 1280 ? 0 : wide ? Math.round(vw * 0.16) : 0;
  const list = items.slice(0, 3);
  const hot = hover !== null ? usable[slots[hover] ?? -1]?.name : null;
  const sel = (nm: string) => `[data-mora-label="${nm.replace(/"/g, '')}"]`;
  const eyebrow = `${dateEyebrow(now)} · ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
  // Name aus der Sitzung statt fest „Marius“ (Kundentest 21.10.).
  const greet = GREETING[phase].replace('{name}', sessionFirstName ? `, ${sessionFirstName}` : '').replace(/, /, ',\n');
  const delay = returned ? 0.7 : 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-[40] antialiased" data-testid="universe-v2-overlay" data-phase={phase}
      style={{ fontFamily: UV.sans, color: UV.cream }}>
      <div className="uv2-grain" aria-hidden />
      <div className="absolute inset-0 transition-[background] duration-[3000ms]" style={{ background: TINT[phase] }} />
      {/* Ruhe hinter der Spalte: ein Schleier statt einer Karte */}
      {wide && <div data-uv2-scrim className="absolute inset-y-0 left-0 w-[46%]" style={{ background: 'linear-gradient(90deg, rgba(12,26,30,0.42), rgba(12,26,30,0.12) 60%, transparent)' }} />}
      <style>{`[data-testid^="territory-"]{transition:translate 1.1s ${UV.easeInOut},opacity .9s ${ease},filter .9s ${ease};translate:${shift}px 0}`
        + (hot ? `[data-testid^="territory-"]{opacity:.28!important}${sel(hot)}{opacity:1!important}` : '')}</style>

      {/* MÔRAs Licht – im Zentrum des Kranzes, nur Atem */}
      <div className="absolute top-[49%] -translate-x-1/2 -translate-y-1/2" style={{ left: cx + shift }}>
        <div className="h-56 w-56 rounded-full" style={{ background: `radial-gradient(circle, rgba(214,168,72,${night ? 0.06 : 0.12}) 0%, rgba(214,168,72,0.03) 42%, transparent 70%)`, animation: `uv2breath 9s ${ease} infinite` }} />
      </div>

      {!answering && (
        <header key={returned} style={{ opacity: paneOpen ? 0 : 1, visibility: paneOpen ? "hidden" : "visible", transition: `opacity .6s ${UV.easeOut}` }} className={wide ? 'absolute left-24 top-[12vh] w-[440px]' : 'absolute left-6 right-6 top-16 max-w-[560px] sm:left-12'} data-testid="uv2-greeting">
          <p style={{ ...TYPE.meta, color: UV.gold, animation: `uv2in .6s ${ease} ${delay}s both` }} data-testid="uv2-eyebrow">{eyebrow}</p>
          <h1 data-testid="uv2-greeting-title" className={`${wide ? 'mt-6' : 'mt-3'} whitespace-pre-line`}
            style={{ ...TYPE.display, fontSize: wide ? 64 : 40, color: night ? UV.c(0.75) : UV.cream, animation: `uv2in .6s ${ease} ${delay + 0.08}s both` }}>{greet}</h1>
          <p className={wide ? 'mt-6' : 'mt-3'} style={{ ...TYPE.text, color: UV.c(0.6), animation: `uv2in .6s ${ease} ${delay + 0.16}s both` }}>{SUB[phase]}</p>

          {list.length > 0 && (
            <ol className={`pointer-events-auto ${wide ? 'mt-7' : 'mt-4'}`} style={{ borderTop: `0.5px solid ${UV.hair}` }} data-testid="uv2-today">
              {list.map((it, i) => (
                <li key={i} data-testid="uv2-constellation" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                  className={`flex cursor-default items-baseline gap-4 ${wide ? 'py-4' : 'py-2.5'}`} style={{ borderBottom: `0.5px solid ${UV.hair}`, animation: `uv2in .6s ${ease} ${delay + 0.3 + i * 0.08}s both` }}>
                  <span style={{ ...TYPE.meta, color: hover === i ? UV.gold : UV.c(0.35), transition: 'color .3s' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block" style={{ ...TYPE.text, fontWeight: 400, color: UV.c(hover === null || hover === i ? 0.92 : 0.6), transition: 'color .3s' }}>{it.title}</span>
                    <span className="mt-1 block" style={{ ...TYPE.meta, color: UV.c(0.62) }}>{it.area || it.source.split('·')[0].trim()}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}

          {proposal && (
            <div className={`pointer-events-auto ${wide ? 'mt-8' : 'mt-4'}`} data-testid="uv2-proposal" style={{ animation: `uv2in .6s ${ease} ${delay + 0.6}s both` }}>
              {wide && <p style={{ ...TYPE.meta, color: UV.c(0.35) }}>Wartet auf dich</p>}
              <p className="mt-2" style={{ ...TYPE.text, fontWeight: 400, color: UV.cream }}>{proposal.label}</p>
              {proposal.reason && wide && <p className="mt-1 truncate" title={proposal.reason} data-testid="uv2-proposal-reason" style={{ ...TYPE.text, color: UV.c(0.45) }}>{proposal.reason}</p>}
              <div className={`${wide ? 'mt-5' : 'mt-3'} flex items-center gap-6`}>
                <button type="button" data-testid="uv2-approve" disabled={demo || !canApprove(proposal) || morningOutcome !== null}
                  onClick={async () => { setMorningOutcome('running'); setMorningOutcome(await approve(proposal)); }}
                  className="h-10 rounded-full px-6 transition-transform active:scale-[0.97] disabled:opacity-45"
                  style={{ background: UV.goldGrad, color: UV.ink, fontFamily: UV.sans, fontSize: 15, fontWeight: 500 }}>{morningOutcome === 'running' ? 'Wird ausgeführt …' : 'Freigeben'}</button>
                <button type="button" onClick={() => setDismissed(true)} style={{ ...TYPE.text, color: UV.c(0.6) }} className="hover:text-white">Später</button>
              </div>
              {wide && <p className="mt-3" data-testid="uv2-approve-state" style={{ ...TYPE.meta, color: UV.c(0.35), letterSpacing: '0.12em' }}>
                {demo ? 'Entwurf · ohne Wirkung'
                  : morningOutcome && morningOutcome !== 'running' ? approveLabel(morningOutcome)
                  : canApprove(proposal) ? 'Erst nach Freigabe · danach geprüft'
                  : 'Noch nicht ausführbar · kein geprüfter Weg'}
              </p>}
            </div>
          )}
        </header>
      )}

      {night && watch && (
        <div className="absolute rounded-full" data-testid="uv2-watch-glow"
          style={{ left: watch.x - watch.r * 2.2, top: watch.y - watch.r * 2.2, width: watch.r * 4.4, height: watch.r * 4.4, background: 'radial-gradient(circle, rgba(229,115,115,0.14), transparent 65%)', animation: `uv2breath 8s ${ease} infinite` }} />
      )}

      {/* MÔRA ohne Fenster: der Raum wird still (B), die Antwort ist eine Editorial-Seite (C) */}
      {answering && <style>{`[data-testid=mobile-territories]{opacity:0;pointer-events:none}[data-testid^="territory-"]{opacity:.26!important;filter:saturate(.5)}${space.state.status === 'answer' ? linkedPlanets(space.state.answer.sources, anchors.map((x) => x.name)).map((nm) => `${sel(nm)}{opacity:1!important;filter:none}`).join('') : ''}`}</style>}
      {answering && <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(5,7,6,0.8), rgba(5,7,6,0.45) 55%, rgba(5,7,6,0.2))', animation: `uv2fade .6s ${ease} both` }} />}
      <MoraSpaceAnswer state={space.state} anchors={anchors} cx={cx} cy={typeof window !== 'undefined' ? window.innerHeight * 0.49 : 441} demo={demo} onClose={space.close} onWindow={openWindow} onApprove={(p) => approve(p)} />

      {/* Frag MÔRA – eine Haarlinie, keine zweite Kapsel über dem Dock */}
      {!night && !detailOpen && !paneOpen && (
        <div data-uv2-askwrap className="absolute bottom-[112px] -translate-x-1/2" style={{ left: cx + shift, width: wide ? 'min(420px,40vw)' : 'min(520px,86vw)', transition: `left 1.1s ${UV.easeInOut}` }}>
        <form data-testid="uv2-ask" className="group relative pointer-events-auto" style={{ animation: `uv2in .6s ${ease} ${delay + 0.8}s both` }}
          onSubmit={(e) => { e.preventDefault(); const q = ask.trim(); if (!q) return; space.ask(q, mode); setAsk(''); }}>
          <label className="flex h-11 items-center gap-3" style={{ borderBottom: `0.5px solid ${askFocus ? 'rgba(214,168,72,0.6)' : UV.c(0.16)}`, transition: 'border-color .4s' }}>
            <input value={ask} onChange={(e) => setAsk(e.target.value)} onFocus={() => setAskFocus(true)} onBlur={() => setTimeout(() => setAskFocus(false), 200)} aria-label="MÔRA fragen" placeholder="Frag MÔRA"
              className="min-w-0 flex-1 bg-transparent text-center placeholder:text-[rgba(247,244,233,0.4)] focus:outline-none" style={{ ...TYPE.text, color: UV.cream }} />
            
          </label>
            <div className="absolute inset-x-0 top-full mt-2 flex justify-center"><span className={`transition-opacity duration-500 ${(askFocus || answering || !!ask.trim()) ? 'opacity-100' : 'pointer-events-none opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100'}`}><ModePicker mode={mode} onChange={setMode} /></span></div>
        </form>
        </div>
      )}

      {iris}

      <style>{`@keyframes uv2breath{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.05);opacity:1}}@keyframes uv2fade{from{opacity:0}to{opacity:1}}@keyframes uv2rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes uv2in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion: reduce){[data-testid=universe-v2-overlay] *{animation:none!important}}`}</style>
    </div>
  );
}
