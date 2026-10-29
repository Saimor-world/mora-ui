'use client';

import '@/features/home/cockpit.css';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { OpenPlanet, PlanetSystem } from '@/features/home/cockpit/Scene';
import { DepartmentSheet, FolderSheet } from '@/features/home/cockpit/Sheets';
import { CockpitWindow } from '@/features/home/cockpit/Window';
import { deriveLiveAttention, finderToCockpitPlanets } from '@/features/home/cockpit/coreAdapter';
import { DepartmentWizard } from '@/components/wizards/DepartmentWizard';
import { useWorld } from '@/lib/lea/useWorld';
import { useScopedToday } from '@/lib/os/useScopedToday';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { hasFiktivMarker, stripFiktiv } from '@/lib/demo/morgenrot/stripFiktiv';
import { MORGENROT } from '@/lib/demo/morgenrot/online';
import { MORGENROT_STRUCTURE, type DemoPlanet } from '@/lib/demo/morgenrot/structure';
import { useActiveCompanyIsDemo } from '@/lib/hooks/useIsSaimorInternal';

function usePhone() {
  const [p, setP] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const q = window.matchMedia('(max-width: 820px)');
    const f = () => setP(q.matches);
    f();
    if (q.addEventListener) q.addEventListener('change', f);
    else q.addListener(f);
    return () => {
      if (q.removeEventListener) q.removeEventListener('change', f);
      else q.removeListener(f);
    };
  }, []);
  return p;
}

export interface UnifiedUniverseProps {
  navigate: (featureId: string) => void;
  preview?: boolean;
  initialPlanetId?: string | null;
  initialStyle?: 'glas' | 'pixel';
}

/**
 * Unified Universe — Der einzige Renderer für das Universe:
 * - Kombiniert die Planeten, den Horizont (ck-horizon) und die Tiefe aus Version A mit dem Pixel/Normal-Umschalter aus Version B.
 * - Genau EINE MÔRA im OsDock (keine zweite in Szene oder HUD).
 * - Zustand (gewählter Planet, Ordner, Daten) bleibt beim Umschalten zwischen Pixel und Glas erhalten.
 * - Echte Abteilungsaufgaben im DepartmentSheet, DepartmentWizard für neue Abteilungen.
 */
export function UnifiedUniverse({
  navigate,
  preview: _preview,
  initialPlanetId,
  initialStyle,
}: UnifiedUniverseProps) {
  const world = useWorld();
  const phone = usePhone();
  const user = useSessionStore((s) => s.user);
  const { snapshot } = useScopedToday();

  const [planetId, setPlanetId] = useState<string | null>(initialPlanetId ?? null);
  const [moonId, setMoonId] = useState<string | null>(null);
  const [deptSheetOpen, setDeptSheetOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Style state: 'glas' (HQ-Gesamtansicht mit dunklen Glasplaneten) oder 'pixel' (HQ-Pixelansicht mit Mini-Monden)
  // Genau EIN Umschalter (.wd-view links auf halber Höhe aus Version B)
  const [planetStyle, setPlanetStyle] = useState<'glas' | 'pixel'>(() => {
    if (initialStyle) return initialStyle;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mora.planet_style');
        if (stored === 'pixel' || stored === 'glas') return stored;
        if (localStorage.getItem('mora.universe.view') === 'full') return 'glas';
      } catch {}
    }
    return 'pixel';
  });

  const toggleStyle = (next?: 'glas' | 'pixel') => {
    const resolved = next ?? (planetStyle === 'pixel' ? 'glas' : 'pixel');
    setPlanetStyle(resolved);
    try {
      localStorage.setItem('mora.planet_style', resolved);
      localStorage.setItem('mora.universe.view', resolved === 'pixel' ? 'pixel' : 'full');
    } catch {}
  };

  // Consume universeFocus from shellStore if set (e.g. planet click from Home)
  const universeFocus = useOsShellStore((s) => s.universeFocus);
  useEffect(() => {
    if (universeFocus) {
      setPlanetId(universeFocus);
      setMoonId(null);
      setDeptSheetOpen(false);
      useOsShellStore.getState().setUniverseFocus(null);
    }
  }, [universeFocus]);

  // Handle URL query parameters (?ort=planet&ordner=mond)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const ort = params.get('ort');
    if (ort && ort !== 'firma') setPlanetId(ort);
    const ordner = params.get('ordner');
    if (ordner) setMoonId(ordner);
  }, []);

  // Demo detection and company name
  const activeCompanyIsDemo = useActiveCompanyIsDemo();
  const rawCompanyName =
    (user as { active_company_name?: string | null } | null)?.active_company_name ||
    'Dein Unternehmen';
  const companyName = stripFiktiv(rawCompanyName) || 'Dein Unternehmen';
  const companyId =
    world.companyId ||
    (user as { active_company_id?: string | null } | null)?.active_company_id ||
    null;

  const effectiveIsDemo = Boolean(
    activeCompanyIsDemo ||
    (user as { is_demo?: boolean } | null)?.is_demo ||
    user?.role === 'demo' ||
    user?.tenant_id === MORGENROT.tenantId ||
    user?.tenant_id === 'tenant-demo' ||
    user?.tenant_id === 'tenant-demo-morgenrot' ||
    world.companyId === MORGENROT.companyId ||
    hasFiktivMarker(rawCompanyName) ||
    /morgenrot/i.test(rawCompanyName) ||
    world.tasks.some((t) => hasFiktivMarker(t.title)) ||
    world.events.some((e) => hasFiktivMarker(e.title))
  );

  // Real CORE departments from useWorld().finder (Ohne Abteilung already filtered out)
  // Fallback to MORGENROT_STRUCTURE when offline/demo so planets are always visible
  const planets: DemoPlanet[] = useMemo(() => {
    const fromWorld = finderToCockpitPlanets(world.finder);
    if (fromWorld.length > 0) return fromWorld;
    if (effectiveIsDemo) {
      return MORGENROT_STRUCTURE.map((p) => ({
        ...p,
        title: stripFiktiv(p.title) || p.title,
      }));
    }
    return [];
  }, [world.finder, effectiveIsDemo]);

  const { attention } = useMemo(
    () => deriveLiveAttention(snapshot, navigate),
    [snapshot, navigate]
  );

  const planet = planets.find((p) => p.id === planetId) ?? null;
  const moon = planet?.moons?.find((m) => m.id === moonId) ?? null;
  const sceneMode = planet ? 'planet' : 'system';

  // Filter tasks for the selected planet if available (identical to LiveCockpit)
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

  const handleOpenPlanet = (id: string) => {
    setPlanetId(id);
    setMoonId(null);
    setDeptSheetOpen(false);
  };

  const handleBackToUniverse = () => {
    setPlanetId(null);
    setMoonId(null);
    setDeptSheetOpen(false);
  };

  return (
    <div
      className="ck ck-universe-unified"
      data-testid="universe-unified"
      data-view="universe"
      data-style={planetStyle}
      data-phone={phone ? '1' : '0'}
      data-folder={moon ? '1' : '0'}
    >
      <div className="ck-space" aria-hidden />

      {/* Version B style switcher positioned on the left at ~half height (single switcher) */}
      <button
        type="button"
        className="wd-view ck-style-toggle"
        aria-pressed={planetStyle === 'pixel'}
        onClick={() => toggleStyle()}
        data-testid="world-view-toggle"
        title={planetStyle === 'pixel' ? 'Zurück zur Gesamtansicht (Glas)' : 'Zur Pixel-Ansicht'}
      >
        <i aria-hidden />
        {planetStyle === 'pixel' ? 'Pixel-Ansicht' : <>Gesamtansicht<small>ohne Pixel</small></>}
      </button>

      {/* Top HUD with Navigation & Actions */}
      <header className="ck-top" data-testid="universe-topbar">
        <div className="ck-brand flex items-center gap-2">
          {planet ? (
            <button
              type="button"
              className="fv-back flex items-center gap-1.5 text-sm font-medium hover:text-white"
              onClick={handleBackToUniverse}
              data-testid="world-planet-close"
              aria-label="Zurück zum Universe"
            >
              <ArrowLeft size={16} /> <span>Universe</span>
            </button>
          ) : (
            <span>{companyName}</span>
          )}
          {effectiveIsDemo ? (
            <span className="ck-fict fiktiv-badge" data-testid="universe-fiktiv-badge">
              Fiktive Demo
            </span>
          ) : null}
        </div>

        <div className="ck-top__r flex items-center gap-2">
          <button
            type="button"
            className="ck-btn"
            style={{ fontSize: 13, padding: '6px 14px', borderRadius: 999 }}
            onClick={() => setWizardOpen(true)}
            data-testid="universe-add-department"
            title="Neue Abteilung anlegen"
          >
            + Abteilung
          </button>
        </div>
      </header>

      {/* 3D Scene canvas */}
      <div className={`ck-scene ck-scene--${sceneMode}`}>
        {sceneMode === 'planet' && planet ? (
          <OpenPlanet
            planet={planet}
            showMoons={true}
            onMoon={(id) => {
              setMoonId(id);
              setDeptSheetOpen(false);
            }}
            activeMoon={moonId}
            onOpenDept={() => setDeptSheetOpen(true)}
            style={planetStyle}
          />
        ) : (
          <PlanetSystem
            planets={planets}
            attention={attention}
            company={companyName}
            compact={false}
            style={planetStyle}
            onOpen={handleOpenPlanet}
          />
        )}
      </div>

      <CockpitWindow />

      {/* Sheets: Folder (Files) & Department (Tasks) */}
      {moon && planet ? (
        <FolderSheet
          moon={moon}
          planetTitle={planet.title}
          onClose={() => setMoonId(null)}
        />
      ) : null}

      {deptSheetOpen && planet ? (
        <DepartmentSheet
          planet={planet}
          tasks={planetTasks}
          onOpenMoon={(mId) => {
            setMoonId(mId);
            setDeptSheetOpen(false);
          }}
          onClose={() => setDeptSheetOpen(false)}
        />
      ) : null}

      {/* Department Wizard Modal */}
      {wizardOpen && companyId ? (
        <DepartmentWizard
          isOpen={wizardOpen}
          onClose={() => setWizardOpen(false)}
          companyId={companyId}
        />
      ) : null}
    </div>
  );
}
