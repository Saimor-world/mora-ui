'use client';
import React, { useEffect, useRef } from 'react';
import { Button, Loading, Stack, Surface, Text } from '@/components/os-kit';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useNavStore } from '@/lib/store/navStore';
import { resolveScopeCompany, useDemoStore } from '@/lib/demo/demoStore';
import type { TodaySnapshot, TodayCalendarEvent, TodaySourceStatus } from '@/lib/api/todayClient';

const TASK_STATUS: Record<string, string> = { backlog: 'Offen', in_progress: 'In Arbeit', done: 'Erledigt' };
const PRIORITY: Record<string, string> = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch' };
const dateLabel = (value: string) => value.slice(0, 10).replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3.$2.$1');

/** Read-only detail inside Heute. No object payload, permission or write intent lives in the command store. */
export function ObjectFocus({ snapshot, events, eventStatus, loading, calendarLoading = false, snapshotStale = false, surface = 'today' }: {
  snapshot: TodaySnapshot | null;
  events: TodayCalendarEvent[];
  eventStatus: TodaySourceStatus;
  loading: boolean;
  calendarLoading?: boolean;
  snapshotStale?: boolean;
  surface?: 'today' | 'post';
}) {
  const target = useOsShellStore(s => s.objectTarget);
  const user = useSessionStore(s => s.user);
  const generation = useSessionStore(s => s.sessionGeneration);
  const demo = useDemoStore(s => s.demoCompanyId);
  const nav = useNavStore(s => s.activeCompanyId);
  const company = resolveScopeCompany(demo, user?.active_company_id ?? null, nav);
  const scope = JSON.stringify([JSON.stringify([user?.tenant_id, user?.id, generation]), demo, company]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!target) return;
    heading.current?.focus();
    heading.current?.scrollIntoView?.({ block: 'nearest', behavior: 'auto' });
  }, [target]);
  if (!target || target.surface !== surface) return null;

  const sameScope = Boolean(user?.tenant_id && user?.id) && target.scope === scope;
  const requested = snapshot?.requested_scope;
  const taskScope = !!requested && requested.tenant_id === user?.tenant_id && requested.user_id === user?.id
    && (requested?.company_id ?? null) === company;
  const taskMeta = snapshot?.tasks;
  const readableTask = sameScope && taskScope && taskMeta && ['ok', 'empty', 'stale'].includes(taskMeta.status);
  const task = target.kind === 'task' && readableTask
    ? [...(taskMeta.items ?? []), ...(taskMeta.due_today ?? []), ...(taskMeta.overdue ?? [])].find(t => t.id === target.id) : null;
  const readableEvent = sameScope && ['ok', 'empty', 'stale'].includes(eventStatus);
  const event = target.kind === 'event' && readableEvent ? events.find(e => e.id === target.id) : null;
  const pending = sameScope && (target.kind === 'task' ? loading : calendarLoading);
  const item = task || event;
  const missing = !sameScope ? 'Das Ziel gehört zu einem anderen Arbeitsbereich. Bitte dort neu öffnen.'
    : target.kind === 'task' ? 'Die ausgewählte Aufgabe ist im aktuellen Aufgabenstand nicht verfügbar.'
    : 'Der ausgewählte Termin ist im aktuellen Kalenderstand nicht verfügbar.';

  return (
    <Surface padding={5} role="region" aria-label={target.kind === 'task' ? 'Aufgabendetails' : 'Termindetails'} data-testid="object-focus">
      <Stack direction="row" align="center" justify="space-between" gap={3}>
        <h2 ref={heading} tabIndex={-1} className="os-text-title m-0">{target.kind === 'task' ? 'Aufgabe ansehen' : 'Termin ansehen'}</h2>
        <Button size="sm" variant="ghost" onClick={() => useOsShellStore.getState().setObjectTarget(null)} aria-label="Details schließen">Schließen</Button>
      </Stack>
      {demo ? <Text variant="meta">Fiktive Demo</Text> : null}
      {pending && !item ? <Loading lines={2} label="Ziel wird geladen" /> : item ? (
        <Stack gap={2} className="mt-3">
          <Text variant="title" as="h3">{item.title}</Text>
          {task ? <>
            <Text>Status: {TASK_STATUS[task.status] || 'Unbekannt'}</Text>
            {task.due_date ? <Text>Fällig: {dateLabel(task.due_date)}</Text> : null}
            {task.priority ? <Text>Priorität: {PRIORITY[task.priority] || 'Unbekannt'}</Text> : null}
            {taskMeta?.status === 'stale' || snapshotStale ? <Text variant="meta">Letzter gespeicherter Stand – aktuell nicht bestätigt.</Text> : null}
          </> : null}
          {event ? <>
            <Text>{dateLabel(event.date)}{event.time ? ` · ${event.time} Uhr` : ' · ganztägig'}</Text>
            {event.duration != null ? <Text>Dauer: {event.duration} Minuten</Text> : null}
            {event.location ? <Text>Ort: {event.location}</Text> : null}
            {eventStatus === 'stale' ? <Text variant="meta">Letzter gespeicherter Stand – aktuell nicht bestätigt.</Text> : null}
          </> : null}
        </Stack>
      ) : <Text role="status" className="mt-3">{missing}</Text>}
    </Surface>
  );
}
