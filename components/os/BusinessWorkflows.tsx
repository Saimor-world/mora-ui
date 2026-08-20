'use client';

import React, { useMemo } from 'react';
import { Activity, Mail, Network, Search, ShieldCheck, SquareCheckBig } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PaneType } from '@/lib/surface/surfaceRegistry';
import type { CoreTreeNode } from '@/lib/types/core';
import { useNavStore } from '@/lib/store/navStore';
import { useCommunicationLiveData } from '@/lib/hooks/useCommunicationLiveData';
import { useActionEvents } from '@/lib/hooks/useActionEvents';
import { useNightwatchIncidents } from '@/lib/queries/useNightwatchIncidents';
import { useTasks } from '@/lib/queries/useTasks';
import { useTree } from '@/lib/queries/useTree';

type OpenWorkflow = (id: string, name: string, size: { width: number; height: number }) => void;
type WorkflowTone = 'cyan' | 'amber' | 'blue' | 'emerald' | 'violet' | 'rose';

type Workflow = {
  id: PaneType;
  title: string;
  verb: string;
  description: string;
  evidence: string;
  count?: number;
  icon: LucideIcon;
  tone: WorkflowTone;
  size: { width: number; height: number };
};

const TONES: Record<WorkflowTone, { shell: string; icon: string; eyebrow: string }> = {
  cyan: { shell: 'border-cyan-300/12 bg-cyan-500/[0.055] hover:border-cyan-200/28 hover:bg-cyan-500/[0.09]', icon: 'text-cyan-200/65', eyebrow: 'text-cyan-100/38' },
  amber: { shell: 'border-amber-300/12 bg-amber-500/[0.05] hover:border-amber-200/28 hover:bg-amber-500/[0.085]', icon: 'text-amber-200/65', eyebrow: 'text-amber-100/38' },
  blue: { shell: 'border-blue-300/12 bg-blue-500/[0.05] hover:border-blue-200/28 hover:bg-blue-500/[0.085]', icon: 'text-blue-200/65', eyebrow: 'text-blue-100/38' },
  emerald: { shell: 'border-emerald-300/12 bg-emerald-500/[0.05] hover:border-emerald-200/28 hover:bg-emerald-500/[0.085]', icon: 'text-emerald-200/65', eyebrow: 'text-emerald-100/38' },
  violet: { shell: 'border-violet-300/12 bg-violet-500/[0.05] hover:border-violet-200/28 hover:bg-violet-500/[0.085]', icon: 'text-violet-200/65', eyebrow: 'text-violet-100/38' },
  rose: { shell: 'border-rose-300/12 bg-rose-500/[0.045] hover:border-rose-200/28 hover:bg-rose-500/[0.08]', icon: 'text-rose-200/65', eyebrow: 'text-rose-100/38' },
};

function countDocuments(nodes: CoreTreeNode[]): number {
  return nodes.reduce((count, node) => count + (node.type === 'node' ? 1 : 0) + countDocuments(node.children ?? []), 0);
}

function openIncidentCount(incidents: Array<{ status?: string }>): number {
  const closed = new Set(['resolved', 'dismissed', 'closed']);
  return incidents.filter(incident => !closed.has((incident.status || 'open').toLowerCase())).length;
}

export function BusinessWorkflows({ onOpen }: { onOpen: OpenWorkflow }) {
  const activeCompanyId = useNavStore(state => state.activeCompanyId);
  const communication = useCommunicationLiveData(true);
  const { events, isLoading: actionsLoading } = useActionEvents(true);
  const tasksQuery = useTasks(activeCompanyId);
  const treeQuery = useTree(activeCompanyId);
  const incidentsQuery = useNightwatchIncidents(false);

  const workflows = useMemo<Workflow[]>(() => {
    const pendingActions = events.filter(event => ['proposed', 'running', 'pending_confirmation'].includes(event.status));
    const openTasks = (tasksQuery.data ?? []).filter(task => task.status !== 'done');
    const documents = countDocuments(treeQuery.data ?? []);
    const incidents = openIncidentCount(incidentsQuery.data ?? []);
    const communicationCount = communication.mailPreview.length + communication.calendarPreview.length;
    const firstSignal = communication.calendarPreview[0]?.title || communication.mailPreview[0]?.subject;

    return [
      {
        id: 'lagefeld', verb: 'Verstehen', title: 'Den Tag einordnen', icon: Network, tone: 'cyan',
        description: 'Mail, Termine, Aufgaben und Systemsignale als eine belegte Lage.',
        evidence: communication.isLoading ? 'Echte Signale werden geladen …' : firstSignal || 'Keine aktuelle Vorschau aus verbundenen Quellen',
        count: communicationCount || undefined, size: { width: 1040, height: 720 },
      },
      {
        id: 'action-center', verb: 'Entscheiden', title: 'Freigaben & Entscheidungen', icon: Activity, tone: 'amber',
        description: 'Vorschläge prüfen, Agentenaktionen bestätigen und Ergebnisse nachvollziehen.',
        evidence: actionsLoading ? 'Entscheidungen werden geladen …' : pendingActions[0]?.message || (pendingActions.length ? 'Offene Agentenaktion' : 'Keine offene Freigabe'),
        count: pendingActions.length || undefined, size: { width: 940, height: 720 },
      },
      {
        id: 'mail', verb: 'Kommunizieren', title: 'Kunden beantworten', icon: Mail, tone: 'blue',
        description: 'Echte Nachrichten lesen und im Geschäftskontext weiterbearbeiten.',
        evidence: communication.isLoading ? 'Postfach wird geladen …' : communication.mailPreview[0]?.subject || 'Keine Nachrichtenvorschau aus verbundenen Konten',
        count: communication.mailPreview.length || undefined, size: { width: 960, height: 680 },
      },
      {
        id: 'tasks', verb: 'Umsetzen', title: 'Arbeit liefern', icon: SquareCheckBig, tone: 'emerald',
        description: 'Aufgaben priorisieren, bewegen und bis zum Ergebnis führen.',
        evidence: tasksQuery.isLoading ? 'Aufgaben werden geladen …' : openTasks[0]?.title || 'Keine offene Aufgabe in dieser Organisation',
        count: openTasks.length || undefined, size: { width: 900, height: 580 },
      },
      {
        id: 'search', verb: 'Wissen', title: 'Antworten & Unterlagen finden', icon: Search, tone: 'violet',
        description: 'Über alle Inhalte der aktiven Organisation suchen.',
        evidence: treeQuery.isLoading ? 'Organisationswissen wird gezählt …' : documents ? `${documents} indexierte Inhalte im Organisationsbaum` : 'Noch keine indexierten Inhalte gefunden',
        count: documents || undefined, size: { width: 720, height: 560 },
      },
      {
        id: 'nightwatch', verb: 'Absichern', title: 'Risiken erkennen', icon: ShieldCheck, tone: 'rose',
        description: 'Infrastrukturzustand und konkrete Warnungen prüfen.',
        evidence: incidentsQuery.isLoading ? 'Nightwatch wird geladen …' : incidentsQuery.data?.[0]?.title || (incidents ? 'Offener Infrastrukturvorfall' : 'Keine offenen Nightwatch-Vorfälle'),
        count: incidents || undefined, size: { width: 760, height: 680 },
      },
    ];
  }, [actionsLoading, communication, events, incidentsQuery.data, incidentsQuery.isLoading, tasksQuery.data, tasksQuery.isLoading, treeQuery.data, treeQuery.isLoading]);

  return (
    <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-3" aria-label="Unternehmerische Aufgaben" data-testid="business-workflows">
      {workflows.map(workflow => {
        const Icon = workflow.icon;
        const tone = TONES[workflow.tone];
        return (
          <button
            key={workflow.id}
            type="button"
            onClick={() => onOpen(workflow.id, workflow.id === 'action-center' ? 'Entscheidungen' : workflow.title, workflow.size)}
            className={`group relative min-h-[154px] rounded-[20px] border p-4 text-left transition hover:-translate-y-0.5 ${tone.shell}`}
          >
            <div className="flex items-start justify-between gap-3">
              <Icon size={17} className={tone.icon} />
              {workflow.count != null && (
                <span className="rounded-full border border-white/10 bg-black/15 px-2 py-0.5 text-[9px] tabular-nums text-white/55">{workflow.count}</span>
              )}
            </div>
            <span className={`mt-4 block text-[9px] uppercase tracking-[0.2em] ${tone.eyebrow}`}>{workflow.verb}</span>
            <strong className="mt-1 block text-sm font-medium text-white/82">{workflow.title}</strong>
            <span className="mt-1 block text-[10px] leading-relaxed text-white/38">{workflow.description}</span>
            <span className="mt-3 block truncate border-t border-white/[0.055] pt-2 text-[9px] text-white/28" title={workflow.evidence}>{workflow.evidence}</span>
          </button>
        );
      })}
    </section>
  );
}