'use client';
import { demoCompanyName, useDemoStore } from '@/lib/demo/demoStore';
import '../cockpit.css';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CockpitWindow } from './Window';
import { OPEN_PLANET_SIZE, PlanetSystem } from './Scene';
import { homeMycelium } from '@/lib/universe/homeMycelium';
import { dayMoonsFor } from '@/lib/universe/dayMoons';
import { corePost } from '@/lib/api/http';
import { useScopeCompanyId } from '@/lib/demo/demoStore';
import { HomeOverview } from '../widgets/HomeOverview';
import { HomeFocus } from '../widgets/HomeFocus';
import { widgetsFromToday } from '../widgets/adapters';
import { useScopedToday } from '@/lib/os/useScopedToday';
import { useNightwatchIncidents } from '@/lib/queries/useNightwatchIncidents';
import { useSessionStore } from '@/lib/store/sessionStore';
import { firstName } from '@/lib/auth/displayName';
import type { FeatureSurfaceProps } from '../../types';
import type { TodaySnapshot } from '@/lib/api/todayClient';
import type { FPlanet } from '@/lib/lea/finder';
import { coreTreeToPlanets, deriveLiveAttention, finderToCockpitPlanets } from './coreAdapter';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';
import { hasFiktivMarker, stripFiktiv } from '@/lib/demo/morgenrot/stripFiktiv';
import { useUniverseFocus } from '@/lib/lea/universeFocus';
import { focusCards, type FocusCard } from '@/lib/mora/bridgeData';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';

/** „Mi., 4. Nov.“ aus dem Snapshot-Datum, sonst heute. Keine erfundene Uhrzeit. */
export function headerDate(raw?: string | null, now: Date = new Date()): string {
  const parsed = raw ? new Date(raw) : null;
  const d = parsed && !isNaN(parsed.getTime()) ? parsed : now;
  return `${d.toLocaleDateString('de-DE', { weekday: 'short' })}, ${d.getDate()}. ${d.toLocaleDateString('de-DE', { month: 'short' })}`;
}

function usePhone() {
  const [p, setP] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(max-width: 820px)');
    const f = () => setP(q.matches);
    f();
    q.addEventListener('change', f);
    return () => q.removeEventListener('change', f);
  }, []);
  return p;
}

export interface LiveCockpitProps {
  navigate: FeatureSurfaceProps['navigate'];
  initialView?: 'home' | 'universe';
  companyName?: string;
  departments?: any[];
  finderPlanets?: FPlanet[];
  finderLoading?: boolean;
  finderFailed?: boolean;
  snapshot?: TodaySnapshot | null;
  viewerName?: string | null;
  isDemo?: boolean;
}

export function LiveCockpit({
  navigate,
  initialView = 'home',
  companyName: propCompanyName,
  departments: propDepartments,
  finderPlanets,
  finderLoading = false,
  finderFailed = false,
  snapshot: propSnapshot,
  viewerName: propViewerName,
  isDemo = false,
}: LiveCockpitProps) {
  const user = useSessionStore((s) => s.user);
  const demoId = useDemoStore((s) => s.demoCompanyId);
  const { snapshot: liveSnapshot, loading: liveLoading, loadError } = useScopedToday();
  const snapshot = propSnapshot !== undefined ? propSnapshot : liveSnapshot;

  const phone = usePhone();
  // Compute company name: strip literal [FIKTIV]/(FIKTIV), show badge via effectiveIsDemo
  const rawCompanyName =
    propCompanyName ||
    demoCompanyName(demoId) ||
    (user as { active_company_name?: string | null } | null)?.active_company_name ||
    'Dein Unternehmen';
  const companyName = stripFiktiv(rawCompanyName) || 'Dein Unternehmen';
  const effectiveIsDemo =
    isDemo ||
    !!demoCompanyName(demoId) ||
    hasFiktivMarker(rawCompanyName) ||
    user?.tenant_id === 'tenant-demo-morgenrot' ||
    snapshot?.requested_scope?.tenant_id === 'tenant-demo-morgenrot' ||
    /morgenrot/i.test(rawCompanyName);

  // Compute user first name for honest personalized greeting from session
  const cleanViewerName = propViewerName ? stripFiktiv(propViewerName) : null;
  const first = cleanViewerName?.split(/\s+/)[0] || firstName(user);

  // Real company departments: from props (e.g. Morgenrot) or from useWorld().finder (same source as Universe)
  const rawDepts = useMemo(() => {
    return propDepartments && propDepartments.length > 0 ? propDepartments : [];
  }, [propDepartments]);

  const planets: DemoPlanet[] = useMemo(() => {
    const fromCore = coreTreeToPlanets(rawDepts);
    if (fromCore.length > 0) return fromCore;
    const fromWorld = finderPlanets ? finderToCockpitPlanets(finderPlanets) : [];
    if (fromWorld.length > 0) return fromWorld;
    // An online Home never invents departments that cannot be opened in CORE.
    // The explicitly marked Offline component owns the separate fictional seed.
    return [];
  }, [rawDepts, finderPlanets]);

  const { data: nightwatchIncidents = [] } = useNightwatchIncidents(false);
  const { attention, items } = useMemo(
    () => deriveLiveAttention(snapshot, navigate, nightwatchIncidents),
    [snapshot, navigate, nightwatchIncidents]
  );

  const scopeCompanyId = useScopeCompanyId();
  const dayMoons = useMemo(() => dayMoonsFor(snapshot), [snapshot]);
  const threads = useMemo(() => homeMycelium(planets, snapshot), [planets, snapshot]);
  // Demo: abhaken bleibt lokal, nie ein CORE-Schreibzugriff.
  const onTaskDone = useCallback((id: string) => { if (!effectiveIsDemo && !scopeCompanyId?.startsWith('demo-')) void corePost(`/v3/tasks/${encodeURIComponent(id)}`, { status: 'done' }).catch(() => null); }, [effectiveIsDemo, scopeCompanyId]);

  const planetSignals = useMemo(() => {
    const map = new Map<string, { isAlarm: boolean; reason: string }>();
    planets.forEach((p) => {
      const incs = nightwatchIncidents.filter((i) => i.department_id === p.id);
      const crit = incs.find((i) => i.severity === 'critical' || i.severity === 'fatal');
      if (crit) {
        map.set(p.id, { isAlarm: true, reason: crit.title || 'Kritischer Vorfall' });
        return;
      }
      if (incs.length > 0) {
        map.set(p.id, { isAlarm: false, reason: incs[0].title || 'Vorfall in Prüfung' });
        return;
      }
      const overdue = (snapshot?.tasks?.overdue ?? []).filter((t) => t.department_id === p.id);
      if (overdue.length > 0) {
        map.set(p.id, { isAlarm: false, reason: overdue[0].title || `${overdue.length} überfällige Aufgabe` });
        return;
      }
      const due = (snapshot?.tasks?.due_today ?? []).filter((t) => t.department_id === p.id);
      if (due.length > 0) {
        map.set(p.id, { isAlarm: false, reason: due[0].title || `${due.length} heute fällig` });
        return;
      }
      if (attention.has(p.id)) {
        map.set(p.id, { isAlarm: false, reason: 'Braucht dich' });
      }
      if (map.has(p.id)) return;
      const open = (snapshot?.tasks?.items ?? []).filter((t) => t.department_id === p.id && t.status !== 'done');
      if (open.length > 0) map.set(p.id, { isAlarm: false, reason: `${open.length} offen` });
    });
    return map;
  }, [planets, nightwatchIncidents, snapshot?.tasks, attention]);

  // Nur das Datum: die Uhrzeit steht live in der Brücke (vorher fest „07:00“ – widersprach der Dock-Uhr).
  const timeHeader = useMemo(() => headerDate(snapshot?.calendar?.date), [snapshot?.calendar?.date]);

  // Leise Zeichen aus echten Daten: Zahl = überfällige Aufgaben der Abteilung, Ring = offene Nachtwache.
  const planetMarks = useMemo(() => {
    const map = new Map<string, { overdue: number; watch: boolean }>();
    planets.forEach((p) => {
      const overdue = (snapshot?.tasks?.overdue ?? []).filter((t) => t.department_id === p.id).length;
      const watch = nightwatchIncidents.some((i) => i.department_id === p.id && !(i as { acked?: boolean }).acked);
      if (overdue || watch) map.set(p.id, { overdue, watch });
    });
    return map;
  }, [planets, snapshot?.tasks, nightwatchIncidents]);

  // Home is an overview, not a second Universe. Every entry goes to the same
  // CORE-backed FinderVerse used by Heute and the dock, with the real target ID.
  // Ein Raum: die Kamera fliegt auf den Planeten zu, dann öffnet derselbe Himmel die Abteilung.
  const [dive, setDive] = useState<{ id: string; x: number; y: number; dx: number; dy: number; k: number } | null>(null);
  // Rückflug aus der Abteilung: Home startet nah am Planeten (ohne Übergang) und fährt dann hinaus.
  // Nur lesen (StrictMode ruft Initialisierer doppelt); verbraucht wird der Rückflug im Effekt unten.
  const [returning, setReturning] = useState<string | null>(() => useUniverseFocus.getState().returning);
  const diveFor = useCallback((id: string) => {
    const el = typeof document !== 'undefined' ? document.querySelector<HTMLElement>(`[data-testid="open-${CSS.escape(id)}"] .glass-orb`) : null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const scene = (el.closest('.ck-scene') as HTMLElement | null)?.getBoundingClientRect() ?? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const x = r.left + r.width / 2 - scene.left, y = r.top + r.height / 2 - scene.top;
    // Ziel = Ort und Größe des offenen Planeten (OpenPlanet: Mitte, 30 % Höhe) → nahtlose Übergabe.
    el.closest('.ck-planet')?.classList.add('is-dive');
    return { el, d: { id, x, y, dx: scene.width / 2 - x, dy: scene.height * 0.3 - y, k: OPEN_PLANET_SIZE / Math.max(24, r.width) } };
  }, []);
  const openTaskMoon = useCallback((planetId: string, taskId: string) => {
    if (!planets.some((p) => p.id === planetId)) return;
    useUniverseFocus.getState().show({ planetId, taskId, from: 'home' });
    navigate('universe');
  }, [planets, navigate]);
  const diveCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => { diveCleanupRef.current?.(); }, []);
  const openDepartment = useCallback((id: string) => {
    if (!planets.some((p) => p.id === id)) return;
    diveCleanupRef.current?.();
    useUniverseFocus.getState().show({ planetId: id, taskId: null, from: 'home' });
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const hit = reduced ? null : diveFor(id);
    if (!hit) { navigate('universe'); return; }
    setDive(hit.d);
    // Weiter erst, wenn die Kamera angekommen ist (transitionend), sonst spätestens nach 1,6 s.
    const sceneEl = hit.el.closest('.ck-scene') as HTMLElement | null;
    let done = false;
    let timer = 0;
    const cleanup = () => {
      done = true;
      window.clearTimeout(timer);
      sceneEl?.removeEventListener('transitionend', onEnd);
      diveCleanupRef.current = null;
    };
    const go = () => { if (done) return; cleanup(); navigate('universe'); };
    const onEnd = (e: TransitionEvent) => { if (e.target === sceneEl && e.propertyName === 'transform') go(); };
    sceneEl?.addEventListener('transitionend', onEnd);
    timer = window.setTimeout(go, 360);
    diveCleanupRef.current = cleanup;
  }, [planets, navigate, diveFor]);
  // Die Abteilungen schon im Ruhezustand vorladen, damit der Anflug ohne Ladepause in den Planeten übergeht.
  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;
    const t = window.setTimeout(() => { void import('@/features/universe/index').catch(() => undefined); }, 1200);
    return () => window.clearTimeout(t);
  }, []);
  // Rückflug: warten, bis der Himmel vermessen ist (Planet an seinem echten Platz), dann nah ansetzen und hinausfahren.
  useLayoutEffect(() => {
    if (!returning) return;
    useUniverseFocus.getState().takeReturn();
    let raf = 0, tries = 0, last = '';
    const settle = () => {
      const el = document.querySelector<HTMLElement>(`[data-testid="open-${CSS.escape(returning)}"] .glass-orb`);
      const r = el?.getBoundingClientRect();
      const key = r ? `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}` : '';
      if (!r || !r.width || key !== last) { last = key; if (++tries < 40) { raf = requestAnimationFrame(settle); return; } }
      const hit = diveFor(returning);
      if (!hit) { setReturning(null); return; }
      setDive(hit.d); // noch mit data-return: ohne Übergang, sieht aus wie die Abteilung
      // Erst Übergänge wieder einschalten (Bild unverändert), dann im nächsten Bild hinausfahren –
      // beides in einem Schritt startet in Chrome keinen Übergang.
      const after2 = (fn: () => void) => { raf = requestAnimationFrame(() => { raf = requestAnimationFrame(fn); }); };
      after2(() => { flyOut.current = true; setReturning(null); });
    };
    raf = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(raf);
  }, [returning, diveFor]);
  const flyOut = useRef(false);
  // Drehpunkt bleibt beim Hinausfahren derselbe, sonst springt das Bild.
  const lastDive = useRef<{ x: number; y: number } | null>(null);
  if (dive) lastDive.current = { x: dive.x, y: dive.y };
  useEffect(() => {
    if (returning || !flyOut.current) return;
    flyOut.current = false;
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => setDive(null)); });
    const t = window.setTimeout(() => document.querySelectorAll('.ck-planet.is-dive').forEach((b) => b.classList.remove('is-dive')), 1400);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(t); };
  }, [returning]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('ort');
    if (!id && initialView !== 'universe') return;
    if (finderLoading) return;
    const target = planets.find((p) => p.id === id);
    if (target) {
      const moonId = params.get('ordner');
      useUniverseFocus.getState().show({ planetId: target.id, moonId: target.moons.some((m) => m.id === moonId) ? moonId : null });
    } else useUniverseFocus.getState().take();
    // Consume the old shortcut so returning Home cannot replay the handoff.
    if (id) {
      const url = new URL(window.location.href);
      url.searchParams.delete('ort');
      url.searchParams.delete('ordner');
      window.history.replaceState(window.history.state, '', url.toString());
    }
    navigate('universe');
  }, [initialView, navigate, planets, finderLoading]);

  const focus = useMemo(() => focusCards(snapshot ?? null), [snapshot]);

  const resolveTaskPlanetId = useCallback((t?: { department_id?: string | null; folder_id?: string | null } | null) => {
    if (!t) return null;
    if (t.department_id && planets.some((p) => p.id === t.department_id)) return t.department_id;
    const byFolder = t.folder_id ? planets.find((p) => p.moons.some((m) => m.id === t.folder_id))?.id : null;
    return byFolder || planets[0]?.id || null;
  }, [planets]);

  const openFocus = (target: FocusCard['target']) => {
    if (target === 'post') navigate('post');
    else if (target === 'tasks') {
      const t = (snapshot?.tasks?.overdue ?? [])[0] ?? (snapshot?.tasks?.due_today ?? [])[0];
      const planetId = resolveTaskPlanetId(t);
      if (t && planetId) openTaskMoon(planetId, t.id);
      else navigate('today');
    }
    else if (target === 'calendar') openLegacyApp('calendar');
    else useOsShellStore.getState().setNightwatchOpen(true);
  };

  const handleWidgetOpen = (widgetId: string) => {
    if (widgetId === 'tasks' || widgetId === 'overdue-tasks') {
      const list = widgetId === 'overdue-tasks' ? (snapshot?.tasks?.overdue ?? []) : [...(snapshot?.tasks?.overdue ?? []), ...(snapshot?.tasks?.due_today ?? [])];
      const t = list[0];
      const planetId = resolveTaskPlanetId(t);
      if (t && planetId) openTaskMoon(planetId, t.id);
      else navigate('today');
    } else if (widgetId === 'calendar') {
      navigate('post');
    } else if (widgetId === 'mail') {
      navigate('post');
    } else {
      navigate('universe');
    }
  };

  return (
    <div
      className="ck"
      data-testid="home"
      data-scope="owner"
      data-view="home"
      data-phone={phone ? '1' : '0'}
      data-folder="0"
      data-dive={dive ? dive.id : undefined}
      data-return={returning ? '1' : undefined}
      style={dive ? ({ ['--dive-x' as string]: `${dive.x}px`, ['--dive-y' as string]: `${dive.y}px`, ['--dive-dx' as string]: `${dive.dx}px`, ['--dive-dy' as string]: `${dive.dy}px`, ['--dive-k' as string]: dive.k.toFixed(3) } as React.CSSProperties)
        : lastDive.current ? ({ ['--dive-x' as string]: `${lastDive.current.x}px`, ['--dive-y' as string]: `${lastDive.current.y}px` } as React.CSSProperties) : undefined}
    >
      <div className="ck-space" aria-hidden />
      <div className="ck-mist" aria-hidden><i /><i /><i /></div>

      {/* 3D Scene canvas */}
      <div className="ck-scene ck-scene--system ck-scene--behind">
        {!phone ? (
          <PlanetSystem
            planets={planets}
            attention={attention}
            signals={planetSignals}
            marks={planetMarks}
            company={companyName}
            compact
            skyScale={2}
            moons={dayMoons}
            threads={threads}
            onTaskDone={onTaskDone}
            onOpenTask={(taskId) => {
              const t = [...(snapshot?.tasks?.overdue ?? []), ...(snapshot?.tasks?.due_today ?? []), ...(snapshot?.tasks?.items ?? [])].find((x) => x.id === taskId);
              const planetId = resolveTaskPlanetId(t);
              if (planetId) openTaskMoon(planetId, taskId);
            }}
            onOpen={openDepartment}
          />
        ) : null}
      </div>

      <CockpitWindow />

      {/* Top HUD */}
      <header className="ck-top">
        <div className="ck-brand">
          <span>{companyName}</span>
        </div>
        <div className="ck-top__r">
          <span className="ck-time">{timeHeader}</span>
          <span>aus CORE</span>
          {effectiveIsDemo ? (
            <span
              className="ck-fict fiktiv-badge"
              title="Café Morgenrot, Mitarbeitende, Schichten und Zahlen sind erfunden."
            >
              Fiktive Demo
            </span>
          ) : null}
        </div>
      </header>

      {/* Left panel: HomeOverview with live tiles */}
        <section className="ck-panel" aria-label="Home">
          <div data-testid="morgenrot-online">
            <HomeOverview
              titleClass="ck-h1"
              sublineClass="ck-sub"
              widgets={widgetsFromToday(snapshot)}
              onOpenWidget={handleWidgetOpen}
            >
              {phone ? (
                <div className="ck-home-strip">
                  <PlanetSystem
                    planets={planets}
                    attention={attention}
                    company={companyName}
                    compact
                    strip
                    onOpen={openDepartment}
                  />
                </div>
              ) : null}

              {/* Desktop: Planeten und Monde tragen den Tag, keine Karten über dem Himmel. */}
              {phone ? <HomeFocus cards={focus} phone onOpen={openFocus} /> : null}

              {phone && items.length ? (
                <ol className="ck-list">
                  {items.map((it) => (
                    <li key={it.id} className="ck-item">
                      <div className="ck-item__txt">
                        <div className="ck-item__t">{it.title}</div>
                        {it.detail ? <div className="ck-item__d" style={it.isWarning ? { color: 'var(--amber, #f59e0b)' } : undefined}>{it.detail}</div> : null}
                      </div>
                      <button
                        type="button"
                        className={it.primary ? 'ck-btn ck-btn--p' : 'ck-btn'}
                        onClick={() => it.onAction?.()}
                      >
                        {it.action}
                      </button>
                    </li>
                  ))}
                </ol>
              ) : null}

              {/* Department pills for direct access and testing */}
              <div className="mr-depts" aria-label="Abteilungen">
                {planets.length ? (
                  planets.map((d) => (
                    <button
                      type="button"
                      key={d.id}
                      className="mr-dept"
                      data-testid="morgenrot-department"
                      onClick={() => openDepartment(d.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {d.title}
                    </button>
                  ))
                ) : (
                  null
                )}
              </div>
            </HomeOverview>
          </div>
        </section>
    </div>
  );
}
