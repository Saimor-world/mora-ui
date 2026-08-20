'use client';

import React, { useMemo } from 'react';
import {
  Activity,
  CircleDollarSign,
  Mail,
  Network,
  Search,
  ShieldCheck,
  SquareCheckBig,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PaneType } from '@/lib/surface/surfaceRegistry';
import type { CoreTreeNode } from '@/lib/types/core';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useCommunicationLiveData } from '@/lib/hooks/useCommunicationLiveData';
import { useActionEvents } from '@/lib/hooks/useActionEvents';
import { useFinancialPulse } from '@/lib/queries/useFinancialPulse';
import { useNightwatchIncidents } from '@/lib/queries/useNightwatchIncidents';
import { useTasks } from '@/lib/queries/useTasks';
import { useTree } from '@/lib/queries/useTree';

type OpenWorkflow = (id: string, name: string, size: { width: number; height: number }) => void;
type WorkflowTone = 'cyan' | 'amber' | 'blue' | 'emerald' | 'violet' | 'rose';
type WorkflowAction =
  | { kind: 'pane'; id: PaneType; size: { width: number; height: number } }
  | { kind: 'desk' };

type WorkflowMetric = {
  label: string;
  value: string;
  detail: string;
};

type Workflow = {
  id: string;
  action: WorkflowAction;
  title: string;
  verb: string;
  description: string;
  evidence: string;
  count?: number;
  icon: LucideIcon;
  tone: WorkflowTone;
  wide?: boolean;
  metrics?: WorkflowMetric[];
};

const TONES: Record<WorkflowTone, { shell: string; icon: string; eyebrow: string }> = {
  cyan: { shell: 'border-cyan-300/12 bg-cyan-500/[0.055] hover:border-cyan-200/28 hover:bg-cyan-500/[0.09]', icon: 'text-cyan-200/65', eyebrow: 'text-cyan-100/38' },
  amber: { shell: 'border-amber-300/12 bg-amber-500/[0.05] hover:border-amber-200/28 hover:bg-amber-500/[0.085]', icon: 'text-amber-200/65', eyebrow: 'text-amber-100/38' },
  blue: { shell: 'border-blue-300/12 bg-blue-500/[0.05] hover:border-blue-200/28 hover:bg-blue-500/[0.085]', icon: 'text-blue-200/65', eyebrow: 'text-blue-100/38' },
  emerald: { shell: 'border-emerald-300/12 bg-emerald-500/[0.05] hover:border-emerald-200/28 hover:bg-emerald-500/[0.085]', icon: 'text-emerald-200/65', eyebrow: 'text-emerald-100/38' },
  violet: { shell: 'border-violet-300/12 bg-violet-500/[0.05] hover:border-violet-200/28 hover:bg-violet-500/[0.085]', icon: 'text-violet-200/65', eyebrow: 'text-violet-100/38' },
  rose: { shell: 'border-rose-300/12 bg-rose-500/[0.045] hover:border-rose-200/28 hover:bg-rose-500/[0.08]', icon: 'text-rose-200/65', eyebrow: 'text-rose-100/38' },
};

const FINANCE_ROLES = new Set(['owner', 'admin', 'system_owner']);

function countDocuments(nodes: CoreTreeNode[]): number {
  return nodes.reduce((count, node) => count + (node.type === 'node' ? 1 : 0) + countDocuments(node.children ?? []), 0);
}

function openIncidentCount(incidents: Array<{ status?: string }>): number {
  const closed = new Set(['resolved', 'dismissed', 'closed']);
  return incidents.filter(incident => !closed.has((incident.status || 'open').toLowerCase())).length;
}

function formatMoney(value: number | null, currency = 'EUR'): string {
  if (value == null) return 'Nicht verbunden';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(value);
}

function providerLabel(provider: string | null | undefined): string {
  if (provider === 'revolut_business') return 'Revolut Business';
  if (provider === 'gocardless_bank_data') return 'Open Banking';
  if (provider === 'finapi') return 'finAPI';
  return 'Bankkonto verbinden';
}

export function BusinessWorkflows({
  onOpen,
  onOpenDesk,
}: {
  onOpen: OpenWorkflow;
  onOpenDesk?: () => void;
}) {
  const activeCompanyId = useNavStore(state => state.activeCompanyId);
  const user = useSessionStore(state => state.user);
  const communication = useCommunicationLiveData(true);
  const { events, isLoading: actionsLoading } = useActionEvents(true);
  const tasksQuery = useTasks(activeCompanyId);
  const treeQuery = useTree(activeCompanyId);
  const incidentsQuery = useNightwatchIncidents(false);
  const financeAllowed = Boolean(user?.role && FINANCE_ROLES.has(user.role));
  const financeScopeId = user?.tenant_id || user?.id || null;
  const financeQuery = useFinancialPulse(financeScopeId, financeAllowed);

  const workflows = useMemo<Workflow[]>(() => {
    const pendingActions = events.filter(event => ['proposed', 'running', 'pending_confirmation'].includes(event.status));
    const openTasks = (tasksQuery.data ?? []).filter(task => task.status !== 'done');
    const documents = countDocuments(treeQuery.data ?? []);
    const incidents = openIncidentCount(incidentsQuery.data ?? []);
    const communicationCount = communication.mailPreview.length + communication.calendarPreview.length;
    const firstSignal = communication.calendarPreview[0]?.title || communication.mailPreview[0]?.subject;
    const finance = financeQuery.data;
    const financeLoading = financeAllowed && financeQuery.isLoading;
    const costKind =
      finance?.infrastructure.kind === 'actual'
        ? 'Rechnung'
        : finance?.infrastructure.kind === 'estimate'
          ? 'Schätzung'
          : 'Nicht erfasst';
    const balanceEntries = Object.entries(finance?.banking.balancesByCurrency ?? {});
    const preferredBalance = balanceEntries.find(([currency]) => currency === 'EUR') ?? balanceEntries[0];
    const bankCurrency = preferredBalance?.[0] || 'EUR';
    const bankBalance = preferredBalance?.[1] ?? null;
    const bankProvider = providerLabel(finance?.banking.provider);

    return [
      {
        id: 'lagefeld',
        action: { kind: 'pane', id: 'lagefeld', size: { width: 1040, height: 720 } },
        verb: 'Verstehen', title: 'Den Tag einordnen', icon: Network, tone: 'cyan',
        description: 'Mail, Termine, Aufgaben und Systemsignale als eine belegte Lage.',
        evidence: communication.isLoading ? 'Echte Signale werden geladen …' : firstSignal || 'Keine aktuelle Vorschau aus verbundenen Quellen',
        count: communicationCount || undefined,
      },
      {
        id: 'action-center',
        action: { kind: 'pane', id: 'action-center', size: { width: 940, height: 720 } },
        verb: 'Entscheiden', title: 'Freigaben & Entscheidungen', icon: Activity, tone: 'amber',
        description: 'Vorschläge prüfen, Agentenaktionen bestätigen und Ergebnisse nachvollziehen.',
        evidence: actionsLoading ? 'Entscheidungen werden geladen …' : pendingActions[0]?.message || (pendingActions.length ? 'Offene Agentenaktion' : 'Keine offene Freigabe'),
        count: pendingActions.length || undefined,
      },
      {
        id: 'mail',
        action: { kind: 'pane', id: 'mail', size: { width: 960, height: 680 } },
        verb: 'Kommunizieren', title: 'Kunden beantworten', icon: Mail, tone: 'blue',
        description: 'Echte Nachrichten lesen und im Geschäftskontext weiterbearbeiten.',
        evidence: communication.isLoading ? 'Postfach wird geladen …' : communication.mailPreview[0]?.subject || 'Keine Nachrichtenvorschau aus verbundenen Konten',
        count: communication.mailPreview.length || undefined,
      },
      {
        id: 'tasks',
        action: { kind: 'pane', id: 'tasks', size: { width: 900, height: 580 } },
        verb: 'Umsetzen', title: 'Arbeit liefern', icon: SquareCheckBig, tone: 'emerald',
        description: 'Aufgaben priorisieren, bewegen und bis zum Ergebnis führen.',
        evidence: tasksQuery.isLoading ? 'Aufgaben werden geladen …' : openTasks[0]?.title || 'Keine offene Aufgabe in dieser Organisation',
        count: openTasks.length || undefined,
      },
      {
        id: 'search',
        action: { kind: 'pane', id: 'search', size: { width: 720, height: 560 } },
        verb: 'Wissen', title: 'Antworten & Unterlagen finden', icon: Search, tone: 'violet',
        description: 'Über alle Inhalte der aktiven Organisation suchen.',
        evidence: treeQuery.isLoading ? 'Organisationswissen wird gezählt …' : documents ? `${documents} indexierte Inhalte im Organisationsbaum` : 'Noch keine indexierten Inhalte gefunden',
        count: documents || undefined,
      },
      {
        id: 'nightwatch',
        action: { kind: 'pane', id: 'nightwatch', size: { width: 760, height: 680 } },
        verb: 'Absichern', title: 'Risiken erkennen', icon: ShieldCheck, tone: 'rose',
        description: 'Infrastrukturzustand und konkrete Warnungen prüfen.',
        evidence: incidentsQuery.isLoading ? 'Nightwatch wird geladen …' : incidentsQuery.data?.[0]?.title || (incidents ? 'Offener Infrastrukturvorfall' : 'Keine offenen Nightwatch-Vorfälle'),
        count: incidents || undefined,
      },
      {
        id: 'finance',
        action: { kind: 'desk' },
        verb: 'Steuern',
        title: 'Finanzen & Liquidität',
        icon: CircleDollarSign,
        tone: 'amber',
        wide: true,
        description: 'Umsatz, echte Bankliquidität und systemweite Infrastrukturkosten — sichtbar, ohne unterschiedliche Scopes zu verrechnen.',
        evidence: !financeAllowed
          ? 'Finanzlage ist nur für Owner und Admin sichtbar'
          : financeLoading
            ? 'Echte Finanzquellen werden gelesen …'
            : finance?.revenue.monthly == null
              ? 'Noch keine reale Umsatzbuchung verbunden'
              : finance?.banking.status === 'connected'
                ? bankProvider + ' · ' + finance.banking.accountCount + ' Konten · ' + finance.banking.recentTransactionCount + ' aktuelle Buchungen'
                : (finance.revenue.period || 'Aktueller Monat') + ' · Bankkonto noch nicht verbunden',
        metrics: [
          {
            label: 'Monatsumsatz',
            value: financeLoading ? 'Lädt …' : formatMoney(finance?.revenue.monthly ?? null, finance?.revenue.currency),
            detail: finance?.revenue.period || 'Tenant-gebundene Quelle',
          },
          {
            label: 'Liquidität ' + bankCurrency,
            value: financeLoading ? 'Lädt …' : formatMoney(bankBalance, bankCurrency),
            detail: finance?.banking.status === 'connected' ? 'Echter beobachteter Kontostand' : 'Revolut oder Open Banking',
          },
          {
            label: 'Infrastruktur',
            value: financeLoading ? 'Lädt …' : formatMoney(finance?.infrastructure.monthly ?? null, finance?.infrastructure.currency),
            detail: 'Systemweit · ' + costKind,
          },
          {
            label: 'Bankverbindung',
            value: financeLoading ? 'Prüft …' : bankProvider,
            detail: finance?.banking.status === 'connected'
              ? finance.banking.accountCount + ' Konten synchronisiert'
              : 'Tenant-gebunden · keine Demodaten',
          },
        ],
      },
    ];
  }, [
    actionsLoading,
    communication,
    events,
    financeAllowed,
    financeQuery.data,
    financeQuery.isLoading,
    incidentsQuery.data,
    incidentsQuery.isLoading,
    tasksQuery.data,
    tasksQuery.isLoading,
    treeQuery.data,
    treeQuery.isLoading,
  ]);

  return (
    <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-3" aria-label="Unternehmerische Aufgaben" data-testid="business-workflows">
      {workflows.map(workflow => {
        const Icon = workflow.icon;
        const tone = TONES[workflow.tone];
        return (
          <button
            key={workflow.id}
            type="button"
            onClick={() => {
              if (workflow.action.kind === 'desk') {
                onOpenDesk?.();
                return;
              }
              onOpen(
                workflow.action.id,
                workflow.action.id === 'action-center' ? 'Entscheidungen' : workflow.title,
                workflow.action.size,
              );
            }}
            className={`group relative min-h-[154px] rounded-[20px] border p-4 text-left transition hover:-translate-y-0.5 ${workflow.wide ? 'md:col-span-2 xl:col-span-3' : ''} ${tone.shell}`}
          >
            <div className="flex items-start justify-between gap-3">
              <Icon size={17} className={tone.icon} />
              <div className="flex items-center gap-2">
                {workflow.wide && (
                  <span className="rounded-full border border-white/[0.08] bg-black/15 px-2 py-0.5 text-[8px] uppercase tracking-[0.15em] text-white/35">
                    Finanzwahrheit
                  </span>
                )}
                {workflow.count != null && (
                  <span className="rounded-full border border-white/10 bg-black/15 px-2 py-0.5 text-[9px] tabular-nums text-white/55">{workflow.count}</span>
                )}
              </div>
            </div>
            <span className={`mt-4 block text-[9px] uppercase tracking-[0.2em] ${tone.eyebrow}`}>{workflow.verb}</span>
            <strong className="mt-1 block text-sm font-medium text-white/82">{workflow.title}</strong>
            <span className="mt-1 block text-[10px] leading-relaxed text-white/38">{workflow.description}</span>
            {workflow.metrics && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {workflow.metrics.map(metric => (
                  <span key={metric.label} className="rounded-[13px] border border-white/[0.055] bg-black/10 px-3 py-2">
                    <span className="block text-[8px] uppercase tracking-[0.13em] text-white/28">{metric.label}</span>
                    <strong className="mt-1 block text-sm font-medium tabular-nums text-white/78">{metric.value}</strong>
                    <span className="mt-0.5 block text-[8px] text-white/28">{metric.detail}</span>
                  </span>
                ))}
              </div>
            )}
            <span className="mt-3 block truncate border-t border-white/[0.055] pt-2 text-[9px] text-white/28" title={workflow.evidence}>{workflow.evidence}</span>
          </button>
        );
      })}
    </section>
  );
}
