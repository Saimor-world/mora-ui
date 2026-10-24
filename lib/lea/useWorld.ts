'use client';
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';
import { listCompanyFiles } from '@/lib/api/filesClient';
import { useDemoStore, resolveScopeCompany } from '@/lib/demo/demoStore';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDayStore } from './dayStore';
import { buildLiveDay, calendarMeta } from './live';
import { isCalendarDept, plural, upcomingEvents, type WorldDepartment, type WorldEvent, type WorldPlanet, type WorldTask } from './world';
import { buildFinder, planetCounts, TASKS_PLANET, type FFolder, type FNode, type FPlanet, type FSpace } from './finder';
import { matteTone } from '@/lib/universe/matteTone';

function list<T>(raw: unknown, keys: string[] = []): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') for (const k of keys) { const v = (raw as Record<string, unknown>)[k]; if (Array.isArray(v)) return v as T[]; }
  return [];
}

/** Echte Daten für Home und Universe: Abteilungen (mit Bereichen), Termine, Aufgaben. Ohne Sitzung: nichts. */
export function useWorld() {
  const demoCompany = useDemoStore((s) => s.demoCompanyId);
  const navCompany = useNavStore((s) => s.activeCompanyId);
  const sessionCompany = useSessionStore((s) => (s.user as { active_company_id?: string | null } | null)?.active_company_id ?? null);
  // Die Firma der Sitzung zuerst: navStore kann noch eine alte Firma aus localStorage halten.
  const companyId = resolveScopeCompany(demoCompany, sessionCompany, navCompany);
  const hasSession = useSessionStore((s) => Boolean(s.user?.tenant_id));
  const enabled = hasSession && Boolean(companyId);
  const loadDayStatus = useDayStore((s) => s.loadCompany);
  useEffect(() => { void loadDayStatus(enabled ? companyId : null); }, [enabled, companyId, loadDayStatus]);
  const tree = useQuery({
    queryKey: ['lea-world', 'tree', companyId],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const raw = await coreGet(`/v3/tree?company_id=${encodeURIComponent(companyId!)}`, { isOptional: true });
      const unassigned = raw && typeof raw === 'object' && !Array.isArray(raw) ? list<FSpace>((raw as Record<string, unknown>).unassigned_spaces) : [];
      return { departments: list<WorldDepartment>(raw, ['departments']), unassigned };
    },
  });
  const folders = useQuery({
    queryKey: ['lea-world', 'folders', companyId],
    enabled,
    staleTime: 30_000,
    queryFn: async () => list<FFolder>(await coreGet(`/v3/folders?company_id=${encodeURIComponent(companyId!)}`, { isOptional: true }), ['folders']),
  });
  const nodes = useQuery({
    queryKey: ['lea-world', 'nodes', companyId],
    enabled,
    staleTime: 30_000,
    queryFn: async () => list<FNode>(await coreGet(`/v3/nodes?company_id=${encodeURIComponent(companyId!)}&limit=500`, { isOptional: true }), ['nodes']),
  });
  // Hochgeladene Dateien (GET /v3/files) sind ebenfalls Sterne ihres Ordners; mit Knoten verknüpfte zählen dort.
  const files = useQuery({
    queryKey: ['lea-world', 'files', companyId],
    enabled,
    staleTime: 30_000,
    queryFn: async () => (await listCompanyFiles(companyId!).catch(() => []))
      .filter((f) => f.folder_id && !f.linked_node_id)
      .map((f): FNode => ({ id: f.id, name: f.filename, type: 'file', folder_id: f.folder_id, created_at: (f as { created_at?: string }).created_at ?? null, metadata: { companyFile: true } })),
  });
  const events = useQuery({
    queryKey: ['lea-world', 'events', companyId],
    enabled,
    staleTime: 30_000,
    queryFn: async () => list<WorldEvent>(await coreGet(`/v3/calendar/events?company_id=${encodeURIComponent(companyId!)}`, { isOptional: true }), ['events', 'items']),
  });
  const tasks = useQuery({
    queryKey: ['lea-world', 'tasks', companyId],
    enabled,
    staleTime: 30_000,
    queryFn: async () => list<WorldTask>(await coreGet(`/v3/tasks?company_id=${encodeURIComponent(companyId!)}`, { isOptional: true }), ['tasks', 'items']),
  });
  const phases = useDayStore((s) => s.phases);
  const day = useMemo(() => buildLiveDay(events.data ?? [], tasks.data ?? [], phases), [events.data, tasks.data, phases]);
  // Finder = Universe: Abteilungen, Ordner (Monde), Inhalte (Sterne) und der Aufgaben-Planet.
  const finder: FPlanet[] = useMemo(() => buildFinder({
    departments: (tree.data?.departments ?? []) as never,
    unassigned: tree.data?.unassigned ?? [],
    folders: folders.data ?? [],
    nodes: [...(nodes.data ?? []), ...(files.data ?? [])],
    tasks: tasks.isSuccess ? tasks.data ?? [] : null,
  }), [tree.data, folders.data, nodes.data, files.data, tasks.data, tasks.isSuccess]);
  // Live: was Lea heute tut („ist da“, abgeschlossen), steht sofort am Termin-Planeten.
  const planets: WorldPlanet[] = useMemo(() => {
    const live = calendarMeta(day);
    const depts = tree.data?.departments ?? [];
    const upcoming = upcomingEvents(events.data ?? []);
    // Grammatik des Universe: Planeten sind nur Abteilungen (Orte). Aufgaben ohne Ordner und Termine sind
    // keine Orte – sie stehen im Horizont und bei MÔRA. Eine reine Termin-Abteilung ohne Ordner ist eine Quelle.
    const places = finder.filter((p) => p.kind !== 'tasks' && !(p.moons.length === 0 && depts.some((x) => x.id === p.id && isCalendarDept(x))));
    return places.map((p, idx) => {
      const c = planetCounts(p);
      const d = depts.find((x) => x.id === p.id);
      const cal = Boolean(d && isCalendarDept(d));
      let meta = p.kind === 'tasks'
        ? day.taskLine
        : p.moons.length ? plural(p.moons.length, 'Ordner', 'Ordner') : 'noch leer';
      if (cal && upcoming.length) meta = plural(upcoming.length, 'Termin kommt', 'Termine kommen');
      if (cal && live) meta = live;
      const weight = p.kind === 'tasks' ? p.stars.length : c.folders + c.items + (cal ? upcoming.length : 0);
      return { id: p.id, name: p.name, tone: matteTone(p.name, { count: weight }, idx), weight, meta, moons: p.moons.map((m) => ({ id: m.id, label: m.name, count: m.count })),
        orbit: {
          moons: p.moons.map((m) => ({ id: m.id, label: m.name, stars: m.stars.map((x) => ({ id: x.id, label: x.name, kind: x.kind })) })),
          stars: p.stars.map((x) => ({ id: x.id, label: x.name, kind: x.kind, overdue: x.overdue, done: x.done })),
        } };
    });
  }, [finder, tree.data, events.data, day]);
  return {
    enabled,
    loading: enabled && (tree.isLoading || events.isLoading || tasks.isLoading),
    failed: enabled && tree.isError,
    companyId,
    planets,
    finder,
    tasksPlanetId: TASKS_PLANET,
    day,
    events: events.data ?? [],
    tasks: tasks.data ?? [],
  };
}
