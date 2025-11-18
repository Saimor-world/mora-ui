'use client';

import PanelCard from '@/components/ui/PanelCard';
import type { MindloopItem, MindloopSynthesisSummary } from '@/lib/api/mindloop';

export type DerivedSignalHint = {
  id: string;
  text: string;
  targets?: string[];
  tone: 'theme' | 'anomaly' | 'opportunity';
};

interface SignalCardProps {
  items: MindloopItem[];
  summary?: MindloopSynthesisSummary;
  isLoading?: boolean;
  onNavigateToTargets?: (targetIds?: string[], contextLabel?: string) => void;
}

const HINT_LIMIT = 3;

// UI-only helper that clusters signals into calm, actionable hints.
export function deriveMindloopHints(items: MindloopItem[]): DerivedSignalHint[] {
  const hints: DerivedSignalHint[] = [];
  const targetsOf = (item: MindloopItem) => {
    const ids = [
      ...(item.entity_id ? [item.entity_id] : []),
      ...(Array.isArray(item.related_ids) ? item.related_ids : []),
    ];
    if (!ids.length) ids.push(item.id);
    return Array.from(new Set(ids));
  };

  const tagCounts = items.reduce<Record<string, { count: number; targets: string[] }>>((acc, item) => {
    (item.tags || []).forEach((tag) => {
      if (!acc[tag]) acc[tag] = { count: 0, targets: [] };
      acc[tag].count += 1;
      acc[tag].targets.push(...targetsOf(item));
    });
    return acc;
  }, {});
  const topTag = Object.entries(tagCounts).sort((a, b) => b[1].count - a[1].count)[0];
  if (topTag && topTag[1].count >= 2) {
    hints.push({
      id: `theme-${topTag[0]}`,
      text: `Mora bemerkt mehr Resonanz zu ${topTag[0]} - Feld oeffnen.`,
      targets: Array.from(new Set(topTag[1].targets)),
      tone: 'theme',
    });
  }

  const anomaly = items.find(
    (item) => item.type === 'anomaly' || (typeof item.severity === 'number' && item.severity > 0.8)
  );
  if (anomaly) {
    hints.push({
      id: `anomaly-${anomaly.id}`,
      text: 'Ungewoehnliche Bewegung - sanft im Feld pruefen.',
      targets: targetsOf(anomaly),
      tone: 'anomaly',
    });
  }

  const opportunity =
    items.find((item) => item.type === 'opportunity') ||
    items.find((item) => item.type === 'semantic' || item.type === 'awareness');
  if (opportunity) {
    hints.push({
      id: `opportunity-${opportunity.id}`,
      text: 'Verbindungen lassen sich staerken - verknuepfte Objekte ansehen.',
      targets: targetsOf(opportunity),
      tone: 'opportunity',
    });
  }

  return hints.slice(0, HINT_LIMIT);
}

export default function SignalCard({ items, summary, isLoading, onNavigateToTargets }: SignalCardProps) {
  const total = summary?.total ?? items.length;
  const highest = summary?.highest_severity ?? Math.max(0, ...items.map((item) => item.severity ?? 0));

  if (isLoading) {
    return (
      <PanelCard className="shadow-xl mora-depth-md bg-card/90 border border-border/70" paddingClassName="p-6 lg:p-7">
        <p className="text-sm text-muted-foreground">Mind Loop wird geladen ...</p>
      </PanelCard>
    );
  }

  const breakdown = buildBreakdown(items, summary?.breakdown);
  const strongestLabel = highest >= 0.8 ? 'deutlich' : highest >= 0.55 ? 'spuerbar' : 'sanft';
  const derivedHints = deriveMindloopHints(items);

  return (
    <PanelCard className="shadow-xl mora-depth-md bg-card/90 border border-border/70" paddingClassName="p-6 lg:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">Signalstrang</p>
          <h3 className="text-xl font-semibold text-foreground">Mind Loop Synthese</h3>
          <p className="text-sm text-muted-foreground max-w-xl">
            Zusammengefasste Impulse aus Semantic, Awareness und System. Demo-freundlich, defensiv und ohne Live-Versprechen.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateToTargets?.(derivedHints[0]?.targets, derivedHints[0]?.text)}
          className="px-3 py-2 rounded-2xl bg-emerald-900/60 border border-emerald-500/40 text-emerald-100 text-xs font-semibold mora-transition hover:bg-emerald-900/80"
        >
          {total} Signale
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metric label="Staerkste Intensitaet" value={`${Math.round(highest * 100)}%`} hint={strongestLabel} />
        <Metric
          label="Typen"
          value={
            Object.keys(breakdown).length > 0
              ? Object.keys(breakdown)
                  .map((key) => `${key}: ${breakdown[key]}`)
                  .join(' \u2022 ')
              : 'Keine'
          }
          hint="semantic / awareness / system"
        />
        <Metric label="Frische" value="Regelmaessige Aktualisierung" hint="Mock-freundlich, kein Echtzeit-Versprechen" />
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Hinweise</p>
        {derivedHints.length > 0 ? (
          <ul className="space-y-2">
            {derivedHints.map((hint) => (
              <li key={hint.id}>
                <button
                  type="button"
                  onClick={() => onNavigateToTargets?.(hint.targets, hint.text)}
                  className="w-full text-left px-3 py-2 rounded-xl bg-background/70 border border-border/60 mora-transition hover:border-primary/50 hover:bg-primary/5 text-sm flex items-start gap-2"
                >
                  <span aria-hidden="true">{iconForTone(hint.tone)}</span>
                  <span className="text-foreground">{hint.text}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Noch keine aktuellen Signale.</p>
        )}
      </div>
    </PanelCard>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="p-4 rounded-xl bg-background/60 border border-border/60 flex flex-col gap-1 mora-transition hover:border-primary/40">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function buildBreakdown(items: MindloopItem[], fromSummary?: Record<string, number>) {
  if (fromSummary && Object.keys(fromSummary).length > 0) return fromSummary;
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = item.type || 'unbekannt';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function iconForTone(tone: DerivedSignalHint['tone']) {
  switch (tone) {
    case 'anomaly':
      return '⚠';
    case 'opportunity':
      return '✨';
    default:
      return '🌿';
  }
}
