'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, Circle, FileText, Folder, FolderPlus, LayoutList, Link2, Orbit, Sparkles, StickyNote, Upload, type LucideIcon } from 'lucide-react';
import { MoraStone } from '@/components/os-kit';
import { useReducedMotion } from 'framer-motion';
import { GLASS_SHARED, GlassOrb, glassTintFor, glassVariantFor } from '@/components/world/GlassOrb';
import { JadeMora } from '@/components/world/JadeMora';
import { PixelMora } from '@/components/world/PixelMora';
import { MORA_FIGURE } from '@/lib/mora/figure';
const FvMora = MORA_FIGURE === 'jade' ? JadeMora : PixelMora;
import { focusTiles, formatModified, kindLabel, planetCounts, TASKS_PLANET, type FPlanet, type Moon, type Star, type StarKind } from '@/lib/lea/finder';
import type { LiveDay } from '@/lib/lea/live';

/** „1 Eintrag“, „3 Einträge“. */
const entries = (n: number) => `${n} ${n === 1 ? 'Eintrag' : 'Einträge'}`;

export type FinderView = 'universe' | 'list';
export type RolePreview = 'owner' | 'department' | 'member';

const ICON: Record<StarKind, LucideIcon> = { event: Calendar, document: FileText, note: StickyNote, task: Circle, file: FileText, link: Link2, other: FileText };

export interface FinderVerseProps {
  /** Direkt in diesen Ordner springen und den Stern hervorheben (aus Wissen). */
  initialMoonId?: string | null;
  initialStarId?: string | null;
  planet: FPlanet;
  phone: boolean;
  /** false: keine MÔRA-Figur in der Szene (sie lebt nur im Dock). */
  moraInScene?: boolean;
  day: LiveDay;
  role?: RolePreview;
  onClose: () => void;
  onAskMora: (q: string) => void;
  onOpenStar: (star: Star) => void;
  onToggleTask?: (star: Star) => void;
  onCreateFolder: (name: string) => Promise<unknown>;
  onCreateNote: (moonId: string, title: string) => Promise<unknown>;
  onUpload: (moonId: string, file: File) => Promise<unknown>;
}

/** Live-Hinweise von MÔRA: nur belegte Sätze aus Leas Tag und dem Inhalt dieses Planeten. */
export function liveHints(planet: FPlanet, day: LiveDay): string[] {
  const out: string[] = [];
  if (planet.kind === 'tasks') {
    for (const s of planet.stars.filter((x) => x.overdue)) out.push(`${s.name}: ${s.hint}.`);
    for (const s of planet.stars.filter((x) => !x.done && x.hint === 'heute fällig')) out.push(`${s.name} ist heute fällig.`);
    if (day.doneToday.length) out.push(`Heute schon erledigt: ${day.doneToday.length}.`);
    if (!out.length) out.push(planet.stars.length ? 'Nichts drängt gerade.' : 'Noch keine Aufgaben angelegt.');
    return out.slice(0, 4);
  }
  const events = planet.moons.flatMap((m) => m.stars.filter((s) => s.kind === 'event'));
  if (events.length) {
    if (day.running) out.push(`${day.running.title} läuft gerade.`);
    else if (day.next) out.push(`Als Nächstes: ${day.next.time ?? ''} ${day.next.title}`.replace(/\s+/g, ' ').trim() + '.');
    if (day.doneTodayEvents) out.push('Alle heutigen Termine sind abgeschlossen.');
  }
  const c = planetCounts(planet);
  if (!planet.moons.length) out.push('Noch keine Ordner. Lege den ersten an, dann kreist er hier als Mond.');
  else {
    // Kein Wiederholen der Zahlen aus den Kacheln: lieber das zuletzt Geänderte nennen.
    const last = planet.moons.flatMap((m) => m.stars.map((s) => ({ s, m }))).filter((x) => x.s.modified).sort((a, b) => String(b.s.modified).localeCompare(String(a.s.modified)))[0];
    if (last) out.push(`Zuletzt geändert: ${last.s.name} in ${last.m.name}.`);
    else if (!events.length) out.push(`${c.folders} Ordner, ${entries(c.items)}.`);
  }
  return out.slice(0, 4);
}

/**
 * Finder als Universe: Planet → Monde (Ordner) → Sterne (Inhalte). Zweite Ansicht derselben
 * Daten: eine große, ruhige Liste im Stil von „Big Picture“ (Pfeiltasten, Enter, Rücktaste).
 * Rechts der Fokus: Zahlen, Aktionen, Live-Hinweise von MÔRA.
 */
export function FinderVerse(p: FinderVerseProps) {
  const { planet, phone, day } = p;
  const role = p.role ?? 'owner';
  const readOnly = role === 'member';
  const [moonId, setMoonId] = useState<string | null>(p.initialMoonId ?? null);
  const [view, setView] = useState<FinderView>('universe');
  const [dir, setDir] = useState<'in' | 'out'>('in');
  const [selected, setSelected] = useState<string | null>(p.initialStarId ?? null);
  const [form, setForm] = useState<null | 'folder' | 'note'>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const ok = (text: string) => setMsg({ text, tone: 'ok' });
  const fail = (text: string) => setMsg({ text, tone: 'error' });
  const [focusIdx, setFocusIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const moon: Moon | null = planet.moons.find((m) => m.id === moonId) ?? null;
  useEffect(() => { if (moonId && !moon) setMoonId(null); }, [moonId, moon]);
  const stars: Star[] = moon ? moon.stars : planet.stars;
  const rows = useMemo(() => [
    ...(moon ? [] : planet.moons.map((m) => ({ type: 'moon' as const, id: m.id, name: m.name, kind: 'Ordner', modified: m.modified, hint: `${entries(m.count)}`, moon: m }))),
    ...stars.map((s) => ({ type: 'star' as const, id: s.id, name: s.name, kind: kindLabel(s.kind), modified: s.modified, hint: s.hint, star: s })),
  ], [moon, planet.moons, stars]);

  // Kamera wie beim Planeten-Zoom: Ursprung ist der angeklickte Mond, zurück fährt sie zu ihm hinaus.
  const [origin, setOrigin] = useState('50% 50%');
  const goMoon = (id: string, at?: string) => { if (at) setOrigin(at); setDir('in'); setMoonId(id); setSelected(null); setFocusIdx(0); };
  // Touch: nach unten wischen = eine Ebene zurück (wie Escape / Zurück-Knopf).
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onSwipeStart = (e: React.PointerEvent) => { swipe.current = e.pointerType === 'touch' ? { x: e.clientX, y: e.clientY } : null; };
  const onSwipeEnd = (e: React.PointerEvent) => {
    const st = swipe.current; swipe.current = null;
    if (st && e.clientY - st.y > 80 && Math.abs(e.clientX - st.x) < 60) goUp();
  };
  const goUp = () => { if (moonId) { setDir('out'); setMoonId(null); setSelected(null); setFocusIdx(0); } else p.onClose(); };

  useEffect(() => {
    closeRef.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) { if (e.key === 'Escape') setForm(null); return; }
      if (e.key === 'Escape') { e.preventDefault(); goUp(); }
      if (e.key === 'Backspace') { e.preventDefault(); goUp(); }
      if (view === 'list' && rows.length) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx((i) => Math.min(rows.length - 1, i + 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx((i) => Math.max(0, i - 1)); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  useEffect(() => {
    if (view !== 'list') return;
    const el = listRef.current?.querySelectorAll<HTMLButtonElement>('.fv-row')[focusIdx];
    el?.focus();
  }, [focusIdx, view, rows.length]);

  const openRow = (r: (typeof rows)[number]) => (r.type === 'moon' ? goMoon(r.id) : (setSelected(r.id), p.onOpenStar(r.star)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true); setMsg(null);
    try {
      if (form === 'folder') { await p.onCreateFolder(v); ok(`Ordner „${v}“ angelegt.`); }
      if (form === 'note' && moon) { await p.onCreateNote(moon.id, v); ok(`Notiz „${v}“ angelegt.`); }
      setText(''); setForm(null);
    } catch { fail('Das hat nicht geklappt. Bitte noch einmal.'); }
    setBusy(false);
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !moon) return;
    setBusy(true); setMsg(null);
    try { await p.onUpload(moon.id, f); ok(`„${f.name}“ hochgeladen.`); } catch { fail('Hochladen hat nicht geklappt. Bitte noch einmal.'); }
    setBusy(false);
  };

  const c = planetCounts(planet);
  const tiles: Array<[string, number, string]> = moon && planet.kind !== 'tasks'
    ? [['Einträge', moon.count, 'in diesem Ordner'], ['Notizen', moon.stars.filter((s) => s.kind === 'note').length, 'persönliche Notizen']]
    : focusTiles(planet);
  const hints = liveHints(planet, day);
  const canFolder = !readOnly && planet.kind !== 'tasks' && (planet.kind === 'department' || planet.spaces.length > 0) && !moon;
  const canInside = !readOnly && Boolean(moon);
  const levelKey = `${planet.id}/${moonId ?? ''}`;
  const centerName = moon ? moon.name : planet.name;
  const ring = moon ? [] : planet.moons;
  const sel = stars.find((s) => s.id === selected) ?? null;

  // Richtung 1 Gravitationsfeld: Entzerren & Überlappungsschutz für Monde und Sterne
  const layoutData = useMemo(() => {
    const hasMoons = ring.length > 0;
    const hasStars = stars.length > 0;

    // Radien der Gravitationsbahnen
    const moonRx = hasMoons && hasStars ? (phone ? 29 : 28) : (phone ? 33 : 34);
    const moonRy = hasMoons && hasStars ? (phone ? 24 : 23) : (phone ? 27 : 28);

    const moonItems = ring.map((m, i) => {
      const a = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
      return {
        moon: m,
        angle: a,
        x: 50 + Math.cos(a) * moonRx,
        y: 50 + Math.sin(a) * moonRy,
      };
    });

    const starCount = Math.min(stars.length, 24);
    const starItems = stars.slice(0, 24).map((s, i) => {
      let a: number;
      let rx: number;
      let ry: number;

      if (hasMoons) {
        // Staffelung in die Zwischenräume der Monde
        const baseOffset = Math.PI / Math.max(ring.length, 2);
        a = (i / starCount) * Math.PI * 2 - Math.PI / 2 + baseOffset;
        rx = phone ? 42 : 45;
        ry = phone ? 36 : 39;
      } else if (starCount <= 8) {
        a = (i / starCount) * Math.PI * 2 - Math.PI / 2;
        rx = phone ? 30 : 35;
        ry = phone ? 25 : 29;
      } else {
        // Zwei konzentrische Gravitationswellen für viele Sterne
        const isOuter = i % 2 === 1;
        a = (i / starCount) * Math.PI * 2 - Math.PI / 2;
        rx = isOuter ? (phone ? 42 : 44) : (phone ? 30 : 33);
        ry = isOuter ? (phone ? 36 : 38) : (phone ? 25 : 27);
      }

      // Richtungsanker: Beschriftung wächst immer nach außen weg
      const sin = Math.sin(a);
      const cos = Math.cos(a);
      let labelPos: 'top' | 'bottom' | 'left' | 'right';
      if (sin < -0.38) labelPos = 'top';
      else if (sin > 0.38) labelPos = 'bottom';
      else labelPos = cos >= 0 ? 'right' : 'left';

      return {
        star: s,
        angle: a,
        x: 50 + Math.cos(a) * rx,
        y: 50 + Math.sin(a) * ry,
        labelPos,
      };
    });

    return {
      moonRx,
      moonRy,
      moonItems,
      starItems,
      starOuterRx: hasMoons ? (phone ? 42 : 45) : (starCount > 8 ? (phone ? 42 : 44) : (phone ? 30 : 35)),
      starOuterRy: hasMoons ? (phone ? 36 : 39) : (starCount > 8 ? (phone ? 36 : 38) : (phone ? 25 : 29)),
      hasInnerWave: hasMoons && hasStars,
    };
  }, [ring, stars, phone]);

  // konzept4: der geöffnete Planet ist die große Glaskugel unten, seine Ordner ziehen als Monde im ruhigen Bogen darüber.
  const reduced = !!useReducedMotion();
  const domeMoons = useMemo(() => {
    const n = ring.length;
    const rows = n > (phone ? 3 : 7) ? 2 : 1;
    const per = rows === 2 ? Math.ceil(n / 2) : n;
    return ring.map((m, i) => {
      const row = rows === 2 ? i % 2 : 0;
      const k = rows === 2 ? Math.floor(i / 2) : i;
      const inRow = rows === 2 ? (row === 0 ? per : n - per) : n;
      const t = inRow <= 1 ? 0 : (k / (inRow - 1)) * 2 - 1;
      const spread = Math.min(phone ? 33 : 40, (phone ? 17 : 9.5) * Math.max(0, inRow - 1)) + (rows === 2 && row === 1 ? (phone ? 8 : 4) : 0);
      const x = 50 + (inRow <= 1 ? 0 : t * spread) * (rows === 2 && row === 1 && inRow > 1 ? 0.8 : 1);
      const y = (phone ? 17 : 21) + (phone ? 8 : 9) * t * t + row * (phone ? 19 : 17);
      const size = Math.round((phone ? 58 : 84) + Math.min(phone ? 14 : 26, Math.sqrt(m.count) * (phone ? 3 : 4.5)));
      return { moon: m, x, y, size, i };
    });
  }, [ring, phone]);

  const selectedStarItem = layoutData.starItems.find((item) => item.star.id === selected) ?? null;

  return (
    <div className="fv" role="dialog" aria-modal="true" aria-label={`Planet ${planet.name}`} data-testid="world-planet-window" data-view={view} data-phone={phone ? 'true' : 'false'}>
      <header className="fv-top">
        <button ref={closeRef} type="button" className="fv-back" onClick={goUp} data-testid={moonId ? 'fv-up' : 'world-planet-close'} aria-label={moonId ? `Zurück zu ${planet.name}` : 'Zurück zum Universe'}>
          <ArrowLeft size={18} /> <span>{moonId ? planet.name : 'Universe'}</span>
        </button>
        <nav className="fv-crumbs" aria-label="Pfad" data-testid="fv-crumbs">
          <button type="button" onClick={p.onClose}>Universe</button>
          <span aria-hidden>›</span>
          <button type="button" onClick={() => moonId && goUp()} aria-current={moonId ? undefined : 'page'}>{planet.name}</button>
          {moon ? <><span aria-hidden>›</span><span aria-current="page">{moon.name}</span></> : null}
        </nav>
        <div className="fv-toggle" role="group" aria-label="Ansicht">
          <button type="button" aria-pressed={view === 'universe'} onClick={() => setView('universe')} data-testid="fv-view-universe"><Orbit size={16} /> <span>Universe</span></button>
          <button type="button" aria-pressed={view === 'list'} onClick={() => { setView('list'); setFocusIdx(0); }} data-testid="fv-view-list"><LayoutList size={16} /> <span>Liste</span></button>
        </div>
      </header>

      <div className="fv-body">
        <section className="fv-stage" aria-label={centerName} onPointerDown={onSwipeStart} onPointerUp={onSwipeEnd} onPointerCancel={() => { swipe.current = null; }}>
          {view === 'universe' ? (
            !moon ? (
            <div key={levelKey} className="fv-orbit fv-dome" data-dir={dir} data-testid="fv-orbit" data-glass="true" data-reduced={reduced ? 'true' : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="fv-dome__planet" src="/universe/glass/half.png" alt="" draggable={false} />
              <div className="fv-dome__title">
                <span className="fv-center__name">{planet.name}</span>
                <span className="fv-center__meta">{planet.kind === 'tasks' ? `${c.open} offen` : `${c.folders} Ordner · ${entries(c.items)}`}</span>
              </div>
              {domeMoons.map(({ moon: m, x, y, size, i }) => (
                <button
                  key={m.id}
                  type="button"
                  className="fv-moon fv-moon--glass"
                  style={{ left: `${x}%`, top: `${y}%`, '--i': i } as React.CSSProperties}
                  onClick={() => goMoon(m.id, `${x}% ${y}%`)}
                  data-testid={`fv-moon-${m.id}`}
                  aria-label={`Ordner ${m.name} öffnen · ${entries(m.count)}`}
                >
                  <GlassOrb variant={glassVariantFor(m.name)} size={size}>
                    <span className="wd-badge" aria-hidden>{m.count}</span>
                  </GlassOrb>
                  <span className="fv-moon__name">{m.name}</span>
                </button>
              ))}
              {p.moraInScene !== false ? (
                <span className="fv-dome__mora" data-testid="fv-mora" aria-hidden>
                  <FvMora bare size={phone ? 48 : 80} mood="idle" reduced={reduced} />
                </span>
              ) : null}
              {stars.length ? (
                <div className="fv-dome__stars" data-testid="fv-dome-stars">
                  {stars.slice(0, 24).map((st) => (
                    <button key={st.id} type="button" className="fv-chip" data-kind={st.kind} data-done={st.done ? 'true' : undefined} data-overdue={st.overdue ? 'true' : undefined} data-selected={selected === st.id ? 'true' : undefined}
                      onClick={() => setSelected(st.id)} data-testid={`fv-star-${st.id}`} aria-label={`${kindLabel(st.kind)} ${st.name}${st.hint ? ` · ${st.hint}` : ''}`}>
                      <span>{st.name}</span>{st.hint ? <small>{st.hint}</small> : null}
                    </button>
                  ))}
                </div>
              ) : null}
              {!ring.length && !stars.length ? (
                <div className="fv-empty" data-testid="fv-empty">
                  <p>{planet.kind === 'tasks' ? 'Noch keine Aufgaben.' : `In ${planet.name} gibt es noch keine Ordner.`}</p>
                  {canFolder ? <button type="button" className="fv-btn" onClick={() => setForm('folder')} data-testid="fv-empty-folder"><FolderPlus size={16} /> Ordner anlegen</button> : null}
                </div>
              ) : null}
            </div>
            ) : (
            <div key={levelKey} className="fv-orbit" data-dir={dir} style={{ transformOrigin: origin }} data-testid="fv-orbit">
              <svg className="fv-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                <defs>
                  <linearGradient id="fv-filament" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9ec2a8" stopOpacity="0.32" />
                    <stop offset="60%" stopColor="#6f8f78" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#c9b89a" stopOpacity="0.25" />
                  </linearGradient>
                </defs>
                {ring.length ? <ellipse cx="50" cy="50" rx={layoutData.moonRx} ry={layoutData.moonRy} className="fv-orbit-wave fv-orbit-wave--moons" /> : null}
                {stars.length ? <ellipse cx="50" cy="50" rx={layoutData.starOuterRx} ry={layoutData.starOuterRy} className="fv-orbit-wave fv-orbit-wave--stars" /> : null}
                {layoutData.hasInnerWave ? <ellipse cx="50" cy="50" rx="19" ry="16" className="fv-orbit-wave fv-orbit-wave--core" /> : null}
                {layoutData.moonItems.map((m) => (
                  <line key={m.moon.id} x1="50" y1="50" x2={m.x} y2={m.y} className="fv-filament" />
                ))}
                {selectedStarItem ? (
                  <line x1="50" y1="50" x2={selectedStarItem.x} y2={selectedStarItem.y} className="fv-filament fv-filament--active" />
                ) : null}
              </svg>
              <div className="fv-center">
                <GlassOrb variant={moon ? glassVariantFor(centerName) : GLASS_SHARED} material={moon ? null : 'rnd'} tint={moon ? undefined : glassTintFor(centerName)} size={phone ? 104 : 150} />
                <span className="fv-center__name">{centerName}</span>
                <span className="fv-center__meta">{moon ? `${entries(moon.count)}${moon.spaceName ? ` · ${moon.spaceName}` : ''}` : planet.kind === 'tasks' ? `${c.open} offen` : `${c.folders} Ordner`}</span>
              </div>
              {layoutData.moonItems.map(({ moon: m, x, y }) => (
                <button
                  key={m.id}
                  type="button"
                  className="fv-moon"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  onClick={() => goMoon(m.id, `${x}% ${y}%`)}
                  data-testid={`fv-moon-${m.id}`}
                  aria-label={`Ordner ${m.name} öffnen · ${entries(m.count)}`}
                >
                  <GlassOrb variant={glassVariantFor(m.name)} size={phone ? 48 : 64}>
                    <span className="wd-badge" aria-hidden>{m.count}</span>
                  </GlassOrb>
                  <span className="fv-moon__name">{m.name}</span>
                </button>
              ))}
              {layoutData.starItems.map(({ star: s, x, y, labelPos }) => (
                <button
                  key={s.id}
                  type="button"
                  className="fv-star"
                  data-kind={s.kind}
                  data-done={s.done ? 'true' : undefined}
                  data-overdue={s.overdue ? 'true' : undefined}
                  data-selected={selected === s.id ? 'true' : undefined}
                  data-label-pos={labelPos}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  onClick={() => setSelected(s.id)}
                  data-testid={`fv-star-${s.id}`}
                  aria-label={`${kindLabel(s.kind)} ${s.name}${s.hint ? ` · ${s.hint}` : ''}`}
                >
                  <span className="fv-star__dot" aria-hidden />
                  <span className="fv-star__label-wrap">
                    <span className="fv-star__name">{s.name}</span>
                    {s.hint ? <span className="fv-star__hint">{s.hint}</span> : null}
                  </span>
                </button>
              ))}
              {!ring.length && !stars.length ? (
                <div className="fv-empty" data-testid="fv-empty">
                  <p>{moon ? 'Dieser Ordner ist noch leer.' : planet.kind === 'tasks' ? 'Noch keine Aufgaben.' : `In ${planet.name} gibt es noch keine Ordner.`}</p>
                  {canFolder ? <button type="button" className="fv-btn" onClick={() => setForm('folder')} data-testid="fv-empty-folder"><FolderPlus size={16} /> Ordner anlegen</button> : null}
                  {canInside ? <button type="button" className="fv-btn" onClick={() => fileRef.current?.click()}><Upload size={16} /> Datei hochladen</button> : null}
                </div>
              ) : null}
            </div>
            )
          ) : (
            <div key={levelKey} className="fv-list" ref={listRef} data-dir={dir} data-testid="fv-list" role="list">
              <div className="fv-list__head" aria-hidden><span>Typ</span><span>Name</span><span>Geändert</span></div>
              {rows.map((r, i) => {
                const Icon = r.type === 'moon' ? Folder : r.star.kind === 'task' && r.star.done ? CheckCircle2 : ICON[r.star.kind];
                return (
                  <button key={r.id} type="button" role="listitem" className="fv-row" data-focus={i === focusIdx ? 'true' : undefined} data-done={r.type === 'star' && r.star.done ? 'true' : undefined}
                    onFocus={() => setFocusIdx(i)} onClick={() => openRow(r)} data-testid={`fv-row-${r.id}`}>
                    <span className="fv-row__type"><Icon size={phone ? 18 : 22} /> <span>{r.kind}</span></span>
                    <span className="fv-row__name">{r.name}{r.hint ? <small>{r.hint}</small> : null}</span>
                    <span className="fv-row__date">{formatModified(r.modified)}</span>
                  </button>
                );
              })}
              {!rows.length ? <div className="fv-empty fv-empty--list" data-testid="fv-empty"><p>{moon ? 'Dieser Ordner ist noch leer.' : planet.kind === 'tasks' ? 'Noch keine Aufgaben.' : `In ${planet.name} gibt es noch keine Ordner.`}</p>{canFolder ? <button type="button" className="fv-btn" onClick={() => setForm('folder')}><FolderPlus size={16} /> Ordner anlegen</button> : null}</div> : null}
              {!phone && rows.length ? <p className="fv-list__keys" aria-hidden>↑ ↓ wählen · Enter öffnen · ⌫ zurück</p> : null}
            </div>
          )}
        </section>

        <aside className="fv-focus" aria-label="Fokus" data-testid="fv-focus">
          <p className="fv-eyebrow">{role === 'owner' ? 'Fokus' : role === 'department' ? 'Fokus · Abteilung' : 'Fokus · Mitglied (nur lesen)'}</p>
          <h2 className="fv-focus__title">{centerName}</h2>
          <div className="fv-tiles">
            {tiles.map(([k, n, sub]) => <div key={k} className="fv-tile"><span className="fv-eyebrow">{k}</span><strong>{n}</strong><span>{sub}</span></div>)}
          </div>
          {sel ? (
            <div className="fv-sel" data-testid="fv-selected">
              <p className="fv-eyebrow">{kindLabel(sel.kind)}</p>
              <p className="fv-sel__name">{sel.name}</p>
              {sel.hint ? <p className="fv-sel__hint">{sel.hint}</p> : null}
              <div className="fv-sel__actions">
                {sel.kind === 'task' && p.onToggleTask && !readOnly ? <button type="button" className="fv-btn" onClick={() => p.onToggleTask?.(sel)} data-testid="fv-toggle-task">{sel.done ? 'Wieder öffnen' : 'Erledigt'}</button> : null}
                {sel.kind !== 'task' ? <button type="button" className="fv-btn" onClick={() => p.onOpenStar(sel)} data-testid="fv-open-star">Öffnen</button> : null}
                <button type="button" className="fv-btn fv-btn--ghost" onClick={() => p.onAskMora(`Was weißt du zu „${sel.name}“?`)}>MÔRA fragen</button>
              </div>
            </div>
          ) : null}
          <p className="fv-eyebrow">Aktionen</p>
          <div className="fv-actions">
            {canFolder ? <button type="button" className="fv-action" onClick={() => setForm('folder')} data-testid="fv-new-folder"><FolderPlus size={18} /><span><b>Ordner anlegen</b><small>wird ein neuer Mond</small></span></button> : null}
            {canInside ? <button type="button" className="fv-action" onClick={() => setForm('note')} data-testid="fv-new-note"><StickyNote size={18} /><span><b>Notiz anlegen</b><small>wird ein Stern in {moon?.name}</small></span></button> : null}
            {canInside ? <button type="button" className="fv-action" onClick={() => fileRef.current?.click()} data-testid="fv-upload"><Upload size={18} /><span><b>Datei hochladen</b><small>in {moon?.name}</small></span></button> : null}
            <button type="button" className="fv-action" onClick={() => p.onAskMora(`Was ist in ${centerName} gerade wichtig?`)} data-testid="fv-ask"><Sparkles size={18} /><span><b>MÔRA fragen</b><small>Was ist hier gerade wichtig?</small></span></button>
          </div>
          {form ? (
            <form className="fv-form" onSubmit={submit} data-testid="fv-form">
              <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={form === 'folder' ? 'Name des Ordners' : 'Titel der Notiz'} aria-label={form === 'folder' ? 'Name des Ordners' : 'Titel der Notiz'} data-testid="fv-form-input" maxLength={120} />
              <button type="submit" className="fv-btn" disabled={busy || !text.trim()}>{busy ? 'Legt an …' : 'Anlegen'}</button>
              <button type="button" className="fv-btn fv-btn--ghost" onClick={() => setForm(null)}>Abbrechen</button>
            </form>
          ) : null}
          {msg ? <p className="fv-msg" role="status" data-tone={msg.tone} data-testid="fv-msg">{msg.text}</p> : null}
          <input ref={fileRef} type="file" hidden onChange={onFile} data-testid="fv-file" />
          <p className="fv-eyebrow"><MoraStone size={14} /> Live-Hinweise</p>
          <ul className="fv-hints" data-testid="fv-hints">{hints.map((h) => <li key={h}>{h}</li>)}</ul>
        </aside>
      </div>
    </div>
  );
}

export { TASKS_PLANET };
