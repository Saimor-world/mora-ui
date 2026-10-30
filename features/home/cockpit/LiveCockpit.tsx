'use client';
import '../cockpit.css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CockpitWindow } from './Window';
import { PlanetSystem } from './Scene';
import { HomeOverview } from '../widgets/HomeOverview';
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
  const { snapshot: liveSnapshot, loading: liveLoading, loadError } = useScopedToday();
  const snapshot = propSnapshot !== undefined ? propSnapshot : liveSnapshot;

  const phone = usePhone();
  // Compute company name: strip literal [FIKTIV]/(FIKTIV), show badge via effectiveIsDemo
  const rawCompanyName =
    propCompanyName ||
    (user as { active_company_name?: string | null } | null)?.active_company_name ||
    'Dein Unternehmen';
  const companyName = stripFiktiv(rawCompanyName) || 'Dein Unternehmen';
  const effectiveIsDemo =
    isDemo ||
    hasFiktivMarker(rawCompanyName) ||
    user?.tenant_id === 'tenant-demo-morgenrot' ||
    snapshot?.requested_scope?.tenant_id === 'tenant-demo-morgenrot' ||
    /morgenrot/i.test(rawCompanyName);

  // Compute user first name for honest personalized greeting from session
  const cleanViewerName = propViewerName ? stripFiktiv(propViewerName) : null;
  const first = cleanViewerName?.split(/\s+/)[0] || firstName(user);

  const h = new Date().getHours();
  const hello = h < 11 ? 'Guten Morgen' : h < 17 ? 'Guten Tag' : 'Guten Abend';
  const greeting = `${hello}${first ? `, ${first}` : ''}.`;

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
    });
    return map;
  }, [planets, nightwatchIncidents, snapshot?.tasks, attention]);

  const timeHeader = useMemo(() => {
    const rawDate = snapshot?.calendar?.date;
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const dayName = d.toLocaleDateString('de-DE', { weekday: 'short' });
        const dayNum = d.getDate();
        const monthName = d.toLocaleDateString('de-DE', { month: 'short' });
        return `${dayName}, ${dayNum}. ${monthName} · 07:00`;
      }
    }
    const now = new Date();
    const dayName = now.toLocaleDateString('de-DE', { weekday: 'short' });
    const dayNum = now.getDate();
    const monthName = now.toLocaleDateString('de-DE', { month: 'short' });
    return `${dayName}, ${dayNum}. ${monthName} · 07:00`;
  }, [snapshot?.calendar?.date]);

  // Home is an overview, not a second Universe. Every entry goes to the same
  // CORE-backed FinderVerse used by Heute and the dock, with the real target ID.
  const openDepartment = useCallback((id: string) => {
    if (!planets.some((p) => p.id === id)) return;
    useUniverseFocus.getState().show({ planetId: id });
    navigate('universe');
  }, [planets, navigate]);
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

  const subline = liveLoading && propSnapshot === undefined
    ? 'Quellen werden geladen …'
    : loadError && propSnapshot === undefined && !liveLoading
    ? 'Quellen sind derzeit nicht verfügbar.'
    : items.length
    ? `${items.length === 1 ? 'Ein Ding braucht' : items.length === 2 ? 'Zwei Dinge brauchen' : 'Drei Dinge brauchen'} dich.`
    : 'Keine offenen Hinweise aus den verfügbaren Quellen.';

  const handleWidgetOpen = (widgetId: string) => {
    if (widgetId === 'tasks' || widgetId === 'overdue-tasks') {
      navigate('tasks');
    } else if (widgetId === 'calendar') {
      navigate('calendar');
    } else if (widgetId === 'mail') {
      navigate('mora');
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
    >
      <div className="ck-space" aria-hidden />

      {/* 3D Scene canvas */}
      <div className="ck-scene ck-scene--system ck-scene--behind">
        {!phone ? (
          <PlanetSystem
            planets={planets}
            attention={attention}
            signals={planetSignals}
            company={companyName}
            compact
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
              greeting={greeting}
              subline={subline}
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

              {items.length ? (
                <ol className="ck-list">
                  {items.map((it) => (
                    <li key={it.id} className="ck-item">
                      <div className="ck-item__txt">
                        <div className="ck-item__t">{it.title}</div>
                        <div className="ck-item__d" style={it.isWarning ? { color: 'var(--amber, #f59e0b)' } : undefined}>{it.detail}</div>
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
              ) : (
                <div className="ck-calm" data-testid="home-done">
                  <div>
                    <b>Alles erledigt.</b>
                    <span>Keine offenen Hinweise aus den verfügbaren Quellen.</span>
                  </div>
                </div>
              )}

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
                  <span className="mr-note">{finderLoading ? 'Abteilungen werden geladen …' : finderFailed ? 'Abteilungen gerade nicht lesbar.' : 'Noch keine Abteilungen in CORE.'}</span>
                )}
              </div>
            </HomeOverview>
          </div>
        </section>
    </div>
  );
}
