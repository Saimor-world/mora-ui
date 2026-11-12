'use client';
import './werkstatt.css';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';
import type { DeptWork, WorkTask } from '@/lib/universe/deptWork';
import { stripFiktiv } from '@/lib/demo/morgenrot/stripFiktiv';
import { shortDate } from '@/lib/lea/world';
import { useDayActions } from '@/lib/lea/useDayActions';
import { fetchNodeDetails, createNode, updateNode } from '@/lib/api/orgClient';
import { renderMarkdown } from '@/lib/docs/markdown';
import { buildShipTodaySnapshot, getDepartmentRoomContext, getShipNodeById } from '@/lib/universe/shipDepartments';
import {
  useOperationalLedger,
  resolveScopeKey,
  isAuthoritativeCoreScope,
  resolveOperationalActor,
  formatAuditMarkdownLine,
  getShelfTemplatesForDepartment,
  type AuditEntry,
  type TruthStatus,
} from '@/lib/universe/operationalLedger';
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
import { DeskWorkstation, resolveStationKind } from './DeskWorkstation';
import { CrewRelicAvatar } from '@/components/world/CrewRelicAvatar';
import type { DeptMember, RoomKind } from '@/features/universe/ui/Workbench';

export type Place = { kind: 'room' } | { kind: 'task'; id: string } | { kind: 'doc'; id: string } | { kind: 'planung' } | { kind: 'station' };
export const placeFromParam = (p: string | null): Place | null => {
  if (!p) return null;
  if (p === 'werkstatt' || p === 'studio' || p === 'bar') return { kind: 'room' };
  if (p === 'planung') return { kind: 'planung' };
  if (p === 'station' || p === 'arbeitsplatz') return { kind: 'station' };
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
  desk: { x: 120, y: 560, w: 640, h: 140 },
  /** MÔRA sitzt auf der Fensterbank, links vom Pult; Größe in Einheiten passend zur Perspektive. */
  moraSeat: { x: 1150, y: 641, size: 112 },
  /** Messingschild vorn am Pultbrett. */
  plate: { x: 1556, y: 628 },
};
const CLOSE = {
  task: { img: '/werkstatt/room-schreibtisch.webp', sky: { x: 0, y: 0, w: 1920, h: 150 }, mora: { x: 420, y: 930 } },
  doc: { img: '/werkstatt/room-pult.webp', sky: { x: 200, y: 0, w: 1560, h: 720 }, mora: { x: 1640, y: 738 } },
  planung: { img: '/werkstatt/room-mappe.webp', sky: { x: 0, y: 0, w: 1920, h: 120 }, mora: { x: 360, y: 960 } },
  station: { img: '/werkstatt/room-schreibtisch.webp', sky: { x: 0, y: 0, w: 1920, h: 150 }, mora: { x: 420, y: 930 } },
};
const focusOf = (p: Place): Rect => ((p.kind === 'task' || p.kind === 'station') ? ROOM.desk : p.kind === 'doc' ? ROOM.lecternBook : p.kind === 'planung' ? ROOM.folder : ROOM.board);
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
/** Nahsicht im Licht der Welt & im echten Material des Raums (Basalt-Zeichentisch, Espresso-Theke, Smaragd-Walnuss-Kontor, Eichen-Werkbank). */
const closeImg = (kind: keyof typeof CLOSE, world: World, archetype?: string) => {
  let base = CLOSE[kind].img;
  if (kind === 'station' || kind === 'task') {
    if (archetype === 'studio') base = '/werkstatt/room-schreibtisch-atelier.webp';
    else if (archetype === 'bar') base = '/werkstatt/room-schreibtisch-bar.webp';
    else if (archetype === 'kontor' || archetype === 'bridge') base = '/werkstatt/room-schreibtisch-kontor.webp';
  }
  return world === 'morgennebel' ? base.replace('.webp', '-morgen.webp') : base;
};
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
  /** Direkt durch den Korridor in den Nachbarraum einer anderen Abteilung wechseln. */
  onSwitchPlanet?: (planetId: string) => void;
  onExit: () => void;
}

export function Werkstatt({ planet, work, planets, companyId, today, roomKind, crew = [], backLabel, initial, fromSpace = true, onSwitchPlanet, onExit }: WerkstattProps) {
  const stage = useStage();
  // Der Raum hat seine eigene Bühne (bei 4:3 verkleinert, damit Regal und Pult beide sichtbar bleiben).
  const room = useMemo(() => roomStage(stage), [stage]);
  const world = useWorld();
  const title = clean(planet.title);
  const roomCtx = useMemo(() => getDepartmentRoomContext(planet.id, title), [planet.id, title]);
  const resolvedRoomKind = roomKind ?? roomCtx.primaryRoom;
  const [activeRoom, setActiveRoom] = useState<RoomKind>(resolvedRoomKind);
  useEffect(() => { setActiveRoom(roomKind ?? roomCtx.primaryRoom); }, [roomKind, roomCtx.primaryRoom]);
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

  const currentRoomMeta = roomCtx[activeRoom];
  const roomSignText = roomCtx.roomName.toLowerCase().includes(title.toLowerCase())
    ? roomCtx.roomName
    : `${title} · ${roomCtx.roomName}`;

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
    const c = camFor(ROOM.window, 1.35, 5);
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
    const c = camFor(ROOM.window, 1.35, 5);
    roomEl.animate([{ transform: 'none' }, { transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.k})` }], { duration: 320, easing: EASE, fill: 'forwards' });
    const f = rootEl.animate([{ opacity: 1 }, { opacity: 1, offset: 0.65 }, { opacity: 0 }], { duration: 320, easing: 'linear', fill: 'forwards' });
    f.onfinish = () => onExit();
  }, [busy, camFor, onExit]);

  // In ein Objekt im physischen Raum hinein / wieder heraus (flüssiger Kamerazoom auf Tisch, Pult oder Mappe).
  const zoom = useCallback((into: Place, dir: 'in' | 'out', done: () => void) => {
    const roomEl = roomRef.current, layer = closeRef.current;
    if (!roomEl || reduced() || typeof roomEl.animate !== 'function') { done(); return; }
    const c = camFor(focusOf(into), 0.9);
    const vw = window.innerWidth, vh = window.innerHeight;
    const k0 = c.s.w / vw;
    const from = `translate(${c.s.x + c.s.w / 2 - (vw * k0) / 2}px, ${c.s.y + c.s.h / 2 - (vh * k0) / 2}px) scale(${k0})`;
    const camA = [{ transform: 'none' }, { transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.k})` }];
    const layA = [{ transform: from, opacity: 0 }, { transform: from, opacity: 0, offset: 0.25 }, { transform: 'none', opacity: 1 }];
    const opt = { duration: dir === 'in' ? 280 : 220, easing: EASE, fill: 'forwards' as FillMode };
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

  const backToRoom = useCallback(() => {
    if (busy || stack.length <= 1) return;
    const leaving = stack[stack.length - 1];
    setBusy(true);
    zoom(leaving, 'out', () => {
      setStack([{ kind: 'room' }]);
      setBusy(false);
    });
  }, [busy, stack, zoom]);

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

  const roomLabel = currentRoomMeta.shortLabel;
  const stationMeta = useMemo(() => resolveStationKind(planet.id, title, roomCtx.archetype), [planet.id, title, roomCtx.archetype]);
  const nameOf = (p: Place) => (p.kind === 'room' ? roomLabel : p.kind === 'task' ? 'Aufgabe' : p.kind === 'doc' ? 'Buch' : p.kind === 'station' ? stationMeta.deskLabel : 'Planung');
  const backTo = stack.length > 1 ? { label: nameOf(stack[stack.length - 2]), run: back } : { label: backLabel ?? 'Universe', run: back };

  const toggleRoomLamp = useCallback(() => {
    const nextPhase = world === 'morgennebel' ? 'night' : 'flow';
    useOsShellStore.getState().setPhaseOverride(nextPhase);
  }, [world]);

  const scopeKey = useMemo(() => resolveScopeKey(companyId, planet.id), [companyId, planet.id]);
  const { state: opLedger, record: recordOp } = useOperationalLedger(scopeKey, companyId);
  const isLiveCore = useMemo(() => isAuthoritativeCoreScope(scopeKey, companyId), [scopeKey, companyId]);
  const [docSyncStatus, setDocSyncStatus] = useState<TruthStatus>(() =>
    scopeKey === 'demo-morgenrot' ? 'demo-simulation' : isAuthoritativeCoreScope(scopeKey, companyId) ? 'core-confirmed' : 'local-draft'
  );
  const [docSyncError, setDocSyncError] = useState<string | null>(null);
  const [pendingDocSave, setPendingDocSave] = useState<{ id: string; text: string } | null>(null);
  const shelfTemplates = useMemo(() => getShelfTemplatesForDepartment(planet.id, title), [planet.id, title]);
  const [shelfQuery, setShelfQuery] = useState('');

  const moraImpulse = useMemo(() => {
    if (scopeKey === 'demo-morgenrot' && opLedger.kanzleiWeber.step4Booked) {
      return {
        title: 'MÔRA · KANZLEI WEBER ABGESCHLOSSEN',
        text: opLedger.kanzleiWeber.oatMilkReorderPrepared
          ? 'Die Reservierung Kanzlei Weber (142,00 €) ist verbucht & dokumentiert. Die Hafermilch-Nachbestellung (36 L) für morgen liegt im Kontor bereit.'
          : 'Die Reservierung ist abgeschlossen. Der Umsatz (142,00 €) wurde verbucht, der Vorgang dokumentiert. Für morgen könnte Hafermilch knapp werden (16 / 24 L). Soll ich eine Nachbestellung vorbereiten?',
        cta: 'Tisch & Dossier öffnen →',
        canReorderOatMilk: !opLedger.kanzleiWeber.oatMilkReorderPrepared,
      };
    }
    switch (stationMeta.kind) {
      case 'kueche-station':
        return {
          title: 'MÔRA · Backstuben-Impuls',
          text: `Hafermilch (${opLedger.oatMilkLiters}/24 L) & Espresso (4/6 kg) unter Soll · ${opLedger.kanzleiWeber.step1Confirmed ? 'Auftrag Kanzlei Weber wartet auf Zimtschnecken-Charge!' : '36er Zimtschnecken-Charge für die Theke bereit.'}`,
          cta: 'Backofen & Bestand öffnen →',
          canReorderOatMilk: false,
        };
      case 'service-station':
        return {
          title: 'MÔRA · Gastraum-Impuls',
          text: '12:30 Uhr: Kanzlei Weber (12 Pers., Tafel 4–6) · Interaktiver Grundriss & Tischkasse bereit.',
          cta: 'Tischplan & Kasse öffnen →',
          canReorderOatMilk: false,
        };
      case 'theke-station':
        return {
          title: 'MÔRA · Barista-Impuls',
          text: `Siebträger 9,0 bar / 93,2 °C · ${opLedger.kanzleiWeber.step2Baked ? 'Frische Zimtschnecken aus der Backstube für Kanzlei Weber eingetroffen!' : 'Schnell-Bon für Laufkundschaft & Schichttausch (Jonas → Lena).'}`,
          cta: 'Schnell-Bon & Theke öffnen →',
          canReorderOatMilk: false,
        };
      case 'verwaltung-station':
        return {
          title: 'MÔRA · Kontor-Impuls',
          text: 'Donnerstag-Bestellung (213,00 €) vor 14:00 Uhr fällig · Live-Tageskasse synchron mit Theke & Service.',
          cta: 'Hauptbuch & Einkauf öffnen →',
          canReorderOatMilk: false,
        };
      case 'atelier-station':
        return {
          title: 'MÔRA · Atelier-Impuls',
          text: 'ORIGIN // 001 (Seed 1001): Streiflicht- & Quarz-Inspektor am Basalt-Zeichentisch bereit.',
          cta: 'ORIGIN-Inspektor öffnen →',
          canReorderOatMilk: false,
        };
      default:
        return {
          title: `MÔRA · ${title}`,
          text: `${allTasks.filter((t) => !t.done).length} offene Aufgaben an der Tafel · ${docs.length} Dossiers im Raum.`,
          cta: `${stationMeta.badgeText} öffnen →`,
          canReorderOatMilk: false,
        };
    }
  }, [scopeKey, opLedger.kanzleiWeber, opLedger.oatMilkLiters, stationMeta.kind, stationMeta.badgeText, title, allTasks, docs.length]);

  // Brett & Aktionen -----------------------------------------------------------------------------------
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [later, setLater] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [docSlip, setDocSlip] = useState(false);
  const { addTask, setDone, update } = useDayActions(companyId);
  const laterPages = useMemo(() => { const p: WorkTask[][] = []; for (let i = 0; i < board.later.length; i += PER_PAGE) p.push(board.later.slice(i, i + PER_PAGE)); return p.length ? p : [[]]; }, [board.later]);
  const pages = later ? laterPages : board.pages;
  const pg = Math.min(page, pages.length - 1);
  const cards = pages[pg] ?? [];
  const order = useMemo(() => [...board.pages.flat(), ...board.later], [board]);
  const newTaskFolder = activeFolder ?? planFolder ?? planet.moons[0]?.id ?? null;

  const saveLecternContent = async (text: string): Promise<boolean> => {
    if (!lecternDoc) return false;
    const nextText = text.trim() || lecternContent;
    setCreatedDocs((prev) => {
      const idx = prev.findIndex((d) => d.id === lecternDoc.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], content: nextText };
        return next;
      }
      return [{ id: lecternDoc.id, name: clean(lecternDoc.name), meta: lecternDoc.meta, folderId: lecternDoc.folderId, content: nextText }, ...prev];
    });
    qc.setQueryData(['node', lecternDoc.id], (old: Record<string, unknown> | null | undefined) => ({
      ...(old ?? { id: lecternDoc.id, title: clean(lecternDoc.name) }),
      content: nextText,
    }));

    if (!isLiveCore) {
      setDocSyncError(null);
      setPendingDocSave(null);
      setDocSyncStatus(scopeKey === 'demo-morgenrot' ? 'demo-simulation' : 'local-draft');
      return true;
    }

    setDocSyncStatus('saving');
    setDocSyncError(null);
    setPendingDocSave({ id: lecternDoc.id, text: nextText });
    try {
      const saved = await updateNode(lecternDoc.id, {
        content: nextText,
        title: clean(lecternDoc.name),
        folder_id: lecternDoc.folderId || undefined,
      });
      if (!saved) {
        throw new Error('CORE-Server hat keine Speicherbestätigung zurückgegeben');
      }
      setDocSyncStatus('core-confirmed');
      setDocSyncError(null);
      setPendingDocSave(null);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Dokument konnte nicht im CORE gespeichert werden';
      setDocSyncStatus('failed');
      setDocSyncError(msg);
      return false;
    }
  };

  const retryDocSave = async (): Promise<boolean> => {
    if (!pendingDocSave) return false;
    return saveLecternContent(pendingDocSave.text);
  };

  const appendAuditEntryToLectern = (entry: AuditEntry) => {
    const line = formatAuditMarkdownLine(entry);
    const base = lecternContent || `# ${lecternDoc ? clean(lecternDoc.name) : title}`;
    const marker = '## Dokumentenspur (Verifizierte Buchungen)';
    const nextContent = base.includes(marker)
      ? `${base}\n${line}`
      : `${base}\n\n${marker}\n${line}`;
    void saveLecternContent(nextContent);
  };

  const createDepartmentDoc = async (t: string, body: string): Promise<boolean> => {
    const fid = newTaskFolder ?? planet.moons[0]?.id ?? 'f-default';
    const content = `# ${t}\n\n${body || `Konzept & Dokumentation für ${title}.`}`;
    if (!isLiveCore) {
      const localId = `doc-local-${Date.now().toString(36)}`;
      setCreatedDocs((prev) => [{ id: localId, name: t, meta: 'document', folderId: fid, content }, ...prev]);
      qc.setQueryData(['node', localId], { id: localId, title: t, name: t, content });
      setLectern(localId);
      setDocSyncStatus(scopeKey === 'demo-morgenrot' ? 'demo-simulation' : 'local-draft');
      setDocSyncError(null);
      return true;
    }

    setDocSyncStatus('saving');
    setDocSyncError(null);
    try {
      const res = await createNode({
        folder_id: fid,
        title: t,
        name: t,
        type: 'document',
        content,
      } as Parameters<typeof createNode>[0]);
      if (!res || typeof (res as { id?: string }).id !== 'string') {
        throw new Error('CORE hat kein Dokument angelegt');
      }
      const createdId = (res as { id: string }).id;
      setCreatedDocs((prev) => [{ id: createdId, name: t, meta: 'document', folderId: fid, content }, ...prev]);
      qc.setQueryData(['node', createdId], { id: createdId, title: t, name: t, content });
      setLectern(createdId);
      setDocSyncStatus('core-confirmed');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Dokument-Erstellung im CORE fehlgeschlagen';
      setDocSyncStatus('failed');
      setDocSyncError(msg);
      return false;
    }
  };

  const submitDraft = async () => {
    const v = (draft ?? '').trim();
    if (!v) { setDraft(null); return; }
    const ok = await addTask(v, newTaskFolder, null, planet.id);
    if (ok) setDraft(null);
  };

  // Signale (Post & Termine) für die Abteilung (0ms synchron aus TodaySnapshot)
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

  // Jeder Raum besitzt sein EIGENES illustriertes 1920×1080 Raumbild mit eigenen Möbeln, eigenem Licht und transparentem Fenster ins Universum:
  // - werkstatt: room-werkstatt.webp (Holz-Werkbank, Kork-Pinnwand, Runder Tisch, Lesepult)
  // - studio (Atelier): room-atelier.webp (Dunkler Basalt, Messing-Leinentafel, Zeichentisch mit ORIGIN-Sockel, Atelier-Pult)
  // - bar (Gastraum / Theke / Crew-Bar): room-bar.webp (Schiefer-Tafel, Espresso-Holztheke mit Siebträger, Bistro-Tisch, Empfangspult)
  // - bridge / kontor (Kommandobrücke / Verwaltung / Kontor): room-kontor.webp (Smaragd-Walnuss-Kontor, Bankierlampe & Waage, Kontor-Pult)
  const activeStageImg = useMemo(() => {
    const arch = roomCtx.archetype;
    const base =
      arch === 'studio'
        ? '/werkstatt/room-atelier.webp'
        : arch === 'bar'
          ? '/werkstatt/room-bar.webp'
          : arch === 'bridge' || arch === 'kontor'
            ? '/werkstatt/room-kontor.webp'
            : '/werkstatt/room-werkstatt.webp';
    return world === 'morgennebel' ? base.replace('.webp', '-morgen.webp') : base;
  }, [roomCtx.archetype, world]);
  const activeSkyRect = ROOM.window;
  const activeMoraSeat = ROOM.moraSeat;

  const taskOf = (id: string) => allTasks.find((t) => t.id === id) ?? null;
  const folderName = (t: WorkTask | null) => (t?.folderId ? clean(planet.moons.find((m) => m.id === t.folderId)?.title ?? '') : '');
  const folderTitleById = (fid: string) => clean(planet.moons.find((m) => m.id === fid)?.title ?? '');

  return (
    <div ref={rootRef} className="wk-root" lang="de" data-world={world} data-room={activeRoom} data-archetype={roomCtx.archetype} data-dept={planet.id} data-testid="werkstatt" data-place={top.kind} data-landed={landed ? '1' : undefined}>
      <div ref={roomRef} className="wk-room" aria-hidden={close ? true : undefined}>
        <StageLayer
          stage={room}
          img={activeStageImg}
          ext={activeStageImg.replace('.webp', '')}
          label={`${roomLabel} ${title}`}
          testId="wk-room"
          under={<WindowUniverse rect={activeSkyRect} world={world} planets={planets} focusId={planet.id} />}
        >
          {/* =====================================================================================
              PHYSISCHER ABTEILUNGS-RAUM (Jede Abteilung hat ihr eigenes Zimmer mit Möbeln & Fenster!)
             ===================================================================================== */}
          <div className="wk-room-bar" style={{ left: B.x, top: B.y - 46, width: 1560 }} data-testid="wk-room-bar">
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
            <span className="wk-workflow-pill wk-workflow-pill--wood">
              <b>{roomCtx.roomName}:</b> Wandtafel · Tisch links ({stationMeta.badgeText}) · Beistelltisch (Mappe) · Pult rechts (Buch)
            </span>
          </div>

          {planets.length > 1 && onSwitchPlanet ? (
            <div
              className="wk-corridor"
              style={{ left: ROOM.window.x, top: 30 }}
              role="navigation"
              aria-label="Nachbarräume im Korridor"
              data-testid="wk-corridor"
            >
              <span className="wk-corridor__label">Räume:</span>
              {planets.map((p) => {
                const isCurrent = p.id === planet.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="wk-folder-tab"
                    aria-current={isCurrent ? 'page' : undefined}
                    aria-pressed={isCurrent}
                    data-testid={`wk-corridor-${p.id}`}
                    onClick={() => { if (!isCurrent) onSwitchPlanet(p.id); }}
                  >
                    {clean(p.title)}
                  </button>
                );
              })}
              <button
                type="button"
                className="wk-folder-tab wk-lamp-toggle"
                onClick={toggleRoomLamp}
                data-testid="wk-lamp-toggle"
                aria-label="Tischlampe & Tageslicht umschalten"
              >
                {world === 'morgennebel' ? '☀ Tageslicht' : '🕯 Lampenlicht'}
              </button>
            </div>
          ) : null}

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

          {/* Physische Möbel & Gegenstände im Raum:
              0. Spezial-Objekt links am Tisch (ORIGIN-Sockel / Siebträger-Maschine / Messingwaage / Werkbank-Lampe)
              1. Haupttisch / Theke / Werkbank / Zeichentisch links unter der Lampe -> Echte Arbeitsstation der Abteilung!
              2. Runder Beistelltisch in der Mitte -> Wochenmappe
              3. Stehpult vor dem Fenster rechts -> Gebundenes Vollbild-Buch
              4. Wandregal / Archivschrank ganz links -> Dokumenten-Auswahl */}
          <button
            type="button"
            className="wk-hit wk-hit--fixture"
            style={box(stationMeta.fixtureBox)}
            onClick={() => open({ kind: 'station' })}
            aria-label={`${stationMeta.fixtureLabel}: ${stationMeta.fixtureSub}`}
            data-testid="wk-hit-fixture"
          />
          <button
            type="button"
            className="wk-plate wk-plate--fixture"
            style={{
              left: Math.max(108, stationMeta.fixtureBox.x + stationMeta.fixtureBox.w / 2),
              top: stationMeta.fixtureBox.y - 16,
              translate: '-50% 0',
            }}
            onClick={() => open({ kind: 'station' })}
            data-testid="wk-fixture-plate"
          >
            <span>{stationMeta.fixtureLabel}</span>
            <small>{stationMeta.fixtureSub}</small>
          </button>

          <button
            type="button"
            className="wk-hit wk-hit--desk"
            style={box(ROOM.desk)}
            onClick={() => open({ kind: 'station' })}
            aria-label={stationMeta.deskLabel}
            data-testid="wk-hit-station"
          />
          <button
            type="button"
            className="wk-plate wk-plate--desk"
            style={{ left: ROOM.desk.x + ROOM.desk.w / 2, top: ROOM.desk.y + 24, translate: '-50% 0' }}
            onClick={() => open({ kind: 'station' })}
            data-testid="wk-desk-plate"
          >
            <b>{stationMeta.deskLabel}</b>
            <small>{stationMeta.deskHint} →</small>
          </button>

          <button type="button" className="wk-hit" style={box(ROOM.lectern)} onClick={() => lecternDoc && open({ kind: 'doc', id: lecternDoc.id })} aria-label={lecternDoc ? `Buch am Pult: ${clean(lecternDoc.name)}` : 'Pult'} data-testid="wk-hit-lectern" />
          {lecternDoc ? <div className="wk-plate" aria-hidden style={{ left: ROOM.plate.x, top: ROOM.plate.y, translate: '-50% 0' }}>{clean(lecternDoc.name)}</div> : null}
          <button type="button" className="wk-hit" style={box(ROOM.table)} onClick={() => open({ kind: 'planung' })} aria-label="Mappe Planung" data-testid="wk-hit-mappe" />
          <div className="wk-plate wk-plate--sub" aria-hidden style={{ left: ROOM.table.x + ROOM.table.w / 2, top: ROOM.table.y + 62, translate: '-50% 0' }}>Wochenmappe</div>
          <button type="button" className="wk-hit" style={box(ROOM.shelf)} onClick={() => setDocSlip(true)} aria-label="Regal mit Dokumenten" data-testid="wk-hit-shelf" />

          {docSlip ? (
            <PaperSlip x={116} y={108} w={480} label="Wandregal · Dossier- & Vorlagen-Archiv" onClose={() => setDocSlip(false)} testId="wk-doc-slip">
              <div style={{ marginBottom: 8 }}>
                <input
                  value={shelfQuery}
                  onChange={(e) => setShelfQuery(e.target.value)}
                  placeholder="Unterlagen & Vorlagen im Regal suchen…"
                  data-testid="wk-shelf-search"
                  aria-label="Unterlagen im Regal suchen"
                  style={{
                    width: '100%',
                    height: 30,
                    padding: '0 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(90, 62, 30, 0.3)',
                    background: '#fffcf5',
                    fontSize: 13,
                  }}
                />
              </div>
              <ul className="wk-slip__list">
                {docs
                  .filter((d) => !shelfQuery.trim() || clean(d.name).toLowerCase().includes(shelfQuery.trim().toLowerCase()))
                  .map((d) => (
                    <li key={d.id}>
                      <button type="button" onClick={() => { setDocSlip(false); setLectern(d.id); open({ kind: 'doc', id: d.id }); }}>
                        <span>{clean(d.name)}</span>
                        {folderTitleById(d.folderId) ? <em>{folderTitleById(d.folderId)}</em> : null}
                      </button>
                    </li>
                  ))}
              </ul>
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed rgba(90, 62, 30, 0.25)' }} data-testid="wk-shelf-templates">
                <small style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7b5514', marginBottom: 6 }}>
                  Vorlagen aus dem Regal anlegen & aufs Stehpult legen
                </small>
                <ul className="wk-slip__list">
                  {shelfTemplates.map((tpl) => (
                    <li key={tpl.id}>
                      <button
                        type="button"
                        data-testid={`wk-shelf-tpl-${tpl.id}`}
                        onClick={async () => {
                          setDocSlip(false);
                          await createDepartmentDoc(tpl.title, tpl.body);
                          const res = await recordOp({
                            idempotencyKey: `shelf-tpl-${tpl.id}`,
                            actor: resolveOperationalActor(scopeKey),
                            departmentId: planet.id,
                            departmentTitle: title,
                            action: `Vorlage "${tpl.title}" aus dem Wandregal angelegt`,
                            result: 'Neues Dossier auf dem Stehpult aufgeschlagen',
                            safetyLevel: 'routine',
                          });
                          if (!res.alreadyRecorded && res.entry) appendAuditEntryToLectern(res.entry);
                        }}
                      >
                        <span>+ {tpl.title}</span>
                        <em>Vorlage</em>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </PaperSlip>
          ) : null}
          {!close ? (
            <div
              className="wk-mora-companion"
              style={{ left: activeMoraSeat.x - 190, top: activeMoraSeat.y - 168 }}
              data-testid="wk-mora-bubble"
            >
              <div className="wk-mora-companion__head">
                <span>{moraImpulse.title}</span>
                <button
                  type="button"
                  className="wk-mora-companion__lamp"
                  onClick={toggleRoomLamp}
                  aria-label="Raumlicht umschalten"
                >
                  {world === 'morgennebel' ? '☀ Tag' : '🕯 Nacht'}
                </button>
              </div>
              <p>{moraImpulse.text}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {moraImpulse.canReorderOatMilk ? (
                  <button
                    type="button"
                    className="wk-mora-companion__cta"
                    data-testid="wk-mora-reorder-btn"
                    onClick={async () => {
                      const res = await recordOp({
                        idempotencyKey: 'mora-oatmilk-reorder-prep',
                        actor: resolveOperationalActor(scopeKey),
                        departmentId: planet.id,
                        departmentTitle: title,
                        action: 'Hafermilch-Nachbestellung (36 L Barista) für morgen vorbereitet',
                        result: 'Nachbestellung im Kontor-Lieferantenbogen hinterlegt & dokumentiert',
                        safetyLevel: 'buchung',
                        kind: 'routine_action',
                        mutate: (d) => {
                          d.kanzleiWeber.oatMilkReorderPrepared = true;
                        },
                      });
                      if (res.ok && !res.alreadyRecorded && res.entry) appendAuditEntryToLectern(res.entry);
                      if (res.ok) {
                        void addTask('Hafermilch-Nachbestellung (36 L Hofmolkerei) freigeben', newTaskFolder, today, planet.id);
                      }
                    }}
                  >
                    Nachbestellung vorbereiten →
                  </button>
                ) : null}
                <button
                  type="button"
                  className="wk-mora-companion__cta"
                  data-testid="wk-mora-action-btn"
                  onClick={() => open({ kind: 'station' })}
                >
                  {moraImpulse.cta}
                </button>
              </div>
            </div>
          ) : null}
          {!close ? <MoraSeat at={activeMoraSeat} stage={room} name="wk-room" /> : null}
        </StageLayer>
      </div>

      {close ? (
        <div
          ref={closeRef}
          key={`${close.kind}-${"id" in close ? close.id : ""}`}
          className="wk-close"
          data-testid={`wk-close-${close.kind}`}
          data-archetype={roomCtx.archetype}
          data-close-kind={close.kind}
        >
          <StageLayer
            stage={stage}
            img={closeImg(close.kind, world, roomCtx.archetype)}
            ext={closeImg(close.kind, world, roomCtx.archetype).replace('.webp', '')}
            label={nameOf(close)}
            under={<WindowUniverse rect={CLOSE[close.kind].sky} world={world} planets={planets} focusId={planet.id} />}
          >
            <div className="wk-close-bar" data-testid="wk-close-bar">
              <button
                type="button"
                className="wk-close-bar__back"
                onClick={backToRoom}
                data-testid="wk-close-back-room"
              >
                ← Zurück in den Raum ({roomCtx.roomName})
              </button>
              <span className="wk-plate wk-plate--room">{roomSignText} · {nameOf(close)}</span>
              <div className="wk-close-bar__nav" role="group" aria-label="Möbel & Arbeitsplätze im Raum">
                <button
                  type="button"
                  className="wk-folder-tab"
                  aria-pressed={close.kind === 'station'}
                  onClick={() => open({ kind: 'station' })}
                  data-testid="wk-close-go-station"
                >
                  {stationMeta.badgeText}
                </button>
                <button
                  type="button"
                  className="wk-folder-tab"
                  aria-pressed={close.kind === 'planung'}
                  onClick={() => open({ kind: 'planung' })}
                  data-testid="wk-close-go-planung"
                >
                  Wochenmappe
                </button>
                <button
                  type="button"
                  className="wk-folder-tab"
                  aria-pressed={close.kind === 'doc'}
                  disabled={!lecternDoc}
                  onClick={() => lecternDoc && open({ kind: 'doc', id: lecternDoc.id })}
                  data-testid="wk-close-go-doc"
                >
                  Buch am Pult
                </button>
              </div>
            </div>
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
            {close.kind === 'planung' ? (
              <Mappe
                weeks={weeks}
                folderId={planFolder}
                companyId={companyId}
                today={today}
                defaultRows={defaultWeekRows}
                back={backTo}
                tasks={allTasks}
                events={barEvents}
                onMoveTaskDate={(t, iso) => void update(t.raw, { due_date: iso })}
                onToggleTask={(t) => void setDone(t.raw, !t.done)}
                onAddTaskForDate={(txt, iso) => void addTask(txt, newTaskFolder, iso, planet.id)}
              />
            ) : null}
            {close.kind === 'station' ? (
              <>
                <DeskWorkstation
                  stationKind={stationMeta.kind}
                  planetId={planet.id}
                  planetTitle={title}
                  companyId={companyId}
                  crew={crew}
                  tasks={allTasks}
                  docs={docs.map((d) => ({ ...d, name: clean(d.name) }))}
                  activeDocTitle={lecternDoc ? clean(lecternDoc.name) : ''}
                  activeDocContent={lecternContent}
                  docSyncStatus={docSyncStatus}
                  docSyncError={docSyncError}
                  onRetryDocSave={pendingDocSave ? () => { void retryDocSave(); } : undefined}
                  onSaveDoc={(txt) => saveLecternContent(txt)}
                  onOpenBook={(id) => { setLectern(id); open({ kind: 'doc', id }); }}
                  onSelectDoc={(id) => setLectern(id)}
                  onCreateDoc={(t, b) => createDepartmentDoc(t, b)}
                  onAddTask={(t, who) => void addTask(t, newTaskFolder, today, planet.id, who)}
                  onToggleTask={(t) => void setDone(t.raw, !t.done)}
                  onOpenTask={(id) => open({ kind: 'task', id })}
                  mails={barMails}
                  events={barEvents}
                  onAppendAuditEntry={appendAuditEntryToLectern}
                  onClose={back}
                />
                <WorkDock back={backTo} actions={[
                  { id: 'buch', label: 'Buch am Pult', run: () => lecternDoc && open({ kind: 'doc', id: lecternDoc.id }), disabled: !lecternDoc },
                  { id: 'planung', label: 'Wochenmappe', run: () => open({ kind: 'planung' }) },
                ]} />
              </>
            ) : null}
            <MoraSeat at={CLOSE[close.kind].mora} stage={stage} name={`wk-close-${close.kind}`} />
          </StageLayer>
        </div>
      ) : null}

      {!close && landed ? (
        <WorkDock back={backTo} actions={[
          { id: 'station', label: stationMeta.badgeText, run: () => open({ kind: 'station' }) },
          {
            id: 'neue-aufgabe',
            label: 'Neue Aufgabe',
            run: () => { setLater(false); setPage(0); setDraft(''); },
          },
          { id: 'dokumente', label: 'Dokumente', run: () => setDocSlip((v) => !v), pressed: docSlip },
          { id: 'planung', label: 'Planung', run: () => open({ kind: 'planung' }) },
        ]} />
      ) : null}
    </div>
  );
}
