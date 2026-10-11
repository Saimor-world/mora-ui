'use client';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { useSources } from '@/lib/os-prototype/useSources';
import { assessSourceConnection, type ConnectionEvidence } from '@/lib/os-prototype/appConnectionEvidence';
import React from 'react';
import { CalendarDays, Inbox } from 'lucide-react';
import { Button, SampleTag, FailureState, Loading, ResponsiveGrid, Stack, StateView, Status, Surface, Text } from '@/components/os-kit';
import { classifyCoreFailure } from '@/lib/os-prototype/coreFailure';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import type { FeatureSurfaceProps } from '../types';
import { usePostCalendar, usePostInbox } from './data/usePost';
import { useSessionStore } from '@/lib/store/sessionStore';
import { DEMO_CALENDAR, DEMO_MAIL } from '@/lib/os-prototype/demoPack';
import { CalendarContinuity } from '@/components/home/CalendarContinuity';

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

function SourceGate({ state, label, onConnect }: { state: ConnectionEvidence; label: string; onConnect: () => void }) {
  if (state === 'checking') return <Loading lines={3} />;
  if (state === 'unavailable') return <FailureState kind="offline" compact subject={label + ': Quellenstatus nicht abrufbar'} />;
  if (state === 'no_session') return <FailureState kind="unauthenticated" compact subject={label} />;
  return (
    <div data-testid={`post-source-gate-${label === 'Posteingang' ? 'mail' : 'calendar'}`}>
      <StateView kind="not_configured" compact title={label + ' nicht bestätigt'} copy="CORE meldet keine verifiziert verbundene Quelle. Ein leeres Postfach oder ein freier Kalender ist damit nicht belegt." />
      <Button size="sm" variant="ghost" onClick={onConnect}>Quellen prüfen</Button>
    </div>
  );
}

export default function PostSurface({ preview, navigate }: FeatureSurfaceProps) {
  const hasSession = useSessionStore((s) => Boolean(s.user?.tenant_id));
  const sample = Boolean(preview);
  const sources = useSources(!sample && hasSession);
  const connections = sources.data?.connections;
  const sourceState = { hasSession: hasSession && !sample, isLoading: sources.isLoading, isError: sources.isError, isSuccess: sources.isSuccess, connections };
  const mailConnection = assessSourceConnection('mail', sourceState);
  const calendarConnection = assessSourceConnection('calendar', sourceState);
  const liveInbox = usePostInbox(!sample && mailConnection === 'connected');
  const liveCalendar = usePostCalendar(!sample && calendarConnection === 'connected');
  const goToSources = () => {
    useOsShellStore.getState().setSettingsSection('sources');
    navigate('settings');
  };
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
          {!sample && mailConnection !== 'connected' ? <SourceGate state={mailConnection} label="Posteingang" onConnect={goToSources} /> : <QueryBody q={inbox} subject="/v3/mail/messages" empty="Posteingang leer" render={(items) => (
            <div className="os-list">
              {items.slice(0, 8).map((m) => (
                <div key={m.id} className="os-list-row os-mail-row">
                  <span className="os-mail-avatar" aria-hidden>{String(m.from_addr || m.from || '?').charAt(0).toUpperCase()}</span>
                  <Stack gap={0} className="min-w-0 flex-1"><Text tone="default" className="truncate">{m.subject || '(ohne Betreff)'}</Text><Text variant="meta" className="truncate">{m.from_addr || m.from}</Text>{m.snippet ? <Text variant="meta" className="truncate">{m.snippet}</Text> : null}</Stack>
                  {m.read === false ? <Status tone="info">neu</Status> : null}
                  <Button size="sm" variant="ghost" onClick={() => { useOsShellStore.getState().setMoraDraft(`Hilf mir bei einer Nachricht mit dem Betreff „${m.subject || '(ohne Betreff)'}“. Hier wurde dir nur der Betreff übergeben, nicht der Inhalt. Behaupte nicht, die Nachricht gelesen zu haben, und sende nichts ohne meine Freigabe.`); useOsShellStore.getState().setMoraOpen(true); }} aria-label={`Nur Betreff mit MÔRA besprechen: ${m.subject || ''}`} title="Nur Betreff, kein Mailinhalt wird übergeben">MÔRA zum Betreff</Button>
                </div>
              ))}
            </div>
          )} />}
        </Column>
        <Column icon={<CalendarDays size={16} />} title="Termine" action={<Button size="sm" onClick={() => openLegacyApp('calendar')}>Kalender öffnen</Button>}>
          {!sample && calendarConnection !== 'connected' ? <SourceGate state={calendarConnection} label="Kalender" onConnect={goToSources} /> : <QueryBody q={calendar} subject="/v3/calendar/events" empty="Keine Termine" render={(items) => (
            <div className="os-list">
              {items.slice(0, 8).map((e) => (
                <div key={e.id} className="os-list-row"><Text tone="default" className="truncate">{e.title}</Text><Text variant="meta">{e.date}{e.time ? ` · ${e.time}` : ''}</Text></div>
              ))}
            </div>
          )} />}
        </Column>
      </ResponsiveGrid>
      {/* V1.5: Kalender-Fäden aus dem Legacy-Home (CalendarContinuity, /v3/continuity) – vorbereitende Aufgaben zu Terminen, nur mit deiner Freigabe. */}
      {sample ? (
        <Surface padding={5} data-testid="post-continuity">
          <Text variant="eyebrow">Kalender-Fäden</Text>
          <Text className="mt-2">Vorbereitungs-Aufgaben zu kommenden Terminen erscheinen hier, sobald ein Kalender verbunden ist. MÔRA schlägt vor, du bestätigst.</Text>
        </Surface>
      ) : <CalendarContinuity />}
    </div>
  );
}
