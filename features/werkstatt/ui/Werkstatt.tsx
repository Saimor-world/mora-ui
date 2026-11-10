'use client';
import './werkstatt.css';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';
import type { DeptWork, WorkTask } from '@/lib/universe/deptWork';
import { stripFiktiv } from '@/lib/demo/morgenrot/stripFiktiv';
import { shortDate } from '@/lib/lea/world';
import { useDayActions } from '@/lib/lea/useDayActions';
import { fetchNodeDetails, createNode } from '@/lib/api/orgClient';
import { renderMarkdown } from '@/lib/docs/markdown';
import { buildShipTodaySnapshot, getDepartmentRoomContext, getShipNodeById } from '@/lib/universe/shipDepartments';
import { demoTodaySnapshot } from '@/lib/demo/morgenrot/demoToday';
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
import { CrewRelicAvatar, deriveCrewRelic } from '@/components/world/CrewRelicAvatar';
import type { DeptMember, RoomKind } from '@/features/universe/ui/Workbench';

export type Place = { kind: 'room' } | { kind: 'task'; id: string } | { kind: 'doc'; id: string } | { kind: 'planung' };
export const placeFromParam = (p: string | null): Place | null => {
  if (!p) return null;
  if (p === 'werkstatt' || p === 'studio' || p === 'bar') return { kind: 'room' };
  if (p === 'planung') return { kind: 'planung' };
  const [k, id] = p.split(':');
  if (k === 'aufgabe' && id) return { kind: 'task', id };
  if (k === 'dokument' && id) return { kind: 'doc', id };
  return null;
};
export const roomKindFromParam = (p: string | null): RoomKind => (p === 'studio' ? 'studio' : p === 'bar' ? 'bar' : 'werkstatt');

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
  /** Welcher Raum der Abteilung betreten wurde (Werkstatt, Studio, Bar). */
  roomKind?: RoomKind;
  /** Crew / Captain der Abteilung für die Bar- und Abteilungsansicht. */
  crew?: DeptMember[];
  /** Beschriftung für den Rückweg aus dem Raum (z. B. Abteilungsname). */
  backLabel?: string;
  /** Startort (Deep-Link ?platz=…) – ohne Anflug. */
  initial?: Place | null;
  /** Woher der Anflug kommt (Planet im Fenster). null = direkt. */
  fromSpace?: boolean;
  onExit: () => void;
}

export function Werkstatt({ planet, work, planets, companyId, today, roomKind = 'werkstatt', crew = [], backLabel, initial, fromSpace = true, onExit }: WerkstattProps) {
  const stage = useStage();
  // Der Raum hat seine eigene Bühne (bei 4:3 verkleinert, damit Regal und Pult beide sichtbar bleiben).
  const room = useMemo(() => roomStage(stage), [stage]);
  const world = useWorld();
  const title = clean(planet.title);
  const [activeRoom, setActiveRoom] = useState<RoomKind>(roomKind);
  useEffect(() => { setActiveRoom(roomKind); }, [roomKind]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
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

  const roomCtx = useMemo(() => getDepartmentRoomContext(planet.id, title), [planet.id, title]);
  const currentRoomMeta = roomCtx[activeRoom];
  const roomSignText = currentRoomMeta.name.toLowerCase().includes(title.toLowerCase())
    ? currentRoomMeta.name
    : `${title} · ${currentRoomMeta.name}`;

  // Aufgaben, Dokumente, Wochen – aus denselben Daten wie die Abteilung (useWorld → deptWork).
  const allTasks = useMemo(() => {
    const l: WorkTask[] = [...work.loose];
    work.moons.forEach((m) => l.push(...m.open, ...m.done));
    return l;
  }, [work]);
  const tasks = useMemo(
    () => (activeFolder ? allTasks.filter((t) => t.folderId === activeFolder) : allTasks),
    [allTasks, activeFolder]
  );
  const board = useMemo(() => arrangeBoard(tasks, today, PER_PAGE), [tasks, today]);
  const [createdDocs, setCreatedDocs] = useState<Array<{ id: string; name: string; meta: string; folderId: string; content: string }>>([]);
  const allDocs = useMemo(() => {
    const l: { id: string; name: string; meta: string; folderId: string }[] = [...createdDocs];
    work.moons.forEach((m, fid) => m.docs.forEach((d) => {
      if (!l.some((x) => x.id === d.id)) l.push({ ...d, folderId: fid });
    }));
    return l;
  }, [work, createdDocs]);
  const weeksDocs = allDocs.filter((d) => /wochenplan[\s_-]*kw/i.test(d.name));
  const docs = useMemo(() => {
    const base = allDocs.filter((d) => !weeksDocs.includes(d));
    return activeFolder ? base.filter((d) => d.folderId === activeFolder) : base;
  }, [allDocs, weeksDocs, activeFolder]);
  const planFolder = planet.moons.find((m) => /planung/i.test(m.title))?.id ?? weeksDocs[0]?.folderId ?? planet.moons[0]?.id ?? null;
  const weeks = useMemo(() => weekNodesFrom(weeksDocs, Number(today.slice(0, 4))), [weeksDocs, today]);
  const [lectern, setLectern] = useState<string | null>(null);
  const lecternDoc = docs.find((d) => d.id === lectern) ?? docs.find((d) => d.meta !== 'file') ?? docs[0] ?? null;

  // Direkt-Vorschau im Studio für das gewählte Dossier (ohne 401-Hänger, sofort aus Ship-Fallback oder Cache)
  const localLecternNode = useMemo(() => {
    if (!lecternDoc) return null;
    const localCreated = createdDocs.find((d) => d.id === lecternDoc.id);
    if (localCreated) return { id: localCreated.id, title: localCreated.name, content: localCreated.content };
    return getShipNodeById(lecternDoc.id);
  }, [lecternDoc, createdDocs]);
  const lecternQuery = useQuery({
    queryKey: ['node', lecternDoc?.id ?? 'none'],
    queryFn: async () => (lecternDoc ? (await fetchNodeDetails(lecternDoc.id).catch(() => null)) ?? localLecternNode : null),
    enabled: Boolean(lecternDoc && activeRoom === 'studio'),
    initialData: localLecternNode ?? undefined,
    staleTime: 30_000,
  });
  const lecternContent = useMemo(() => {
    const d = (lecternQuery.data ?? localLecternNode) as { content?: string; description?: string; body?: string[] } | null | undefined;
    const raw = d?.content ?? d?.description ?? (Array.isArray(d?.body) ? d.body.join('\n\n') : '');
    if (raw && raw.trim()) return raw;
    if (lecternDoc) {
      return `# ${clean(lecternDoc.name)}\n\nArbeitsdokument im Bereich **${title}**. Klicken Sie auf *Im Buch öffnen & bearbeiten*, um dieses Dokument im Doppelseiten-Satz weiterzuschreiben.`;
    }
    return '';
  }, [lecternQuery.data, localLecternNode, lecternDoc, title]);

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
  }, [landed, busy, close, activeRoom]);
  useEffect(() => () => useMoraPresence.getState().goHome(), []);

  // Kamera ------------------------------------------------------------------------------------------
  const camFor = useCallback((r: Rect, fill: number, cap = 3.4) => {
    const s = toScreen(room, r);
    const c = cameraTo(s, window.innerWidth, window.innerHeight, fill);
    const k = Math.min(cap, c.scale);
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    return { k, tx: window.innerWidth / 2 - cx * k, ty: window.innerHeight / 2 - cy * k, s };
  }, [room]);

  // Schneller, flüssiger Anflug in den Raum (380 ms statt 1500 ms, kein Hängen).
  useLayoutEffect(() => {
    if (landed) return;
    const roomEl = roomRef.current, rootEl = rootRef.current;
    if (!roomEl || !rootEl || typeof roomEl.animate !== 'function') { setLanded(true); return; }
    const winRect = activeRoom === 'studio' ? CLOSE.doc.sky : activeRoom === 'bar' ? CLOSE.task.sky : ROOM.window;
    const c = camFor(winRect, 1.35, 5);
    const a = roomEl.animate([{ transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.k})` }, { transform: 'none' }], { duration: 380, easing: EASE, fill: 'backwards' });
    rootEl.animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 1 }], { duration: 380, easing: 'linear', fill: 'backwards' });
    a.onfinish = () => { settle(roomEl, ''); setLanded(true); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exit = useCallback(() => {
    if (busy) return;
    const roomEl = roomRef.current, rootEl = rootRef.current;
    useMoraPresence.getState().goHome();
    if (!roomEl || !rootEl || reduced() || typeof roomEl.animate !== 'function') { onExit(); return; }
    setBusy(true);
    document.documentElement.removeAttribute('data-os-work');
    const winRect = activeRoom === 'studio' ? CLOSE.doc.sky : activeRoom === 'bar' ? CLOSE.task.sky : ROOM.window;
    const c = camFor(winRect, 1.35, 5);
    roomEl.animate([{ transform: 'none' }, { transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.k})` }], { duration: 320, easing: EASE, fill: 'forwards' });
    const f = rootEl.animate([{ opacity: 1 }, { opacity: 1, offset: 0.65 }, { opacity: 0 }], { duration: 320, easing: 'linear', fill: 'forwards' });
    f.onfinish = () => onExit();
  }, [busy, camFor, onExit, activeRoom]);

  // In ein Objekt hinein / wieder heraus (flüssig & direkt).
  const zoom = useCallback((into: Place, dir: 'in' | 'out', done: () => void) => {
    const roomEl = roomRef.current, layer = closeRef.current;
    if (!roomEl || reduced() || typeof roomEl.animate !== 'function') { done(); return; }
    const c = camFor(focusOf(into), 0.9);
    const vw = window.innerWidth, vh = window.innerHeight;
    const k0 = c.s.w / vw;
    const from = `translate(${c.s.x + c.s.w / 2 - (vw * k0) / 2}px, ${c.s.y + c.s.h / 2 - (vh * k0) / 2}px) scale(${k0})`;
    const camA = [{ transform: 'none' }, { transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.k})` }];
    const layA = [{ transform: from, opacity: 0 }, { transform: from, opacity: 0, offset: 0.25 }, { transform: 'none', opacity: 1 }];
    const opt = { duration: dir === 'in' ? 320 : 260, easing: EASE, fill: 'forwards' as FillMode };
    const camEnd = `translate(${c.tx}px, ${c.ty}px) scale(${c.k})`;
    settle(roomEl, null);
    const a = roomEl.animate(dir === 'in' ? camA : [...camA].reverse(), opt);
    const l = layer ? layer.animate(dir === 'in' ? layA : [...layA].reverse().map((k, i) => ({ ...k, offset: i === 1 ? 0.75 : undefined })), opt) : null;
    a.onfinish = () => {
      settle(roomEl, dir === 'in' ? camEnd : '');
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
    if (cur.kind !== 'room') zoom(cur, 'out', push); else push();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, stack]);
  useLayoutEffect(() => {
    const p = pendingIn.current;
    if (!p) return;
    pendingIn.current = null;
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

  useEffect(() => {
    if (!landed || !afterLanding.current) return;
    const p = afterLanding.current;
    afterLanding.current = null;
    const t = window.setTimeout(() => open(p), 120);
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

  const roomLabel = activeRoom === 'studio' ? 'Studio' : activeRoom === 'bar' ? 'Bar' : 'Werkstatt';
  const nameOf = (p: Place) => (p.kind === 'room' ? roomLabel : p.kind === 'task' ? 'Aufgabe' : p.kind === 'doc' ? 'Buch' : 'Planung');
  const backTo = stack.length > 1 ? { label: nameOf(stack[stack.length - 2]), run: back } : { label: backLabel ?? 'Universe', run: back };

  // Brett & Aktionen -----------------------------------------------------------------------------------
  const [page, setPage] = useState(0);
  const [later, setLater] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [docSlip, setDocSlip] = useState(false);
  const [studioTaskDraft, setStudioTaskDraft] = useState('');
  const [newDocOpen, setNewDocOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocBody, setNewDocBody] = useState('');
  const [handoverDraft, setHandoverDraft] = useState('');
  const { addTask, setDone } = useDayActions(companyId);
  const laterPages = useMemo(() => { const p: WorkTask[][] = []; for (let i = 0; i < board.later.length; i += PER_PAGE) p.push(board.later.slice(i, i + PER_PAGE)); return p.length ? p : [[]]; }, [board.later]);
  const pages = later ? laterPages : board.pages;
  const pg = Math.min(page, pages.length - 1);
  const cards = pages[pg] ?? [];
  const order = useMemo(() => [...board.pages.flat(), ...board.later], [board]);
  const newTaskFolder = activeFolder ?? planFolder ?? planet.moons[0]?.id ?? null;

  const submitDraft = async () => {
    const v = (draft ?? '').trim();
    if (!v) { setDraft(null); return; }
    const ok = await addTask(v, newTaskFolder, null, planet.id);
    if (ok) setDraft(null);
  };
  const submitStudioTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = studioTaskDraft.trim();
    if (!v) return;
    const ok = await addTask(v, newTaskFolder, null, planet.id);
    if (ok) setStudioTaskDraft('');
  };
  const submitNewDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = newDocTitle.trim();
    if (!t) return;
    const fid = newTaskFolder ?? planet.moons[0]?.id ?? 'f-default';
    const content = `# ${t}\n\n${newDocBody.trim() || `Konzept & Dokumentation für ${title}.`}`;
    const localId = `doc-local-${Date.now().toString(36)}`;
    let createdId = localId;
    try {
      const res = await createNode({ folder_id: fid, title: t, name: t, type: 'document', content } as Parameters<typeof createNode>[0]);
      if (res && typeof (res as { id?: string }).id === 'string') createdId = (res as { id: string }).id;
    } catch {
      // Fallback: lokal im Studio sofort verfügbar
    }
    setCreatedDocs((prev) => [{ id: createdId, name: t, meta: 'document', folderId: fid, content }, ...prev]);
    setLectern(createdId);
    setNewDocTitle('');
    setNewDocBody('');
    setNewDocOpen(false);
  };
  const submitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = handoverDraft.trim();
    if (!v) return;
    const ok = await addTask(v, newTaskFolder, today, planet.id);
    if (ok) setHandoverDraft('');
  };

  // Signale (Post & Termine) für die Bar der Abteilung (0ms synchron aus TodaySnapshot)
  const todaySnap = useMemo(
    () => (companyId?.startsWith('demo-')
      ? demoTodaySnapshot(companyId, 'demo', 'tenant-demo')
      : buildShipTodaySnapshot(companyId ?? 'company-local-demo', 'user-local-demo', 'tenant-local-demo')),
    [companyId]
  );
  const barMails = useMemo(() => {
    const items = todaySnap?.mail?.items ?? [];
    const deptItems = items.filter((m) => !m.department_id || m.department_id === planet.id || title.toLowerCase().includes((m.department_id ?? '').replace('dept-', '')));
    return (deptItems.length > 0 ? deptItems : items).slice(0, 3);
  }, [todaySnap, planet.id, title]);
  const barEvents = useMemo(() => {
    const evs = todaySnap?.calendar?.events ?? [];
    const deptEvs = evs.filter((ev) => !ev.department_id || ev.department_id === planet.id || title.toLowerCase().includes((ev.department_id ?? '').replace('dept-', '')));
    return (deptEvs.length > 0 ? deptEvs : evs).slice(0, 3);
  }, [todaySnap, planet.id, title]);

  const B = ROOM.board, COLS = 3, GAP = 18, PAD = 22;
  const cw = (B.w - PAD * 2 - GAP * (COLS - 1)) / COLS, ch = (B.h - PAD * 2 - GAP) / 2;
  const slot = (i: number) => ({ left: B.x + PAD + (i % COLS) * (cw + GAP), top: B.y + PAD + Math.floor(i / COLS) * (ch + GAP), width: cw, height: ch });

  // Jeder Raum hat sein eigenes Raumbild und eigenes Himmelsfenster!
  const activeStageImg = useMemo(() => {
    if (activeRoom === 'studio') return world === 'morgennebel' ? '/werkstatt/room-pult-morgen.webp' : '/werkstatt/room-pult.webp';
    if (activeRoom === 'bar') return world === 'morgennebel' ? '/werkstatt/room-schreibtisch-morgen.webp' : '/werkstatt/room-schreibtisch.webp';
    return world === 'morgennebel' ? '/werkstatt/room-werkstatt-morgen.webp' : '/werkstatt/room-werkstatt.webp';
  }, [activeRoom, world]);
  const activeSkyRect = activeRoom === 'studio' ? CLOSE.doc.sky : activeRoom === 'bar' ? CLOSE.task.sky : ROOM.window;
  const activeMoraSeat = activeRoom === 'studio'
    ? { x: CLOSE.doc.mora.x, y: CLOSE.doc.mora.y, size: 112 }
    : activeRoom === 'bar'
      ? { x: CLOSE.task.mora.x, y: CLOSE.task.mora.y, size: 112 }
      : ROOM.moraSeat;

  const taskOf = (id: string) => allTasks.find((t) => t.id === id) ?? null;
  const folderName = (t: WorkTask | null) => (t?.folderId ? clean(planet.moons.find((m) => m.id === t.folderId)?.title ?? '') : '');
  const folderTitleById = (fid: string) => clean(planet.moons.find((m) => m.id === fid)?.title ?? '');

  return (
    <div ref={rootRef} className="wk-root" lang="de" data-world={world} data-room={activeRoom} data-testid="werkstatt" data-place={top.kind} data-landed={landed ? '1' : undefined}>
      <div ref={roomRef} className="wk-room" aria-hidden={close ? true : undefined}>
        <StageLayer
          stage={room}
          img={activeStageImg}
          ext={activeRoom === 'werkstatt' ? activeStageImg.replace('.webp', '') : undefined}
          label={`${roomLabel} ${title}`}
          testId="wk-room"
          under={<WindowUniverse rect={activeSkyRect} world={world} planets={planets} focusId={planet.id} />}
        >
          {/* =====================================================================================
              RAUM 02 · STUDIO (Lesepult & Panorama-Fenster: Dossiers, offenes Buch & Abteilungs-Fokus)
             ===================================================================================== */}
          {activeRoom === 'studio' ? (
            <>
              <div className="wk-room-bar wk-room-bar--studio" style={{ left: 48, top: 26, width: 1824 }} data-testid="wk-room-bar">
                <span className="wk-plate wk-plate--room" data-testid="wk-room-sign">{roomSignText}</span>
                <span className="wk-room-sub">{roomCtx.studio.subtitle}</span>
                {planet.moons.length > 0 ? (
                  <div className="wk-folders" role="group" aria-label={`Ordner in ${title}`} data-testid="wk-folders" style={{ marginLeft: 'auto' }}>
                    <button type="button" className="wk-folder-tab" aria-pressed={activeFolder === null} data-testid="wk-folder-all"
                      onClick={() => { setActiveFolder(null); setPage(0); }}>Alle Ordner</button>
                    {planet.moons.map((m) => (
                      <button key={m.id} type="button" className="wk-folder-tab" aria-pressed={activeFolder === m.id} data-testid={`wk-folder-${m.id}`}
                        onClick={() => { setActiveFolder(m.id); setPage(0); }}>{clean(m.title)}</button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="wk-studio-stage" role="list" aria-label={`Studio ${title}`} data-testid="wk-board" data-room-mode="studio">
                {/* Linke Spalte: Dossiers & Konzepte der Abteilung */}
                <aside className="wk-studio-panel wk-studio-panel--docs" style={{ left: 48, top: 82, width: 396, height: 836 }}>
                  <div className="wk-studio-panel__head">
                    <div>
                      <span className="wk-studio-eyebrow">{roomCtx.studio.tag}</span>
                      <h3>Dossiers & Konzepte ({docs.length})</h3>
                    </div>
                    <button type="button" className="wk-studio-btn" onClick={() => setNewDocOpen((v) => !v)} data-testid="wk-studio-new-doc-toggle">
                      {newDocOpen ? 'Schließen' : '+ Neues Dossier'}
                    </button>
                  </div>

                  {newDocOpen ? (
                    <form className="wk-studio-form" onSubmit={(e) => void submitNewDoc(e)} data-testid="wk-studio-new-doc-form">
                      <input
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        placeholder="Titel des Dossiers / Konzepts…"
                        aria-label="Titel des Dossiers"
                        data-testid="wk-studio-new-doc-title"
                        autoFocus
                      />
                      <textarea
                        value={newDocBody}
                        onChange={(e) => setNewDocBody(e.target.value)}
                        placeholder="Kernaussage, Spezifikation oder Entwurf…"
                        aria-label="Inhalt des Dossiers"
                        rows={3}
                      />
                      <button type="submit" className="wk-studio-btn wk-studio-btn--primary">Im Studio anlegen</button>
                    </form>
                  ) : null}

                  <div className="wk-studio-doc-list">
                    {docs.map((d) => {
                      const isSelected = lecternDoc?.id === d.id;
                      return (
                        <div key={d.id} role="listitem" className={`wk-studio-doc-item${isSelected ? ' is-active' : ''}`}>
                          <button
                            type="button"
                            className="wk-studio-doc-card"
                            data-testid={`wk-doc-card-${d.id}`}
                            onClick={() => setLectern(d.id)}
                          >
                            <span className="wk-card__t">{clean(d.name)}</span>
                            <span className="wk-card__f">{folderTitleById(d.folderId) || 'Dokument'}</span>
                          </button>
                          <button
                            type="button"
                            className="wk-studio-doc-open"
                            onClick={() => { setLectern(d.id); open({ kind: 'doc', id: d.id }); }}
                            aria-label={`${clean(d.name)} im Vollbild-Buch öffnen`}
                          >
                            Buch →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </aside>

                {/* Mitte auf dem Holzpult: Aufgeschlagenes Studio-Buch mit Live-Inhalt & Kontext-Matrix */}
                <section className="wk-studio-lectern" style={{ left: 468, top: 136, width: 984, height: 782 }} data-testid="wk-studio-lectern">
                  <div className="wk-studio-book">
                    {/* Linke Buchseite: Direkt lesbares Dossier */}
                    <div className="wk-studio-page wk-studio-page--left">
                      <header className="wk-studio-page__head">
                        <span>{lecternDoc ? (folderTitleById(lecternDoc.folderId) || title) : title}</span>
                        {lecternDoc ? (
                          <button
                            type="button"
                            className="wk-studio-btn wk-studio-btn--primary"
                            data-testid="wk-studio-open-book"
                            onClick={() => open({ kind: 'doc', id: lecternDoc.id })}
                          >
                            Im Buch blättern & schreiben →
                          </button>
                        ) : null}
                      </header>
                      {lecternDoc ? (
                        <div
                          className="wk-studio-markdown"
                          data-testid="wk-studio-doc-preview"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(lecternContent) }}
                        />
                      ) : (
                        <p className="wk-studio-empty">Noch kein Dossier in diesem Ordner. Legen Sie links ein neues Konzept an.</p>
                      )}
                    </div>

                    {/* Rechte Buchseite: Abteilungs-spezifischer Fokus & Leitplanken */}
                    <div className="wk-studio-page wk-studio-page--right" data-testid="wk-studio-focus">
                      <header className="wk-studio-page__head">
                        <span>Abteilungs-Kontext · {title}</span>
                        <span>{roomCtx.studio.shortLabel}</span>
                      </header>
                      <h3 className="wk-studio-focus__title">{roomCtx.studio.focusTitle}</h3>
                      <div className="wk-studio-focus__grid">
                        {roomCtx.studio.focusItems.map((item, idx) => (
                          <div key={idx} className="wk-studio-focus__card">
                            <div className="wk-studio-focus__top">
                              <b>{item.label}</b>
                              {item.status ? <span className="wk-studio-badge">{item.status}</span> : null}
                            </div>
                            <p>{item.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="wk-studio-focus__footer">
                        <span>Aktiver Ordner: <b>{activeFolder ? folderTitleById(activeFolder) : 'Alle Ordner'}</b></span>
                        <button type="button" className="wk-studio-btn" onClick={() => open({ kind: 'planung' })}>
                          Wochenmappe öffnen →
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Rechte Spalte: Verknüpfte Aufgaben & Ableitung aus dem Konzept */}
                <aside className="wk-studio-panel wk-studio-panel--tasks" style={{ left: 1476, top: 82, width: 396, height: 836 }}>
                  <div className="wk-studio-panel__head">
                    <div>
                      <span className="wk-studio-eyebrow">Umsetzung · {title}</span>
                      <h3>Aufgaben zum Konzept ({tasks.filter((t) => !t.done).length})</h3>
                    </div>
                  </div>
                  <form className="wk-studio-task-form" onSubmit={(e) => void submitStudioTask(e)}>
                    <input
                      value={studioTaskDraft}
                      onChange={(e) => setStudioTaskDraft(e.target.value)}
                      placeholder="Aufgabe aus Dossier ableiten…"
                      aria-label="Aufgabe aus Dossier ableiten"
                      data-testid="wk-studio-new-task"
                    />
                    <button type="submit" className="wk-studio-btn wk-studio-btn--primary">+</button>
                  </form>
                  <div className="wk-studio-task-list">
                    {tasks.slice(0, 7).map((t) => (
                      <div key={t.id} className="wk-studio-task-row" data-done={t.done ? '1' : undefined}>
                        <button
                          type="button"
                          className="wk-studio-check"
                          aria-pressed={t.done}
                          onClick={() => void setDone(t.raw, !t.done)}
                          aria-label={t.done ? `${t.title} wieder öffnen` : `${t.title} erledigen`}
                        >
                          {t.done ? '✓' : ''}
                        </button>
                        <button type="button" className="wk-studio-task-title" onClick={() => open({ kind: 'task', id: t.id })}>
                          <span>{t.title}</span>
                          <small>{[folderName(t), t.assignee, t.due ? (t.dueToday ? 'heute' : shortDate(t.due)) : ''].filter(Boolean).join(' · ')}</small>
                        </button>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            </>
          ) : activeRoom === 'bar' ? (
            /* =====================================================================================
               RAUM 03 · BAR & CREW-LOUNGE (Holztisch mit Tee/Kaffee & Lampe: Crew, Übergabe & Funk)
               ===================================================================================== */
            <>
              <div className="wk-room-bar wk-room-bar--bar" style={{ left: 64, top: 162, width: 1792 }} data-testid="wk-room-bar">
                <span className="wk-plate wk-plate--room" data-testid="wk-room-sign">{roomSignText}</span>
                <span className="wk-room-sub">{roomCtx.bar.subtitle}</span>
              </div>

              <div className="wk-bar-stage" role="list" aria-label={`Bar ${title}`} data-testid="wk-board" data-room-mode="bar">
                {/* Linke Spalte: Captain, Crew & Relic-Identitäten (#001–#111) + MÔRA */}
                <section className="wk-bar-panel wk-bar-panel--crew" style={{ left: 64, top: 214, width: 560, height: 706 }}>
                  <header className="wk-bar-panel__head">
                    <span className="wk-studio-eyebrow">{roomCtx.bar.tag}</span>
                    <h3>Captain & Crew an Bord ({crew.length})</h3>
                  </header>
                  <div className="wk-bar-crew-list">
                    {crew.map((c) => {
                      const openCount = allTasks.filter((t) => !t.done && t.assignee && t.assignee.toLowerCase() === c.name.toLowerCase()).length;
                      const relic = deriveCrewRelic(c.id || c.name, Boolean(c.isCaptain));
                      return (
                        <div key={c.id} role="listitem" className="wk-bar-crew-card" data-testid={`wk-crew-${c.id}`}>
                          <CrewRelicAvatar id={c.id} name={clean(c.name)} isCaptain={c.isCaptain} status={c.status} size={42} testId={`wk-crew-avatar-${c.id}`} />
                          <div className="wk-bar-crew-card__body">
                            <div className="wk-bar-crew-card__top">
                              <span className="wk-card__t">{c.isCaptain ? `Captain ${clean(c.name)}` : clean(c.name)}</span>
                              <span className="wk-bar-status" data-online={c.status !== 'offline' ? '1' : undefined}>
                                {c.status === 'offline' ? 'Pause' : 'An Bord'}
                              </span>
                            </div>
                            <span className="wk-bar-relic">ORIGIN #{relic.instance} · {relic.mineralName}</span>
                            <span className="wk-card__f">
                              {c.role ? clean(c.role) : (c.isCaptain ? 'Abteilungsleitung' : 'Crew')}
                              {openCount ? <em>{openCount} offen</em> : <em>Bereit</em>}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      role="listitem"
                      className="wk-bar-mora-card"
                      onClick={() => useOsShellStore.getState().setMoraOpen(true)}
                      data-testid="wk-mora-ship"
                      aria-label="MÔRA (Das Schiff) rufen"
                    >
                      <div className="wk-bar-mora-card__body">
                        <span className="wk-card__t">MÔRA · Das Schiff</span>
                        <span className="wk-card__f">Verbindet alle Abteilungen, Kanäle & das Universum</span>
                      </div>
                      <span className="wk-studio-badge">Rufen →</span>
                    </button>
                  </div>
                </section>

                {/* Mittlere Spalte: Schicht-Übergabe & Tages-Logbuch am Tisch */}
                <section className="wk-bar-panel wk-bar-panel--handover" style={{ left: 652, top: 214, width: 616, height: 706 }} data-testid="wk-bar-handover">
                  <header className="wk-bar-panel__head">
                    <span className="wk-studio-eyebrow">Schichtwechsel & Logbuch</span>
                    <h3>{roomCtx.bar.loungeTitle}</h3>
                  </header>
                  <form className="wk-studio-task-form" onSubmit={(e) => void submitHandover(e)} data-testid="wk-bar-handover-form">
                    <input
                      value={handoverDraft}
                      onChange={(e) => setHandoverDraft(e.target.value)}
                      placeholder={roomCtx.bar.handoverPrompt}
                      aria-label="Übergabe-Notiz oder Aufgabe"
                      data-testid="wk-bar-handover-input"
                    />
                    <button type="submit" className="wk-studio-btn wk-studio-btn--primary">Festhalten</button>
                  </form>
                  <div className="wk-bar-handover-stats">
                    <span>Offen in {title}: <b>{allTasks.filter((t) => !t.done).length}</b></span>
                    <span>Erledigt: <b>{allTasks.filter((t) => t.done).length}</b></span>
                  </div>
                  <div className="wk-studio-task-list" data-testid="wk-bar-tasks">
                    {allTasks.slice(0, 6).map((t) => (
                      <div key={t.id} className="wk-studio-task-row" data-done={t.done ? '1' : undefined}>
                        <button
                          type="button"
                          className="wk-studio-check"
                          aria-pressed={t.done}
                          onClick={() => void setDone(t.raw, !t.done)}
                          aria-label={t.done ? `${t.title} wieder öffnen` : `${t.title} erledigen`}
                        >
                          {t.done ? '✓' : ''}
                        </button>
                        <button type="button" className="wk-studio-task-title" onClick={() => open({ kind: 'task', id: t.id })}>
                          <span>{t.title}</span>
                          <small>{[t.assignee ? `Zuständig: ${t.assignee}` : '', folderName(t), t.due ? (t.dueToday ? 'heute' : shortDate(t.due)) : ''].filter(Boolean).join(' · ')}</small>
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Rechte Spalte: Abteilungs-Funk (Post & Termine heute) */}
                <section className="wk-bar-panel wk-bar-panel--signals" style={{ left: 1296, top: 214, width: 560, height: 706 }} data-testid="wk-bar-signals">
                  <header className="wk-bar-panel__head">
                    <div>
                      <span className="wk-studio-eyebrow">Abteilungs-Funk & Brücke</span>
                      <h3>Post & Termine für {title}</h3>
                    </div>
                    <button
                      type="button"
                      className="wk-studio-btn"
                      data-testid="wk-bar-open-post"
                      onClick={() => useOsShellStore.getState().setActiveFeature('post')}
                    >
                      Post & Kalender →
                    </button>
                  </header>

                  <div className="wk-bar-signal-group">
                    <h4>Eingegangene Nachrichten ({barMails.length})</h4>
                    {barMails.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="wk-bar-signal-card"
                        onClick={() => useOsShellStore.getState().setActiveFeature('post')}
                      >
                        <b>{clean(m.subject ?? '')}</b>
                        <small>{clean(m.from || m.from_addr || 'Eingang')} · {(m.received_at ?? '').slice(11, 16) || 'heute'}</small>
                      </button>
                    ))}
                  </div>

                  <div className="wk-bar-signal-group">
                    <h4>Heutige Termine & Runden ({barEvents.length})</h4>
                    {barEvents.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        className="wk-bar-signal-card"
                        onClick={() => useOsShellStore.getState().setActiveFeature('post')}
                      >
                        <b>{clean(ev.title)}</b>
                        <small>{ev.time || (ev.start ?? '').slice(11, 16) || 'Heute'} Uhr</small>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </>
          ) : (
            /* =====================================================================================
               RAUM 01 · WERKSTATT (Holz-Pinnwand, Werkbank, Wochenmappe & Lesepult)
               ===================================================================================== */
            <>
              <div className="wk-room-bar" style={{ left: B.x, top: B.y - 46, width: B.w }} data-testid="wk-room-bar">
                <span className="wk-plate wk-plate--room" data-testid="wk-room-sign">{roomSignText}</span>
                {planet.moons.length > 0 ? (
                  <div className="wk-folders" role="group" aria-label={`Ordner in ${title}`} data-testid="wk-folders">
                    <button type="button" className="wk-folder-tab" aria-pressed={activeFolder === null} data-testid="wk-folder-all"
                      onClick={() => { setActiveFolder(null); setPage(0); }}>Alle</button>
                    {planet.moons.map((m) => (
                      <button key={m.id} type="button" className="wk-folder-tab" aria-pressed={activeFolder === m.id} data-testid={`wk-folder-${m.id}`}
                        onClick={() => { setActiveFolder(m.id); setPage(0); }}>{clean(m.title)}</button>
                    ))}
                  </div>
                ) : null}
              </div>

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
                      <span className="wk-card__f">{t.due ? (t.dueToday ? 'heute' : shortDate(t.due)) : ''}{t.overdue ? <i className="wk-dot" aria-label="überfällig" /> : null}{t.assignee ? <em style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><CrewRelicAvatar name={t.assignee} size={18} />{t.assignee}</em> : null}</span>
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
              {/* Gegenstände der Werkstatt */}
              <button type="button" className="wk-hit" style={box(ROOM.lectern)} onClick={() => lecternDoc && open({ kind: 'doc', id: lecternDoc.id })} aria-label={lecternDoc ? `Buch am Pult: ${clean(lecternDoc.name)}` : 'Pult'} data-testid="wk-hit-lectern" />
              {lecternDoc ? <div className="wk-plate" aria-hidden style={{ left: ROOM.plate.x, top: ROOM.plate.y, translate: '-50% 0' }}>{clean(lecternDoc.name)}</div> : null}
              <button type="button" className="wk-hit" style={box(ROOM.table)} onClick={() => open({ kind: 'planung' })} aria-label="Mappe Planung" data-testid="wk-hit-mappe" />
              <button type="button" className="wk-hit" style={box(ROOM.shelf)} onClick={() => setDocSlip(true)} aria-label="Regal mit Dokumenten" data-testid="wk-hit-shelf" />
            </>
          )}

          {docSlip ? (
            <PaperSlip x={1060} y={120} w={420} label="Dokumente" onClose={() => setDocSlip(false)} testId="wk-doc-slip">
              <ul className="wk-slip__list">
                {docs.map((d) => <li key={d.id}><button type="button" onClick={() => { setDocSlip(false); setLectern(d.id); open({ kind: 'doc', id: d.id }); }}><span>{clean(d.name)}</span>{folderTitleById(d.folderId) ? <em>{folderTitleById(d.folderId)}</em> : null}</button></li>)}
              </ul>
            </PaperSlip>
          ) : null}
          {!close ? <MoraSeat at={activeMoraSeat} stage={room} name="wk-room" /> : null}
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
          { id: 'raum-werkstatt', label: 'Werkstatt', run: () => setActiveRoom('werkstatt'), pressed: activeRoom === 'werkstatt' },
          { id: 'raum-studio', label: 'Studio', run: () => setActiveRoom('studio'), pressed: activeRoom === 'studio' },
          { id: 'raum-bar', label: 'Bar', run: () => setActiveRoom('bar'), pressed: activeRoom === 'bar' },
          { id: 'neue-aufgabe', label: 'Neue Aufgabe', run: () => { setActiveRoom('werkstatt'); setLater(false); setPage(0); setDraft(''); } },
          { id: 'dokumente', label: 'Dokumente', run: () => setDocSlip((v) => !v), pressed: docSlip },
          { id: 'planung', label: 'Planung', run: () => open({ kind: 'planung' }) },
        ]} />
      ) : null}
    </div>
  );
}
