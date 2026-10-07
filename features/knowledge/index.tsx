'use client';
import React, { useDeferredValue, useState } from 'react';
import { BookOpen, Brain, FileText, Folder, FolderHeart, NotebookPen, Search } from 'lucide-react';
import { Button, SampleTag, FailureState, Input, Loading, ResponsiveGrid, Stack, StateView, Surface, Text } from '@/components/os-kit';
import { classifyCoreFailure } from '@/lib/os-prototype/coreFailure';
import { legacyAppName, openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useSessionStore } from '@/lib/store/sessionStore';
import type { FeatureSurfaceProps } from '../types';
import { useKnowledgeSearch, useRecentMemories } from './data/useKnowledge';
import { DEMO_COMPANY_NAME, DEMO_MINDLOOP, demoAllDocuments } from '@/lib/os-prototype/demoPack';

export const KNOWLEDGE_SOURCES: Array<{ appId: string; icon: React.ReactNode; copy: string }> = [
  { appId: 'finder', icon: <Folder size={16} />, copy: 'Ordner, Räume und Dateien des Unternehmens.' },
  { appId: 'meine-dateien', icon: <FolderHeart size={16} />, copy: 'Deine persönlichen Dateien.' },
  { appId: 'notes', icon: <NotebookPen size={16} />, copy: 'Schnelle Notizen.' },
  { appId: 'document', icon: <FileText size={16} />, copy: 'Dokumente lesen und bearbeiten.' },
  { appId: 'search', icon: <Search size={16} />, copy: 'Erweiterte Suche mit Filtern.' },
];

export default function KnowledgeSurface({ navigate, preview }: FeatureSurfaceProps) {
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const hasSession = useSessionStore((s) => Boolean(s.user?.tenant_id));
  const search = useKnowledgeSearch(deferred);
  const memories = useRecentMemories();
  const sample = Boolean(preview) && !hasSession;
  const demoDocs = demoAllDocuments();
  const q = deferred.trim().toLowerCase();
  const demoHits = q ? demoDocs.filter((d) => `${d.name} ${d.summary} ${d.department} ${d.folder} ${d.tags.join(' ')}`.toLowerCase().includes(q)) : demoDocs;

  return (
    <div className="flex flex-col gap-6" data-testid="feature-knowledge">
      <header>
        <Stack direction="row" gap={3} align="center"><Text variant="eyebrow">Wissen</Text>{sample ? <SampleTag /> : null}</Stack>
        <Text variant="display" className="mt-2">Hier weiß SAIMÔR Dinge.</Text>
        <Text className="mt-2 max-w-2xl">Dateien, Notizen, Dokumente und das, was MÔRA sich gemerkt hat – mit einer Suche.</Text>
      </header>

      <Input label="Wissen durchsuchen" placeholder="Wonach suchst du?" value={query} onChange={(e) => setQuery(e.target.value)} />

      {search.active && !sample ? (
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

      {sample ? (
        <ResponsiveGrid columns={2}>
          <Surface padding={5} data-testid="knowledge-demo-docs">
            <Stack direction="row" justify="space-between" align="center" className="mb-3"><Text variant="eyebrow">{q ? `Treffer in ${DEMO_COMPANY_NAME}` : `Dokumente · ${DEMO_COMPANY_NAME}`}</Text><SampleTag /></Stack>
            {demoHits.length === 0 ? <StateView compact kind="empty" title="Keine Treffer im Beispiel" /> : (
              <div className="os-list">
                {demoHits.slice(0, 10).map((d) => (
                  <div key={d.name} className="os-list-row"><Stack gap={0} className="min-w-0"><Text tone="default" className="truncate">{d.name}</Text><Text variant="meta" className="truncate">{d.summary}</Text></Stack><Text variant="meta">{d.department}</Text></div>
                ))}
              </div>
            )}
          </Surface>
          <Surface padding={5} data-testid="knowledge-demo-mora">
            <Stack direction="row" justify="space-between" align="center" className="mb-3"><Stack direction="row" gap={2} align="center"><Brain size={14} className="os-tone-faint" /><Text variant="eyebrow">Was MÔRA bemerkt hat</Text></Stack><SampleTag /></Stack>
            <div className="os-list">{DEMO_MINDLOOP.map((m) => <div key={m.id} className="os-list-row"><Stack gap={0} className="min-w-0"><Text tone="default">{m.title.replace(/^Môra:\s*/, '')}</Text><Text variant="meta">{m.message}</Text></Stack><Text variant="meta">vor {m.hoursAgo} h</Text></div>)}</div>
          </Surface>
        </ResponsiveGrid>
      ) : null}

      {!sample ? <Surface padding={5}>
        <Stack direction="row" justify="space-between" align="center" className="mb-3">
          <Stack direction="row" gap={2} align="center"><Brain size={14} className="os-tone-faint" /><Text variant="eyebrow">Was MÔRA sich zuletzt gemerkt hat</Text></Stack>
          <Button size="sm" variant="ghost" onClick={() => navigate('mora')}>MÔRA fragen</Button>
        </Stack>
        {!hasSession ? <FailureState compact kind="unauthenticated" subject="/v3/memory/list" />
          : memories.isLoading ? <Loading />
          : memories.data === null || memories.isError ? <StateView compact kind="offline" detail="/v3/memory/list" />
          : (memories.data?.length ?? 0) === 0 ? <StateView compact kind="empty" title="Noch keine Erinnerungen" copy="MÔRA merkt sich Zusammenfassungen nach Gesprächen." />
          : <div className="os-list">{memories.data!.map((m) => <div key={m.id} className="os-list-row"><Text>{m.summary}</Text><Text variant="meta">{new Date(m.created_at).toLocaleDateString('de-DE')}</Text></div>)}</div>}
      </Surface> : null}

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
