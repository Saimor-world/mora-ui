'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';
import { calendarReadWindow, calendarSnapshotIsCurrent, fetchCalendarReadSnapshot } from '@/lib/api/calendarReadClient';
import { listCompanyFiles } from '@/lib/api/filesClient';
import { useDemoStore, resolveScopeCompany } from '@/lib/demo/demoStore';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDayStore } from './dayStore';
import { buildLiveDay, calendarMeta } from './live';
import { isCalendarDept, planetTraits, plural, upcomingEvents, type WorldDepartment, type WorldEvent, type WorldPlanet, type WorldTask } from './world';
import { buildFinder, planetCounts, TASKS_PLANET, type FFolder, type FNode, type FPlanet, type FSpace } from './finder';
import { matteTone, toneSlots } from '@/lib/universe/matteTone';

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
  const tenantId = useSessionStore((s) => s.user?.tenant_id);
  const userId = useSessionStore((s) => s.user?.id);
  const generation = useSessionStore((s) => s.sessionGeneration);
  const hasSession = Boolean(tenantId && userId);
  const enabled = hasSession && Boolean(companyId);
  const [now, setNow] = useState(() => new Date());
  const window = useMemo(() => calendarReadWindow(now), [now]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
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
    queryKey: ['lea-world', 'calendar-read', tenantId, userId, generation, companyId, window.startDate, window.endDate],
    enabled,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: false,
    queryFn: () => fetchCalendarReadSnapshot({ tenantId: tenantId!, userId: userId!, companyId: companyId!, ...window }),
  });
  const tasks = useQuery({
    queryKey: ['lea-world', 'tasks', companyId],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const raw = await coreGet(`/v3/tasks?company_id=${encodeURIComponent(companyId!)}`, { isOptional: true, throwAuthErrors: true });
      if (!Array.isArray(raw) && !(raw && typeof raw === 'object' && (Array.isArray(raw.tasks) || Array.isArray(raw.items)))) throw new Error('Tasks unavailable');
      return list<WorldTask>(raw, ['tasks', 'items']);
    },
  });
  const phases = useDayStore((s) => s.phases);
  const calendarComplete = calendarSnapshotIsCurrent(events.data, new Date()) && !events.isError;
  const calendar = useMemo(() => events.data ? { ...events.data, complete: calendarComplete,
    status: calendarComplete ? events.data.status : events.isError ? 'unavailable' as const : events.data.complete ? 'stale' as const : events.data.status,
    count: calendarComplete ? events.data.count : null } : null, [events.data, calendarComplete, events.isError]);
  const tasksComplete = tasks.isSuccess;
  const calendarEvents = useMemo<WorldEvent[]>(() => calendarComplete ? (events.data?.events ?? []).map((event) => ({
    id: event.id, title: event.title, date: event.date, time: event.time ?? undefined, duration: event.duration ?? undefined,
  })) : [], [calendarComplete, events.data]);
  const day = useMemo(() => {
    const result = buildLiveDay(calendarEvents, tasks.data ?? [], phases, now, 'Europe/Berlin');
    if (!calendarComplete || !tasksComplete) return { ...result, ahead: null, taskLine: tasksComplete ? result.taskLine : 'Aufgabenstand nicht verfügbar',
      sentence: !calendarComplete ? 'Den Kalenderstand kann ich gerade nicht vollständig lesen.' : 'Den Aufgabenstand kann ich gerade nicht vollständig lesen.' };
    return result;
  }, [calendarEvents, tasks.data, phases, calendarComplete, tasksComplete, now]);
  // Finder = Universe: Abteilungen, Ordner (Monde), Inhalte (Sterne) und der Aufgaben-Planet.
  const finder: FPlanet[] = useMemo(() => buildFinder({
    departments: (tree.data?.departments ?? []) as never,
    unassigned: tree.data?.unassigned ?? [],
    folders: folders.data ?? [],
    nodes: [...(nodes.data ?? []), ...(files.data ?? [])],
    tasks: tasks.isSuccess ? tasks.data ?? [] : null,
  }), [tree.data, folders.data, nodes.data, files.data, tasks.data, tasks.isSuccess]);
  // Live: was Lea heute tut („ist da“, abgeschlossen), steht sofort am Termin-Planeten.
  const places = useMemo(() => {
    const depts = tree.data?.departments ?? [];
    // Grammatik des Universe: Planeten sind nur Abteilungen (Orte). Aufgaben ohne Ordner und Termine sind
    // keine Orte – sie stehen im Horizont und bei MÔRA. Eine reine Termin-Abteilung ohne Ordner ist eine Quelle.
    return finder.filter((p) => p.kind !== 'tasks' && !(p.moons.length === 0 && depts.some((x) => x.id === p.id && isCalendarDept(x))));
  }, [finder, tree.data]);
  // Ton je Ort fest aus dem Namen, Nachbarn auf der Bahn entzerrt – derselbe Ton im Universe und im Finder.
  const toneById = useMemo(() => {
    const slots = toneSlots(places.map((p) => p.name));
    return new Map(places.map((p, i) => [p.id, matteTone(p.name, {}, slots[i])]));
  }, [places]);
  const finderToned: FPlanet[] = useMemo(() => finder.map((p) => (toneById.has(p.id) ? { ...p, tone: toneById.get(p.id)! } : p)), [finder, toneById]);
  const planets: WorldPlanet[] = useMemo(() => {
    const live = calendarMeta(day, 'Europe/Berlin');
    const depts = tree.data?.departments ?? [];
    const upcoming = upcomingEvents(calendarEvents, now, 'Europe/Berlin');
    return places.map((p) => {
      const c = planetCounts(p);
      const d = depts.find((x) => x.id === p.id);
      const cal = Boolean(d && isCalendarDept(d));
      let meta = p.kind === 'tasks'
        ? day.taskLine
        : p.moons.length ? plural(p.moons.length, 'Ordner', 'Ordner') : 'noch leer';
      if (cal && upcoming.length) meta = plural(upcoming.length, 'Termin kommt', 'Termine kommen');
      if (cal && live) meta = live;
      const weight = p.kind === 'tasks' ? p.stars.length : c.folders + c.items + (cal ? upcoming.length : 0);
      return { id: p.id, name: p.name, tone: toneById.get(p.id) ?? matteTone(p.name, { count: weight }), weight, meta, moons: p.moons.map((m) => ({ id: m.id, label: m.name, count: m.count })),
        orbit: {
          moons: p.moons.map((m) => ({ id: m.id, label: m.name, stars: m.stars.map((x) => ({ id: x.id, label: x.name, kind: x.kind })) })),
          stars: p.stars.map((x) => ({ id: x.id, label: x.name, kind: x.kind, overdue: x.overdue, done: x.done })),
        },
        traits: planetTraits(p.id, p.moons.map((m) => m.id), [...(nodes.data ?? []), ...(files.data ?? [])], tasks.data ?? []) };
    });
  }, [places, toneById, tree.data, calendarEvents, day, nodes.data, files.data, tasks.data, now]);
  return {
    enabled,
    loading: enabled && (tree.isLoading || events.isLoading || tasks.isLoading),
    failed: enabled && tree.isError,
    dayUnavailable: enabled && (!calendarComplete || !tasksComplete),
    calendarUnavailable: enabled && !calendarComplete,
    tasksUnavailable: enabled && !tasksComplete,
    companyId,
    planets,
    finder: finderToned,
    tasksPlanetId: TASKS_PLANET,
    day,
    calendar,
    events: calendarEvents,
    tasks: tasks.data ?? [],
  };
}
