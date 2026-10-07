'use client';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { AgentFeed } from '@/features/mora/ui/AgentFeed';
import React, { useMemo } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, CircleDot, Compass, Inbox, ListTodo, Mail, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { Button, MoraStone, FailureState, Loading, ResponsiveGrid, SampleTag, Stack, StateView, Status, Surface, Text } from '@/components/os-kit';
import { useScopedToday } from '@/lib/os/useScopedToday';
import type { TodaySnapshot, TodaySourceStatus } from '@/lib/api/todayClient';
import { useSessionStore } from '@/lib/store/sessionStore';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useFinanceSignal } from '@/features/finance/data/useFinanceSignal';
import { CONTRACT_LABEL } from '@/features/finance/data/contracts';
import type { FeatureSurfaceProps } from '../types';
import { deriveAttention, deriveHints } from './data/attention';
import { sampleTodaySnapshot } from './data/sample';
import { MoraLagebild } from './ui/MoraLagebild';
import { MoraBriefing } from './ui/MoraBriefing';

const PHASE_GREETING = { flow: 'Guten Morgen', build: 'Guten Tag', lounge: 'Guten Abend', night: 'Guten Abend' } as const;
function greeting(phase?: keyof typeof PHASE_GREETING | null, date = new Date()) {
  if (phase) return PHASE_GREETING[phase];
  const h = date.getHours();
  return h < 11 ? 'Guten Morgen' : h < 17 ? 'Guten Tag' : 'Guten Abend';
}

function SourceState({ status, label }: { status: TodaySourceStatus; label: string }) {
  if (status === 'disconnected') return <StateView compact kind="not_configured" title={`${label} nicht verbunden`} copy="Docke die Quelle unter Einstellungen › Quellen an." />;
  if (status === 'unavailable') return <StateView compact kind="backend_unavailable" title={`${label} gerade nicht verfügbar`} copy="CORE konnte diese Quelle nicht lesen. Das heißt nicht, dass nichts da ist." />;
  return null;
}

function Section({ icon, title, children, aside }: { icon: React.ReactNode; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <Surface padding={5}>
      <Stack direction="row" align="center" justify="space-between" className="mb-3">
        <Stack direction="row" gap={2} align="center"><span className="os-tone-faint" aria-hidden>{icon}</span><Text variant="eyebrow">{title}</Text></Stack>
        {aside}
      </Stack>
      {children}
    </Surface>
  );
}

export default function TodaySurface({ navigate, preview }: FeatureSurfaceProps) {
  const phaseOverride = useOsShellStore((s) => s.phaseOverride);
  const userName = useSessionStore((s) => s.user?.name?.split(' ')[0] ?? null);
  const today = useScopedToday({ backgroundRefresh: true });
  const finance = useFinanceSignal();
  const sample = preview && !today.snapshot;
  const snapshot: TodaySnapshot | null = today.snapshot || (sample ? sampleTodaySnapshot() : null);
  const attention = useMemo(() => (snapshot ? deriveAttention(snapshot) : []), [snapshot]);
  const hints = useMemo(() => deriveHints(snapshot), [snapshot]);
  const dateLabel = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex flex-col gap-6" data-testid="feature-today">
      <header>
        <Stack direction="row" gap={3} align="center"><Text variant="eyebrow">{dateLabel}</Text>{sample ? <SampleTag /> : null}</Stack>
        <div className="os-today-hero mt-2"><MoraStone size={44} halo /><Text variant="display">{greeting(phaseOverride)}{userName ? `, ${userName}` : ''}.</Text></div>
        <Text className="mt-2 max-w-2xl">
          {sample
            ? 'Lokale Vorschau: Die Inhalte unten sind Beispieldaten, damit der Aufbau sichtbar ist. Mit CORE-Sitzung erscheinen hier deine echten Signale.'
            : 'Das Wichtigste von heute, ruhig zusammengeführt. Was nicht belegt ist, steht hier als „unbekannt“ – nicht als „nichts“.'}
        </Text>
      </header>

      <MoraBriefing live={!preview && Boolean(userName)} navigate={navigate} />

      {snapshot ? (
        <section aria-label="Heute · Aktuell" data-testid="today-now">
          <Text variant="eyebrow" className="mb-2">Heute · Aktuell — das ist heute relevant</Text>
          <div className="os-today-now">
            {([
              ['Kalender', CalendarDays, snapshot.calendar.events[0]?.title ?? 'Heute frei', snapshot.calendar.events.length ? `${snapshot.calendar.events.length} Termin${snapshot.calendar.events.length === 1 ? '' : 'e'} heute` : 'Keine weiteren Termine für heute.', () => navigate('post')],
              ['Mail', Mail, snapshot.mail.items[0]?.subject ?? 'Nichts Neues', `${snapshot.mail.items.length} zuletzt geladene Nachrichten.`, () => navigate('post')],
              ['Aufgaben · Organisation', ListTodo, snapshot.tasks.counts.open ? `${snapshot.tasks.counts.open} offen` : 'Nichts offen', snapshot.tasks.counts.overdue ? `${snapshot.tasks.counts.overdue} überfällig` : 'Keine überfälligen Aufgaben.', () => openLegacyApp('tasks')],
              ['Nightwatch', ShieldCheck, sample ? 'Alles ruhig' : 'Unbekannt', sample ? 'Keine offenen Vorfälle.' : 'Lagebild in der klassischen Nightwatch.', () => openLegacyApp('nightwatch')],
            ] as const).map(([label, Icon, title, copy, run]) => (
              <button key={label} type="button" className="os-today-now__card" onClick={run} data-testid={`today-now-${label.split(' ')[0].toLowerCase()}`}>
                <span className="os-today-now__eyebrow"><Icon size={13} aria-hidden /> {label} <ArrowUpRight size={12} className="ml-auto" aria-hidden /></span>
                <b>{title}</b><span>{copy}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {sample ? <MoraLagebild navigate={navigate} /> : null}

      <AgentFeed live={!preview && Boolean(userName)} demo={Boolean(sample)} limit={3} compact />

      <Surface interactive padding={5} className="os-universe-card" onClick={() => navigate('universe')} data-testid="today-universe-card" aria-label="Universe betreten: Den Raum deines Unternehmens betreten">
        <Stack direction="row" align="flex-end" justify="space-between" gap={3}>
          <Stack gap={1} className="min-w-0">
            <Text variant="eyebrow">Universe</Text>
            <Text variant="title" as="div">Den Raum deines Unternehmens betreten</Text>
            <Text variant="meta">Bereiche, Spaces und Zusammenhänge – als Landschaft statt als Liste.</Text>
          </Stack>
          <ArrowRight size={16} className="os-tone-accent" aria-hidden />
        </Stack>
      </Surface>

      {today.loading && !snapshot ? <Loading lines={4} /> : null}
      {!today.loading && !snapshot ? (
        <FailureState
          kind={today.loadError === 'unauthorized' ? 'unauthenticated' : today.loadError === 'forbidden' ? 'denied' : 'offline'}
          subject="Tagesbild: /v3/today"
          onRetry={() => today.refresh(true)}
        />
      ) : null}

      {snapshot ? (
        <>
          <Section icon={<CircleDot size={14} />} title="Braucht Aufmerksamkeit" aside={sample ? <SampleTag /> : null}>
            {attention.length === 0 ? (
              <Text>Nichts Dringendes. Alles Belegte ist im grünen Bereich.</Text>
            ) : (
              <div className="os-list">
                {attention.map((a) => (
                  <div key={a.id} className="os-list-row">
                    <Stack gap={0} className="min-w-0"><Text tone="default" className="truncate">{a.title}</Text><Text variant="meta">{a.reason}</Text></Stack>
                    <Button size="sm" variant="ghost" onClick={() => (a.target === 'today' ? openLegacyApp('tasks') : navigate(a.target))}>Ansehen</Button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <ResponsiveGrid columns={2}>
            <Section icon={<CalendarDays size={14} />} title="Termine heute" aside={<Button size="sm" variant="ghost" onClick={() => navigate('post')}>Post</Button>}>
              <SourceState status={snapshot.calendar.status} label="Kalender" />
              {(snapshot.calendar.status === 'ok' || snapshot.calendar.status === 'empty' || snapshot.calendar.status === 'partial' || snapshot.calendar.status === 'stale') && (
                snapshot.calendar.events.length === 0 ? <Text>Keine Termine heute.</Text> : (
                  <div className="os-list">
                    {snapshot.calendar.events.slice(0, 4).map((e) => (
                      <div key={e.id} className="os-list-row"><Text tone="default" className="truncate">{e.title}</Text><Text variant="meta">{e.time || 'ganztägig'}</Text></div>
                    ))}
                  </div>
                )
              )}
            </Section>

            <Section icon={<Wallet size={14} />} title="Finance-Signal" aside={<Button size="sm" variant="ghost" onClick={() => navigate('finance')}>Finance</Button>}>
              {finance.kind === 'value' ? (
                <Stack gap={1}>
                  <Text variant="meta">{finance.label}</Text>
                  <Text variant="title" as="div">{finance.value}</Text>
                  <Stack direction="row" gap={2} wrap>
                    <Status tone={finance.truth === 'observed' ? 'safe' : 'warning'}>{finance.truth}</Status>
                    {finance.warnings ? <Status tone="warning">{finance.warnings} Hinweis{finance.warnings === 1 ? '' : 'e'}</Status> : null}
                  </Stack>
                </Stack>
              ) : (
                <Stack gap={1}>
                  <Text>Kein belegter Finanzstand.</Text>
                  <Status tone="warning">{CONTRACT_LABEL[finance.state]}</Status>
                </Stack>
              )}
            </Section>

            <Section icon={<ListTodo size={14} />} title="Offene Arbeit" aside={<Button size="sm" variant="ghost" onClick={() => openLegacyApp('tasks')}>Aufgaben</Button>}>
              <SourceState status={snapshot.tasks.status} label="Aufgaben" />
              {snapshot.tasks.status !== 'disconnected' && snapshot.tasks.status !== 'unavailable' ? (
                <Stack direction="row" gap={6} wrap>
                  {([['Offen', snapshot.tasks.counts.open], ['In Arbeit', snapshot.tasks.counts.in_progress], ['Heute fällig', snapshot.tasks.counts.due_today], ['Überfällig', snapshot.tasks.counts.overdue]] as const).map(([l, v]) => (
                    <Stack key={l} gap={0}><Text variant="title" as="div">{v ?? '—'}</Text><Text variant="meta">{l}</Text></Stack>
                  ))}
                </Stack>
              ) : null}
            </Section>

            <Section icon={<Inbox size={14} />} title="Neue Informationen" aside={<Button size="sm" variant="ghost" onClick={() => navigate('post')}>Post</Button>}>
              <SourceState status={snapshot.mail.status} label="Post" />
              {snapshot.mail.items.length === 0 && snapshot.mail.status !== 'disconnected' && snapshot.mail.status !== 'unavailable' ? <Text>Nichts Neues.</Text> : (
                <div className="os-list">
                  {snapshot.mail.items.slice(0, 3).map((m) => (
                    <div key={m.id} className="os-list-row">
                      <Stack gap={0} className="min-w-0"><Text tone="default" className="truncate">{m.subject || '(ohne Betreff)'}</Text><Text variant="meta" className="truncate">{m.from_addr}</Text></Stack>
                      {m.read === false ? <Status tone="info">neu</Status> : null}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </ResponsiveGrid>
        </>
      ) : null}

      <section aria-label="Weiter" data-testid="today-launch">
        <Text variant="eyebrow" className="mb-2">Weiter — dort weitermachen, wo gerade etwas anliegt</Text>
        <div className="os-today-launch">
          {([
            ['Universe', 'Raum & Zusammenhänge', Compass, () => navigate('universe')],
            ['Arbeit', 'Offene Arbeit und nächste Schritte', ListTodo, () => openLegacyApp('tasks')],
            ['Mail', 'Lesen, antworten, sortieren', Mail, () => navigate('post')],
            ['Kalender', 'Termine und feste Punkte', CalendarDays, () => navigate('post')],
            ['Dateien', 'Dokumente im Arbeitskontext', BookOpen, () => navigate('knowledge')],
          ] as const).map(([t, d, Icon, run]) => (
            <button key={t} type="button" className="os-today-now__card" onClick={run}><span className="os-today-now__eyebrow"><Icon size={13} aria-hidden /> {d}</span><b>{t}</b></button>
          ))}
        </div>
      </section>

      <Section icon={<Sparkles size={14} />} title="MÔRA-Hinweise" aside={<Button size="sm" onClick={() => navigate('mora')}>MÔRA fragen</Button>}>
        <Stack gap={2}>{hints.map((h) => <Text key={h}>{h}</Text>)}</Stack>
      </Section>
    </div>
  );
}
