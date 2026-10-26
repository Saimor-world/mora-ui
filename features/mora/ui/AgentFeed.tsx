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
  search: 'Suche', user_interaction: 'Anfrage', node: 'Bereich', perception: 'Wahrnehmung', cognition: 'Überlegung', action: 'Aktion', signal: 'Signal',
};

const SOURCE_LABEL: Record<string, string> = { search_cortex: 'Suche', node_cortex: 'Bereiche', agency: 'Agent' };

const INTENT_LABEL: Record<string, string> = { information_retrieval: 'Information finden' };

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

/** CORE protokolliert teils englisch („Scanning index for exact match“). Kund:innen sehen deutsche Sätze. */
const THOUGHT_DE: Array<[RegExp, string]> = [
  [/scann?ing index|exact match|searching/i, 'Hat für dich in deinen Bereichen nach dem passenden Eintrag gesucht.'],
  [/reading|parsing|ingest/i, 'Liest neue Einträge ein.'],
  [/detect|signal/i, 'Hat ein neues Signal erkannt.'],
  [/summari[sz]/i, 'Fasst zusammen, was sich verändert hat.'],
];
export function thoughtDe(text?: string | null): string {
  if (!text) return '—';
  if (/[äöüß]|\b(der|die|das|und|ist|nicht|ein|eine)\b/i.test(text)) return text;
  if (!/\b(the|for|ing|and|of|to|with|index|match)\b|ing\b/i.test(text)) return text;
  return THOUGHT_DE.find(([re]) => re.test(text))?.[1] ?? 'Arbeitet im Hintergrund an deinen Daten.';
}

function ago(d: Date | null): string {
  if (!d) return '';
  const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  return m < 1 ? 'gerade eben' : m < 60 ? `vor ${m} min` : m < 1440 ? `vor ${Math.round(m / 60)} h` : d.toLocaleDateString('de-DE');
}

export function AgentFeed({ live, demo, limit = 8, compact = false, hideWhenEmpty = false }: { live: boolean; demo: boolean; limit?: number; compact?: boolean; hideWhenEmpty?: boolean }) {
  const q = useQuery({
    queryKey: ['os', 'agency-thoughts', limit],
    queryFn: async () => ((await coreGet(`/v3/agency/thoughts?limit=${limit}`, { throwAuthErrors: true })) as { thoughts?: AgentThought[] } | null)?.thoughts || [],
    enabled: live,
    refetchInterval: 30_000,
    retry: false,
  });
  const items = live ? (q.data || []) : demo ? DEMO_THOUGHTS.slice(0, limit) : [];
  const sample = !live && demo;
  // Heute zeigt den Feed nur mit echtem Inhalt; leer/Fehler fasst die Statuszeile zusammen.
  if (hideWhenEmpty && (live ? q.isLoading || q.isError || !items.length : !items.length)) return null;

  const body = live && q.isLoading ? <Loading lines={2} />
    : live && q.isError ? <FailureState kind={classifyCoreFailure(q.error)} compact subject="/v3/agency/thoughts" />
    : !items.length ? <Empty compact title={live ? 'Noch keine Agenten-Aktivität' : 'Agenten-Feed braucht eine CORE-Sitzung'} copy={live ? 'Sobald MÔRA sucht, Bereiche liest oder Signale erkennt, erscheint es hier – mit Quelle und Zeit.' : 'Ohne Sitzung zeigt SAIMÔR keine Aktivität an.'} />
    : (
      <ol className="os-agent-feed" data-testid="agent-feed-list">
        {groupThoughts(items).map((g, i) => {
          const d = parseThoughtTime(g.last.ts);
          const label = TYPE_LABEL[g.last.type || ''] || g.last.type || 'Aktivität';
          const head = g.count > 1 ? `${g.count} ${PLURAL[label] || label}` : label;
          const when = sample ? null : g.count > 1 ? `zuletzt ${ago(d)}` : ago(d);
          return (
            <li key={`${g.last.ts || 'demo'}-${i}`} className="os-agent-feed__item" data-count={g.count}>
              <span className="os-agent-feed__dot" aria-hidden />
              <div className="min-w-0">
                <Text variant="meta">{[head, SOURCE_LABEL[g.last.signal_source || ''] || null, when].filter(Boolean).join(' · ')}</Text>
                <Text tone="default" className={compact ? 'truncate' : undefined}>{g.text}</Text>
                {!compact && g.last.latent_intent ? <Text variant="meta">Absicht: {INTENT_LABEL[g.last.latent_intent] || g.last.latent_intent}</Text> : null}
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

const PLURAL: Record<string, string> = { Anfrage: 'Anfragen', Suche: 'Suchen', Aktion: 'Aktionen', Signal: 'Signale', Bereich: 'Bereiche', Wahrnehmung: 'Wahrnehmungen', 'Überlegung': 'Überlegungen', 'Aktivität': 'Aktivitäten' };

/** Gleiche Gedanken (gleicher Typ, gleicher Text) zu einer Zeile bündeln, neuester zuerst. */
export function groupThoughts(items: AgentThought[]): { text: string; count: number; last: AgentThought }[] {
  const out: { text: string; count: number; last: AgentThought }[] = [];
  for (const t of items) {
    const text = thoughtDe(t.thought);
    const hit = out.find((g) => g.text === text && (g.last.type || '') === (t.type || ''));
    if (hit) { hit.count += 1; if (String(t.ts || '') > String(hit.last.ts || '')) hit.last = t; }
    else out.push({ text, count: 1, last: t });
  }
  return out;
}
