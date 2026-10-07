'use client';
import React from 'react';
import { BookOpen, CalendarDays, FileText, Inbox, ListTodo, Mail, Radio, X } from 'lucide-react';
import { Button, MoraStone, SampleTag, Stack, Text } from '@/components/os-kit';
import type { OrganizationTerritory } from '@/components/universe/OrganizationField';
import type { UniverseSignal } from '@/lib/universe/types';
import { DEMO_DEPARTMENTS, DEMO_TASKS } from '@/lib/os-prototype/demoPack';

const KIND_ICON: Record<UniverseSignal['kind'], React.ReactNode> = {
  mail: <Mail size={13} />, calendar: <CalendarDays size={13} />, rss: <BookOpen size={13} />, nightwatch: <Radio size={13} />,
};
const KIND_LABEL: Record<UniverseSignal['kind'], string> = { mail: 'Mail', calendar: 'Termin', rss: 'Feed', nightwatch: 'MÔRA-Beobachtung' };

/** Aufgaben einer Abteilung: Name oder erstes Namenswort im Aufgabentitel (Demo-Paket). */
export function tasksFor(name: string) {
  const first = name.split(/[\s&]+/)[0];
  return DEMO_TASKS.filter((t) => t.includes(name) || (first.length > 3 && t.includes(first)));
}

/** V1.4 – Glas-Detailpanel beim Planetenfokus: Dokumente, Aufgaben, Signale, Sprung nach Wissen/Post. */
export function PlanetDetail({ territory, signals, onClose, onOpenKnowledge, onOpenPost, onAskMora }: {
  territory: OrganizationTerritory;
  signals: UniverseSignal[];
  onClose: () => void;
  onOpenKnowledge: (query: string) => void;
  onOpenPost: () => void;
  onAskMora: (text: string) => void;
}) {
  const dept = DEMO_DEPARTMENTS.find((d) => d.id === territory.id);
  const docs = dept?.folders.flatMap((f) => f.documents.map((d) => ({ ...d, folder: f.name }))) ?? [];
  const tasks = tasksFor(territory.name);
  const own = signals.filter((s) => s.targetId === territory.id);
  return (
    <aside className="os-planet-detail" data-testid="planet-detail" aria-label={`${territory.name} – Details`}
      style={{ '--planet-accent': territory.color || undefined } as React.CSSProperties}>
      <Stack direction="row" justify="space-between" align="flex-start" gap={3}>
        <Stack gap={1} className="min-w-0">
          <Stack direction="row" gap={2} align="center"><Text variant="eyebrow">Planet</Text><SampleTag /></Stack>
          <Text variant="title" as="h2">{territory.name}</Text>
          {territory.description ? <Text variant="meta">{territory.description}</Text> : null}
        </Stack>
        <button type="button" className="os-planet-detail__close" onClick={onClose} aria-label="Fokus lösen (Esc)"><X size={18} /></button>
      </Stack>

      <div className="os-planet-detail__stats">
        <span><strong>{docs.length}</strong> Dokumente</span>
        <span><strong>{tasks.length}</strong> Aufgaben</span>
        <span><strong>{own.length}</strong> Signale</span>
      </div>

      <section>
        <Stack direction="row" gap={2} align="center" className="mb-2"><FileText size={13} className="os-tone-faint" /><Text variant="eyebrow">Dokumente</Text></Stack>
        {docs.length === 0 ? <Text variant="meta">Noch keine Dokumente in diesem Bereich.</Text> : (
          <div className="os-list">{docs.map((d) => (
            <button key={d.name} type="button" className="os-list-row os-planet-detail__row" onClick={() => onOpenKnowledge(d.name)}>
              <Stack gap={0} className="min-w-0"><Text tone="default" className="truncate">{d.name}</Text><Text variant="meta" className="truncate">{d.folder} · {d.summary}</Text></Stack>
            </button>
          ))}</div>
        )}
      </section>

      <section>
        <Stack direction="row" gap={2} align="center" className="mb-2"><ListTodo size={13} className="os-tone-faint" /><Text variant="eyebrow">Aufgaben</Text></Stack>
        {tasks.length === 0 ? <Text variant="meta">Keine offenen Aufgaben zugeordnet.</Text> : (
          <div className="os-list">{tasks.map((t) => <div key={t} className="os-list-row"><Text tone="default">{t}</Text></div>)}</div>
        )}
      </section>

      <section>
        <Stack direction="row" gap={2} align="center" className="mb-2"><Inbox size={13} className="os-tone-faint" /><Text variant="eyebrow">Signale</Text></Stack>
        {own.length === 0 ? <Text variant="meta">Gerade nichts, was hereinragt.</Text> : (
          <div className="os-list">{own.map((s) => (
            <div key={s.id} className="os-list-row">
              <Stack direction="row" gap={2} align="flex-start" className="min-w-0">
                <span className="os-tone-faint mt-1" aria-hidden>{KIND_ICON[s.kind]}</span>
                <Stack gap={0} className="min-w-0"><Text tone="default">{s.title}</Text><Text variant="meta">{KIND_LABEL[s.kind]} · {s.evidence === 'assigned' ? 'belegt' : 'vermutet'} · {s.subtitle}</Text></Stack>
              </Stack>
            </div>
          ))}</div>
        )}
      </section>

      <Stack direction="row" gap={2} wrap className="os-planet-detail__actions">
        <Button size="sm" onClick={() => onOpenKnowledge(territory.name)} data-testid="planet-open-knowledge">In Wissen öffnen</Button>
        <Button size="sm" variant="ghost" onClick={onOpenPost} data-testid="planet-open-post">In Post öffnen</Button>
        <Button size="sm" variant="ghost" icon={<MoraStone size={16} halo={false} />} onClick={() => onAskMora(`Was ist in ${territory.name} gerade wichtig?`)}>MÔRA fragen</Button>
      </Stack>
    </aside>
  );
}
