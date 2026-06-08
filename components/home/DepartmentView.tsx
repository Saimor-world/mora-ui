'use client';

import React from 'react';
import { FileText, Plug, Sparkles, Users } from 'lucide-react';
import { getUserColorHex } from '@/lib/utils/userColors';
import type { PeerUser } from '@/lib/hooks/usePresence';
import type { ConnectorStatus, OpenFlowSignal } from '@/lib/openflow/types';
import type { IncidentStatusPanel as IncidentStatusPanelData } from '@/lib/panel/types';
import { IncidentStatusPanel } from '@/components/home/IncidentStatusPanel';

export interface DepartmentRecentDoc {
  id: string;
  title: string;
  updatedAt?: string;
}

interface DepartmentViewProps {
  departmentName: string;
  peers: PeerUser[];
  recentDocs: DepartmentRecentDoc[];
  suggestions: OpenFlowSignal[];
  connectors: ConnectorStatus[];
  incidentPanels?: IncidentStatusPanelData[];
  hasUnscopedIncidents?: boolean;
  onOpenDoc?: (id: string) => void;
}

function Pillar({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] border border-white/[0.08] bg-black/22 p-4 backdrop-blur-2xl">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white/82">
        {icon}
        {title}
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-white/42">
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

export function DepartmentView({
  departmentName,
  peers,
  recentDocs,
  suggestions,
  connectors,
  incidentPanels = [],
  hasUnscopedIncidents = false,
  onOpenDoc,
}: DepartmentViewProps) {
  const visibleIncidentPanels = incidentPanels.filter(isVisibleIncidentPanel).slice(0, 2);

  return (
    <section data-testid="department-view" className="relative mx-auto flex h-full w-full max-w-[1500px] flex-col gap-5 px-6 pb-28 pt-24">
      <header>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/14 bg-violet-400/[0.07] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-violet-50/58">
          Abteilung
        </div>
        <h1 className="text-3xl font-light tracking-[-0.01em] text-white">{departmentName}</h1>
      </header>

      {(visibleIncidentPanels.length > 0 || hasUnscopedIncidents) && (
        <section data-testid="department-view-incident-context" className="grid gap-3">
          {visibleIncidentPanels.length > 0 ? (
            visibleIncidentPanels.map((panel) => (
              <IncidentStatusPanel key={panel.id} panel={panel} />
            ))
          ) : (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm leading-relaxed text-white/46">
              Globale Systemsignale vorhanden, aber keinem Bereich belegbar zugeordnet.
            </div>
          )}
        </section>
      )}

      <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <Pillar icon={<Users size={16} className="text-emerald-200/70" />} title="Team online">
          {peers.length > 0 ? (
            peers.map((peer) => (
              <div key={peer.sessionId} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                <span
                  data-testid={`peer-aura-${peer.sessionId}`}
                  className="h-3 w-3 rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.12)]"
                  style={{ backgroundColor: getUserColorHex(peer.email || peer.name || peer.sessionId) }}
                />
                <span className="text-sm text-white/82">{peer.name}</span>
                <span className="ml-auto text-[11px] uppercase tracking-wide text-white/35">{peer.status}</span>
              </div>
            ))
          ) : (
            <Empty>Niemand ist gerade online.</Empty>
          )}
        </Pillar>

        <Pillar icon={<FileText size={16} className="text-cyan-200/70" />} title="Letzte Dokumente">
          {recentDocs.length > 0 ? (
            recentDocs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => onOpenDoc?.(doc.id)}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-left transition-colors hover:bg-white/[0.07]"
              >
                <FileText size={14} className="text-white/40" />
                <span className="text-sm text-white/82">{doc.title}</span>
              </button>
            ))
          ) : (
            <Empty>Noch keine Dokumente in dieser Abteilung.</Empty>
          )}
        </Pillar>

        <Pillar icon={<Sparkles size={16} className="text-amber-200/70" />} title="Mora-Vorschläge">
          {suggestions.length > 0 ? (
            suggestions.map((sig) => (
              <div key={sig.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                <h3 className="text-sm font-medium text-white/86">{sig.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/52">{sig.summary}</p>
              </div>
            ))
          ) : (
            <Empty>Mora hat gerade keine Vorschläge.</Empty>
          )}
        </Pillar>

        <Pillar icon={<Plug size={16} className="text-violet-200/70" />} title="Externe Daten">
          {connectors.length > 0 ? (
            connectors.map((c) => {
              const good = c.status === 'connected' || c.status === 'local';
              return (
                <div key={c.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-white/75">{c.label}</span>
                    <span className={`h-2 w-2 rounded-full ${good ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/40">{c.detail}</p>
                </div>
              );
            })
          ) : (
            <Empty>Noch keine externen Datenquellen (ERP/CRM) verbunden.</Empty>
          )}
        </Pillar>
      </div>
    </section>
  );
}
