'use client';
import './werkstatt.css';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';
import type { DeptWork, WorkTask } from '@/lib/universe/deptWork';
import { stripFiktiv } from '@/lib/demo/morgenrot/stripFiktiv';
import { shortDate } from '@/lib/lea/world';
import { useDayActions } from '@/lib/lea/useDayActions';
import { useMoraPresence } from '@/lib/mora/moraPresence';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { sceneFor } from '@/lib/os-prototype/scene';
import { arrangeBoard } from '../model/board';
import { cameraTo, roomStage, toScreen, worldFor, type Rect, type Stage, type World } from '../model/stage';
import { StageLayer, useStage } from './Stage';
import { WindowUniverse, type SkyPlanet } from './WindowUniverse';
import { WorkDock } from './WorkDock';
import { PaperSlip } from './PaperSlip';
import { Book } from './Book';
import { Mappe, weekNodesFrom } from './Mappe';
import { TaskSheet } from './TaskSheet';

export type Place = { kind: 'room' } | { kind: 'task'; id: string } | { kind: 'doc'; id: string } | { kind: 'planung' };
export const placeFromParam = (p: string | null): Place | null => {
  if (!p) return null;
  if (p === 'werkstatt') return { kind: 'room' };
  if (p === 'planung') return { kind: 'planung' };
  const [k, id] = p.split(':');
  if (k === 'aufgabe' && id) return { kind: 'task', id };
  if (k === 'dokument' && id) return { kind: 'doc', id };
  return null;
};

/** Der Raum (Bühnen-Einheiten im Raumbild 1920×1080). */
const ROOM = {
  board: { x: 257, y: 118, w: 574, h: 392 },
  window: { x: 1000, y: 84, w: 826, h: 572 },
  lectern: { x: 1420, y: 470, w: 280, h: 500 },
  lecternBook: { x: 1459, y: 482, w: 195, h: 122 },
  table: { x: 830, y: 630, w: 250, h: 300 },
  folder: { x: 853, y: 641, w: 193, h: 53 },
  shelf: { x: 0, y: 60, w: 112, h: 560 },
  desk: { x: 120, y: 560, w: 640, h: 120 },
  /** MÔRA sitzt auf der Fensterbank, links vom Pult; Größe in Einheiten passend zur Perspektive. */
  moraSeat: { x: 1150, y: 641, size: 112 },
  /** Messingschild vorn am Pultbrett. */
  plate: { x: 1556, y: 628 },
};
const CLOSE = {
  task: { img: '/werkstatt/room-schreibtisch.webp', sky: { x: 0, y: 0, w: 1920, h: 150 }, mora: { x: 420, y: 930 } },
  doc: { img: '/werkstatt/room-pult.webp', sky: { x: 200, y: 0, w: 1560, h: 720 }, mora: { x: 1640, y: 738 } },
  planung: { img: '/werkstatt/room-mappe.webp', sky: { x: 0, y: 0, w: 1920, h: 120 }, mora: { x: 360, y: 960 } },
};
const focusOf = (p: Place): Rect => (p.kind === 'task' ? ROOM.desk : p.kind === 'doc' ? ROOM.lecternBook : p.kind === 'planung' ? ROOM.folder : ROOM.board);
const EASE = 'cubic-bezier(.45,0,.2,1)';
/** Kamera in Ruhelage: Inline-Transform setzen (null = unverändert) und alle Fahrten auf dem Element beenden. */
function settle(el: HTMLElement, transform: string | null) {
  el.getAnimations().forEach((x) => x.cancel());
  if (transform !== null) el.style.transform = transform;
}
const reduced = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const clean = (s: string) => stripFiktiv(s) || s;
const box = (r: Rect): React.CSSProperties => ({ left: r.x, top: r.y, width: r.w, height: r.h });
/** 3 × 2 Plätze am Brett: 5 Karten + der Stapel „später“ – Karten breit genug für ganze Wörter und Namen. */
const PER_PAGE = 5;
/** Nahsicht im Licht der Welt: morgens Tageslicht und Lampe aus, nachts Lampenlicht. */
const closeImg = (kind: keyof typeof CLOSE, world: World) => (world === 'morgennebel' ? CLOSE[kind].img.replace('.webp', '-morgen.webp') : CLOSE[kind].img);
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

function useWorld(): World {
  const override = useOsShellStore((s) => s.phaseOverride);
  const [phase, setPhase] = useState<string>(() => override ?? sceneFor(new Date()).id);
  useEffect(() => {
    setPhase(override ?? sceneFor(new Date()).id);
    const t = window.setInterval(() => setPhase(useOsShellStore.getState().phaseOverride ?? sceneFor(new Date()).id), 60_000);
    return () => window.clearInterval(t);
  }, [override]);
  return worldFor(phase);
}

/**
 * MÔRA-Platz: die eine Dock-MÔRA fliegt hierher und sitzt still auf der Fläche. Der Anker ist so gesetzt, dass ihre
 * Unterkante auf `at.y` liegt; `size` (Einheiten) gibt ihre Höhe passend zur Perspektive (CSS-Variable fürs Dock-Bild).
 * Darunter ein weicher Kontaktschatten auf dem Holz.
 */
const MORA_PX = 95;
const FEET_PAD = 17; // transparenter Rand unter MÔRAs Füßen im Asset (px)
 // Höhe der fliegenden Dock-MÔRA in px (bei flightScale 0,7)
function MoraSeat({ at, stage, name }: { at: { x: number; y: number; size?: number }; stage: Stage; name: string }) {
  const size = at.size ?? 120;
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--wk-mora-scale', String(((size * stage.k) / MORA_PX).toFixed(3)));
    return () => { root.style.removeProperty('--wk-mora-scale'); };
  }, [size, stage.k]);
  const w = 82 / stage.k, h = MORA_PX / stage.k;
  const sw = size * 0.78, sh = size * 0.16;
  return (
    <>
      <span className="wk-seat-shadow" aria-hidden style={{ left: at.x - sw / 2, top: at.y - sh / 2, width: sw, height: sh }} />
      <span className="wk-seat" data-mora-anchor={name} style={{ left: at.x - w / 2, top: at.y - h + FEET_PAD / stage.k, width: w, height: h }} aria-hidden />
    </>
  );
}

export interface WerkstattProps {
  planet: DemoPlanet;
  work: DeptWork;
  planets: SkyPlanet[];
  companyId: string | null;
  today: string;
  /** Startort (Deep-Link ?platz=…) – ohne Anflug. */
  initial?: Place | null;
  /** Woher der Anflug kommt (Planet im Fenster). null = direkt. */
  fromSpace?: boolean;
  onExit: () => void;
}

export function Werkstatt({ planet, work, planets, companyId, today, initial, fromSpace = true, onExit }: WerkstattProps) {
  const stage = useStage();
  // Der Raum hat seine eigene Bühne (bei 4:3 verkleinert, damit Regal und Pult beide sichtbar bleiben).
  const room = useMemo(() => roomStage(stage), [stage]);
  const world = useWorld();
  const title = clean(planet.title);
  const roomRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLDivElement>(null);
  // Direkt (Deep-Link): gleich am Ort. Mit Anflug: erst in den Raum, dann zum Ort hinein (siehe unten).
  const [stack, setStack] = useState<Place[]>(() => (initial && initial.kind !== 'room' && !fromSpace ? [{ kind: 'room' }, initial] : [{ kind: 'room' }]));
  const afterLanding = useRef<Place | null>(initial && initial.kind !== 'room' && fromSpace ? initial : null);
  const [busy, setBusy] = useState(false);
  const [landed, setLanded] = useState(!fromSpace || reduced());
  const top = stack[stack.length - 1];
  const close = top.kind === 'room' ? null : top;

  // Aufgaben, Dokumente, Wochen – aus denselben Daten wie die Abteilung (useWorld → deptWork).
  const tasks = useMemo(() => {
    const l: WorkTask[] = [...work.loose];
    work.moons.forEach((m) => l.push(...m.open, ...m.done));
    return l;
  }, [work]);
  const board = useMemo(() => arrangeBoard(tasks, today, PER_PAGE), [tasks, today]);
  const allDocs = useMemo(() => {
    const l: { id: string; name: string; meta: string; folderId: string }[] = [];
    work.moons.forEach((m, fid) => m.docs.forEach((d) => l.push({ ...d, folderId: fid })));
    return l;
  }, [work]);
  const weeksDocs = allDocs.filter((d) => /wochenplan[\s_-]*kw/i.test(d.name));
  const docs = allDocs.filter((d) => !weeksDocs.includes(d));
  const planFolder = planet.moons.find((m) => /planung/i.test(m.title))?.id ?? weeksDocs[0]?.folderId ?? planet.moons[0]?.id ?? null;
  const weeks = useMemo(() => weekNodesFrom(weeksDocs, Number(today.slice(0, 4))), [weeksDocs, today]);
  const [lectern, setLectern] = useState<string | null>(null);
  const lecternDoc = docs.find((d) => d.id === lectern) ?? docs.find((d) => d.meta !== 'file') ?? docs[0] ?? null;
  const defaultWeekRows = useMemo(() => {
    const names = planet.moons.map((m) => clean(m.title)).filter((n) => n && !/^planung$/i.test(n)).slice(0, 3);
    return names.length > 0 ? names : [title || 'Aufgaben', 'Termine', 'Notizen'];
  }, [planet.moons, title]);

  // Arbeitsmodus am Dock + Welt (Dock folgt Licht der Welt).
  useLayoutEffect(() => {
    const root = document.documentElement;
    // Arbeitsmodus ab dem Anflug: das große Dock zieht sich zurück, während die Kamera durchs Fenster fährt.
    root.setAttribute('data-os-work', 'werkstatt');
    root.dataset.world = world;
    return () => { root.removeAttribute('data-os-work'); delete root.dataset.world; };
  }, [world]);

  // MÔRA setzt sich an den Ort, an dem man gerade ist.
  useEffect(() => {
    if (!landed || busy) return;
    const anchor = close ? `close-${close.kind}` : 'room';
    const t = window.setTimeout(() => useMoraPresence.getState().goTo(`[data-mora-anchor="wk-${anchor}"]`, 'work'), 60);
    return () => window.clearTimeout(t);
  }, [landed, busy, close]);
  useEffect(() => () => useMoraPresence.getState().goHome(), []);

  // Kamera ------------------------------------------------------------------------------------------
  const camFor = useCallback((r: Rect, fill: number, cap = 3.4) => {
    const s = toScreen(room, r);
    const c = cameraTo(s, window.innerWidth, window.innerHeight, fill);
    const k = Math.min(cap, c.scale);
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    return { k, tx: window.innerWidth / 2 - cx * k, ty: window.innerHeight / 2 - cy * k, s };
  }, [room]);

  // Anflug durch das Fenster: Kamera startet draußen (Scheiben füllen das Bild) und fährt in den Raum zurück.
  useLayoutEffect(() => {
    if (landed) return;
    const room = roomRef.current, rootEl = rootRef.current;
    if (!room || !rootEl || typeof room.animate !== 'function') { setLanded(true); return; }
    const c = camFor(ROOM.window, 1.5, 9);
    const a = room.animate([{ transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.k})` }, { transform: 'none' }], { duration: 1500, easing: EASE, fill: 'backwards' });
    rootEl.animate([{ opacity: 0 }, { opacity: 1, offset: 0.28 }, { opacity: 1 }], { duration: 1500, easing: 'linear', fill: 'backwards' });
    a.onfinish = () => { settle(room, ''); setLanded(true); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exit = useCallback(() => {
    if (busy) return;
    const room = roomRef.current, rootEl = rootRef.current;
    useMoraPresence.getState().goHome();
    if (!room || !rootEl || reduced() || typeof room.animate !== 'function') { onExit(); return; }
    setBusy(true);
    document.documentElement.removeAttribute('data-os-work');
    const c = camFor(ROOM.window, 1.5, 9);
    room.animate([{ transform: 'none' }, { transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.k})` }], { duration: 1200, easing: EASE, fill: 'forwards' });
    const f = rootEl.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 1200, easing: 'linear', fill: 'forwards' });
    f.onfinish = () => onExit();
  }, [busy, camFor, onExit]);

  // In ein Objekt hinein / wieder heraus.
  const zoom = useCallback((into: Place, dir: 'in' | 'out', done: () => void) => {
    const room = roomRef.current, layer = closeRef.current;
    if (!room || reduced() || typeof room.animate !== 'function') { done(); return; }
    const c = camFor(focusOf(into), 0.9);
    const vw = window.innerWidth, vh = window.innerHeight;
    const k0 = c.s.w / vw;
    const from = `translate(${c.s.x + c.s.w / 2 - (vw * k0) / 2}px, ${c.s.y + c.s.h / 2 - (vh * k0) / 2}px) scale(${k0})`;
    const camA = [{ transform: 'none' }, { transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.k})` }];
    const layA = [{ transform: from, opacity: 0 }, { transform: from, opacity: 0, offset: 0.25 }, { transform: 'none', opacity: 1 }];
    const opt = { duration: dir === 'in' ? 950 : 800, easing: EASE, fill: 'forwards' as FillMode };
    const camEnd = `translate(${c.tx}px, ${c.ty}px) scale(${c.k})`;
    // Die Ruhelage steht immer als Inline-Stil; Fahrten laufen nur dazwischen und werden danach entfernt
    // (keine fill:forwards-Reste, die unter späteren Fahrten weiterwirken).
    settle(room, null);
    const a = room.animate(dir === 'in' ? camA : [...camA].reverse(), opt);
    const l = layer ? layer.animate(dir === 'in' ? layA : [...layA].reverse().map((k, i) => ({ ...k, offset: i === 1 ? 0.75 : undefined })), opt) : null;
    a.onfinish = () => {
      settle(room, dir === 'in' ? camEnd : '');
      if (layer && l && dir === 'in') { l.cancel(); layer.style.transform = ''; layer.style.opacity = ''; }
      done();
    };
  }, [camFor]);

  const pendingIn = useRef<Place | null>(null);
  const open = useCallback((p: Place) => {
    if (busy) return;
    setBusy(true);
    const cur = stack[stack.length - 1];
    const push = () => { pendingIn.current = p; setStack((s) => [...s, p]); };
    // Von einer Nahansicht zur nächsten: erst hinaus in den Raum, dann hinein – nie ein harter Schnitt.
    if (cur.kind !== 'room') zoom(cur, 'out', push); else push();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, stack]);
  // Nach dem Einhängen der Nahansicht: hineinfahren.
  useLayoutEffect(() => {
    const p = pendingIn.current;
    if (!p) return;
    pendingIn.current = null;
    // Ebene vorher sichtbar? (Nahansicht → Nahansicht): Raum steht noch gezoomt – zurücksetzen, dann hinein.
    zoom(p, 'in', () => setBusy(false));
  }, [stack, zoom]);

  const back = useCallback(() => {
    if (busy) return;
    if (stack.length <= 1) { exit(); return; }
    const leaving = stack[stack.length - 1];
    const prev = stack[stack.length - 2];
    setBusy(true);
    zoom(leaving, 'out', () => {
      setStack((s) => s.slice(0, -1));
      if (prev.kind !== 'room') { pendingIn.current = prev; } else setBusy(false);
    });
  }, [busy, stack, exit, zoom]);

  // Mit Anflug und Ziel (z. B. von Home zur obersten Aufgabe): nach der Landung zum Objekt hineinfahren.
  useEffect(() => {
    if (!landed || !afterLanding.current) return;
    const p = afterLanding.current;
    afterLanding.current = null;
    const t = window.setTimeout(() => open(p), 250);
    return () => window.clearTimeout(t);
  }, [landed, open]);

  // Esc: eine Ebene zurück (Zettel schließen zuerst sich selbst).
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[data-ws-pop]')) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) { t.blur(); e.preventDefault(); return; }
      e.preventDefault();
      back();
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [back]);

  const nameOf = (p: Place) => (p.kind === 'room' ? 'Werkstatt' : p.kind === 'task' ? 'Aufgabe' : p.kind === 'doc' ? 'Buch' : 'Planung');
  const backTo = stack.length > 1 ? { label: nameOf(stack[stack.length - 2]), run: back } : { label: 'Universe', run: back };

  // Brett ----------------------------------------------------------------------------------------------
  const [page, setPage] = useState(0);
  const [later, setLater] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [docSlip, setDocSlip] = useState(false);
  const { addTask } = useDayActions(companyId);
  const laterPages = useMemo(() => { const p: WorkTask[][] = []; for (let i = 0; i < board.later.length; i += PER_PAGE) p.push(board.later.slice(i, i + PER_PAGE)); return p.length ? p : [[]]; }, [board.later]);
  const pages = later ? laterPages : board.pages;
  const pg = Math.min(page, pages.length - 1);
  const cards = pages[pg] ?? [];
  const order = useMemo(() => [...board.pages.flat(), ...board.later], [board]);
  const newTaskFolder = planFolder ?? planet.moons[0]?.id ?? null;
  const submitDraft = async () => {
    const v = (draft ?? '').trim();
    if (!v) { setDraft(null); return; }
    const ok = await addTask(v, newTaskFolder, null, planet.id);
    if (ok) setDraft(null);
  };
  const B = ROOM.board, COLS = 3, GAP = 18, PAD = 22;
  const cw = (B.w - PAD * 2 - GAP * (COLS - 1)) / COLS, ch = (B.h - PAD * 2 - GAP) / 2;
  const slot = (i: number) => ({ left: B.x + PAD + (i % COLS) * (cw + GAP), top: B.y + PAD + Math.floor(i / COLS) * (ch + GAP), width: cw, height: ch });
  const roomImg = world === 'morgennebel' ? '/werkstatt/room-werkstatt-morgen.webp' : '/werkstatt/room-werkstatt.webp';
  const taskOf = (id: string) => tasks.find((t) => t.id === id) ?? null;
  const folderName = (t: WorkTask | null) => (t?.folderId ? clean(planet.moons.find((m) => m.id === t.folderId)?.title ?? '') : '');

  return (
    <div ref={rootRef} className="wk-root" lang="de" data-world={world} data-testid="werkstatt" data-place={top.kind} data-landed={landed ? '1' : undefined}>
      <div ref={roomRef} className="wk-room" aria-hidden={close ? true : undefined}>
        <StageLayer stage={room} img={roomImg} ext={roomImg.replace('.webp', '')} label={`Werkstatt ${title}`} testId="wk-room"
          under={<WindowUniverse rect={ROOM.window} world={world} planets={planets} focusId={planet.id} />}>
          {/* Brett */}
          <div className="wk-board" role="list" aria-label={`Aufgaben ${title}`} data-testid="wk-board" data-later={later ? '1' : undefined}>
            {draft !== null ? (
              <div className="wk-card wk-card--new" style={slot(0)} role="listitem">
                <textarea autoFocus value={draft} placeholder="Neue Aufgabe" aria-label="Neue Aufgabe" data-testid="wk-new-card" maxLength={120}
                  onChange={(e) => setDraft(e.target.value)} onBlur={() => void submitDraft()}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submitDraft(); } if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setDraft(null); } }} />
              </div>
            ) : null}
            {cards.slice(0, draft !== null ? PER_PAGE - 1 : PER_PAGE).map((t, i) => {
              const k = i + (draft !== null ? 1 : 0);
              return (
                <button key={t.id} type="button" role="listitem" className="wk-card" data-testid={`wk-card-${t.id}`} data-overdue={t.overdue ? '1' : undefined}
                  style={{ ...slot(k), rotate: `${((hash(t.id) % 7) - 3) * 0.35}deg` }} onClick={() => open({ kind: 'task', id: t.id })}>
                  <i className="wk-pin" aria-hidden />
                  <span className="wk-card__t">{t.title}</span>
                  <span className="wk-card__f">{t.due ? (t.dueToday ? 'heute' : shortDate(t.due)) : ''}{t.overdue ? <i className="wk-dot" aria-label="überfällig" /> : null}{t.assignee ? <em>{t.assignee}</em> : null}</span>
                </button>
              );
            })}
            {!later && board.later.length ? (
              <button type="button" className="wk-card wk-bundle" style={slot(PER_PAGE)} onClick={() => { setLater(true); setPage(0); }} data-testid="wk-later" aria-label={`Später, ${board.later.length} Aufgaben`}>
                <i className="wk-bundle__clip" aria-hidden />
                <span className="wk-card__t">später</span>
                <span className="wk-bundle__n">{board.later.length}</span>
              </button>
            ) : later ? (
              <button type="button" className="wk-card wk-bundle wk-bundle--back" style={slot(PER_PAGE)} onClick={() => { setLater(false); setPage(0); }} data-testid="wk-now" aria-label="Zurück zu den nächsten Aufgaben">
                <span className="wk-card__t">jetzt</span>
              </button>
            ) : null}
          </div>
          {pages.length > 1 ? (
            <div className="wk-tag wk-tag--pager" style={{ left: B.x + 214, top: B.y + B.h + 14 }}>
              <button type="button" onClick={() => setPage(Math.max(0, pg - 1))} disabled={pg === 0} aria-label="Blatt zurück" data-testid="wk-board-prev">‹</button>
              <span data-testid="wk-board-page">{pg + 1} / {pages.length}</span>
              <button type="button" onClick={() => setPage(Math.min(pages.length - 1, pg + 1))} disabled={pg >= pages.length - 1} aria-label="Blatt weiter" data-testid="wk-board-next">›</button>
            </div>
          ) : null}
          {/* Gegenstände */}
          <button type="button" className="wk-hit" style={box(ROOM.lectern)} onClick={() => lecternDoc && open({ kind: 'doc', id: lecternDoc.id })} aria-label={lecternDoc ? `Buch am Pult: ${clean(lecternDoc.name)}` : 'Pult'} data-testid="wk-hit-lectern" />
          {lecternDoc ? <div className="wk-plate" aria-hidden style={{ left: ROOM.plate.x, top: ROOM.plate.y, translate: '-50% 0' }}>{clean(lecternDoc.name)}</div> : null}
          <button type="button" className="wk-hit" style={box(ROOM.table)} onClick={() => open({ kind: 'planung' })} aria-label="Mappe Planung" data-testid="wk-hit-mappe" />
          <button type="button" className="wk-hit" style={box(ROOM.shelf)} onClick={() => setDocSlip(true)} aria-label="Regal mit Dokumenten" data-testid="wk-hit-shelf" />
          {docSlip ? (
            <PaperSlip x={1060} y={120} w={420} label="Dokumente" onClose={() => setDocSlip(false)} testId="wk-doc-slip">
              <ul className="wk-slip__list">
                {docs.map((d) => <li key={d.id}><button type="button" onClick={() => { setDocSlip(false); setLectern(d.id); open({ kind: 'doc', id: d.id }); }}><span>{clean(d.name)}</span></button></li>)}
              </ul>
            </PaperSlip>
          ) : null}
          {!close ? <MoraSeat at={ROOM.moraSeat} stage={room} name="wk-room" /> : null}
        </StageLayer>
      </div>

      {close ? (
        <div ref={closeRef} key={`${close.kind}-${"id" in close ? close.id : ""}`} className="wk-close" data-testid={`wk-close-${close.kind}`}>
          <StageLayer stage={stage} img={closeImg(close.kind, world)} label={nameOf(close)}
            under={<WindowUniverse rect={CLOSE[close.kind].sky} world={world} planets={planets} focusId={planet.id} />}>
            {close.kind === 'task' && taskOf(close.id) ? (
              <TaskSheet key={close.id} task={taskOf(close.id) as WorkTask} companyId={companyId}
                crumb={[title, folderName(taskOf(close.id))].filter(Boolean).join(' · ')}
                docs={docs.filter((d) => d.folderId === taskOf(close.id)?.folderId).map((d) => ({ id: d.id, name: clean(d.name) }))}
                onOpenDoc={(id) => { setLectern(id); open({ kind: 'doc', id }); }}
                onNext={() => { const i = order.findIndex((t) => t.id === close.id); const n = order[i + 1]; if (n) setStack((s) => [...s.slice(0, -1), { kind: 'task', id: n.id }]); }}
                back={backTo} />
            ) : null}
            {close.kind === 'doc' ? (
              <Book key={close.id} id={close.id} fallbackTitle={clean(allDocs.find((d) => d.id === close.id)?.name ?? '')}
                folderId={allDocs.find((d) => d.id === close.id)?.folderId ?? null} stage={stage} back={backTo} />
            ) : null}
            {close.kind === 'planung' ? <Mappe weeks={weeks} folderId={planFolder} companyId={companyId} today={today} defaultRows={defaultWeekRows} back={backTo} /> : null}
            <MoraSeat at={CLOSE[close.kind].mora} stage={stage} name={`wk-close-${close.kind}`} />
          </StageLayer>
        </div>
      ) : null}

      {!close && landed ? (
        <WorkDock back={backTo} actions={[
          { id: 'neue-aufgabe', label: 'Neue Aufgabe', run: () => { setLater(false); setPage(0); setDraft(''); } },
          { id: 'dokumente', label: 'Dokumente', run: () => setDocSlip((v) => !v), pressed: docSlip },
          { id: 'planung', label: 'Planung', run: () => open({ kind: 'planung' }) },
        ]} />
      ) : null}
    </div>
  );
}
