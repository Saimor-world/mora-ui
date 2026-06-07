'use client';

import React from 'react';
import { Activity, AlertTriangle, ArrowRight, ExternalLink, FolderOpen, Network, Plug, Sparkles } from 'lucide-react';
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
  if (action.kind === 'connect_source') {
    if (typeof window !== 'undefined') {
      window.open('https://dash.saimor.world', '_blank', 'noopener,noreferrer');
    }
    return;
  }

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
    <article className="rounded-xl border border-white/[0.08] bg-white/[0.045] p-3 shadow-[0_14px_36px_rgba(0,0,0,0.16)]">
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
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-300/18 bg-emerald-400/[0.08] px-3 py-1.5 text-xs text-emerald-50/78 transition-colors hover:bg-emerald-400/[0.14]"
          onClick={() => openActionPane(action, onOpenPane)}
        >
          {action.label}
          <ArrowRight size={13} />
        </button>
      ) : null}
    </article>
  );
}

function MyceliumField() {
  const strands = [
    'left-[2%] top-[16%] w-[44%] rotate-[7deg] from-emerald-300/0 via-emerald-300/24 to-cyan-200/0',
    'left-[20%] top-[52%] w-[48%] -rotate-[13deg] from-amber-200/0 via-amber-200/20 to-rose-200/0',
    'right-[8%] top-[30%] w-[36%] rotate-[22deg] from-violet-200/0 via-violet-200/22 to-emerald-200/0',
    'left-[10%] bottom-[18%] w-[58%] rotate-[3deg] from-cyan-200/0 via-cyan-200/18 to-amber-200/0',
    'right-[0%] bottom-[28%] w-[40%] -rotate-[18deg] from-rose-200/0 via-rose-200/18 to-violet-200/0',
  ];
  const nodes = [
    'left-[8%] top-[22%] bg-emerald-200/55 shadow-emerald-300/40',
    'left-[34%] top-[38%] bg-cyan-200/55 shadow-cyan-300/40',
    'left-[52%] top-[18%] bg-amber-200/55 shadow-amber-300/40',
    'right-[22%] top-[44%] bg-violet-200/55 shadow-violet-300/40',
    'right-[9%] bottom-[24%] bg-rose-200/50 shadow-rose-300/35',
    'left-[28%] bottom-[18%] bg-emerald-200/45 shadow-emerald-300/35',
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_74%_22%,rgba(251,191,36,0.12),transparent_24%),radial-gradient(circle_at_80%_76%,rgba(244,114,182,0.10),transparent_24%),radial-gradient(circle_at_34%_86%,rgba(34,211,238,0.12),transparent_30%)]" />
      {strands.map((className) => (
        <div key={className} className={`absolute h-px bg-gradient-to-r ${className}`} />
      ))}
      {nodes.map((className) => (
        <div key={className} className={`absolute h-1.5 w-1.5 rounded-full shadow-[0_0_22px] ${className}`} />
      ))}
    </div>
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
        ? 'Lokale OS-Bruecke ist aktiv. Sie liefert nur verdichtete Signale an MORA.'
        : 'Diese Quelle liefert belegte Signale fuer MORA.',
    };
  }

  return {
    state: 'im Dashboard einrichten',
    detail: 'Diese Quelle wird nicht hier konfiguriert. Das gehoert in den OS-Bereich des Dashboards.',
  };
}

function ConnectorPill({ connector }: { connector: ConnectorStatus }) {
  const good = connector.status === 'connected' || connector.status === 'local';
  const copy = connectorCopy(connector);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/18 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-white/75">{connector.label}</span>
        <span className={good ? 'h-2 w-2 rounded-full bg-emerald-300' : 'h-2 w-2 rounded-full bg-amber-300'} />
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.13em] text-white/34">{copy.state}</div>
      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/42">{copy.detail}</p>
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
      <div className={`flex items-center gap-3 rounded-2xl border ${calm.border} ${calm.bg} px-5 py-4`}>
        <CalmIcon size={20} className={calm.text} />
        <div>
          <div className="text-base font-medium text-white/88">Alles ruhig</div>
          <div className="text-sm text-white/50">Keine offenen Vorfälle. MÔRA beobachtet weiter.</div>
        </div>
      </div>
    );
  }

  const tone = TONES[toneForPriority(signal.priority)];
  const Icon = tone.icon;
  const action = signal.suggestedActions[0];

  return (
    <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]`}>
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
  const hideDashboardPlaceholder = hiddenPlaceholders.includes('Larry Dashboard');

  return (
    <section
      data-testid="openflow-lagebild"
      className="relative mx-auto flex min-h-full w-full max-w-[1340px] flex-col gap-4 px-1 pb-8"
    >
      <MyceliumField />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/14 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-emerald-50/58">
            <Sparkles size={12} />
            SAIMOR OpenFlow
          </div>
          <h1 className="max-w-3xl text-2xl font-light text-white">
            Lagebild
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/58">
            Veraenderungen, Menschen und belegte Quellen wachsen zu einem lebenden Organisationsgedaechtnis.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoExplore}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/16 bg-cyan-300/[0.07] px-4 py-2.5 text-sm text-cyan-50/75 hover:bg-cyan-300/[0.12]"
        >
          <Network size={16} />
          Karte oeffnen
        </button>
      </div>

      <HeadlineHero signal={view.headline} onOpenPane={onOpenPane} />

      <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(340px,1.08fr)_minmax(290px,0.92fr)_minmax(300px,0.92fr)]">
        <div className="rounded-xl border border-emerald-200/[0.10] bg-black/24 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/82">
            <Activity size={16} className="text-cyan-200/70" />
            Was hat sich veraendert?
          </div>
          <div className="grid gap-3">
            {changed.length > 0 ? (
              changed.map((item) => <SignalCard key={item.id} signal={item} onOpenPane={onOpenPane} />)
            ) : (
              <EmptyState>Noch keine neuen Signale. Sobald Dashboard, Dateien oder Teamarbeit Quellen freigeben, waechst hier die Karte.</EmptyState>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-amber-200/[0.10] bg-black/22 p-4 backdrop-blur-2xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/82">
              <AlertTriangle size={16} className="text-amber-200/70" />
              Was braucht Aufmerksamkeit?
            </div>
            <div className="grid gap-3">
              {visibleIncidentPanels.map((panel) => (
                <IncidentStatusPanel key={panel.id} panel={panel} />
              ))}
              {attention.length > 0 ? (
                attention.map((item) => <SignalCard key={item.id} signal={item} onOpenPane={onOpenPane} />)
              ) : visibleIncidentPanels.length > 0 ? null : (
                <EmptyState>Keine offenen Reibungspunkte.</EmptyState>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-cyan-200/[0.10] bg-black/22 p-4 backdrop-blur-2xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/82">
              <ArrowRight size={16} className="text-emerald-200/70" />
              Naechster sinnvoller Schritt
            </div>
            <div className="grid gap-3">
              {nextSteps.length > 0 ? (
                nextSteps.map((item) => <SignalCard key={item.id} signal={item} onOpenPane={onOpenPane} />)
              ) : nextStepsUnknown ? (
                <EmptyState>Noch kein belegter naechster Schritt.</EmptyState>
              ) : (
                <EmptyState>MORA wartet auf neue Signale aus Quellen oder Arbeit.</EmptyState>
              )}
            </div>
          </div>
        </div>

        <aside className="grid gap-4">
          {view.initiatives.length > 0 ? (
            <div className="rounded-xl border border-violet-200/[0.10] bg-black/22 p-4 backdrop-blur-2xl">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/82">
                <FolderOpen size={16} className="text-violet-200/70" />
                Initiativen
              </div>
              <div className="grid gap-3">
                {view.initiatives.map((initiative) => (
                  <div key={initiative.id} className="rounded-xl border border-violet-200/10 bg-violet-300/[0.06] p-3">
                    <h3 className="text-sm font-medium text-white/86">{initiative.title}</h3>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/46">
                      <span>{initiative.signalCount} Signale</span>
                      <span>{initiative.riskCount} Risiken</span>
                      <span>{initiative.decisionCount} Entscheidungen</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-emerald-200/[0.10] bg-black/22 p-4 backdrop-blur-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-white/82">
                <Plug size={16} className="text-emerald-200/70" />
                Quellenstatus
              </div>
              {!hideDashboardPlaceholder && (
                <button
                  type="button"
                  onClick={() => typeof window !== 'undefined' && window.open('https://dash.saimor.world', '_blank', 'noopener,noreferrer')}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/45 hover:border-emerald-200/22 hover:text-emerald-100/80"
                >
                  Dashboard
                  <ExternalLink size={11} />
                </button>
              )}
            </div>
            <p className="mb-3 text-xs leading-relaxed text-white/44">
              {hideRuntimePlaceholder || runtimeUnknown
                ? 'Status noch unbekannt. Home zeigt nur Quellen, fuer die CORE belegte Signale liefern kann.'
                : 'Home nutzt nur die Signale, die fuer Orientierung belegbar sind.'}
            </p>
            {connectorHandshakeUnknown ? (
              <div className="mb-3 rounded-xl border border-amber-200/10 bg-amber-300/[0.05] px-3 py-2 text-xs text-amber-50/56">
                Setup-Zustand nicht belegbar.
              </div>
            ) : null}
            <div className="grid gap-2">
              {view.connectors.map((connector) => <ConnectorPill key={connector.id} connector={connector} />)}
            </div>
          </div>
        </aside>
      </div>

    </section>
  );
}
