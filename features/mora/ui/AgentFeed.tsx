'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { Empty, FailureState, Loading, SampleTag, Stack, Surface, Text } from '@/components/os-kit';
import { coreGet } from '@/lib/api/http';
import { classifyCoreFailure } from '@/lib/os-prototype/coreFailure';

/**
 * V1.6 Agenten-Feed – aus Legacy `components/mora/MoraThoughtStream.tsx` (war ohne Route).
 * Quelle: `GET /v3/agency/thoughts` (Cognition-Log des Mandanten).
 * Verbessert: Liste statt rotierender Einzelzeile, React-Query-Polling (pausiert im Hintergrund-Tab),
 * ehrlicher Leerzustand statt Ausblenden, Demo-Einträge klar als „Beispiel“ markiert.
 */
export interface AgentThought { ts?: string; thought?: string; type?: string; signal_source?: string; latent_intent?: string }

const TYPE_LABEL: Record<string, string> = {
  search: 'Suche', node: 'Bereich', perception: 'Wahrnehmung', cognition: 'Überlegung', action: 'Aktion', signal: 'Signal',
};

export const DEMO_THOUGHTS: AgentThought[] = [
  { type: 'signal', signal_source: 'Wissen', thought: 'Budget-Dokument von Store San Francisco ist seit über 60 Tagen unverändert – zur Prüfung vorgemerkt.', latent_intent: 'Risiko früh zeigen' },
  { type: 'cognition', signal_source: 'Universe', thought: 'Marketing und Store Stuttgart arbeiten an überlappenden Kampagnen-Dokumenten.', latent_intent: 'Zusammenhang vorschlagen' },
  { type: 'search', signal_source: 'Suche', thought: 'Suche nach „Schichtplan“ ergab 3 Treffer in Store Stuttgart.', latent_intent: 'Kontext merken' },
  { type: 'action', signal_source: 'Post', thought: 'Antwortentwurf an den Röster vorbereitet – wartet auf deine Bestätigung.', latent_intent: 'nichts ohne Freigabe senden' },
];

export function parseThoughtTime(ts?: string): Date | null {
  if (!ts) return null;
  // CORE schreibt teils „…+00:00Z“ – das doppelte Zonen-Suffix tolerieren.
  const d = new Date(ts.replace(/(\+00:00)Z$/, '$1'));
  return Number.isNaN(d.getTime()) ? null : d;
}

function ago(d: Date | null): string {
  if (!d) return '';
  const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  return m < 1 ? 'gerade eben' : m < 60 ? `vor ${m} min` : m < 1440 ? `vor ${Math.round(m / 60)} h` : d.toLocaleDateString('de-DE');
}

export function AgentFeed({ live, demo, limit = 8, compact = false }: { live: boolean; demo: boolean; limit?: number; compact?: boolean }) {
  const q = useQuery({
    queryKey: ['os', 'agency-thoughts', limit],
    queryFn: async () => ((await coreGet(`/v3/agency/thoughts?limit=${limit}`, { throwAuthErrors: true })) as { thoughts?: AgentThought[] } | null)?.thoughts || [],
    enabled: live,
    refetchInterval: 30_000,
    retry: false,
  });
  const items = live ? (q.data || []) : demo ? DEMO_THOUGHTS.slice(0, limit) : [];
  const sample = !live && demo;

  const body = live && q.isLoading ? <Loading lines={2} />
    : live && q.isError ? <FailureState kind={classifyCoreFailure(q.error)} compact subject="/v3/agency/thoughts" />
    : !items.length ? <Empty compact title={live ? 'Noch keine Agenten-Aktivität' : 'Agenten-Feed braucht eine CORE-Sitzung'} copy={live ? 'Sobald MÔRA sucht, Bereiche liest oder Signale erkennt, erscheint es hier – mit Quelle und Zeit.' : 'Ohne Sitzung zeigt SAIMÔR keine Aktivität an.'} />
    : (
      <ol className="os-agent-feed" data-testid="agent-feed-list">
        {items.map((t, i) => {
          const d = parseThoughtTime(t.ts);
          return (
            <li key={`${t.ts || 'demo'}-${i}`} className="os-agent-feed__item">
              <span className="os-agent-feed__dot" aria-hidden />
              <div className="min-w-0">
                <Text variant="meta">{[TYPE_LABEL[t.type || ''] || t.type || 'Aktivität', t.signal_source, sample ? null : ago(d)].filter(Boolean).join(' · ')}</Text>
                <Text tone="default" className={compact ? 'truncate' : undefined}>{t.thought || '—'}</Text>
                {!compact && t.latent_intent ? <Text variant="meta">Absicht: {t.latent_intent}</Text> : null}
              </div>
            </li>
          );
        })}
      </ol>
    );

  return (
    <Surface padding={compact ? 4 : 5} data-testid="agent-feed" data-live={live || undefined}>
      <Stack direction="row" align="center" justify="space-between" className="mb-3">
        <Stack direction="row" gap={2} align="center"><Activity size={14} className="os-tone-accent" aria-hidden /><Text variant="eyebrow">Woran MÔRA gerade arbeitet</Text></Stack>
        {sample ? <SampleTag /> : null}
      </Stack>
      {body}
    </Surface>
  );
}
