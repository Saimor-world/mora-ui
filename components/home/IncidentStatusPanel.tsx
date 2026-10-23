'use client';

import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import type { IncidentStatusPanel as IncidentStatusPanelData } from '@/lib/panel/types';
import { TONES, toneForPriority, priorityFromSeverityLabel } from '@/lib/ui/status';

function isVerifiedIncidentPanel(panel: IncidentStatusPanelData): boolean {
  return Boolean(
    panel.type === 'incident_status'
    && panel.state === 'verified'
    && panel.source === 'nightwatch'
    && panel.source_type === 'nightwatch.incident'
    && panel.evidence?.length
    && panel.evidence.every((item) => item.source && item.source_type && item.reason)
  );
}

function formatTimestamp(value?: string) {
  if (!value) return 'Zeitpunkt unbekannt';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function IncidentStatusPanel({ panel }: { panel: IncidentStatusPanelData }) {
  if (!isVerifiedIncidentPanel(panel)) return null;

  const priority = priorityFromSeverityLabel(panel.payload.severity);
  const tone = TONES[toneForPriority(priority)];
  const Icon = priority === 'urgent' || priority === 'high' ? AlertTriangle : ShieldCheck;

  return (
    <article
      data-testid="incident-status-panel"
      className={`rounded-xl border ${tone.border} ${tone.bg} p-4 shadow-[0_18px_60px_rgba(0,0,0,0.20)]`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-white/48">
            <Icon size={12} className={tone.text} />
            Sensor-Signal
          </div>
          <h3 className="text-sm font-medium text-white/90">{panel.payload.title}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-white/58">{panel.payload.summary}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${tone.border} ${tone.text}`}>
          {panel.payload.severity}
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-[11px] text-white/48 sm:grid-cols-2">
        <div className="rounded-lg border border-white/[0.06] bg-black/16 px-2.5 py-2">
          <div className="uppercase tracking-[0.14em] text-white/28">Status</div>
          <div className="mt-1 text-white/66">{panel.payload.status}</div>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-black/16 px-2.5 py-2">
          <div className="uppercase tracking-[0.14em] text-white/28">Beleg</div>
          <div className="mt-1 text-white/66">{formatTimestamp(panel.timestamp)}</div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/14 px-3 py-2 text-[11px] leading-relaxed text-white/46">
        {panel.reason}
      </div>
    </article>
  );
}
