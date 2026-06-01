'use client';

import React from 'react';
import { Activity, AlertTriangle, ArrowRight, FolderOpen, Network, Plug, Sparkles } from 'lucide-react';
import type { PaneOpenRequest } from '@/lib/store/paneStore';
import type { ConnectorStatus, OpenFlowLagebild as Lagebild, OpenFlowSignal } from '@/lib/openflow/types';

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

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-100/45">
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
              ? 'rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold text-amber-100'
              : 'rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-white/48'
          }
        >
          {signal.priority}
        </span>
      </div>

      {action ? (
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-300/18 bg-emerald-400/[0.08] px-3 py-2 text-xs text-emerald-50/78 transition-colors hover:bg-emerald-400/[0.14]"
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
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm leading-relaxed text-white/42">
      {children}
    </div>
  );
}

function ConnectorPill({ connector }: { connector: ConnectorStatus }) {
  const good = connector.status === 'connected' || connector.status === 'local';

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/18 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-white/75">{connector.label}</span>
        <span className={good ? 'h-2 w-2 rounded-full bg-emerald-300' : 'h-2 w-2 rounded-full bg-amber-300'} />
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/40">{connector.detail}</p>
    </div>
  );
}

export function OpenFlowLagebild({ view, onOpenPane, onGoExplore }: OpenFlowLagebildProps) {
  const changed = view.changed.slice(0, 3);
  const attention = view.attention.slice(0, 2);
  const nextSteps = view.nextSteps.slice(0, 2);

  return (
    <section
      data-testid="openflow-lagebild"
      className="relative mx-auto flex h-full w-full max-w-[1500px] flex-col gap-5 px-6 pb-28 pt-24"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/14 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-emerald-50/58">
            <Sparkles size={12} />
            SAIMOR OpenFlow
          </div>
          <h1 className="max-w-3xl text-3xl font-light text-white">
            Lagebild
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/54">
            Veraenderungen, Quellen, Initiativen und naechste Schritte entstehen aus demselben Organisationsgedaechtnis.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoExplore}
          className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/16 bg-cyan-300/[0.07] px-4 py-3 text-sm text-cyan-50/75 hover:bg-cyan-300/[0.12]"
        >
          <Network size={16} />
          Karte oeffnen
        </button>
      </div>

      <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.9fr_0.9fr]">
        <div className="rounded-[28px] border border-white/[0.08] bg-black/22 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white/82">
            <Activity size={16} className="text-cyan-200/70" />
            Was hat sich veraendert?
          </div>
          <div className="grid gap-3">
            {changed.length > 0 ? (
              changed.map((item) => <SignalCard key={item.id} signal={item} onOpenPane={onOpenPane} />)
            ) : (
              <EmptyState>Noch keine neuen Signale. Verbinde Mail, Cloud oder Kalender, damit die Karte wachsen kann.</EmptyState>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[28px] border border-white/[0.08] bg-black/22 p-4 backdrop-blur-2xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white/82">
              <AlertTriangle size={16} className="text-amber-200/70" />
              Was braucht Aufmerksamkeit?
            </div>
            <div className="grid gap-3">
              {attention.length > 0 ? (
                attention.map((item) => <SignalCard key={item.id} signal={item} onOpenPane={onOpenPane} />)
              ) : (
                <EmptyState>Keine offenen Reibungspunkte.</EmptyState>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/[0.08] bg-black/22 p-4 backdrop-blur-2xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white/82">
              <ArrowRight size={16} className="text-emerald-200/70" />
              Naechster sinnvoller Schritt
            </div>
            <div className="grid gap-3">
              {nextSteps.length > 0 ? (
                nextSteps.map((item) => <SignalCard key={item.id} signal={item} onOpenPane={onOpenPane} />)
              ) : (
                <EmptyState>MORA wartet auf neue Signale aus Quellen oder Arbeit.</EmptyState>
              )}
            </div>
          </div>
        </div>

        <aside className="grid gap-4">
          <div className="rounded-[28px] border border-white/[0.08] bg-black/22 p-4 backdrop-blur-2xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white/82">
              <FolderOpen size={16} className="text-violet-200/70" />
              Initiativen
            </div>
            <div className="grid gap-3">
              {view.initiatives.length > 0 ? (
                view.initiatives.map((initiative) => (
                  <div key={initiative.id} className="rounded-2xl border border-violet-200/10 bg-violet-300/[0.06] p-4">
                    <h3 className="text-sm font-medium text-white/86">{initiative.title}</h3>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/46">
                      <span>{initiative.signalCount} Signale</span>
                      <span>{initiative.riskCount} Risiken</span>
                      <span>{initiative.decisionCount} Entscheidungen</span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState>Initiativen entstehen, sobald Quellen und Arbeit zusammenhaengen.</EmptyState>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/[0.08] bg-black/22 p-4 backdrop-blur-2xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white/82">
              <Plug size={16} className="text-emerald-200/70" />
              Quellen
            </div>
            <div className="grid gap-2">
              {view.connectors.map((connector) => <ConnectorPill key={connector.id} connector={connector} />)}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
