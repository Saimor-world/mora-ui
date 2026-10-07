'use client';
import React, { useDeferredValue, useState } from 'react';
import { BookOpen, Brain, FileText, Folder, FolderHeart, NotebookPen, Search } from 'lucide-react';
import { Button, FailureState, Input, Loading, ResponsiveGrid, Stack, StateView, Surface, Text } from '@/components/os-kit';
import { classifyCoreFailure } from '@/lib/os-prototype/coreFailure';
import { legacyAppName, openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useSessionStore } from '@/lib/store/sessionStore';
import type { FeatureSurfaceProps } from '../types';
import { useKnowledgeSearch, useRecentMemories } from './data/useKnowledge';

export const KNOWLEDGE_SOURCES: Array<{ appId: string; icon: React.ReactNode; copy: string }> = [
  { appId: 'finder', icon: <Folder size={16} />, copy: 'Ordner, Räume und Dateien des Unternehmens.' },
  { appId: 'meine-dateien', icon: <FolderHeart size={16} />, copy: 'Deine persönlichen Dateien.' },
  { appId: 'notes', icon: <NotebookPen size={16} />, copy: 'Schnelle Notizen.' },
  { appId: 'document', icon: <FileText size={16} />, copy: 'Dokumente lesen und bearbeiten.' },
  { appId: 'search', icon: <Search size={16} />, copy: 'Erweiterte Suche mit Filtern.' },
];

export default function KnowledgeSurface({ navigate }: FeatureSurfaceProps) {
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const hasSession = useSessionStore((s) => Boolean(s.user?.tenant_id));
  const search = useKnowledgeSearch(deferred);
  const memories = useRecentMemories();

  return (
    <div className="flex flex-col gap-6" data-testid="feature-knowledge">
      <header>
        <Text variant="eyebrow">Wissen</Text>
        <Text variant="display" className="mt-2">Hier weiß SAIMÔR Dinge.</Text>
        <Text className="mt-2 max-w-2xl">Dateien, Notizen, Dokumente und das, was MÔRA sich gemerkt hat – mit einer Suche.</Text>
      </header>

      <Input label="Wissen durchsuchen" placeholder="Wonach suchst du?" value={query} onChange={(e) => setQuery(e.target.value)} />

      {search.active ? (
        <ResponsiveGrid columns={2}>
          <Surface padding={5}>
            <Text variant="eyebrow" className="mb-3">Inhalte</Text>
            {!hasSession ? <FailureState compact kind="unauthenticated" subject="/v3/search/keyword" />
              : search.keyword.isLoading ? <Loading />
              : search.keyword.isError ? <FailureState compact kind={classifyCoreFailure(search.keyword.error)} />
              : (search.keyword.data?.results.length ?? 0) === 0 ? <StateView compact kind="empty" title="Keine Treffer" copy="Ohne CORE-Antwort liefert die Suche ebenfalls keine Treffer." />
              : (
                <div className="os-list">
                  {search.keyword.data!.results.slice(0, 10).map((r: any, i: number) => (
                    <button key={r?.id || i} type="button" className="os-list-row w-full text-left" onClick={() => (r?.node_id || r?.id) && openLegacyApp('document', { nodeId: r.node_id || r.id })}>
                      <Text tone="default" className="truncate">{r?.title || r?.name || r?.filename || 'Treffer'}</Text>
                      <Text variant="meta">{r?.type || ''}</Text>
                    </button>
                  ))}
                </div>
              )}
          </Surface>
          <Surface padding={5}>
            <Text variant="eyebrow" className="mb-3">Erinnerungen</Text>
            {!hasSession ? <FailureState compact kind="unauthenticated" subject="/v3/memory/search" />
              : search.memory.isLoading ? <Loading />
              : search.memory.data === null ? <StateView compact kind="offline" />
              : (search.memory.data?.length ?? 0) === 0 ? <StateView compact kind="empty" title="Nichts erinnert" />
              : <div className="os-list">{search.memory.data!.map((m) => <div key={m.id} className="os-list-row"><Text>{m.summary}</Text></div>)}</div>}
          </Surface>
        </ResponsiveGrid>
      ) : null}

      <Surface padding={5}>
        <Stack direction="row" justify="space-between" align="center" className="mb-3">
          <Stack direction="row" gap={2} align="center"><Brain size={14} className="os-tone-faint" /><Text variant="eyebrow">Was MÔRA sich zuletzt gemerkt hat</Text></Stack>
          <Button size="sm" variant="ghost" onClick={() => navigate('mora')}>MÔRA fragen</Button>
        </Stack>
        {!hasSession ? <FailureState compact kind="unauthenticated" subject="/v3/memory/list" />
          : memories.isLoading ? <Loading />
          : memories.data === null || memories.isError ? <StateView compact kind="offline" detail="/v3/memory/list" />
          : (memories.data?.length ?? 0) === 0 ? <StateView compact kind="empty" title="Noch keine Erinnerungen" copy="MÔRA merkt sich Zusammenfassungen nach Gesprächen." />
          : <div className="os-list">{memories.data!.map((m) => <div key={m.id} className="os-list-row"><Text>{m.summary}</Text><Text variant="meta">{new Date(m.created_at).toLocaleDateString('de-DE')}</Text></div>)}</div>}
      </Surface>

      <section aria-label="Quellen">
        <Stack direction="row" gap={2} align="center" className="mb-3"><BookOpen size={14} className="os-tone-faint" /><Text variant="eyebrow">Quellen</Text></Stack>
        <ResponsiveGrid columns={3}>
          {KNOWLEDGE_SOURCES.map((s) => (
            <Surface key={s.appId} interactive padding={4} onClick={() => openLegacyApp(s.appId)} data-legacy-app={s.appId}>
              <Stack direction="row" gap={3} align="center">
                <span className="os-tone-accent" aria-hidden>{s.icon}</span>
                <Stack gap={0}><Text tone="default">{legacyAppName(s.appId)}</Text><Text variant="meta">{s.copy}</Text></Stack>
              </Stack>
            </Surface>
          ))}
        </ResponsiveGrid>
      </section>
    </div>
  );
}
