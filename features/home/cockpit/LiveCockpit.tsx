'use client';
import '../cockpit.css';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { CockpitWindow } from './Window';
import { OpenPlanet, PlanetSystem } from './Scene';
import { DepartmentSheet, FolderSheet } from './Sheets';
import { HomeOverview } from '../widgets/HomeOverview';
import { widgetsFromToday } from '../widgets/adapters';
import { useScopedToday } from '@/lib/os/useScopedToday';
import { useSessionStore } from '@/lib/store/sessionStore';
import { firstName } from '@/lib/auth/displayName';
import type { FeatureSurfaceProps } from '../../types';
import type { TodaySnapshot } from '@/lib/api/todayClient';
import type { FPlanet } from '@/lib/lea/finder';
import { coreTreeToPlanets, deriveLiveAttention, finderToCockpitPlanets } from './coreAdapter';
import { MORGENROT_STRUCTURE, type DemoPlanet } from '@/lib/demo/morgenrot/structure';
import { hasFiktivMarker, stripFiktiv } from '@/lib/demo/morgenrot/stripFiktiv';
import { useActiveCompanyIsDemo } from '@/lib/hooks/useIsSaimorInternal';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { UnifiedUniverse } from '@/features/universe/ui/UnifiedUniverse';

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
  snapshot: propSnapshot,
  viewerName: propViewerName,
  isDemo = false,
}: LiveCockpitProps) {
  const user = useSessionStore((s) => s.user);
  const { snapshot: liveSnapshot, loading: liveLoading, loadError } = useScopedToday({
    enabled: propSnapshot === undefined,
  });
  const snapshot = propSnapshot !== undefined ? propSnapshot : liveSnapshot;

  const phone = usePhone();
  const [view, setView] = useState<'home' | 'universe'>(initialView);
  const [planetId, setPlanetId] = useState<string | null>(null);
  const [moonId, setMoonId] = useState<string | null>(null);
  const [deptSheetOpen, setDeptSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [planetStyle, setPlanetStyle] = useState<'glas' | 'pixel'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const s = localStorage.getItem('mora.planet_style');
        if (s === 'pixel' || s === 'glas') return s;
      } catch {}
    }
    return 'pixel';
  });

  useEffect(() => {
    try {
      const s = localStorage.getItem('mora.planet_style');
      if (s === 'pixel' || s === 'glas') setPlanetStyle(s);
    } catch {}
  }, []);

  const toggleStyle = (st: 'glas' | 'pixel') => {
    setPlanetStyle(st);
    try {
      localStorage.setItem('mora.planet_style', st);
    } catch {}
  };

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Handle URL shortcut (?ort=firma|<planet>&ordner=<mond>)
  useEffect(() => {
    const s = new URLSearchParams(window.location.search);
    const ort = s.get('ort');
    if (ort) {
      setView('universe');
      if (ort !== 'firma') setPlanetId(ort);
      const o = s.get('ordner');
      if (o) setMoonId(o);
    }
  }, []);

  // Compute company name: strip literal [FIKTIV]/(FIKTIV), show badge via effectiveIsDemo
  const activeCompanyIsDemo = useActiveCompanyIsDemo();
  const rawCompanyName =
    propCompanyName ||
    (user as { active_company_name?: string | null } | null)?.active_company_name ||
    'Dein Unternehmen';
  const companyName = stripFiktiv(rawCompanyName) || 'Dein Unternehmen';
  const effectiveIsDemo =
    isDemo ||
    activeCompanyIsDemo ||
    Boolean((user as { is_demo?: boolean } | null)?.is_demo) ||
    hasFiktivMarker(rawCompanyName) ||
    user?.tenant_id === 'tenant-demo-morgenrot' ||
    user?.tenant_id === 'tenant-demo' ||
    snapshot?.requested_scope?.tenant_id === 'tenant-demo-morgenrot' ||
    snapshot?.requested_scope?.tenant_id === 'tenant-demo' ||
    /morgenrot/i.test(rawCompanyName);

  // Compute user first name for honest personalized greeting
  const cleanViewerName = propViewerName ? stripFiktiv(propViewerName) : null;
  let first = cleanViewerName?.split(/\s+/)[0] || firstName(user);
  const userRole = (user?.role || '').toLowerCase();
  const userEmail = (user?.email || '').toLowerCase();
  if (
    !first ||
    first.toLowerCase() === 'inhaber' ||
    first.toLowerCase() === 'owner' ||
    userRole === 'owner' ||
    userEmail.startsWith('inhaber@')
  ) {
    if (companyName.includes('Morgenrot')) {
      first = 'Marius';
    }
  }

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
    // Falls Café-Abteilungen noch als Ersatz einspringen: nur für Demo-Modus (Kennzeichnung über .fiktiv-badge)
    if (effectiveIsDemo && !propDepartments) {
      return MORGENROT_STRUCTURE.map((p) => ({
        ...p,
        title: stripFiktiv(p.title) || p.title,
      }));
    }
    return [];
  }, [rawDepts, finderPlanets, effectiveIsDemo, propDepartments]);

  const { attention, items } = useMemo(
    () => deriveLiveAttention(snapshot, navigate),
    [snapshot, navigate]
  );

  const planet = planets.find((p) => p.id === planetId) ?? null;
  const moon = planet?.moons?.find((m) => m.id === moonId) ?? null;

  const showHome = view === 'home';
  const sceneMode = planet && view === 'universe' ? 'planet' : 'system';

  const subline = liveLoading && propSnapshot === undefined
    ? 'Quellen werden geladen …'
    : !snapshot || (loadError && propSnapshot === undefined)
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
      setView('universe');
    }
  };

  // Filter tasks for the selected planet if available
  const planetTasks = useMemo(() => {
    if (!planet || !snapshot?.tasks?.due_today) return [];
    const pTitle = planet.title.toLowerCase();
    const pId = planet.id.toLowerCase();
    return snapshot.tasks.due_today
      .filter((t) => {
        const text = `${t.title} ${t.id}`.toLowerCase();
        return text.includes(pTitle) || text.includes(pId);
      })
      .map((t) => ({ id: t.id, title: stripFiktiv(t.title) || t.title, due: t.due_date }));
  }, [planet, snapshot]);

  if (view === 'universe') {
    return <UnifiedUniverse navigate={navigate} initialPlanetId={planetId} initialStyle={planetStyle} />;
  }

  return (
    <div
      className="ck"
      data-testid="home"
      data-scope="owner"
      data-view={view}
      data-phone={phone ? '1' : '0'}
      data-folder={moon && !showHome ? '1' : '0'}
    >
      <div className="ck-space" aria-hidden />

      {/* 3D Scene canvas */}
      <div className={`ck-scene ck-scene--${sceneMode}${showHome ? ' ck-scene--behind' : ''}`}>
        {sceneMode === 'planet' && planet ? (
          <OpenPlanet
            planet={planet}
            showMoons={!showHome}
            onMoon={(id) => {
              setMoonId(id);
              setDeptSheetOpen(false);
            }}
            activeMoon={moonId}
            onOpenDept={() => setDeptSheetOpen(true)}
            style={planetStyle}
          />
        ) : !(phone && showHome) ? (
          <PlanetSystem
            planets={planets}
            attention={attention}
            company={companyName}
            compact={showHome}
            style={planetStyle}
            onOpen={(id) => {
              useOsShellStore.getState().setUniverseFocus(id);
              navigate('universe');
            }}
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
          <div className="ck-style-switch" role="group" aria-label="Darstellung">
            <button
              type="button"
              className={`ck-style-btn${planetStyle === 'glas' ? ' is-active' : ''}`}
              onClick={() => toggleStyle('glas')}
              data-testid="switch-glas"
            >
              Glas
            </button>
            <button
              type="button"
              className={`ck-style-btn${planetStyle === 'pixel' ? ' is-active' : ''}`}
              onClick={() => toggleStyle('pixel')}
              data-testid="switch-pixel"
            >
              Pixel
            </button>
          </div>
          <span className="ck-time">Mi, 28. Okt · 07:00</span>
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

      {/* Navigation back from planet horizon */}
      {!showHome && planet ? (
        <button
          type="button"
          className="ck-back"
          onClick={() => {
            setPlanetId(null);
            setMoonId(null);
            setDeptSheetOpen(false);
          }}
          data-testid="ck-back"
        >
          <ArrowLeft size={16} /> {companyName}
        </button>
      ) : null}

      {/* Left panel: HomeOverview with live tiles */}
      {showHome ? (
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
                    style={planetStyle}
                    onOpen={(id) => {
                      setView('universe');
                      setPlanetId(id);
                      setMoonId(null);
                      setDeptSheetOpen(false);
                    }}
                  />
                </div>
              ) : null}

              {items.length ? (
                <ol className="ck-list">
                  {items.map((it) => (
                    <li key={it.id} className="ck-item">
                      <div className="ck-item__txt">
                        <div className="ck-item__t">{it.title}</div>
                        <div className="ck-item__d">{it.detail}</div>
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
                    <span
                      key={d.id}
                      className="mr-dept"
                      data-testid="morgenrot-department"
                      onClick={() => {
                        setView('universe');
                        setPlanetId(d.id);
                        setMoonId(null);
                        setDeptSheetOpen(false);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {d.title}
                    </span>
                  ))
                ) : (
                  <span className="mr-note">Noch keine Abteilungen in CORE.</span>
                )}
              </div>
            </HomeOverview>
          </div>
        </section>
      ) : null}

      {/* Moon Folder Sheet */}
      {moon && planet && !showHome && !deptSheetOpen ? (
        <FolderSheet
          key={moon.id}
          moon={moon}
          planetTitle={planet.title}
          onClose={() => setMoonId(null)}
        />
      ) : null}

      {/* Department Sheet on Planet click */}
      {deptSheetOpen && planet && !showHome ? (
        <DepartmentSheet
          planet={planet}
          tasks={planetTasks}
          onOpenMoon={(id) => {
            setMoonId(id);
            setDeptSheetOpen(false);
          }}
          onNewFolder={() => setToast('Ordner-Erstellung vorbereitet')}
          onClose={() => setDeptSheetOpen(false)}
        />
      ) : null}

      {toast ? (
        <div className="ck-toast" role="status">
          <Check size={14} /> {toast}
        </div>
      ) : null}
    </div>
  );
}
