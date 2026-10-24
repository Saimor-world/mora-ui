'use client';
import { useWorld } from '@/lib/lea/useWorld';
import { useUniverseFocus } from '@/lib/lea/universeFocus';
import type { Star } from '@/lib/lea/finder';
import React, { useDeferredValue, useMemo, useState } from 'react';
import { BookOpen, Brain, Folder, FolderHeart, NotebookPen } from 'lucide-react';
import { Button, SampleTag, FailureState, Input, Loading, ResponsiveGrid, Stack, StateView, Surface, Text } from '@/components/os-kit';
import { classifyCoreFailure } from '@/lib/os-prototype/coreFailure';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import type { FeatureSurfaceProps } from '../types';
import { useKnowledgeSearch, useRecentMemories } from './data/useKnowledge';

export const KNOWLEDGE_SOURCES: Array<{ appId: string; icon: React.ReactNode; title: string; copy: string }> = [
  { appId: 'finder', icon: <Folder size={16} />, title: 'Studio-Ordner', copy: 'Was das ganze Studio teilt – nach Bereichen geordnet.' },
  { appId: 'meine-dateien', icon: <FolderHeart size={16} />, title: 'Deine Ablage', copy: 'Was nur du siehst.' },
  { appId: 'notes', icon: <NotebookPen size={16} />, title: 'Notizen', copy: 'Kurz festgehalten, z. B. nach einem Termin.' },
];

export default function KnowledgeSurface({ navigate, preview }: FeatureSurfaceProps) {
  const [query, setQuery] = useState(() => {
    const q = useOsShellStore.getState().knowledgeQuery;
    if (q) useOsShellStore.getState().setKnowledgeQuery(null);
    return q ?? '';
  });
  const deferred = useDeferredValue(query);
  const hasSession = useSessionStore((s) => Boolean(s.user?.tenant_id));
  const search = useKnowledgeSearch(deferred);
  const memories = useRecentMemories();
  const sample = Boolean(preview) && !hasSession;
  const world = useWorld();
  const showInUniverse = useUniverseFocus((s) => s.show);
  const worldDocs = useMemo(() => {
    const needle = deferred.trim().toLowerCase();
    const out: { planetId: string; planetName: string; moonId: string; moonName: string; star: Star }[] = [];
    for (const pl of world.finder) for (const m of pl.moons) for (const st of m.stars) {
      if (st.kind === 'task' || st.kind === 'event') continue;
      if (needle && !`${st.name} ${m.name} ${pl.name}`.toLowerCase().includes(needle)) continue;
      out.push({ planetId: pl.id, planetName: pl.name, moonId: m.id, moonName: m.name, star: st });
    }
    return out;
  }, [world.finder, deferred]);
  const q = deferred.trim().toLowerCase();

  return (
    <div className="flex flex-col gap-6" data-testid="feature-knowledge">
      <header>
        <Stack direction="row" gap={3} align="center"><Text variant="eyebrow">Wissen</Text>{sample ? <SampleTag /> : null}</Stack>
        <Text variant="display" className="mt-2">Was dein Studio weiß.</Text>
        <Text className="mt-2 max-w-2xl">Dateien, Notizen, Dokumente und das, was MÔRA sich gemerkt hat – mit einer Suche.</Text>
      </header>

      <Input label="Wissen durchsuchen" placeholder="Wonach suchst du?" value={query} onChange={(e) => setQuery(e.target.value)} />

      {!sample && worldDocs.length ? (
        <Surface padding={5} data-testid="knowledge-world-docs">
          <Text variant="eyebrow" className="mb-1">In deinen Bereichen</Text>
          <Text variant="meta" className="mb-3">Antippen zeigt das Dokument als Stern im Universe.</Text>
          <div className="os-list">
            {worldDocs.slice(0, 8).map((d) => (
              <button key={d.star.id} type="button" className="os-list-row w-full text-left" data-testid={`knowledge-doc-${d.star.id}`}
                onClick={() => { showInUniverse({ planetId: d.planetId, moonId: d.moonId, starId: d.star.id }); navigate('universe'); }}>
                <Text tone="default" className="truncate">{d.star.name}</Text>
                <Text variant="meta">{d.planetName} · {d.moonName}</Text>
              </button>
            ))}
          </div>
        </Surface>
      ) : !sample && world.enabled && !world.loading && !deferred.trim() ? (
        <Surface padding={5} data-testid="knowledge-world-empty">
          <Text variant="eyebrow" className="mb-1">In deinen Bereichen</Text>
          <Text tone="default">Noch keine Dokumente oder Notizen in deinen Bereichen.</Text>
          <Text variant="meta" className="mt-1">Im Universe legst du sie direkt in einem Ordner an – dann findest du sie hier und als Stern.</Text>
          <Button size="sm" variant="ghost" className="mt-3" onClick={() => navigate('universe')}>Zum Universe</Button>
        </Surface>
      ) : null}

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

      {!sample ? <Surface padding={5}>
        <Stack direction="row" justify="space-between" align="center" className="mb-3">
          <Stack direction="row" gap={2} align="center"><Brain size={14} className="os-tone-faint" /><Text variant="eyebrow">Was MÔRA sich zuletzt gemerkt hat</Text></Stack>
          <Button size="sm" variant="ghost" onClick={() => navigate('mora')}>MÔRA fragen</Button>
        </Stack>
        {!hasSession ? <FailureState compact kind="unauthenticated" subject="/v3/memory/list" />
          : memories.isLoading ? <Loading />
          // Leere Antwort = Funktion fehlt im CORE, nicht „keine Verbindung“; echte Fehler werden eingeordnet.
          : memories.isError ? <FailureState compact kind={classifyCoreFailure(memories.error)} subject="/v3/memory/list" />
          : memories.data === null ? <FailureState compact kind="contract_missing" subject="/v3/memory/list" />
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
                <Stack gap={0}><Text tone="default">{s.title}</Text><Text variant="meta">{s.copy}</Text></Stack>
              </Stack>
            </Surface>
          ))}
        </ResponsiveGrid>
      </section>
    </div>
  );
}
