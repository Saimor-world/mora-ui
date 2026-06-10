'use client';

import React from 'react';
import { ArrowRight, Compass, Network, Plug, ShieldCheck } from 'lucide-react';
import type { PaneOpenRequest } from '@/lib/store/paneStore';
import type { IncidentStatusPanel as IncidentStatusPanelData } from '@/lib/panel/types';
import type { ConnectorStatus, OpenFlowLagebild as Lagebild, OpenFlowSignal } from '@/lib/openflow/types';
import { TONES, toneForPriority } from '@/lib/ui/status';
import { IncidentStatusPanel } from '@/components/home/IncidentStatusPanel';

interface OpenFlowLagebildProps {
  view: Lagebild;
  onOpenPane: (request: PaneOpenRequest) => void;
  onGoExplore: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
  mail: 'Mail',
  calendar: 'Kalender',
  cloud: 'Cloud',
  feed: 'Feed',
  crm: 'CRM',
  erp: 'ERP',
  server: 'Server',
  git: 'Git',
  manual: 'Manuell',
  os: 'OS',
};

function paneTitle(type: string) {
  switch (type) {
    case 'mail':
      return 'Mail';
    case 'calendar':
      return 'Kalender';
    case 'chat':
      return 'MORA';
    case 'meine-dateien':
      return 'Meine Dateien';
    case 'integrations':
      return 'Integrationen';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function paneSize(type: string) {
  switch (type) {
    case 'mail':
      return { width: 960, height: 680 };
    case 'calendar':
      return { width: 840, height: 620 };
    case 'chat':
      return { width: 860, height: 680 };
    case 'meine-dateien':
      return { width: 680, height: 560 };
    case 'integrations':
      return { width: 860, height: 680 };
    default:
      return { width: 860, height: 640 };
  }
}

function openActionPane(action: OpenFlowSignal['suggestedActions'][number], onOpenPane: OpenFlowLagebildProps['onOpenPane']) {
  if (!action.paneType) return;

  onOpenPane({
    id: `${action.paneType}-main`,
    type: action.paneType as PaneOpenRequest['type'],
    title: paneTitle(action.paneType),
    size: paneSize(action.paneType),
    data: action.paneData || {},
  });
}

function SignalCard({ signal, onOpenPane }: { signal: OpenFlowSignal; onOpenPane: OpenFlowLagebildProps['onOpenPane'] }) {
  const action = signal.suggestedActions[0];
  const isHot = signal.priority === 'urgent' || signal.priority === 'high';
  const HOT_TONE = TONES[toneForPriority(signal.priority)];
  const HOT_TONE_BG = HOT_TONE.bg;

  return (
    <article className="rounded-lg border border-white/[0.07] bg-white/[0.035] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-cyan-100/45">
            <span>{SOURCE_LABEL[signal.source] || signal.source}</span>
            <span className="h-1 w-1 rounded-full bg-white/25" />
            <span>{signal.trustScope}</span>
          </div>
          <h3 className="text-sm font-medium text-white/90">{signal.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/52">{signal.summary}</p>
        </div>
        <span
          className={
            isHot
              ? `rounded-full border px-2 py-1 text-[10px] font-semibold ${HOT_TONE.border} ${HOT_TONE_BG} ${HOT_TONE.text}`
              : 'rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-white/48'
          }
        >
          {signal.priority}
        </span>
      </div>

      {action ? (
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/62 transition-colors hover:bg-white/[0.07] hover:text-white/82"
          onClick={() => openActionPane(action, onOpenPane)}
        >
          {action.label}
          <ArrowRight size={13} />
        </button>
      ) : null}
    </article>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-sm leading-relaxed text-white/42">
      {children}
    </div>
  );
}

function isVisibleIncidentPanel(panel: IncidentStatusPanelData): boolean {
  return Boolean(
    panel.type === 'incident_status'
    && panel.state === 'verified'
    && panel.source === 'nightwatch'
    && panel.source_type === 'nightwatch.incident'
    && panel.evidence?.length
    && panel.evidence.every((item) => item.source && item.source_type && item.reason)
  );
}

function connectorCopy(connector: ConnectorStatus) {
  if (connector.status === 'connected' || connector.status === 'local') {
    return {
      state: connector.status === 'local' ? 'lokal bereit' : 'liest Signale',
      detail: connector.status === 'local'
        ? 'Lokale OS-Brücke ist aktiv. Sie liefert nur verdichtete Signale.'
        : 'Diese Quelle liefert belegte Signale.',
    };
  }

  return {
    state: 'Setup offen',
    detail: 'Diese Quelle ist noch nicht belegbar verbunden.',
  };
}

function ConnectorPill({ connector }: { connector: ConnectorStatus }) {
  const good = connector.status === 'connected' || connector.status === 'local';
  const copy = connectorCopy(connector);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/12 px-3 py-2" title={copy.detail}>
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="text-xs font-medium text-white/75">{connector.label}</span>
        <span className="truncate text-[10px] uppercase tracking-[0.12em] text-white/34">{copy.state}</span>
      </div>
      <span className={good ? 'h-2 w-2 shrink-0 rounded-full bg-emerald-300' : 'h-2 w-2 shrink-0 rounded-full bg-amber-300'} />
    </div>
  );
}

function HeadlineHero({
  signal,
  onOpenPane,
}: {
  signal: OpenFlowSignal | null;
  onOpenPane: OpenFlowLagebildProps['onOpenPane'];
}) {
  // Calm state — nothing needs the operator right now.
  if (!signal) {
    const calm = TONES.success;
    const CalmIcon = calm.icon;
    return (
      <div className={`flex items-center gap-3 rounded-2xl border ${calm.border} ${calm.bg} px-5 py-5`}>
        <CalmIcon size={20} className={calm.text} />
        <div>
          <div className="text-base font-medium text-white/88">Alles ruhig</div>
          <div className="text-sm text-white/50">Keine kritischen Signale. MÔRA beobachtet weiter.</div>
        </div>
      </div>
    );
  }

  const tone = TONES[toneForPriority(signal.priority)];
  const Icon = tone.icon;
  const action = signal.suggestedActions[0];

  return (
    <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-5`}>
      <div className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/45">
        <Icon size={14} className={tone.text} />
        Jetzt wichtig · {SOURCE_LABEL[signal.source] || signal.source}
      </div>
      <h2 className="text-xl font-light leading-snug text-white">{signal.title}</h2>
      {signal.summary ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/60">{signal.summary}</p> : null}
      {action ? (
        <button
          type="button"
          className={`mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm ${tone.border} ${tone.bg} ${tone.text} transition-colors hover:brightness-125`}
          onClick={() => openActionPane(action, onOpenPane)}
        >
          {action.label}
          <ArrowRight size={14} />
        </button>
      ) : null}
    </div>
  );
}

function MoraOrientation({
  headline,
  attentionCount,
  nextStepsCount,
  nextStepsUnknown,
  runtimeUnknown,
  connectorHandshakeUnknown,
}: {
  headline: OpenFlowSignal | null;
  attentionCount: number;
  nextStepsCount: number;
  nextStepsUnknown: boolean;
  runtimeUnknown: boolean;
  connectorHandshakeUnknown: boolean;
}) {
  let text = 'Keine kritischen Signale. Home zeigt nur belegte Zustände.';

  if (headline) {
    text = headline.source === 'server'
      ? 'Ein Infrastruktur-Signal ist offen. Prüfe den belegten Vorfall, bevor du weitere Aktionen ableitest.'
      : `${headline.title} ist gerade die wichtigste belegte Lage.`;
  } else if (attentionCount > 0) {
    text = `${attentionCount} Signal${attentionCount === 1 ? '' : 'e'} braucht Aufmerksamkeit.`;
  } else if (nextStepsUnknown || runtimeUnknown || connectorHandshakeUnknown) {
    text = 'Einige Zustände sind noch unbekannt. Home zeigt sie nicht als Wahrheit.';
  } else if (nextStepsCount > 0) {
    text =
      nextStepsCount === 1
        ? 'Ein belegter nächster Schritt wartet.'
        : `${nextStepsCount} belegte nächste Schritte warten.`;
  }

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/38">
        <Compass size={13} className="text-cyan-100/50" />
        MÔRA Orientierung
      </div>
      <p className="text-sm leading-relaxed text-white/66">{text}</p>
    </section>
  );
}

export function OpenFlowLagebild({ view, onOpenPane, onGoExplore }: OpenFlowLagebildProps) {
  // The headline is shown once, big. Everything below excludes it (and attention
  // is not repeated inside "changed") — one signal, one place.
  const headlineId = view.headline?.id;
  const attention = view.attention.filter((s) => s.id !== headlineId).slice(0, 3);
  const attentionIds = new Set(attention.map((s) => s.id));
  const changed = view.changed
    .filter((s) => s.id !== headlineId && !attentionIds.has(s.id))
    .slice(0, 3);
  const nextSteps = view.nextSteps.filter((s) => s.id !== headlineId).slice(0, 2);
  const incidentPanels = view.panels?.incidentStatus?.slice(0, 2) ?? [];
  const visibleIncidentPanels = incidentPanels.filter(isVisibleIncidentPanel);
  const hiddenPlaceholders = view.truthState?.hiddenPlaceholders ?? [];
  const runtimeUnknown = Boolean(view.truthState?.runtimeUnknown);
  const connectorHandshakeUnknown = Boolean(view.truthState?.connectorHandshakeUnknown);
  const nextStepsUnknown = Boolean(view.truthState?.nextStepsUnknown);
  const hideRuntimePlaceholder = hiddenPlaceholders.includes('OpenClaw Infrastruktur');
  const actionItems = nextSteps.slice(0, 2);
  const signalItems = [...attention, ...changed].slice(0, 4);

  return (
    <section
      data-testid="openflow-lagebild"
      className="relative mx-auto flex min-h-full w-full max-w-[1180px] flex-col gap-4 px-1 pb-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="max-w-3xl text-2xl font-light text-white">
            Lagebild
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/58">
            Aktuelle belegte Signale, ruhig sortiert.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoExplore}
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white/62 hover:bg-white/[0.07] hover:text-white/82"
        >
          <Network size={16} />
          Karte öffnen
        </button>
      </div>

      <HeadlineHero signal={view.headline} onOpenPane={onOpenPane} />

      <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="grid gap-4">
          <MoraOrientation
            headline={view.headline}
            attentionCount={attention.length}
            nextStepsCount={actionItems.length}
            nextStepsUnknown={nextStepsUnknown}
            runtimeUnknown={runtimeUnknown || hideRuntimePlaceholder}
            connectorHandshakeUnknown={connectorHandshakeUnknown}
          />

          <section className="rounded-xl border border-white/[0.07] bg-black/18 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/78">
              <ShieldCheck size={16} className="text-cyan-100/58" />
              Belegte Signale
            </div>
            <div className="grid gap-3">
              {visibleIncidentPanels.map((panel) => (
                <IncidentStatusPanel key={panel.id} panel={panel} />
              ))}
              {signalItems.length > 0 ? (
                signalItems.map((item) => <SignalCard key={item.id} signal={item} onOpenPane={onOpenPane} />)
              ) : visibleIncidentPanels.length > 0 ? null : (
                <EmptyState>Keine belegten Signale mit Handlungsdruck.</EmptyState>
              )}
            </div>
          </section>
        </main>

        <aside className="grid content-start gap-4">
          {actionItems.length > 0 && (
            <section className="rounded-xl border border-white/[0.07] bg-black/16 p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/78">
                <Compass size={16} className="text-cyan-100/58" />
                MÔRA
              </div>
              <div className="grid gap-3">
                {actionItems.map((item) => <SignalCard key={item.id} signal={item} onOpenPane={onOpenPane} />)}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-white/[0.07] bg-black/16 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/78">
              <Plug size={16} className="text-white/46" />
              System
            </div>
            {connectorHandshakeUnknown ? (
              <div className="mb-3 rounded-lg border border-amber-200/10 bg-amber-300/[0.04] px-3 py-2 text-xs text-amber-50/54">
                Setup-Zustand nicht belegbar.
              </div>
            ) : null}
            <div className="grid gap-2">
              {view.connectors.map((connector) => <ConnectorPill key={connector.id} connector={connector} />)}
            </div>
            <button
              type="button"
              onClick={() => onOpenPane({ id: 'settings-main', type: 'integrations', title: 'Integrationen', size: { width: 860, height: 680 } })}
              className="mt-3 inline-flex items-center gap-2 text-[11px] text-white/34 transition-colors hover:text-white/58"
            >
              <ArrowRight size={11} />
              Integrationen einrichten
            </button>
          </section>
        </aside>
      </div>

    </section>
  );
}
