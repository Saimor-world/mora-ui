'use client';
import '../cockpit.css';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { BridgeConsole } from './BridgeConsole';
import { CockpitWindow } from './Window';
import { OpenPlanet, PlanetSystem } from './Scene';
import { FolderSheet } from './Sheets';
import { HomeOverview } from '../widgets/HomeOverview';
import { widgetsFromToday } from '../widgets/adapters';
import { useScopedToday } from '@/lib/os/useScopedToday';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { firstName } from '@/lib/auth/displayName';
import type { FeatureSurfaceProps } from '../../types';
import type { TodaySnapshot } from '@/lib/api/todayClient';
import { coreTreeToPlanets, deriveLiveAttention, type LiveAttentionItem } from './coreAdapter';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';

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
  snapshot?: TodaySnapshot | null;
  viewerName?: string | null;
  isDemo?: boolean;
}

export function LiveCockpit({
  navigate,
  initialView = 'home',
  companyName: propCompanyName,
  departments: propDepartments,
  snapshot: propSnapshot,
  viewerName: propViewerName,
  isDemo = true,
}: LiveCockpitProps) {
  const user = useSessionStore((s) => s.user);
  const { snapshot: liveSnapshot, loading: liveLoading, loadError } = useScopedToday();
  const snapshot = propSnapshot !== undefined ? propSnapshot : liveSnapshot;

  const phone = usePhone();
  const [view, setView] = useState<'home' | 'universe'>(initialView);
  const [planetId, setPlanetId] = useState<string | null>(null);
  const [moonId, setMoonId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<string | null>(null);

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

  // Compute company name: never "Personal Demo"
  const companyName = propCompanyName || (user as { active_company_name?: string | null } | null)?.active_company_name || 'Café Morgenrot (FIKTIV)';

  // Compute user first name for honest personalized greeting
  let first = propViewerName?.split(/\s+/)[0] || firstName(user);
  const userRole = (user?.role || '').toLowerCase();
  const userEmail = (user?.email || '').toLowerCase();
  if (!first || first.toLowerCase() === 'inhaber' || first.toLowerCase() === 'owner' || userRole === 'owner' || userEmail.startsWith('inhaber@')) {
    if (companyName.includes('Morgenrot')) {
      first = 'Marius';
    }
  }

  const h = new Date().getHours();
  const hello = h < 11 ? 'Guten Morgen' : h < 17 ? 'Guten Tag' : 'Guten Abend';
  const greeting = `${hello}${first ? `, ${first}` : ''}.`;

  // Planets from live departments
  const rawDepts = propDepartments || [
    { id: 'kueche', name: 'Küche' },
    { id: 'service', name: 'Service' },
  ];
  const planets: DemoPlanet[] = useMemo(() => coreTreeToPlanets(rawDepts), [rawDepts]);

  const { attention, items } = useMemo(
    () => deriveLiveAttention(snapshot, navigate),
    [snapshot, navigate]
  );

  const planet = planets.find((p) => p.id === planetId) ?? null;
  const moon = planet?.moons.find((m) => m.id === moonId) ?? null;

  const showHome = view === 'home';
  const sceneMode = planet && view === 'universe' ? 'planet' : 'system';

  const ask = () => {
    if (!q.trim()) return;
    useOsShellStore.getState().setMoraDraft(q);
    setQ('');
    navigate('mora');
  };

  const subline = liveLoading
    ? 'Quellen werden geladen …'
    : !snapshot || loadError
    ? 'Quellen sind derzeit nicht verfügbar.'
    : items.length
    ? `${items.length === 1 ? 'Ein Ding braucht' : items.length === 2 ? 'Zwei Dinge brauchen' : 'Drei Dinge brauchen'} dich.`
    : 'Keine offenen Hinweise aus den verfügbaren Quellen.';

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
            onMoon={(id) => setMoonId(id)}
            activeMoon={moonId}
          />
        ) : !(phone && showHome) ? (
          <PlanetSystem
            planets={planets}
            attention={attention}
            company={companyName}
            compact={showHome}
            onOpen={(id) => {
              setView('universe');
              setPlanetId(id);
              setMoonId(null);
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
          <span className="ck-time">Mi, 28. Okt · 07:00</span>
          <span>aus CORE</span>
          {isDemo ? (
            <span
              className="ck-fict"
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
            >
              {phone ? (
                <div className="ck-home-strip">
                  <PlanetSystem
                    planets={planets}
                    attention={attention}
                    company={companyName}
                    compact
                    strip
                    onOpen={(id) => {
                      setView('universe');
                      setPlanetId(id);
                      setMoonId(null);
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
      {moon && planet && !showHome ? (
        <FolderSheet
          key={moon.id}
          moon={moon}
          planetTitle={planet.title}
          onClose={() => setMoonId(null)}
        />
      ) : null}

      {toast ? (
        <div className="ck-toast" role="status">
          <Check size={14} /> {toast}
        </div>
      ) : null}

      {/* Single MÔRA seated in console center dock */}
      <BridgeConsole
        home={showHome}
        onHome={() => setView('home')}
        onCompany={() => {
          setView('universe');
          setPlanetId(null);
          setMoonId(null);
        }}
        companyLabel={planets.length > 1 ? 'Firma' : planets[0]?.title ?? 'Bereich'}
        value={q}
        onChange={setQ}
        onSubmit={ask}
        onMic={() => navigate('mora')}
        micLabel="MÔRA öffnen"
        needs={items.length}
        onNeeds={() => setView('home')}
        guidance={
          items[0]
            ? {
                text: items[0].title,
                onOpen: () => items[0].onAction?.(),
              }
            : undefined
        }
      />
    </div>
  );
}
