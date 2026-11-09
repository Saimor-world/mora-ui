'use client';
import './workbench.css';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, FileText, Maximize2, PenLine, StickyNote } from 'lucide-react';
import { GlassOrb, glassVariantFor } from '@/components/world/GlassOrb';
import { planetColor } from '@/features/home/cockpit/Scene';
import type { DemoMoon, DemoPlanet } from '@/lib/demo/morgenrot/structure';
import { stripFiktiv } from '@/lib/demo/morgenrot/stripFiktiv';
import { fetchNodeDetails } from '@/lib/api/orgClient';
import { useUpdateNode } from '@/lib/queries/useNodes';
import { useDayActions } from '@/lib/lea/useDayActions';
import { extractHeadings, renderMarkdown } from '@/lib/docs/markdown';
import { shortDate } from '@/lib/lea/world';
import { DueDate } from './DueDate';
import type { DeptWork, MoonWork, WorkTask } from '@/lib/universe/deptWork';
import { useMoraPresence } from '@/lib/mora/moraPresence';

const ORB = 260;
const MOON = 104;
const clean = (s: string) => stripFiktiv(s) || s;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const kindLabel = (meta: string, name = '') => {
  const s = `${meta} ${name}`;
  if (/\.pdf\b|\bpdf\b/i.test(s)) return 'PDF';
  if (/\.docx?\b|\bdocx?\b|\bword\b/i.test(s)) return 'Word';
  if (/note/i.test(s)) return 'Notiz';
  if (/document|file|\bdoc\b/i.test(s)) return 'Dokument';
  return 'Dokument';
};
const dueLabel = (t: WorkTask) => (!t.due ? '' : t.dueToday ? 'heute' : t.overdue ? `seit ${shortDate(t.due)}` : shortDate(t.due));

/** Wohin ein Objekt fliegt: Mittelpunkt des angeklickten Elements im Fenster. */
export type Origin = { x: number; y: number; r: number };
export const originOf = (el: Element | null | undefined): Origin | null => {
  if (!el) return null;
  const b = el.getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2, r: Math.max(b.width, b.height) };
};

/** Monde links und rechts des Planeten, nie über oder unter ihm (dort stehen Name und See). */
function moonSlots(n: number) {
  const left = Math.ceil(n / 2), right = n - left;
  const spread = (k: number, count: number, a0: number, a1: number) => (count === 1 ? (a0 + a1) / 2 : a0 + (k * (a1 - a0)) / (count - 1));
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const isLeft = i % 2 === 0, k = Math.floor(i / 2);
    const deg = isLeft ? spread(k, left, 216, 146) : spread(k, right, -34, 34);
    const a = (deg * Math.PI) / 180;
    out.push({ x: Math.cos(a), y: Math.sin(a) });
  }
  return out;
}

/** Leuchten auf einem Bogen um einen Mittelpunkt (Grad, 0 = rechts, im Uhrzeigersinn). */
function arc(count: number, from: number, to: number, r: number) {
  return Array.from({ length: count }, (_, k) => {
    const deg = count === 1 ? (from + to) / 2 : from + (k * (to - from)) / (count - 1);
    const a = (deg * Math.PI) / 180;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
}

/**
 * Die Abteilung als Arbeitsplatz: der Planet in der Mitte, seine echten Ordner als Monde,
 * Dokumente als helle Punkte auf dem Mond, offene Aufgaben als warme Lichter, die ihn umkreisen.
 */
export function StationPlanet({
  planet, work, space, colorIndex, activeMoon, leaving, watch, onMoon, onTask, onOpenDept,
}: {
  planet: DemoPlanet;
  work: DeptWork;
  space?: string | null;
  colorIndex?: number;
  activeMoon: string | null;
  leaving?: boolean;
  watch?: Set<string>;
  onMoon: (id: string, origin: Origin | null) => void;
  onTask: (id: string, origin: Origin | null) => void;
  onOpenDept?: () => void;
}) {
  const title = clean(planet.title);
  const variant = glassVariantFor(title);
  const slots = useMemo(() => moonSlots(planet.moons.length), [planet.moons.length]);
  const loose = arc(Math.min(work.loose.length, 9), 238, 302, ORB / 2 + 30);
  return (
    <div className={`ck-open ck-open--orbit ws-station${leaving ? ' is-leaving' : ''}`} data-testid={`planet-${planet.id}`} style={colorIndex !== undefined ? planetColor(colorIndex) : undefined}>
      <i className="ws-path" aria-hidden />
      <div className="ck-open__core" aria-hidden>
        <GlassOrb size={ORB} variant={variant} className="ck-opal ck-opal--true">
          <span className="ck-opal__milk" aria-hidden />
          <span className="ck-opal__iris" aria-hidden />
          <span className="ck-opal__spec" aria-hidden />
        </GlassOrb>
      </div>
      {work.loose.slice(0, 9).map((t, k) => (
        <button key={t.id} type="button" className="ws-light ws-light--planet" data-overdue={t.overdue ? '1' : undefined} data-testid={`task-light-${t.id}`}
          style={{ left: `calc(50% + ${loose[k].x}px)`, top: `calc(30% + ${loose[k].y}px)`, ['--d' as string]: `${k * 0.7}s` }}
          title={t.title} aria-label={t.title} onClick={(e) => onTask(t.id, originOf(e.currentTarget))}><i /></button>
      ))}
      <div className="ck-moons ws-moons">
        {planet.moons.map((m, i) => {
          const w = work.moons.get(m.id);
          const s = slots[i];
          const disabled = Boolean(m.loadError || m.disabled);
          const docs = w?.docs ?? [];
          const open = w?.open ?? [];
          const docPts = arc(Math.min(docs.length, 7), 238, 302, MOON / 2 + 12);
          const lights = arc(Math.min(open.length, 7), s.x < 0 ? 212 : -32, s.x < 0 ? 140 : 40, MOON / 2 + 24);
          return (
            <div key={m.id} className="ws-moon" style={{ left: `calc(50% + ${(s.x * 31).toFixed(2)}%)`, top: `calc(30% + ${Math.round(s.y * 175)}px)`, ['--i' as string]: i }} data-active={activeMoon === m.id ? '1' : undefined}>
              <button type="button" className="ck-moon ws-moon__btn" aria-pressed={activeMoon === m.id} disabled={disabled} data-testid={`moon-${m.id}`}
                data-watch={watch?.has(m.id) ? 'true' : undefined} title={disabled ? (m.hint || 'Ordner gerade nicht ladbar') : undefined}
                onClick={disabled ? undefined : (e) => onMoon(m.id, originOf(e.currentTarget.querySelector('.glass-orb')))}>
                <span className="ck-moon__body ws-moon__body">
                  <GlassOrb size={MOON} variant={variant} className="ck-opal ck-opal--true" />
                  {docs.slice(0, 7).map((f, k) => <i key={f.id} className="ck-moon__doc ws-doc" style={{ ['--bx' as string]: `${docPts[k].x}px`, ['--by' as string]: `${docPts[k].y}px` }} aria-hidden />)}
                  {watch?.has(m.id) ? <span className="ck-planet__ring" data-testid={`moon-ring-${m.id}`} aria-hidden /> : null}
                  {w?.overdue ? <span className="ck-planet__count" data-testid={`moon-count-${m.id}`} aria-label={`${w.overdue} überfällig`}>{w.overdue}</span> : null}
                </span>
                <b>{clean(m.title)}</b>
                <small>{disabled ? (m.hint || 'Ordner gerade nicht ladbar') : [plural(docs.length, 'Dokument', 'Dokumente'), open.length ? `${open.length} offen` : ''].filter(Boolean).join(' · ')}</small>
              </button>
              {open.slice(0, 7).map((t, k) => (
                <button key={t.id} type="button" className="ws-light" data-overdue={t.overdue ? '1' : undefined} data-testid={`task-light-${t.id}`}
                  style={{ left: `${lights[k].x}px`, top: `${lights[k].y}px`, ['--d' as string]: `${(i * 3 + k) * 0.6}s` }}
                  title={t.title} aria-label={t.title} onClick={(e) => onTask(t.id, originOf(e.currentTarget))}><i /></button>
              ))}
            </div>
          );
        })}
      </div>
      <div className="ck-horizon" style={{ ['--glass' as string]: `url(/universe/glass/half.png)` }}><div className="ck-horizon__img" /></div>
      <h2 className="ck-horizon__title ws-title" style={onOpenDept ? { cursor: 'pointer' } : undefined} onClick={onOpenDept}>
        {title}
        {space ? <small>{clean(space)}</small> : null}
        {work.open ? <span className="ws-title__n">{work.open} offen{work.overdue ? <em> · {work.overdue} überfällig</em> : null}</span> : null}
      </h2>
    </div>
  );
}

type View = { kind: 'moon'; task?: string } | { kind: 'doc'; id: string; folio?: boolean } | { kind: 'task'; id: string };

/**
 * Nahansicht: das angeklickte Objekt kommt nach vorn und wird zur lesbaren Arbeitsfläche – im selben Raum,
 * der Himmel dahinter wird nur leiser. Keine Box über der Szene, kein Weiß.
 */
export function WorkSurface({
  planet, moon, work, task, origin, companyId, owner, colorIndex, onClose,
}: {
  planet: DemoPlanet;
  moon: DemoMoon | null;
  work: DeptWork;
  /** Direkt eine Aufgabe (Licht angeklickt). */
  task?: WorkTask | null;
  origin: Origin | null;
  companyId: string | null;
  owner: string;
  colorIndex?: number;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>(task ? { kind: 'task', id: task.id } : { kind: 'moon' });
  const [phase, setPhase] = useState<'from' | 'in' | 'out'>('from');
  const ref = useRef<HTMLElement>(null);
  const flushDoc = useRef<(() => void) | null>(null);
  const [vars, setVars] = useState<React.CSSProperties>({});

  // Anflug vom Objekt: Startpunkt = Ort des Mondes/Lichts relativ zur Mitte der Fläche.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    const o = origin ?? { x: b.left + b.width / 2, y: b.top + b.height / 2, r: 80 };
    const bridge = document.querySelector('.bridge')?.getBoundingClientRect().top;
    // Der Mond selbst wächst zur Scheibe: Start als Kreis in Mondgröße an seinem Ort.
    const k = (n: number) => Math.max(0.04, Math.min(0.5, o.r / Math.max(1, n))).toFixed(3);
    setVars({
      ['--fx' as string]: `${Math.round(o.x - (b.left + b.width / 2))}px`,
      ['--fy' as string]: `${Math.round(o.y - (b.top + b.height / 2))}px`,
      ['--fkx' as string]: k(el.offsetWidth),
      ['--fky' as string]: k(el.offsetHeight),
      ...(bridge && bridge > 300 ? { ['--ws-bottom' as string]: `${Math.round(window.innerHeight - bridge + 120)}px` } : {}),
    });
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('in')));
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (phase === 'in') ref.current?.focus({ preventScroll: true }); }, [phase]);

  const size = view.kind === 'task' ? 'task' : view.kind === 'doc' && view.folio ? 'folio' : 'full';

  // MÔRA: außerhalb der Lesefläche parkieren (nie über Plane/Topbar/Dock). Ohne Dock-Dateien.
  const [rest, setRest] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      if (phase !== 'in') return;
      const hull = document.querySelector('.bridge__hull')?.getBoundingClientRect()
        ?? document.querySelector('.bridge')?.getBoundingClientRect();
      const surfaceEl = document.querySelector('.ws-surface') as HTMLElement | null;
      // getBoundingClientRect während Anflug ist transformiert – Layout-Box nutzen.
      let surface: DOMRect | null = null;
      if (surfaceEl) {
        const r = surfaceEl.getBoundingClientRect();
        const transformed = surfaceEl.getAttribute('data-phase') !== 'in';
        if (transformed) {
          const top = parseFloat(getComputedStyle(surfaceEl).top) || r.top;
          const bottomClear = parseFloat(surfaceEl.style.getPropertyValue('--ws-bottom')) || 0;
          const width = surfaceEl.offsetWidth;
          const left = (window.innerWidth - width) / 2;
          const height = size === 'task' ? surfaceEl.offsetHeight : Math.max(0, window.innerHeight - top - bottomClear);
          surface = { left, top, right: left + width, bottom: top + height, width, height, x: left, y: top, toJSON() {} } as DOMRect;
        } else {
          surface = r;
        }
      }
      if (!hull || hull.top < 200) { setRest(null); return; }
      const work = size === 'folio' || size === 'task' || size === 'full';
      // Visuelle Halbachse der fliegenden Figur (~scale .7 × zoom .72 × ~150px) + Luft
      const half = work ? 56 : 60; // Mitte + visuelle Halbbreite der scale-.7-Figur
      const topbar = document.querySelector('.ck-top')?.getBoundingClientRect();
      const topRight = document.querySelector('.ck-top__r')?.getBoundingClientRect();
      const topClear = Math.max(topbar?.bottom ?? 52, topRight?.bottom ?? 0) + half + 10;
      const bottomClear = hull.top - half - 16;
      const edgeR = window.innerWidth - half - 12;
      const edgeL = half + 12;
      let x: number;
      let y: number;
      if (surface) {
        const rightGap = window.innerWidth - surface.right;
        const leftGap = surface.left;
        const need = half * 2 + 12;
        if (rightGap >= need) {
          x = Math.min(edgeR, surface.right + half + 28);
          y = Math.min(Math.max((surface.top + surface.bottom) / 2, topClear), bottomClear);
        } else if (leftGap >= need) {
          x = Math.max(edgeL, surface.left - half - 28);
          y = Math.min(Math.max((surface.top + surface.bottom) / 2, topClear), bottomClear);
        } else {
          // Kein Seitenraum: über der Plane, rechts – Figur darf die Fläche nicht schneiden.
          x = edgeR;
          const above = surface.top - half - 14;
          y = above >= topClear ? above : topClear;
        }
        // Harte Kollisionsprüfung – solange Überlapper, nach oben/außen schieben.
        const hits = () => (
          x + half > surface.left + 1 && x - half < surface.right - 1 &&
          y + half > surface.top + 1 && y - half < surface.bottom - 1
        );
        if (hits()) {
          x = edgeR;
          y = Math.max(topClear, surface.top - half - 14);
        }
        if (hits()) {
          x = edgeL;
          y = Math.max(topClear, surface.top - half - 14);
        }
        if (hits()) {
          // Kein freier Himmel: Figur bleibt ruhig im Dock (nicht über der Lesefläche).
          setRest(null);
          useMoraPresence.getState().goHome();
          return;
        }
      } else {
        x = edgeR;
        y = Math.min(Math.max((topClear + bottomClear) / 2, topClear), bottomClear);
      }
      setRest({ x: Math.round(Math.min(edgeR, Math.max(edgeL, x))), y: Math.round(y) });
    };
    const raf = requestAnimationFrame(() => place());
    const raf2 = requestAnimationFrame(() => {
      requestAnimationFrame(() => { place(); });
    });
    window.addEventListener('resize', place);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => place()) : null;
    const surf = document.querySelector('.ws-surface');
    if (surf && ro) ro.observe(surf);
    const t = window.setTimeout(place, 50);
    const t2 = window.setTimeout(place, 320);
    return () => { cancelAnimationFrame(raf); cancelAnimationFrame(raf2); window.clearTimeout(t); window.clearTimeout(t2); window.removeEventListener('resize', place); ro?.disconnect(); };
  }, [view, size, phase]);

  useLayoutEffect(() => {
    if (!rest) {
      useMoraPresence.getState().goHome();
      return;
    }
    // Dock-Flug neu anstoßen: kurz home, dann Anker (sonst bleibt alter Versatz hängen).
    useMoraPresence.getState().goHome();
    const id = window.setTimeout(() => {
      useMoraPresence.getState().goTo('[data-mora-anchor="work"]', 'work');
    }, 40);
    return () => window.clearTimeout(id);
  }, [rest]);

  const close = useCallback(() => {
    flushDoc.current?.();
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { onClose(); return; }
    setPhase('out');
    window.setTimeout(onClose, 380);
  }, [onClose]);
  const back = useCallback(() => {
    if (view.kind === 'doc' && view.folio) { flushDoc.current?.(); setView({ kind: 'doc', id: view.id }); return; }
    if (view.kind === 'doc') { flushDoc.current?.(); setView({ kind: 'moon' }); return; }
    if (view.kind === 'moon' && view.task) { setView({ kind: 'moon' }); return; }
    close();
  }, [view, close]);

  // Esc: eine Ebene zurück. Capture, damit das Universe nicht gleichzeitig hinausfliegt.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[data-ws-pop]')) return; // offener Datumswähler schließt zuerst sich selbst
      const t = e.target as HTMLElement | null;
      if (t && t.tagName === 'INPUT' && (t as HTMLInputElement).value && t.dataset.clearOnEsc) { (t as HTMLInputElement).value = ''; e.preventDefault(); return; }
      e.preventDefault();
      back();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [back]);

  const mw: MoonWork | undefined = moon ? work.moons.get(moon.id) : undefined;
  const allTasks = useMemo(() => {
    const list: WorkTask[] = [...work.loose];
    work.moons.forEach((w) => list.push(...w.open, ...w.done));
    return list;
  }, [work]);
  const current = view.kind === 'task' ? allTasks.find((t) => t.id === view.id) ?? (task?.id === view.id ? task : null) : null;
  const folderOf = (t: WorkTask | null) => (t?.folderId ? planet.moons.find((m) => m.id === t.folderId) ?? null : null);
  // Lesefläche: Unterkante immer über Hull-Oberkante (getBoundingClientRect + ResizeObserver), 16px Luft.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const topbar = document.querySelector('.ck-top')?.getBoundingClientRect();
      const topRight = document.querySelector('.ck-top__r')?.getBoundingClientRect();
      const topEdge = Math.max(topbar?.bottom ?? 0, topRight?.bottom ?? 0, 48) + 8;
      // Plane deckt Dock-Chrome (z-index 70): Unterkante knapp über Icon-Leiste → max. Lesehöhe.
      const pill = document.querySelector('.bridge__pill')?.getBoundingClientRect();
      const hull = document.querySelector('.bridge__hull')?.getBoundingClientRect()
        ?? document.querySelector('.bridge')?.getBoundingClientRect();
      // Nur Icon-Leiste als Boden – Status-Chips liegen auf gleicher Höhe, Status-Box ist höher.
      const floor = pill?.top ?? (hull && hull.top > 120 ? hull.top + 260 : window.innerHeight - 88);
      const gap = 8;
      const bottomClear = Math.max(72, Math.round(window.innerHeight - floor + gap));
      el.style.setProperty('--ws-top', `${Math.round(size === 'task' ? topEdge + 4 : topEdge)}px`);
      el.style.setProperty('--ws-bottom', `${bottomClear}px`);
    };
    apply();
    const raf = requestAnimationFrame(apply);
    window.addEventListener('resize', apply);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null;
    const hullEl = document.querySelector('.bridge__hull') ?? document.querySelector('.bridge');
    const pillEl = document.querySelector('.bridge__pill');
    if (hullEl && ro) ro.observe(hullEl);
    if (pillEl && ro) ro.observe(pillEl);
    ro?.observe(el);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', apply); ro?.disconnect(); };
  }, [size]);


  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-os-work', size);
    return () => { root.removeAttribute('data-os-work'); };
  }, [size]);

  return (
    <section
      ref={ref}
      tabIndex={-1}
      className={`ws-surface ws-surface--${size}`}
      data-phase={phase}
      data-testid="work-surface"
      data-view={view.kind}
      aria-label={view.kind === 'task' ? current?.title : clean(moon?.title ?? planet.title)}
      style={{ ...vars, ...(colorIndex !== undefined ? planetColor(colorIndex) : {}) }}
    >
      <span className="ws-face" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ws-face__glass" src={`/universe/glass/${glassVariantFor(clean(planet.title))}.png`} alt="" draggable={false} />
        <i className="ws-face__shade" />
      </span>
      {rest ? createPortal(<span key={`${rest.x},${rest.y}`} className="mora-anchor mora-anchor--rest" data-mora-anchor="work" style={{ left: rest.x, top: rest.y }} aria-hidden />, document.body) : null}
      {view.kind === 'moon' && moon ? (
        <MoonDesk planet={planet} moon={moon} w={mw} companyId={companyId} owner={owner} expanded={view.task ?? null}
          onBack={close} onDoc={(id) => setView({ kind: 'doc', id })} onTask={(id) => setView(view.task === id ? { kind: 'moon' } : { kind: 'moon', task: id })} />
      ) : null}
      {view.kind === 'doc' && moon ? (
        <DocDesk id={view.id} moon={moon} name={mw?.docs.find((d) => d.id === view.id)?.name ?? ''} folio={Boolean(view.folio)}
          onBack={back} onFolio={() => setView({ kind: 'doc', id: view.id, folio: true })} flushRef={flushDoc} />
      ) : null}
      {view.kind === 'task' && current ? (
        <TaskDesk task={current} planet={planet} folder={folderOf(current)} owner={current.assignee ?? owner} companyId={companyId} onBack={back} backLabel={clean(planet.title)} />
      ) : null}
    </section>
  );
}

function Head({ onBack, backLabel, children, actions }: { onBack: () => void; backLabel: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="ws-head" data-actions={actions ? '1' : undefined}>
      <button type="button" className="ws-back" onClick={onBack} aria-label={`Zurück zu ${backLabel}`} data-testid="work-back"><ArrowLeft size={17} /></button>
      <div className="ws-head__t">{children}</div>
      {actions ? <div className="ws-head__act">{actions}</div> : null}
    </header>
  );
}

function TaskList({ open, done, expanded, owner, companyId, onToggle, onOpen }: {
  open: WorkTask[]; done: WorkTask[]; expanded: string | null; owner: string; companyId: string | null;
  onToggle: (t: WorkTask) => void; onOpen: (id: string) => void;
}) {
  const overdue = open.filter((t) => t.overdue);
  const today = open.filter((t) => !t.overdue && t.dueToday);
  const later = open.filter((t) => !t.overdue && !t.dueToday);
  const groups: { key: string; label: string; items: WorkTask[] }[] = [
    { key: 'overdue', label: 'Überfällig', items: overdue },
    { key: 'today', label: 'Heute', items: today },
    { key: 'later', label: 'Später', items: later },
  ].filter((g) => g.items.length);
  const flat = groups.flatMap((g) => g.items);
  const [focus, setFocus] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const openKey = open.map((t) => t.id).join('|');
  useEffect(() => { setFocus(0); }, [openKey]);
  const onKey = (e: React.KeyboardEvent) => {
    if (!flat.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocus((i) => Math.min(flat.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocus((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); onOpen(flat[focus]?.id); }
    else if (e.key === ' ') { e.preventDefault(); const t = flat[focus]; if (t) onToggle(t); }
  };
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${focus}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [focus]);
  const row = (t: WorkTask, idx: number, doneRow = false) => (
    <div key={t.id} className="ws-row ws-row--task" data-overdue={t.overdue ? '1' : undefined} data-done={doneRow ? '1' : undefined} data-focus={focus === idx && !doneRow ? '1' : undefined} data-idx={doneRow ? undefined : idx} data-testid={`work-task-${t.id}`}>
      <button type="button" className="ws-check" aria-pressed={doneRow} aria-label={doneRow ? `${t.title} wieder öffnen` : `${t.title} erledigen`} onClick={() => onToggle(t)} data-testid={`work-check-${t.id}`}>{doneRow ? <Check size={13} strokeWidth={2.6} /> : null}</button>
      <button type="button" className="ws-row__t" aria-expanded={expanded === t.id} onClick={() => onOpen(t.id)}>{t.title}</button>
      {t.assignee ? <span className="ws-who">{t.assignee}</span> : null}
      {t.due ? <span className="ws-due">{dueLabel(t)}</span> : null}
      {expanded === t.id ? <div className="ws-row__more" ref={(el) => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}><TaskFacts task={t} owner={t.assignee ?? owner} companyId={companyId} compact /></div> : null}
    </div>
  );
  let idx = 0;
  return (
    <div className="ws-list ws-list--tasks" ref={listRef} tabIndex={0} role="listbox" aria-label="Aufgaben" onKeyDown={onKey} data-testid="work-task-list">
      {groups.map((g) => (
        <div key={g.key} className="ws-group" data-group={g.key}>
          <p className="ws-group__label">{g.label} <span>{g.items.length}</span></p>
          {g.items.map((t) => { const i = idx++; return row(t, i); })}
        </div>
      ))}
      {done.length ? (
        <details className="ws-group" open={done.some((t) => expanded === t.id) || undefined}>
          <summary>{done.length === 1 ? '1 erledigt' : `${done.length} erledigt`}</summary>
          {done.map((t) => row(t, -1, true))}
        </details>
      ) : null}
    </div>
  );
}

function MoonDesk({ planet, moon, w, companyId, owner, expanded, onBack, onDoc, onTask }: {
  planet: DemoPlanet; moon: DemoMoon; w?: MoonWork; companyId: string | null; owner: string; expanded: string | null;
  onBack: () => void; onDoc: (id: string) => void; onTask: (id: string) => void;
}) {
  const { setDone, addTask } = useDayActions(companyId);
  // Gerade abgehakte bleiben durchgestrichen stehen (zurücknehmbar), bis die Fläche schließt.
  const [recent, setRecent] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const docs = w?.docs ?? [];
  const open = w?.open ?? [];
  const done = (w?.done ?? []).filter((t) => recent.includes(t.id));
  const toggle = async (t: WorkTask) => {
    if (!t.done) setRecent((r) => (r.includes(t.id) ? r : [...r, t.id]));
    await setDone(t.raw, !t.done);
  };
  const create = async () => {
    const v = title.trim();
    if (!v || busy) return;
    setBusy(true);
    const ok = await addTask(v, moon.id, due || null);
    setBusy(false);
    if (ok) { setTitle(''); setDue(''); }
  };
  return (
    <>
      <Head onBack={onBack} backLabel={clean(planet.title)}>
        <h2>{clean(moon.title)}</h2>
        <p>{clean(planet.title)}{w?.overdue ? <em> · {w.overdue} überfällig</em> : null}</p>
      </Head>
      <div className="ws-desk">
        <div className="ws-col" data-testid="work-docs">
          <h3>Dokumente <span>{docs.length}</span></h3>
          <div className="ws-list">
            {docs.map((d) => (
              <button key={d.id} type="button" className="ws-row ws-row--doc" onClick={() => onDoc(d.id)} data-testid={`work-doc-${d.id}`}>
                {/note/i.test(d.meta) ? <StickyNote size={15} aria-hidden /> : <FileText size={15} aria-hidden />}
                <b>{clean(d.name)}</b><span>{kindLabel(d.meta, d.name)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="ws-col" data-testid="work-tasks">
          <h3>Aufgaben <span>{open.length}</span></h3>
          <TaskList
            open={open}
            done={done}
            expanded={expanded}
            owner={owner}
            companyId={companyId}
            onToggle={(task) => void toggle(task)}
            onOpen={onTask}
          />
          <form className="ws-new" onSubmit={(e) => { e.preventDefault(); void create(); }}>
            <span className="ws-check ws-check--ghost" aria-hidden />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Neue Aufgabe" aria-label="Neue Aufgabe" data-clear-on-esc="1" data-testid="work-new-title" />
            <DueDate value={due || null} onChange={(v) => setDue(v ?? '')} clearable testId="work-new-due" />
          </form>
        </div>
      </div>
    </>
  );
}

function isPdfDoc(name: string, type?: string | null) {
  const n = (name || '').toLowerCase();
  const ty = (type || '').toLowerCase();
  return ty === 'pdf' || n.endsWith('.pdf');
}

/** Minimales einseitiges PDF für Fixture-Vorschau (kein externes File nötig). */
function fixturePdfDataUrl(title: string): string {
  const safe = title.replace(/[()\\]/g, ' ').slice(0, 60);
  const stream = `BT /F1 18 Tf 72 720 Td (${safe}) Tj T* /F1 12 Tf (SAIMOR · Fixture-PDF) Tj ET`;
  const body =
    '%PDF-1.4\n' +
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n' +
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n' +
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n' +
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj\n` +
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n' +
    'trailer<< /Root 1 0 R >>\n%%EOF\n';
  // Prefer blob URL at call site; data URL works in iframe for tiny PDFs.
  return `data:application/pdf;base64,${btoa(body)}`;
}

function DocDesk({ id, moon, name, folio, onBack, onFolio, flushRef }: {
  id: string; moon: DemoMoon; name: string; folio?: boolean;
  onBack: () => void; onFolio: () => void; flushRef: React.MutableRefObject<(() => void) | null>;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const q = useQuery({ queryKey: ['node', id], queryFn: () => fetchNodeDetails(id), staleTime: 30_000 });
  const upd = useUpdateNode(moon.id);
  const [title, setTitle] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const dirty = useRef(false);
  const readRef = useRef<HTMLDivElement>(null);
  const node = q.data as ({ id?: string; title?: string; name?: string; content?: string; type?: string; updated_at?: string; metadata?: Record<string, unknown>; folder_id?: string | null } | undefined);
  const t = title ?? (node?.title || name);
  const c = body ?? (node?.content ?? '');
  const fileName = node?.name || name;
  const pdf = isPdfDoc(fileName, node?.type);
  const headings = useMemo(() => (pdf || editing ? [] : extractHeadings(c)), [c, pdf, editing]);
  const save = useCallback(() => {
    if (!dirty.current) return;
    dirty.current = false;
    upd.mutate({ id, payload: { title: t, content: c } }, {
      onSuccess: () => {
        setSaved(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
        qc.setQueryData(['node', id], (old: object | undefined) => ({ ...(old ?? {}), title: t, content: c }));
        qc.invalidateQueries({ queryKey: ['lea-world', 'nodes'] });
      },
    });
  }, [id, t, c, upd, qc]);
  flushRef.current = save;
  useEffect(() => {
    if (!dirty.current) return;
    const h = window.setTimeout(save, 900);
    return () => window.clearTimeout(h);
  }, [t, c, save]);
  useEffect(() => () => { flushRef.current = null; }, [flushRef]);
  const edited = node?.updated_at ? new Date(node.updated_at) : null;
  const origin = typeof node?.metadata?.origin === 'string' ? node.metadata.origin : null;
  const jump = (hid: string) => {
    const root = readRef.current;
    const el = root?.querySelector(`#${CSS.escape(hid)}`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  useEffect(() => {
    const root = readRef.current;
    if (!root || !folio) return;
    const sync = () => {
      const atEnd = root.scrollTop + root.clientHeight >= root.scrollHeight - 4;
      root.dataset.atEnd = atEnd ? '1' : '0';
    };
    sync();
    root.addEventListener('scroll', sync, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
    ro?.observe(root);
    return () => { root.removeEventListener('scroll', sync); ro?.disconnect(); };
  }, [folio, c, pdf, editing]);
  return (
    <>
      <Head onBack={onBack} backLabel={clean(moon.title)} actions={<>
        {pdf ? null : (
          <button type="button" className="ws-back" aria-pressed={editing} aria-label={editing ? 'Fertig' : 'Bearbeiten'} onClick={() => { if (editing) save(); setEditing((v) => !v); }} data-testid="work-doc-edit">{editing ? <Check size={16} /> : <PenLine size={16} />}</button>
        )}
        {folio ? null : (
          <button type="button" className="ws-back" aria-label="Lesen" onClick={() => { save(); onFolio(); }} data-testid="work-doc-open"><Maximize2 size={15} /></button>
        )}
      </>}>
        <input className="ws-doc__title" value={t} onChange={(e) => { dirty.current = true; setTitle(e.target.value); }} aria-label="Titel" data-testid="work-doc-title" />
        <p>{clean(moon.title)}{fileName && fileName !== t ? ` · ${fileName}` : ''}{origin ? ` · ${origin}` : ''}{saved ? ` · gesichert ${saved}` : edited && !Number.isNaN(edited.getTime()) ? ` · ${edited.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}` : ''}</p>
      </Head>
      <div className="ws-docview" data-folio={folio ? '1' : undefined} data-pdf={pdf ? '1' : undefined} data-editing={editing ? '1' : undefined}>
        {folio && headings.length > 1 ? (
          <nav className="ws-docview__toc" aria-label="Inhalt">
            <p className="ws-docview__toc-label">Inhalt</p>
            <ol>
              {headings.map((h) => (
                <li key={h.id} data-level={h.level}>
                  <button type="button" onClick={() => jump(h.id)}>{h.text}</button>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <div className="ws-docview__main" ref={readRef}>
          {pdf ? (
            <iframe className="ws-doc__pdf" title={t} src={fixturePdfDataUrl(t)} data-testid="work-doc-pdf" />
          ) : editing ? (
            <textarea className="ws-doc__body" value={c} onChange={(e) => { dirty.current = true; setBody(e.target.value); }} aria-label={t} data-testid="work-doc-body" disabled={q.isLoading} spellCheck autoFocus />
          ) : (
            <div className="ws-doc__read" role="document" tabIndex={0} aria-label={t} data-testid="work-doc-read" aria-busy={q.isLoading}
              onDoubleClick={() => setEditing(true)}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(c) }} />
          )}
        </div>
      </div>
    </>
  );
}

function TaskDesk({ task, planet, folder, owner, companyId, onBack, backLabel }: {
  task: WorkTask; planet: DemoPlanet; folder: DemoMoon | null; owner: string; companyId: string | null; onBack: () => void; backLabel: string;
}) {
  const { setDone, update } = useDayActions(companyId);
  const [title, setTitle] = useState(task.title);
  useEffect(() => setTitle(task.title), [task.title]);
  const commitTitle = () => { const v = title.trim(); if (v && v !== task.title) void update(task.raw, { title: v }); else setTitle(task.title); };
  const crumb = [clean(planet.title), folder ? clean(folder.title) : null].filter(Boolean).join(' · ');
  return (
    <>
      <Head onBack={onBack} backLabel={backLabel}>
        <p className="ws-head__ctx" title={crumb}>{crumb}</p>
      </Head>
      <div className="ws-task" data-done={task.done ? '1' : undefined} data-overdue={task.overdue ? '1' : undefined} data-testid="work-task-view">
        <button type="button" className="ws-check ws-check--big" aria-pressed={task.done} aria-label={task.done ? 'Wieder öffnen' : 'Erledigen'} onClick={() => void setDone(task.raw, !task.done)} data-testid="work-task-done">{task.done ? <Check size={20} strokeWidth={2.4} /> : null}</button>
        <textarea className="ws-task__title" value={title} rows={2} onChange={(e) => setTitle(e.target.value)} onBlur={commitTitle}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
          aria-label="Aufgabe" data-testid="work-task-title" />
      </div>
      <TaskFacts task={task} owner={owner} companyId={companyId} />
    </>
  );
}

function TaskFacts({ task, owner, companyId, compact = false }: { task: WorkTask; owner: string; companyId: string | null; compact?: boolean }) {
  const { update } = useDayActions(companyId);
  return (
    <dl className="ws-facts" data-testid={`work-facts-${task.id}`}>
      <div><dt>Fällig</dt><dd>
        <DueDate value={task.due} onChange={(v) => { if (v) void update(task.raw, { due_date: v }); }} clearable="disabled" testId="work-task-due" />
      </dd></div>
      <div><dt>Verantwortlich</dt><dd>{owner || '–'}</dd></div>
      {/* In der Liste zeigt der Kreis den Status schon; ausführlich nur in der Einzelansicht. */}
      {compact ? null : <div><dt>Status</dt><dd>{task.done ? 'erledigt' : task.status === 'in_progress' ? 'in Arbeit' : 'offen'}</dd></div>}
    </dl>
  );
}
