'use client';

/**
 * Universe v2 – „Der Morgen“ als leise Ebene ÜBER dem echten Universe.
 * Kein eigener Raum: Hintergrund, Planeten und Dock bleiben unverändert.
 * Die Ebene liest nur die Positionen der echten Planeten (data-planet-name)
 * und hängt kleine Sternbilder mit Quellenzeile daran.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { coreGet } from '@/lib/api/http';
import { usePaneStore } from '@/lib/store/paneStore';
import { CAMERA, MOTION, playZoomTone } from '@/lib/universe/motion';
import { useNavStore } from '@/lib/store/navStore';
import { shortcutLabel } from '@/lib/os/shortcut';
import type { MoraMode } from '@/lib/mora/moraModes';
import { approve, approveLabel, canApprove, type ApproveOutcome } from '@/lib/universe/approve';
import { answerBox, easeApart } from '@/lib/universe/answerLayout';
import { ModePicker, MoraSpaceAnswer, useMoraSpace } from '@/components/universe/MoraSpaceAnswer';
import { planetForSource } from '@/lib/universe/spaceAnswer';

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
  morgen: 'Guten Morgen, Marius.', tag: 'Ein ruhiger Tag.', abend: 'Guten Abend, Marius.', nacht: 'Die Wache hält Licht.',
};

const DEMO: Today = {
  items: [
    { title: 'Rechnung R-2041 seit 14 Tagen offen', source: 'Buchhaltung · Offene Posten', area: 'Finanzen' },
    { title: 'Bankgespräch heute um 10:00', source: 'Kalender · heute', area: 'Post & Termine' },
    { title: 'Website-Update wartet auf Freigabe', source: 'Werkstatt · Freigaben', area: 'Werkstatt' },
    { title: 'Leitfaden „Onboarding“ seit 30 Tagen ungeprüft', source: 'Wissen · Dokumente', area: 'Wissen' },
  ],
  proposal: {
    id: 'demo', label: 'Zahlungserinnerung für R-2041 senden',
    reason: 'Die Rechnung ist 14 Tage überfällig. Eine freundliche Erinnerung ist üblich und ändert nichts an der Buchhaltung.',
    sources: ['Buchhaltung · Offene Posten'], undo: 'Bis zum Versand jederzeit zurückziehbar.',
  },
  nebel: ['Bankumsätze', 'Reichweite in Monaten'],
};

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

/** Kleines Sternbild: 3–4 Punkte, feine Linien, deterministisch je Index. */
function Constellation({ seed, dim }: { seed: number; dim?: boolean }) {
  const shapes = [
    [[0, 10], [12, 0], [26, 6], [34, 18]],
    [[0, 4], [10, 16], [24, 12], [30, 0]],
    [[0, 14], [14, 8], [22, 18], [34, 6]],
    [[0, 0], [8, 12], [22, 14], [32, 4]],
  ];
  const pts = shapes[seed % shapes.length];
  return (
    <svg width="38" height="22" viewBox="-2 -2 38 22" className="shrink-0" aria-hidden>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="rgba(255,236,200,0.35)" strokeWidth="0.6" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 1 ? 1.6 : 1.1} fill={dim ? 'rgba(255,255,255,0.4)' : 'rgba(255,240,210,0.95)'} />
      ))}
    </svg>
  );
}

export function MorgenOverlay() {
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
  const coreMode = useNavStore((st) => st.coreMode);
  const viewLevel = useNavStore((st) => st.viewLevel);
  const [mode, setMode] = useState<MoraMode>('denken');
  const [askFocus, setAskFocus] = useState(false);
  const [kbd, setKbd] = useState('⌘K');
  const space = useMoraSpace(demo);
  const modeRef = React.useRef(mode); modeRef.current = mode;
  // „Im Fenster weiter": das Gespräch aus dem Raum wandert mit – nichts wird neu gefragt.
  const openWindow = useCallback((q: string) => {
    const messages = space.history.length ? space.history.map((m) => ({ ...m, mode: modeRef.current }))
      : [{ role: 'user' as const, content: q, mode: modeRef.current }];
    openPane({ id: 'chat-main', type: 'chat', title: 'MÔRA', size: { width: 560, height: 640 }, data: { transcript: { id: `uv2-${Date.now()}`, messages } } });
    space.close();
  }, [openPane, space]);
  const [morningOutcome, setMorningOutcome] = useState<ApproveOutcome | 'running' | null>(null);
  useEffect(() => { setKbd(shortcutLabel('K')); }, []);
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
    if (d) setToday(DEMO);
    else coreGet('/v3/mora/today').then((r) => setToday(unwrap(r))).catch(() => setToday('nebel'));
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

  const data = today && today !== 'nebel' ? today : null;
  const night = phase === 'nacht';
  const cx = vw / 2;
  // Sternbilder hängen an echten Planeten, in fester Reihenfolge von oben nach unten.
  const usable = [...anchors].sort((a, b) => a.y - b.y || a.x - b.x);
  const items = night ? [] : (data?.items ?? []).slice(0, Math.min(4, usable.length));
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
  const SUB: Record<DayPhase, string> = {
    morgen: n ? `${n === 1 ? 'Eine Sache ist' : `${['', '', 'Zwei', 'Drei', 'Vier'][n]} Dinge sind`} heute wichtig${data?.proposal ? ' – eine wartet auf dich.' : '.'}` : 'Nichts drängt heute.',
    tag: n ? 'Nur was sich bewegt, leuchtet.' : 'Alles ruhig.',
    abend: 'Heute: 3 Vorschläge, 2 freigegeben, 1 offen bis morgen. Die Wache war still.',
    nacht: 'Alles ruht. Nur die Wache bleibt wach.',
  };
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

  return (
    <div className="pointer-events-none fixed inset-0 z-[40] antialiased" data-testid="universe-v2-overlay" data-phase={phase}
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}>
      {/* Tagesphase: leiser Schleier über dem bestehenden Hintergrund */}
      <div className="absolute inset-0 transition-[background] duration-[3000ms]" style={{ background: TINT[phase] }} />

      {/* MÔRAs Licht – kein Ring, kein Text darin, nur Atem */}
      <div className="absolute left-1/2 top-[49%] -translate-x-1/2 -translate-y-1/2">
        <div className="h-56 w-56 rounded-full" style={{ background: `radial-gradient(circle, rgba(255,222,170,${night ? 0.08 : 0.16}) 0%, rgba(255,200,140,0.04) 42%, transparent 70%)`, animation: `uv2breath 9s ${ease} infinite` }} />
      </div>

      {/* Eine Überschrift: MÔRAs Begrüßung + ein Satz. Ersetzt „Woraus … besteht“. */}
      {!answering && <header className="absolute left-1/2 top-[104px] w-[min(640px,90vw)] -translate-x-1/2 text-center" data-testid="uv2-greeting"><div style={{ animation: `uv2in 1.2s ${ease} both` }}>
        <h1 className={night ? 'font-normal text-white/70' : 'font-semibold text-white'} data-testid="uv2-greeting-title"
          style={night ? { fontSize: 28, lineHeight: '34px', letterSpacing: '-0.018em', textShadow: '0 2px 18px rgba(0,0,0,0.5)' } : { fontSize: 34, lineHeight: '40px', letterSpacing: '-0.022em', textShadow: '0 2px 24px rgba(0,0,0,0.55)' }}>{GREETING[phase]}</h1>
        <p className={night ? 'mt-2 text-white/45' : 'mt-2 text-white/60'} style={{ fontSize: 15, lineHeight: '20px', letterSpacing: '-0.01em', textShadow: '0 1px 12px rgba(0,0,0,0.6)' }}>{SUB[phase]}</p>
      </div></header>}

      {/* MÔRA ohne Fenster: Raum wird leiser, die Antwort steigt aus dem Licht */}
      {answering && <style>{`[data-testid^="territory-"]{transition:opacity .9s ${ease},filter .9s ${ease};opacity:.32;filter:blur(1.5px) saturate(.6)}${space.state.status === 'answer' ? linkedPlanets(space.state.answer.sources, anchors.map((x) => x.name)).map((n) => `[data-mora-label="${n.replace(/"/g, '')}"]`).join(',') : ''}${space.state.status === 'answer' && linkedPlanets(space.state.answer.sources, anchors.map((x) => x.name)).length ? '{opacity:1;filter:none}' : ''}`}</style>}
      {answering && (() => {
        const box = answerBox(vw, cx, typeof window !== 'undefined' ? window.innerHeight * 0.49 : 441);
        const rules = anchors.map((a) => ({ a, dx: Math.abs(a.y - (box.top + 120)) < 260 ? easeApart(a.x, a.r, cx, box.width) : 0 }))
          .filter((x) => x.dx !== 0 && x.a.name)
          .map(({ a, dx }) => `[data-mora-label="${a.name.replace(/"/g, '')}"]{translate:${dx}px 0}`).join('');
        return rules ? <style data-testid="uv2-ease-apart">{`[data-testid^="territory-"]{transition:translate .9s ${ease},opacity .9s ${ease},filter .9s ${ease}}${rules}`}</style> : null;
      })()}
      {answering && <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 52% 46% at 50% 49%, rgba(4,6,12,0.55), rgba(4,6,12,0.12) 70%, transparent)', animation: `uv2fade 0.9s ${ease} both` }} />}
      <MoraSpaceAnswer state={space.state} anchors={anchors} cx={cx} cy={typeof window !== 'undefined' ? window.innerHeight * 0.49 : 441} demo={demo} onClose={space.close} onWindow={openWindow} onApprove={(p) => approve(p)} />

      {/* Sternbilder an echten Planeten – zwei Textebenen, gleiche Abstände */}
      {!answering && items.map((it, i) => {
        const slot = slots[i];
        if (slot === null) return null;
        const a = usable[slot];
        // Rechts nie unter das Vorschlagsfeld laufen (rechter Rand 24 + Breite 296 + Luft 24).
        const limit = detailOpen ? vw - 32 - 370 - 24 : showComet ? vw - 24 - 296 - 24 : vw - 24;
        const rightRoom = limit - (a.x + a.r + 16);
        // Reicht der Platz rechts nicht für eine ruhige Zeilenbreite, wandert das Sternbild nach links
        // (vorher brach „Website-Update wartet auf Freigabe“ bei Werkstatt in vier Zeilen um).
        const toLeft = a.x < cx - 40 || rightRoom < 168;
        const W = toLeft ? 176 : Math.min(196, rightRoom);
        const left = toLeft ? a.x - a.r - 16 - W : a.x + a.r + 16;
        return (
          <div key={i} className="absolute flex items-start gap-2.5" data-testid="uv2-constellation"
            style={{ left: Math.max(24, left), top: a.y - a.r - 4, width: W, flexDirection: toLeft ? 'row-reverse' : 'row', textAlign: toLeft ? 'right' : 'left', animation: `uv2in 1.4s ${ease} ${0.6 + i * 0.25}s both` }}>
            <Constellation seed={i} dim={phase === 'abend'} />
            <div className="min-w-0" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.75)' }}>
              <p className="font-medium text-white/90" style={{ fontSize: 13, lineHeight: '17px', letterSpacing: '-0.005em' }}>{it.title}</p>
              <p className="mt-1 text-white/45" style={{ fontSize: 11, lineHeight: '14px' }}>{it.source}</p>
            </div>
          </div>
        );
      })}

      {night && watch && (
        <div className="absolute rounded-full" data-testid="uv2-watch-glow"
          style={{ left: watch.x - watch.r * 2.2, top: watch.y - watch.r * 2.2, width: watch.r * 4.4, height: watch.r * 4.4, background: 'radial-gradient(circle, rgba(229,115,115,0.18), transparent 65%)', animation: `uv2breath 8s ${ease} infinite` }} />
      )}

      {today === 'nebel' && (
        <p className="absolute left-1/2 top-[160px] -translate-x-1/2 text-[13px] text-white/45">MÔRAs Tagesbild liegt noch im Nebel – Quelle nicht erreichbar.</p>
      )}

      {/* Komet: eine feine Spur, die im Vorschlag endet */}
      {showComet && data?.proposal && (
        <>
          <div className="absolute" data-testid="uv2-comet" style={{ right: 24 + 296 - 8, top: 212, width: 96, height: 1, transform: 'rotate(-24deg)', transformOrigin: 'right center', background: 'linear-gradient(to left, rgba(255,240,215,0.9), transparent)', animation: `uv2fade 1.6s ${ease} 1.4s both` }} />
          <aside className="pointer-events-auto absolute right-6 top-[200px] w-[296px] rounded-[20px] p-5" data-testid="uv2-proposal"
            style={{ background: 'rgba(22,24,30,0.58)', backdropFilter: 'blur(40px) saturate(160%)', WebkitBackdropFilter: 'blur(40px) saturate(160%)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.14), inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 50px rgba(0,0,0,0.45)', animation: `uv2in 1.2s ${ease} 1.8s both` }}>
            <p className="font-medium text-amber-100/70" style={{ fontSize: 12, lineHeight: '16px' }}>MÔRA schlägt vor</p>
            <p className="mt-2 font-semibold text-white" style={{ fontSize: 17, lineHeight: '22px', letterSpacing: '-0.015em' }}>{data.proposal.label}</p>
            <p className="mt-2 text-white/60" style={{ fontSize: 13, lineHeight: '18px' }}>{data.proposal.reason}</p>
            <p className="mt-3 text-white/40" style={{ fontSize: 11, lineHeight: '14px' }}>Quelle: {data.proposal.sources.join(', ')}</p>
            <p className="mt-2 text-white/50" data-testid="uv2-approve-state" style={{ fontSize: 11, lineHeight: '14px' }}>
              {demo ? 'Entwurf – Freigeben ist hier ohne Wirkung.'
                : morningOutcome && morningOutcome !== 'running' ? approveLabel(morningOutcome)
                : canApprove(data.proposal) ? 'Wird erst nach deiner Freigabe ausgeführt und danach geprüft.'
                : 'Noch nicht ausführbar – CORE meldet keinen geprüften Weg. Nichts passiert von selbst.'}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" data-testid="uv2-approve" disabled={demo || !canApprove(data.proposal) || morningOutcome !== null}
                title={canApprove(data.proposal) ? 'Freigeben' : 'CORE meldet noch keinen geprüften Ausführungsweg'}
                onClick={async () => { if (!data.proposal) return; setMorningOutcome('running'); setMorningOutcome(await approve(data.proposal)); }}
                className="h-9 rounded-full bg-white font-semibold text-black transition-transform active:scale-[0.97] disabled:opacity-40" style={{ fontSize: 13 }}>{morningOutcome === 'running' ? 'Wird ausgeführt …' : 'Freigeben'}</button>
              <button type="button" onClick={() => setDismissed(true)} className="h-9 rounded-full font-medium text-white/80 transition-colors hover:bg-white/15" style={{ fontSize: 13, background: 'rgba(255,255,255,0.08)' }}>Später</button>
            </div>
          </aside>
        </>
      )}

      {/* Ehrlicher Nebel – eine leise Zeile, kein Kasten */}
      {!!data?.nebel?.length && !night && !answering && (
        <p className="absolute bottom-[166px] left-1/2 -translate-x-1/2 whitespace-nowrap text-white/40" data-testid="nebel" style={{ fontSize: 12, textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}>
          Noch im Nebel: {data.nebel.join(', ')}
        </p>
      )}

      {demo && (
        <div className="absolute left-6 top-6 rounded-full px-2.5 py-1 font-medium text-amber-100/75" style={{ fontSize: 11, background: 'rgba(0,0,0,0.35)', boxShadow: 'inset 0 0 0 0.5px rgba(255,220,160,0.3)' }}>Entwurf · Beispieldaten</div>
      )}
      {/* Frag MÔRA – das Gespräch beginnt im Raum, nicht in einem Fenster. */}
      {!night && (
        <div className="pointer-events-auto absolute bottom-[112px] left-1/2 -translate-x-1/2 transition-[width] duration-500" style={{ width: (askFocus || answering || !!ask.trim()) ? 'min(600px,90vw)' : 'min(440px,80vw)', transitionTimingFunction: ease }}>
        <form data-testid="uv2-ask"
          style={{ animation: `uv2in 1.2s ${ease} 2.2s both` }}
          onSubmit={(e) => { e.preventDefault(); const q = ask.trim(); if (!q) return;
            space.ask(q, mode); setAsk(''); }}>

          <label className="flex h-10 items-center gap-2.5 rounded-full pl-3.5 pr-1.5"
            style={{ background: 'rgba(18,22,30,0.46)', backdropFilter: 'blur(30px) saturate(160%)', WebkitBackdropFilter: 'blur(30px) saturate(160%)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.14), 0 10px 30px rgba(0,0,0,0.35)' }}>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: 'radial-gradient(circle, #ffe9c4, #f4b86a)', boxShadow: '0 0 10px rgba(255,214,150,0.8)' }} aria-hidden />
            <input value={ask} onChange={(e) => setAsk(e.target.value)} onFocus={() => setAskFocus(true)} onBlur={() => setTimeout(() => setAskFocus(false), 200)} aria-label="MÔRA fragen" placeholder="Frag MÔRA – oder sag, wohin du willst"
              className="min-w-0 flex-1 bg-transparent text-white placeholder:text-white/40 focus:outline-none" style={{ fontSize: 14, letterSpacing: '-0.01em' }} />
            {(askFocus || answering || !!ask.trim())
              ? <span style={{ animation: `uv2fade 0.4s ${ease} both` }}><ModePicker mode={mode} onChange={setMode} compact /></span>
              : <kbd className="shrink-0 rounded-md px-1.5 py-0.5 text-white/40" style={{ fontSize: 11, boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.18)' }}>{kbd}</kbd>}
          </label>
        </form>
        </div>
      )}

      {iris}

      <style>{`@keyframes uv2breath{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.05);opacity:1}}@keyframes uv2fade{from{opacity:0}to{opacity:1}}@keyframes uv2rise{from{opacity:0;transform:translateY(34px) scale(.96);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}@keyframes uv2pulse{0%,100%{opacity:.45}50%{opacity:.9}}@keyframes uv2in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion: reduce){[data-testid=universe-v2-overlay] *{animation:none!important}}`}</style>
    </div>
  );
}
