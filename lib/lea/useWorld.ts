'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { buildWorld, type WorldDepartment, type WorldEvent, type WorldTask } from './world';

function list<T>(raw: unknown, keys: string[] = []): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') for (const k of keys) { const v = (raw as Record<string, unknown>)[k]; if (Array.isArray(v)) return v as T[]; }
  return [];
}

/** Echte Daten für Home und Universe: Abteilungen (mit Bereichen), Termine, Aufgaben. */
export function useWorld() {
  const navCompany = useNavStore((s) => s.activeCompanyId);
  const sessionCompany = useSessionStore((s) => (s.user as { active_company_id?: string | null } | null)?.active_company_id ?? null);
  const companyId = navCompany || sessionCompany;
  const hasSession = useSessionStore((s) => Boolean(s.user?.tenant_id));
  const enabled = hasSession && Boolean(companyId);
  const tree = useQuery({
    queryKey: ['lea-world', 'tree', companyId],
    enabled,
    staleTime: 30_000,
    queryFn: async () => list<WorldDepartment>(await coreGet(`/v3/tree?company_id=${encodeURIComponent(companyId!)}`, { isOptional: true }), ['departments']),
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
  const planets = useMemo(
    () => buildWorld({ departments: tree.data ?? [], events: events.data ?? [], tasks: tasks.data ?? [] }),
    [tree.data, events.data, tasks.data],
  );
  return {
    enabled,
    loading: enabled && (tree.isLoading || events.isLoading || tasks.isLoading),
    failed: enabled && tree.isError,
    planets,
    events: events.data ?? [],
    tasks: tasks.data ?? [],
  };
}
