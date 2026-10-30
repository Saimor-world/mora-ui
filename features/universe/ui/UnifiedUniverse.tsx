'use client';

import '@/features/home/cockpit.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
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
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';
import { useActiveCompanyIsDemo } from '@/lib/hooks/useIsSaimorInternal';
import { useNavPos } from '@/lib/mora/navPos';
import { useNightwatchIncidents } from '@/lib/queries/useNightwatchIncidents';
import { filterIncidentsForDepartment } from '@/lib/openflow/departmentIncidentContext';
import { nightwatchIncidentsToIncidentStatusPanels } from '@/lib/openflow/nightwatch';
import { useDailyBriefing, formatWarmMoraBriefing } from '@/lib/queries/useDailyBriefing';
import { mailCounts } from '@/lib/mora/bridgeData';
import { useMoraPresence } from '@/lib/mora/moraPresence';
import { BriefingStack, type Briefing } from '@/components/home/BriefingStack';
import { PixelMoon, PixelPlanet, PixelSky } from '@/components/world/PixelPlanet';
import { PixelMora } from '@/components/world/PixelMora';
import { PlanetOrbit } from '@/components/world/WorldUniverse';
import { WorldPlanetSphere } from '@/components/world/WorldPlanetSphere';
import { layoutOrbits, placeOnOrbit, type PlanetLabel } from '@/lib/universe/worldOrbits';
import { planetKind, seedOf } from '@/lib/universe/pixelArt';
import { matteTone, toneSlot } from '@/lib/universe/matteTone';

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

const PX = 2;
const pixelSize = (size: number, angle: number) =>
  Math.max(2 * PX * 5, Math.round((size * (Math.sin(angle) > 0 ? 1 : 0.85)) / (2 * PX)) * 2 * PX);
/**
 * HQ-Pixelansicht (Marius hq.saimor.world, Merge #186):
 * - Hintergrund: PixelSky
 * - Planeten: PixelPlanet mit planetKind & seedOf aus pixelArt.ts
 * - Mini-Monde: PlanetOrbit mit PixelMoon & Pixel-Sternen
 * - Keine eigene MÔRA: die eine Instanz lebt im Dock und fliegt per useMoraPresence
 * - Ruhiges Raster-Layout über layoutOrbits(..., { calm: true })
 */
function PixelUniverseOverview({
  planets,
  attention,
  phone,
  incidentMap,
  onOpenPlanet,
  onMora,
  tasks = [],
  reduced = false,
}: {
  planets: DemoPlanet[];
  attention: Set<string>;
  phone: boolean;
  incidentMap: Map<string, number>;
  onOpenPlanet: (id: string) => void;
  onMora?: () => void;
  tasks?: Array<{ id: string; title: string; status?: string; is_overdue?: boolean | null; department_id?: string | null }>;
  reduced?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1200, height: 680 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const weights = useMemo(() => planets.map((_, i) => 50 + (i % 3) * 10), [planets]);
  const labels = useMemo<PlanetLabel[]>(
    () =>
      planets.map((p) => ({
        name: stripFiktiv(p.title) || p.title,
        moons: p.moons?.length ?? 0,
      })),
    [planets]
  );

  const layout = useMemo(() => {
    return layoutOrbits({
      width: size.width,
      height: Math.max(240, size.height - (phone ? 180 : 140)),
      weights,
      phone,
      calm: true,
      moraBase: phone ? 88 : 150,
      labels,
    });
  }, [size.width, size.height, weights, phone, labels]);

  return (
    <div
      ref={containerRef}
      className="wd-universe"
      data-testid="pixel-universe"
      data-view="pixel"
      data-phone={phone ? 'true' : 'false'}
      data-large={layout && layout.scale >= 1.2 ? 'true' : 'false'}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      <PixelSky reduced={reduced} />

      <div className="wd-zoomwrap" data-testid="world-zoomwrap">
        {layout ? (
          <svg className="wd-orbits" shapeRendering="crispEdges" width={size.width} height={size.height} aria-hidden>
            {layout.slots.map((slot, i) => {
              const pt = placeOnOrbit(layout, slot);
              return null;
            })}
          </svg>
        ) : null}

        {/* Keine eigene MÔRA hier: die eine MÔRA lebt im Dock (useMoraPresence). */}
        {/* Planeten im ruhigen Raster mit WorldPlanetSphere-Boxen und PlanetOrbit */}
        {planets.map((planet, i) => {
          const slot = layout.slots[i];
          if (!slot) return null;
          const pt = placeOnOrbit(layout, slot);
          const displayName = stripFiktiv(planet.title) || planet.title;
          let kind = planetKind(displayName, toneSlot(displayName));
          // Optik 1:1 wie HQ: Matte Planeten, keine Lava, keine Ringe
          if (kind === 'lava') kind = 'desert';
          if (kind === 'gas') kind = 'ocean';
          const seed = seedOf(displayName);
          const sz = pixelSize(slot.size, slot.angle);
          const light = { x: -Math.cos(slot.angle), y: -Math.sin(slot.angle) };
          const incCount = incidentMap.get(planet.id) ?? 0;
          const half = sz / 2;
          const sx = Math.round((pt.x - half) / PX) * PX;
          const sy = Math.round((pt.y - half) / PX) * PX;

          return (
            <button
              key={planet.id}
              type="button"
              className="wd-planet"
              data-side={slot && Math.cos(slot.angle) < -0.05 ? 'left' : 'right'}
              data-depth={pt.front ? 'front' : 'back'}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate3d(${sx}px, ${sy}px, 0)`,
                zIndex: pt.z,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'inherit',
              }}
              onClick={() => onOpenPlanet(planet.id)}
              data-testid={`world-planet-${planet.id}`}
              aria-label={`${displayName} öffnen`}
            >
              {planet.moons?.length ? (
                <PlanetOrbit
                  tone={matteTone(displayName).vars}
                  away={slot && Math.cos(slot.angle) < 0 ? -1 : 1}
                  orbit={{
                    moons: planet.moons.map((m) => ({
                      id: m.id,
                      label: stripFiktiv(m.title) || m.title,
                      stars: (m.files || []).map((f) => ({
                        id: f.id,
                        label: f.name,
                        kind: 'doc' as const,
                        done: true,
                        overdue: false,
                      })),
                    })),
                    stars: tasks
                      .filter((t) => t.department_id === planet.id)
                      .slice(0, 8)
                      .map((t) => ({
                        id: t.id,
                        label: t.title,
                        kind: 'task' as const,
                        done: t.status === 'done',
                        overdue: Boolean(t.is_overdue),
                      })),
                  }}
                  size={sz}
                  phone={phone}
                  pixel={{ kind, light, seed }}
                />
              ) : null}
              <PixelPlanet
                kind={kind}
                size={sz}
                seed={seed}
                light={light}
                folders={0}
                activity={0}
                overdue={0}
                open={0}
                reduced={reduced}
              />
              <WorldPlanetSphere light={light} tone={matteTone(displayName)} className={`wd-tex-${i % 4}`} size={sz}>
                {planet.moons?.length ? <span className="wd-badge" aria-hidden>{planet.moons.length}</span> : null}
              </WorldPlanetSphere>
              <span className="wd-label">
                <span className="wd-name">{displayName}</span>
                <span className="wd-meta">
                  {planet.moons?.length ? `${planet.moons.length} Ordner` : 'noch leer'}
                </span>
                {incCount > 0 ? (
                  <span
                    className="ck-incident-tag"
                    style={{
                      color: '#fbbf24',
                      fontSize: 11,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <i style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} /> Vorfall ({incCount})
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Unified Universe — Der einzige Renderer für das Universe:
 * - HQ-Pixelansicht (WorldUniverse-Bausteine, PixelSky, PixelPlanet, Mini-Monde) im Pixel-Modus
 * - HQ-Gesamtansicht mit dunklen Glasplaneten und Tiefe im Glas-Modus
 * - Genau EIN Umschalter (.wd-view) links auf halber Höhe
 * - Zustand (gewählter Planet, Ordner, Daten) bleibt beim Umschalten nahtlos erhalten
 * - Nav-Position wird an useNavPos gemeldet (Dock-Brotkrumen, Orbit/Universe-Umschaltung)
 * - Abteilungsaufgaben über department_id zugeordnet
 * - Vorhandene CORE/OpenFlow-Signale (Nightwatch, IncidentStatusPanel, DailyBriefing) angebunden
 */
export function UnifiedUniverse({
  navigate,
  preview: _preview,
  initialPlanetId,
  initialStyle,
}: UnifiedUniverseProps) {
  const world = useWorld();
  const phone = usePhone();
  const motionReduced = Boolean(useReducedMotion());
  const user = useSessionStore((s) => s.user);
  const { snapshot } = useScopedToday();

  const [planetId, setPlanetId] = useState<string | null>(initialPlanetId ?? null);
  const [moonId, setMoonId] = useState<string | null>(null);
  const [deptSheetOpen, setDeptSheetOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [mobileBriefingOpen, setMobileBriefingOpen] = useState(false);

  // Style state: 'glas' (HQ-Gesamtansicht mit dunklen Glasplaneten) oder 'pixel' (HQ-Pixelansicht mit Mini-Monden)
  // Genau EIN Umschalter (.wd-view links auf halber Höhe)
  const [planetStyle, setPlanetStyle] = useState<'glas' | 'pixel'>(() => {
    if (initialStyle) return initialStyle;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mora.planet_style');
        if (stored === 'pixel' || stored === 'glas') return stored;
        if (localStorage.getItem('mora.universe.view') === 'pixel') return 'pixel';
      } catch {}
    }
    return 'glas';
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
  // Only real data from CORE is shown — no fictional fallback
  const planets: DemoPlanet[] = useMemo(() => {
    return finderToCockpitPlanets(world.finder);
  }, [world.finder]);

  // Nightwatch incidents & daily briefing
  const { data: nightwatchIncidents = [] } = useNightwatchIncidents(false);

  const { attention } = useMemo(
    () => deriveLiveAttention(snapshot, navigate, nightwatchIncidents),
    [snapshot, navigate, nightwatchIncidents]
  );

  const planetSignals = useMemo(() => {
    const map = new Map<string, { isAlarm: boolean; reason: string }>();
    planets.forEach((p) => {
      const incs = filterIncidentsForDepartment(nightwatchIncidents, p.id);
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
  const { data: dailyBriefing } = useDailyBriefing();

  const planet = planets.find((p) => p.id === planetId) ?? null;
  const moon = planet?.moons?.find((m) => m.id === moonId) ?? null;
  const sceneMode = planet ? 'planet' : 'system';

  // Incidents mapped to departments
  const departmentIncidentMap = useMemo(() => {
    const map = new Map<string, number>();
    planets.forEach((p) => {
      const incs = filterIncidentsForDepartment(nightwatchIncidents, p.id);
      if (incs.length > 0) map.set(p.id, incs.length);
    });
    return map;
  }, [planets, nightwatchIncidents]);

  const activeDeptIncidents = useMemo(() => {
    if (!planet) return [];
    return filterIncidentsForDepartment(nightwatchIncidents, planet.id);
  }, [nightwatchIncidents, planet]);

  const incidentPanels = useMemo(() => {
    if (activeDeptIncidents.length === 0) return [];
    return nightwatchIncidentsToIncidentStatusPanels(activeDeptIncidents);
  }, [activeDeptIncidents]);

  // Synchronisiere useNavPos für Dock-Instrumente und Brotkrumen
  const handleOpenPlanet = (id: string) => {
    setPlanetId(id);
    setMoonId(null);
    setDeptSheetOpen(false);
  };

  // Die eine MÔRA begleitet in den offenen Planeten und kehrt danach in den Dock zurück.
  useEffect(() => {
    const presence = useMoraPresence.getState();
    if (planetId) presence.goTo('[data-mora-anchor="planet"]', 'planet');
    else presence.goHome();
    return () => useMoraPresence.getState().goHome();
  }, [planetId]);

  const handleBackToUniverse = () => {
    setPlanetId(null);
    setMoonId(null);
    setDeptSheetOpen(false);
  };

  useEffect(() => {
    useNavPos.getState().set({
      planet: planet ? { id: planet.id, name: planet.title } : null,
      open: Boolean(planet),
      moon: moon ? { id: moon.id, name: moon.title } : null,
      toUniverse: handleBackToUniverse,
      toPlanet: () => {
        setMoonId(null);
        setDeptSheetOpen(false);
      },
    });
  }, [planet, moon]);

  useEffect(() => {
    return () => {
      useNavPos.getState().set({ planet: null, open: false, moon: null });
    };
  }, []);

  // Morning briefing data mapped to BriefingStack items
  const briefings = useMemo<Briefing[]>(() => {
    if (!dailyBriefing) return [];
    const list: Briefing[] = [];
    // Eine Mail-Zahl für Briefing und Dock; MÔRA spricht kurz und warm aus denselben Daten.
    const briefingUnread = dailyBriefing.metrics?.unread_mails ?? null;
    const mail = mailCounts(snapshot, briefingUnread);
    if (dailyBriefing.text) {
      list.push({
        id: 'briefing-main',
        label: 'Morgen-Briefing',
        title: dailyBriefing.date || 'Heute',
        detail: formatWarmMoraBriefing(dailyBriefing.text, dailyBriefing.metrics, companyName.includes('Morgenrot') ? 'Marius' : undefined),
      });
    }
    if ((mail.unread ?? 0) > 0) {
      list.push({
        id: 'briefing-mails',
        label: 'Post',
        title: `${mail.unread} ungelesene Mails`,
        detail: mail.needsYou ? `${mail.needsYou} ${mail.needsYou === 1 ? 'braucht' : 'brauchen'} dich` : 'Wartet auf dich',
      });
    }
    if (dailyBriefing.metrics?.active_incidents > 0) {
      list.push({
        id: 'briefing-incidents',
        label: 'Nightwatch',
        title: `${dailyBriefing.metrics.active_incidents} aktive Vorfälle`,
        detail: 'Systemmeldungen prüfen',
        accentColor: '#f87171',
      });
    }
    return list;
  }, [dailyBriefing, snapshot, companyName]);

  // Filter tasks for the selected planet strictly by department_id
  const planetTasks = useMemo(() => {
    if (!planet || !snapshot?.tasks?.due_today) return [];
    const moonIds = new Set(planet.moons?.map((m) => m.id) ?? []);
    return snapshot.tasks.due_today
      .filter((t) => {
        if (t.department_id) return t.department_id === planet.id;
        if (t.folder_id && moonIds.has(t.folder_id)) return true;
        return false;
      })
      .map((t) => ({ id: t.id, title: stripFiktiv(t.title) || t.title, due: t.due_date }));
  }, [planet, snapshot]);

  return (
    <div
      className="ck ck-universe-unified"
      data-testid="universe-unified"
      data-view="universe"
      data-style={planetStyle}
      data-phone={phone ? '1' : '0'}
      data-folder={moon ? '1' : '0'}
    >
      {/* Background: PixelSky in pixel mode, ck-space in glass mode */}
      {planetStyle === 'pixel' ? (
        <PixelSky reduced={motionReduced} />
      ) : (
        <div className="ck-space" aria-hidden />
      )}


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
            className="ck-btn ck-style-toggle"
            style={{
              fontSize: 12,
              padding: '5px 12px',
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              color: 'inherit',
              cursor: 'pointer',
            }}
            aria-pressed={planetStyle === 'pixel'}
            onClick={() => toggleStyle()}
            data-testid="world-view-toggle"
            title={planetStyle === 'pixel' ? 'Zurück zur Gesamtansicht (Glas)' : 'Zur Pixel-Ansicht'}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: planetStyle === 'pixel' ? 0 : '50%',
                background: 'currentColor',
                display: 'inline-block',
              }}
              aria-hidden
            />
            {planetStyle === 'pixel' ? 'Glas-Ansicht' : 'Pixel-Ansicht'}
          </button>
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

      {/* Morning Briefing: Desktop linke Seite, Handy als einklappbare Zeile oben (überdeckt nichts) */}
      {!phone && briefings.length > 0 && !planet ? (
        <div
          className="ck-briefing-wrap"
          style={{ position: 'absolute', top: 72, left: 24, zIndex: 12, maxWidth: 360 }}
        >
          <BriefingStack briefings={briefings} />
        </div>
      ) : phone && briefings.length > 0 && !planet ? (
        <div
          className="ck-briefing-mobile"
          style={{
            position: 'absolute',
            top: 52,
            left: 12,
            right: 12,
            zIndex: 25,
            maxWidth: 366,
            margin: '0 auto',
          }}
          data-testid="universe-briefing-mobile"
        >
          <button
            type="button"
            onClick={() => setMobileBriefingOpen((o) => !o)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              borderRadius: 10,
              background: 'rgba(8, 22, 27, 0.88)',
              border: '1px solid rgba(184, 212, 202, 0.18)',
              backdropFilter: 'blur(12px)',
              color: 'inherit',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
            }}
            aria-expanded={mobileBriefingOpen}
            aria-label="Morgen-Briefing umschalten"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgb(var(--c-jade, 111,199,164))', flexShrink: 0 }} />
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.65)', flexShrink: 0 }}>
                Briefing
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {briefings[0]?.title}
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginLeft: 8, flexShrink: 0 }}>
              {mobileBriefingOpen ? '▲' : '▼'}
            </span>
          </button>
          {mobileBriefingOpen ? (
            <div
              style={{
                marginTop: 6,
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(8, 22, 27, 0.94)',
                border: '1px solid rgba(184, 212, 202, 0.22)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              <BriefingStack briefings={briefings} />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Scene canvas */}
      <div className={`ck-scene ck-scene--${sceneMode}`}>
        {sceneMode === 'planet' && planet ? <span className="mora-anchor mora-anchor--planet" data-mora-anchor="planet" aria-hidden="true" /> : null}
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
        ) : planetStyle === 'pixel' ? (
          <PixelUniverseOverview
            planets={planets}
            attention={attention}
            phone={phone}
            incidentMap={departmentIncidentMap}
            onOpenPlanet={handleOpenPlanet}
            onMora={() => { useOsShellStore.getState().setMoraOpen(true); }}
            tasks={snapshot?.tasks?.due_today ?? []}
            reduced={motionReduced}
          />
        ) : (
          <PlanetSystem
            planets={planets}
            attention={attention}
            signals={planetSignals}
            company={companyName}
            compact={false}
            style={planetStyle}
            onOpen={handleOpenPlanet}
          />
        )}
      </div>

      <CockpitWindow />

      {/* Sheets: Folder (Files) & Department (Tasks + IncidentStatusPanels) */}
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
          incidentPanels={incidentPanels}
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
