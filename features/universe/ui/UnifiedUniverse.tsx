'use client';
import { demoCompanyName, useDemoStore } from '@/lib/demo/demoStore';

import '@/features/home/cockpit.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { OpenPlanet, PlanetSystem } from '@/features/home/cockpit/Scene';
import { useUniverseFocus } from '@/lib/lea/universeFocus';
import { DepartmentSheet } from '@/features/home/cockpit/Sheets';
import { StationPlanet, WorkSurface, type DeptMember, type Origin, type RoomKind } from '@/features/universe/ui/Workbench';
import { deptWork } from '@/lib/universe/deptWork';
import { getDepartmentRoomContext, getShipDepartmentCrew } from '@/lib/universe/shipDepartments';
import { Werkstatt, placeFromParam, roomKindFromParam, type Place } from '@/features/werkstatt/ui/Werkstatt';
import { localISO } from '@/lib/lea/world';
import { useTeamMembers } from '@/lib/queries/useTeamMembers';
import { CockpitWindow } from '@/features/home/cockpit/Window';
import { deriveLiveAttention, finderToCockpitPlanets } from '@/features/home/cockpit/coreAdapter';
import { DepartmentWizard } from '@/components/wizards/DepartmentWizard';
import { useWorld } from '@/lib/lea/useWorld';
import { useScopedToday } from '@/lib/os/useScopedToday';
import { useSessionStore } from '@/lib/store/sessionStore';
import { firstName } from '@/lib/auth/displayName';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { hasFiktivMarker, stripFiktiv } from '@/lib/demo/morgenrot/stripFiktiv';
import { MORGENROT } from '@/lib/demo/morgenrot/online';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';
import { useActiveCompanyIsDemo } from '@/lib/hooks/useIsSaimorInternal';
import { useNavPos } from '@/lib/mora/navPos';
import { useNightwatchIncidents } from '@/lib/queries/useNightwatchIncidents';
import { filterIncidentsForDepartment } from '@/lib/openflow/departmentIncidentContext';
import { nightwatchIncidentsToIncidentStatusPanels } from '@/lib/openflow/nightwatch';
import { useDailyBriefing, buildMoraBriefing } from '@/lib/queries/useDailyBriefing';
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
  // Arbeitsplatz: welches Objekt gerade nah ist (Mond oder einzelne Aufgabe) und von wo es kam.
  const [taskId, setTaskId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [deptSheetOpen, setDeptSheetOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [mobileBriefingOpen, setMobileBriefingOpen] = useState(false);
  // Raum der Abteilung (Werkstatt, Studio, Bar): offen, mit Startort und ob die Kamera von draußen durchs Fenster kommt.
  const [room, setRoom] = useState<{ kind: RoomKind; place: Place | null; fromSpace: boolean } | null>(null);

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
    const platzRaw = params.get('platz');
    const platz = placeFromParam(platzRaw);
    if (ort && platz) setRoom({ kind: roomKindFromParam(platzRaw), place: platz, fromSpace: false });
  }, []);

  // Demo detection and company name
  const activeCompanyIsDemo = useActiveCompanyIsDemo();
  const demoNameId = useDemoStore((s) => s.demoCompanyId);
  const setDemoCompany = useDemoStore((s) => s.setDemoCompany);
  const isCafeScope = demoNameId === 'demo-morgenrot';
  const rawCompanyName =
    demoCompanyName(demoNameId) ||
    (user as { active_company_name?: string | null } | null)?.active_company_name ||
    'Dein Unternehmen';
  const companyName = stripFiktiv(rawCompanyName) || 'Dein Unternehmen';
  const companyId =
    world.companyId ||
    (user as { active_company_id?: string | null } | null)?.active_company_id ||
    null;

  const effectiveIsDemo = companyId === 'company-local-demo' ? false : Boolean(
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

  // Was in dieser Abteilung zu tun ist – aus useWorld (dieselben /v3/tasks- und Ordner-Daten wie Heute und Finder).
  const work = useMemo(() => {
    const knownDeptIds = planets.map((p) => p.id);
    const knownFolderIds = planets.flatMap((p) => p.moons.map((m) => m.id));
    const isPrimary = Boolean(planet && planets[0]?.id === planet.id);
    const hasFocusedTask = Boolean(taskId || (room?.place && room.place.kind === 'task'));
    return deptWork(planet, world.tasks, localISO(new Date()), {
      includeUnassigned: isPrimary || hasFocusedTask,
      knownDeptIds,
      knownFolderIds,
    });
  }, [planet, planets, world.tasks, taskId, room?.place]);
  const spaceName = useMemo(() => {
    const f = planet ? world.finder.find((p) => p.id === planet.id) : null;
    const names = Array.from(new Set((f?.spaces ?? []).map((sp) => sp.name).filter(Boolean)));
    return names.length === 1 ? names[0] : null;
  }, [planet, world.finder]);
  const { data: teamMembers = [] } = useTeamMembers(Boolean(planet));
  const deptCrew = useMemo<DeptMember[]>(() => {
    if (!planet) return [];
    const seen = new Set<string>();
    const list: DeptMember[] = [];
    const add = (m: DeptMember) => {
      const k = m.name.trim().toLowerCase();
      if (!k || seen.has(k)) return;
      seen.add(k);
      list.push(m);
    };
    const canonical = getShipDepartmentCrew(planet.id) ?? getShipDepartmentCrew(planet.title);
    if (canonical && canonical.length > 0) {
      canonical.forEach((c) => add(c));
    } else {
      teamMembers.forEach((m, idx) => {
        const isLead = /owner|admin|lead|captain|leitung/i.test(m.role) || idx === 0;
        add({ id: m.id, name: m.name, role: isLead ? 'Abteilungsleitung' : m.role, status: m.status, isCaptain: isLead && !list.some((x) => x.isCaptain) });
      });
    }
    const assignees = new Set<string>();
    work.loose.forEach((t) => { if (t.assignee) assignees.add(t.assignee); });
    work.moons.forEach((mw) => [...mw.open, ...mw.done].forEach((t) => { if (t.assignee) assignees.add(t.assignee); }));
    assignees.forEach((a) => add({ id: `assignee-${a}`, name: a, role: planet.jobRoles?.[0], status: 'online', isCaptain: list.length === 0 }));
    if (list.length === 0) {
      const me = firstName(user);
      if (me) add({ id: user?.id || 'me', name: me, role: 'Abteilungsleitung', status: 'online', isCaptain: true });
    }
    return list;
  }, [planet, teamMembers, work, user]);
  const workTask = useMemo(() => {
    if (!taskId) return null;
    let hit = work.loose.find((t) => t.id === taskId) ?? null;
    work.moons.forEach((w) => { hit = hit ?? [...w.open, ...w.done].find((t) => t.id === taskId) ?? null; });
    return hit;
  }, [taskId, work]);
  const watchMoons = useMemo(() => {
    const set = new Set<string>();
    if (!planet) return set;
    const open = activeDeptIncidents.filter((i) => !i.acked);
    planet.moons.forEach((m) => {
      const ids = new Set(m.files.map((f) => f.id));
      if (open.some((i) => (i.node_id && ids.has(i.node_id)) || (i.relatedNodeIds ?? []).some((n) => ids.has(n)))) set.add(m.id);
    });
    return set;
  }, [planet, activeDeptIncidents]);

  const incidentPanels = useMemo(() => {
    if (activeDeptIncidents.length === 0) return [];
    return nightwatchIncidentsToIncidentStatusPanels(activeDeptIncidents);
  }, [activeDeptIncidents]);

  // Von Home kommend: der angeflogene Planet öffnet zuerst die Abteilungsansicht (Captain, Crew, Ordner, Räume);
  // nur bei Klick auf eine konkrete Aufgabe geht es direkt zu ihr in den Raum.
  const [fromHome, setFromHome] = useState(false);
  useEffect(() => {
    const t = useUniverseFocus.getState().take();
    if (!t?.planetId) return;
    setPlanetId(t.planetId); setFromHome(t.from === 'home');
    if (t.from === 'home' && t.taskId) { setRoom({ kind: 'werkstatt', place: { kind: 'task', id: t.taskId }, fromSpace: true }); return; }
    setRoom(null);
    setMoonId(t.taskId ? null : (t.moonId ?? null)); setTaskId(t.taskId ?? null);
  }, []);

  // Leise Zeichen auf den Monden: überfällige Aufgaben dieses Ordners (folder_id), offene Nachtwache an einem seiner Einträge (node_id).
  const moonMarks = useMemo(() => {
    const map = new Map<string, { overdue: number; watch: boolean }>();
    if (!planet) return map;
    const open = activeDeptIncidents.filter((i) => !i.acked);
    planet.moons.forEach((m) => {
      const ids = new Set(m.files.map((f) => f.id));
      const overdue = (snapshot?.tasks?.overdue ?? []).filter((t) => t.folder_id === m.id).length;
      const watch = open.some((i) => (i.node_id && ids.has(i.node_id)) || (i.relatedNodeIds ?? []).some((n) => ids.has(n)));
      if (overdue || watch) map.set(m.id, { overdue, watch });
    });
    return map;
  }, [planet, snapshot?.tasks, activeDeptIncidents]);

  // Rückflug = Umkehr des Anflugs: Monde ziehen sich zurück, dann fährt die Kamera hinaus –
  // nach Home, wenn der Flug dort begann, sonst in die Universe-Übersicht.
  const [leaving, setLeaving] = useState(false);
  const [backFrom, setBackFrom] = useState<string | null>(null);
  const flyBack = () => {
    if (!planetId || leaving) return;
    const id = planetId;
    if (motionReduced) {
      if (fromHome) { navigate('home'); return; }
      setPlanetId(null); setMoonId(null); setDeptSheetOpen(false); return;
    }
    setMoonId(null); setTaskId(null); setDeptSheetOpen(false); setLeaving(true);
    window.setTimeout(() => {
      if (fromHome) { useUniverseFocus.getState().returnTo(id); navigate('home'); return; }
      setLeaving(false); setFromHome(false); setPlanetId(null); setBackFrom(id);
      window.setTimeout(() => setBackFrom(null), 1300);
    }, 380);
  };
  // Universe-Übersicht nach dem Rückflug: der Himmel zoomt von diesem Planeten aus zurück.
  useEffect(() => {
    if (!backFrom) return;
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`.ck-scene--system [data-testid="open-${CSS.escape(backFrom)}"] .glass-orb`);
      const sc = el?.closest('.ck-scene') as HTMLElement | null;
      if (!el || !sc) return;
      const r = el.getBoundingClientRect(), q = sc.getBoundingClientRect();
      sc.style.setProperty('--back-x', `${r.left + r.width / 2 - q.left}px`);
      sc.style.setProperty('--back-y', `${r.top + r.height / 2 - q.top}px`);
    });
    return () => cancelAnimationFrame(raf);
  }, [backFrom]);

  // Synchronisiere useNavPos für Dock-Instrumente und Brotkrumen
  const handleOpenPlanet = (id: string) => {
    setPlanetId(id);
    setMoonId(null);
    setDeptSheetOpen(false);
  };

  // Die eine MÔRA begleitet in den offenen Planeten und kehrt danach in den Dock zurück.
  useEffect(() => {
    const presence = useMoraPresence.getState();
    // Im Raum setzt die Werkstatt MÔRA selbst an ihren Platz.
    if (room) return;
    // Während du an etwas arbeitest, steht sie neben der Arbeitsfläche – nie darauf.
    if (planetId && (moonId || taskId)) presence.goTo('[data-mora-anchor="work"]', 'work');
    else if (planetId) presence.goTo('[data-mora-anchor="planet"]', 'planet');
    else presence.goHome();
    return () => useMoraPresence.getState().goHome();
  }, [planetId, moonId, taskId, room]);

  const handleBackToUniverse = () => {
    if (planetId && !moonId && !deptSheetOpen) { flyBack(); return; }
    setPlanetId(null);
    setMoonId(null);
    setDeptSheetOpen(false);
  };
  // Esc: erst ein offenes Blatt schließen, sonst zurückfliegen.
  useEffect(() => {
    if (!planetId || room) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (moonId || taskId) { setMoonId(null); setTaskId(null); return; }
      if (deptSheetOpen) { setDeptSheetOpen(false); return; }
      flyBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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
    // Eine Mail-Zahl für Briefing-Karte, Dock-Badge und Post (mailCounts).
    const briefingUnread = dailyBriefing.metrics?.unread_mails ?? null;
    const mail = mailCounts(snapshot, briefingUnread);
    const briefingText = buildMoraBriefing(dailyBriefing, firstName(user));
    if (briefingText) {
      list.push({
        id: 'briefing-main',
        label: 'Morgen-Briefing',
        title: dailyBriefing.date || 'Heute',
        detail: briefingText,
      });
    }
    if ((mail.unread ?? 0) > 0) {
      list.push({
        id: 'briefing-mails',
        label: 'Post',
        title: `${mail.unread} ungelesene Mails`,
        detail: mail.needsYou ? `${mail.needsYou} ${mail.needsYou === 1 ? 'braucht' : 'brauchen'} dich` : '',
      });
    }
    if (dailyBriefing.metrics?.active_incidents && dailyBriefing.metrics.active_incidents > 0) {
      list.push({
        id: 'briefing-incidents',
        label: 'Nightwatch',
        title: `${dailyBriefing.metrics.active_incidents} aktive Vorfälle`,
        detail: 'Systemmeldungen prüfen',
        accentColor: '#f87171',
      });
    }
    return list;
  }, [dailyBriefing, user, snapshot]);

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
      data-folder="0"
      data-work={(moon || workTask) && planet ? '1' : undefined}
      data-werkstatt={room && planet ? (room.fromSpace ? 'flight' : 'direct') : undefined}
    >
      {/* Background: PixelSky in pixel mode, ck-space in glass mode */}
      {planetStyle === 'pixel' ? (
        <PixelSky reduced={motionReduced} />
      ) : (
        <><div className="ck-space" aria-hidden /><div className="ck-mist" aria-hidden><i /><i /><i /></div></>
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
              <ArrowLeft size={16} /> <span>{fromHome ? 'Home' : 'Universe'}</span>
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
          <div
            className="ck-scope-switch"
            role="group"
            aria-label="Arbeitswelt wählen"
            data-testid="scope-switcher"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: 3,
              borderRadius: 999,
              background: 'rgba(6, 16, 20, 0.76)',
              border: '1px solid rgba(184, 212, 202, 0.22)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setDemoCompany(null);
                setPlanetId(null);
                setMoonId(null);
                setTaskId(null);
                setRoom(null);
                setDeptSheetOpen(false);
              }}
              aria-pressed={!isCafeScope}
              data-testid="scope-switch-hq"
              title="SAIMÔR HQ Raumschiff (Kommando, Technik, Atelier, Betrieb, Kontor)"
              style={{
                fontSize: 12,
                fontWeight: !isCafeScope ? 600 : 500,
                padding: '4px 12px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: !isCafeScope ? 'rgba(214, 168, 72, 0.26)' : 'transparent',
                color: !isCafeScope ? '#f6d992' : 'rgba(220, 232, 226, 0.72)',
              }}
            >
              SAIMÔR HQ
            </button>
            <button
              type="button"
              onClick={() => {
                setDemoCompany('demo-morgenrot');
                setPlanetId(null);
                setMoonId(null);
                setTaskId(null);
                setRoom(null);
                setDeptSheetOpen(false);
              }}
              aria-pressed={isCafeScope}
              data-testid="scope-switch-cafe"
              title="Café-Betrieb (Küche & Backstube, Service & Gastraum, Theke & Schicht, Verwaltung)"
              style={{
                fontSize: 12,
                fontWeight: isCafeScope ? 600 : 500,
                padding: '4px 12px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: isCafeScope ? 'rgba(111, 199, 164, 0.26)' : 'transparent',
                color: isCafeScope ? '#a7f3d0' : 'rgba(220, 232, 226, 0.72)',
              }}
            >
              Café-Demo
            </button>
          </div>
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
          style={{ position: 'absolute', top: 100, left: 24, zIndex: 12, maxWidth: 360 }}
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
      <div className={`ck-scene ck-scene--${sceneMode}${backFrom ? ' is-back' : ''}`}>
        {sceneMode === 'planet' && planet ? <span className="mora-anchor mora-anchor--planet" data-mora-anchor="planet" aria-hidden="true" /> : null}
        {sceneMode === 'planet' && planet && planetStyle !== 'pixel' ? (
          <StationPlanet
            planet={planet}
            work={work}
            space={spaceName}
            crew={deptCrew}
            colorIndex={planets.findIndex((p) => p.id === planet.id)}
            activeMoon={moonId}
            leaving={leaving}
            watch={watchMoons}
            onMoon={(id, o) => { setOrigin(o); setTaskId(null); setMoonId(id); setDeptSheetOpen(false); }}
            onTask={(id, o) => { setOrigin(o); setMoonId(null); setTaskId(id); setDeptSheetOpen(false); }}
            onOpenDept={() => setDeptSheetOpen(true)}
            onEnter={() => {
              const ctx = getDepartmentRoomContext(planet.id, stripFiktiv(planet.title) || planet.title);
              setMoonId(null); setTaskId(null); setDeptSheetOpen(false);
              setRoom({ kind: ctx.primaryRoom, place: null, fromSpace: true });
            }}
            onEnterRoom={(kind) => { setMoonId(null); setTaskId(null); setDeptSheetOpen(false); setRoom({ kind, place: null, fromSpace: true }); }}
          />
        ) : sceneMode === 'planet' && planet ? (
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
            moonMarks={moonMarks}
            colorIndex={planets.findIndex((p) => p.id === planet.id)}
            leaving={leaving}
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
            scale={1.45}
            avoidTopLeft={!phone && briefings.length > 0 ? { width: 396, height: 245 } : undefined}
            style={planetStyle}
            onOpen={handleOpenPlanet}
          />
        )}
      </div>

      <CockpitWindow />

      {/* Sheets: Folder (Files) & Department (Tasks + IncidentStatusPanels) */}
      {(moon || workTask) && planet ? (
        <WorkSurface
          key={moon ? `m-${moon.id}` : `t-${workTask?.id}`}
          planet={planet}
          moon={moon ?? (workTask?.folderId ? planet.moons.find((m) => m.id === workTask.folderId) ?? null : null)}
          work={work}
          task={moon ? null : workTask}
          origin={origin}
          companyId={companyId}
          owner={firstName(user) || ''}
          colorIndex={planets.findIndex((p) => p.id === planet.id)}
          onClose={() => {
            const back = moonId;
            setMoonId(null); setTaskId(null);
            if (back) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-testid="moon-${CSS.escape(back)}"]`)?.focus({ preventScroll: true }));
          }}
        />
      ) : null}

      {room && planet ? (
        <Werkstatt
          key={`${planet.id}-${room.kind}`}
          planet={planet}
          work={work}
          planets={planets.map((p) => ({ id: p.id, title: stripFiktiv(p.title) || p.title }))}
          companyId={companyId}
          today={localISO(new Date())}
          roomKind={room.kind}
          crew={deptCrew}
          backLabel={stripFiktiv(planet.title) || planet.title}
          initial={room.place}
          fromSpace={room.fromSpace}
          onSwitchPlanet={(nextId) => {
            const nextPlanet = planets.find((p) => p.id === nextId);
            if (!nextPlanet) return;
            const ctx = getDepartmentRoomContext(nextPlanet.id, stripFiktiv(nextPlanet.title) || nextPlanet.title);
            setPlanetId(nextPlanet.id);
            setMoonId(null);
            setTaskId(null);
            setDeptSheetOpen(false);
            setRoom({ kind: ctx.primaryRoom, place: null, fromSpace: false });
          }}
          onExit={() => setRoom(null)}
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
