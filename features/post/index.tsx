'use client';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import React from 'react';
import { CalendarDays, Inbox } from 'lucide-react';
import { Button, SampleTag, FailureState, Loading, ResponsiveGrid, Stack, StateView, Status, Surface, Text } from '@/components/os-kit';
import { classifyCoreFailure } from '@/lib/os-prototype/coreFailure';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import type { FeatureSurfaceProps } from '../types';
import { usePostCalendar, usePostInbox } from './data/usePost';
import { useSessionStore } from '@/lib/store/sessionStore';
import { DEMO_CALENDAR, DEMO_MAIL } from '@/lib/os-prototype/demoPack';

function Column({ icon, title, action, children }: { icon: React.ReactNode; title: string; action: React.ReactNode; children: React.ReactNode }) {
  return (
    <Surface padding={5} style={{ minHeight: 320 }}>
      <Stack direction="row" justify="space-between" align="center" className="mb-4">
        <Stack direction="row" gap={2} align="center"><span className="os-tone-faint" aria-hidden>{icon}</span><Text variant="title" as="h2">{title}</Text></Stack>
        {action}
      </Stack>
      {children}
    </Surface>
  );
}

function QueryBody<T>({ q, empty, render, subject }: { q: { isLoading: boolean; isError: boolean; error: unknown; data: T[] | null | undefined; refetch: () => void; fetchStatus: string }; empty: string; render: (items: T[]) => React.ReactNode; subject: string }) {
  if (q.fetchStatus === 'idle' && q.data === undefined) return <FailureState kind="unauthenticated" compact subject={subject} />;
  if (q.isLoading) return <Loading lines={4} />;
  if (q.isError) return <FailureState kind={classifyCoreFailure(q.error)} compact subject={subject} onRetry={q.refetch} />;
  if (q.data === null) return <StateView kind="not_configured" compact copy="CORE hat keine Daten geliefert – Quelle nicht verbunden oder nicht erreichbar." detail={subject} />;
  if (!q.data || q.data.length === 0) return <StateView kind="empty" compact title={empty} />;
  return <>{render(q.data)}</>;
}

function demoQuery<T>(data: T[]) { return { isLoading: false, isError: false, error: null, data, refetch: () => undefined, fetchStatus: 'idle' as const }; }

export default function PostSurface({ preview }: FeatureSurfaceProps) {
  const hasSession = useSessionStore((s) => Boolean(s.user?.tenant_id));
  const sample = Boolean(preview) && !hasSession;
  const liveInbox = usePostInbox();
  const liveCalendar = usePostCalendar();
  const today = new Date().toISOString().slice(0, 10);
  // Lokale Vorschau: Demo-Paket „Simple Coffee Group“ (saimor-core demo_isolation.py), als Beispiel markiert.
  const inbox = sample ? demoQuery(DEMO_MAIL.map((m) => ({ id: m.id, subject: m.subject, from: m.from, snippet: m.snippet, read: m.read }))) : liveInbox;
  const calendar = sample ? demoQuery(DEMO_CALENDAR.map((e) => ({ id: e.id, title: e.title, date: today, time: e.time }))) : liveCalendar;

  return (
    <div className="flex flex-col gap-6" data-testid="feature-post">
      <header>
        <Stack direction="row" gap={3} align="center"><Text variant="eyebrow">Post</Text>{sample ? <SampleTag /> : null}</Stack>
        <Text variant="display" className="mt-2">Nachrichten und Termine.</Text>
        <Text className="mt-2 max-w-2xl">
          Ein Ort für das, was hereinkommt und was ansteht. Antworten und Termine anlegen laufen vorerst über die
          bestehenden Apps – MÔRA hilft beim Entwurf, senden tust du.
        </Text>
      </header>
      <ResponsiveGrid columns={2}>
        <Column icon={<Inbox size={16} />} title="Posteingang" action={<Button size="sm" onClick={() => openLegacyApp('mail')}>Postfach öffnen</Button>}>
          <QueryBody q={inbox} subject="/v3/mail/messages" empty="Posteingang leer" render={(items) => (
            <div className="os-list">
              {items.slice(0, 8).map((m) => (
                <div key={m.id} className="os-list-row os-mail-row">
                  <span className="os-mail-avatar" aria-hidden>{String(m.from_addr || m.from || '?').charAt(0).toUpperCase()}</span>
                  <Stack gap={0} className="min-w-0 flex-1"><Text tone="default" className="truncate">{m.subject || '(ohne Betreff)'}</Text><Text variant="meta" className="truncate">{m.from_addr || m.from}</Text>{m.snippet ? <Text variant="meta" className="truncate">{m.snippet}</Text> : null}</Stack>
                  {m.read === false ? <Status tone="info">neu</Status> : null}
                  <Button size="sm" variant="ghost" onClick={() => { useOsShellStore.getState().setMoraDraft(`Fasse zusammen und schlage eine Antwort vor: „${m.subject || ''}“`); useOsShellStore.getState().setMoraOpen(true); }} aria-label={`Mit MÔRA: ${m.subject || ''}`}>Mit MÔRA</Button>
                </div>
              ))}
            </div>
          )} />
        </Column>
        <Column icon={<CalendarDays size={16} />} title="Termine" action={<Button size="sm" onClick={() => openLegacyApp('calendar')}>Kalender öffnen</Button>}>
          <QueryBody q={calendar} subject="/v3/calendar/events" empty="Keine Termine" render={(items) => (
            <div className="os-list">
              {items.slice(0, 8).map((e) => (
                <div key={e.id} className="os-list-row"><Text tone="default" className="truncate">{e.title}</Text><Text variant="meta">{e.date}{e.time ? ` · ${e.time}` : ''}</Text></div>
              ))}
            </div>
          )} />
        </Column>
      </ResponsiveGrid>
    </div>
  );
}
