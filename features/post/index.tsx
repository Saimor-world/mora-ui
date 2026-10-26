'use client';
import { localISO, shortDate } from '@/lib/lea/world';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import React from 'react';
import { CalendarDays, Inbox } from 'lucide-react';
import { MailClient } from './MailClient';
import { Button, SampleTag, FailureState, Loading, Stack, StateView, Status, Surface, Text } from '@/components/os-kit';
import { classifyCoreFailure } from '@/lib/os-prototype/coreFailure';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import type { FeatureSurfaceProps } from '../types';
import { usePostCalendar, usePostInbox } from './data/usePost';
import { useSessionStore } from '@/lib/store/sessionStore';
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


export default function PostSurface({ preview }: FeatureSurfaceProps) {
  const hasSession = useSessionStore((s) => Boolean(s.user?.tenant_id));
  const sample = Boolean(preview) && !hasSession;
  const liveInbox = usePostInbox();
  const liveCalendar = usePostCalendar();
  const today = localISO(new Date());
  // Demos laufen über echte is_demo-Firmen in CORE – keine lokale Kopie mehr.
  const inbox = liveInbox;
  const calendar = liveCalendar;

  return (
    <div className="flex flex-col gap-6" data-testid="feature-post">
      <header>
        <Stack direction="row" gap={3} align="center"><Text variant="eyebrow">Post</Text>{sample ? <SampleTag /> : null}</Stack>
        <Text variant="display" className="mt-2">Nachrichten und Termine.</Text>
        <Text className="mt-2 max-w-2xl">
          Was hereinkommt und was ansteht. MÔRA hilft beim Antworten – senden tust du.
        </Text>
      </header>
      <div className="os-post-grid">
        <Column icon={<Inbox size={16} />} title="Posteingang" action={<Button size="sm" variant="ghost" onClick={() => openLegacyApp('mail')}>Im Postfach öffnen</Button>}>
          <QueryBody q={inbox} subject="/v3/mail/messages" empty="Posteingang leer" render={(items) => <MailClient items={items} />} />
        </Column>
        <Column icon={<CalendarDays size={16} />} title="Termine" action={<Button size="sm" onClick={() => openLegacyApp('calendar')}>Kalender öffnen</Button>}>
          <QueryBody q={calendar} subject="/v3/calendar/events" empty="Keine Termine" render={(items) => (
            <div className="os-list">
              {items.filter((e) => !e.date || String(e.date) >= today).slice(0, 8).map((e) => (
                <div key={e.id} className="os-list-row"><Text tone="default" className="truncate">{e.title}</Text><Text variant="meta">{postDate(String(e.date || ''), today)}{e.time ? ` · ${e.time} Uhr` : ''}</Text></div>
              ))}
            </div>
          )} />
        </Column>
      </div>
      {/* V1.5: Kalender-Fäden aus dem Legacy-Home (CalendarContinuity, /v3/continuity) – vorbereitende Aufgaben zu Terminen, nur mit deiner Freigabe. */}
      {sample ? (
        <Surface padding={5} data-testid="post-continuity">
          <Text variant="eyebrow">Kalender-Fäden</Text>
          <Text className="mt-2">Vorbereitungs-Aufgaben zu kommenden Terminen erscheinen hier, sobald ein Kalender verbunden ist. MÔRA schlägt vor, du bestätigst.</Text>
        </Surface>
      ) : <Surface padding={5} className="os-continuity" data-testid="post-continuity"><CalendarContinuity /></Surface>}
    </div>
  );
}

function postDate(iso: string, today: string): string {
  if (!iso) return '';
  if (iso.slice(0, 10) === today) return 'Heute';
  const t = new Date(`${today}T12:00:00`); t.setDate(t.getDate() + 1);
  if (iso.slice(0, 10) === localISO(t)) return 'Morgen';
  return shortDate(iso.slice(0, 10));
}
