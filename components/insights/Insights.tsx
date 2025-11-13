'use client';

import { useMemo } from 'react';
import { useAppContext } from '@/lib/contexts';
import { useMemoryFacts, useSnapshots, useHealthCheck } from '@/lib/hooks/useApi';
import ContextPanel from './ContextPanel';
import QuickActions from './QuickActions';
import WorkflowRunner from './WorkflowRunner';
import BroadcastInbox from './Broadcast/BroadcastInbox';
import DataUploadPlaceholder from './DataUploadPlaceholder';
import MonitoringPlaceholder from './MonitoringPlaceholder';
import CoreOfflineMessage from '@/components/errors/CoreOfflineMessage';
import { useSessionStore } from '@/store/session';
import type { MoraEvent } from '@/lib/mora/listener';

const ONLINE_STATUSES = new Set(['healthy', 'ok', 'warning']);
const OFFLINE_STATUSES = new Set(['unreachable', 'error', 'unauthorized']);

export default function Insights() {
  const { selectedObject, orb, activeTagFilter, setActiveTagFilter } = useAppContext();
  const recentEvents = useSessionStore((state) => state.recentEvents);

  // Fetch real stats
  const filters: any = {};
  if (orb !== 'all') filters.orb = orb;
  if (activeTagFilter) filters.tag = activeTagFilter;
  const hasFilters = Object.keys(filters).length > 0;
  const { data: objects, isLoading: objectsLoading } = useMemoryFacts(hasFilters ? filters : undefined);
  const { data: snapshots, isLoading: snapshotsLoading } = useSnapshots();
  const { data: health, refetch: refetchHealth } = useHealthCheck();

  const objectCount = objects?.length || 0;
  const relationCount = snapshots?.[2]?.edges.length || 0; // Use latest snapshot (t2)
  const healthStatus = (health?.status || '').toString().toLowerCase();
  const isOffline = OFFLINE_STATUSES.has(healthStatus);
  const isOnline = ONLINE_STATUSES.has(healthStatus) && !isOffline;
  const awarenessStory = useMemo(
    () => buildAwarenessStory(recentEvents, orb, activeTagFilter),
    [recentEvents, orb, activeTagFilter]
  );

  return (
    <aside className="w-80 bg-card border-l border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Insights
          </h2>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">
              {isOnline ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isOffline ? (
          <CoreOfflineMessage
            error={new Error('Core API nicht erreichbar')}
            onRetry={() => refetchHealth()}
          />
        ) : (
          <>
            {/* Context Panel */}
            <ContextPanel selectedObject={selectedObject} />

            {/* Quick Actions */}
            <QuickActions
              selectedObject={selectedObject}
              onFilterByTag={(tag) => setActiveTagFilter(tag)}
            />

            {/* Awareness Narrative */}
            <div className="px-4">
              <div className="mt-4 rounded-2xl border border-border/70 bg-card/70 p-4 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                  Präsenz-Notiz
                </p>
                <p className="text-sm font-semibold text-foreground">{awarenessStory.headline}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{awarenessStory.detail}</p>
                {awarenessStory.badges.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {awarenessStory.badges.map((badge) => (
                      <span
                        key={badge}
                        className="px-2 py-0.5 rounded-full bg-secondary/40 text-secondary-foreground text-[11px] tracking-wide"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Workflow Runner */}
            <WorkflowRunner />

            {/* Broadcast Inbox */}
            <BroadcastInbox />

            {/* Data Upload Placeholder */}
            <DataUploadPlaceholder />

            {/* Monitoring Placeholder */}
            <MonitoringPlaceholder />
          </>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-border">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Objects</div>
            <div className="font-semibold">{objectCount}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Relations</div>
            <div className="font-semibold">{relationCount}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

interface AwarenessStory {
  headline: string;
  detail: string;
  badges: string[];
}

function buildAwarenessStory(
  events: MoraEvent[],
  orb: string,
  activeTagFilter: string | null
): AwarenessStory {
  const badges: string[] = [];
  if (orb && orb !== 'all') {
    badges.push(`Orb · ${orb}`);
  }
  if (activeTagFilter) {
    badges.push(`#${activeTagFilter}`);
  }

  if (!events || events.length === 0) {
    return {
      headline: 'Noch ruhig – keine Awareness',
      detail: 'Sobald du Field oder Folder nutzt, fasse ich deine Spur hier zusammen.',
      badges,
    };
  }

  const nodeTouches = events.filter((evt) => evt.action === 'node_click').length;
  if (nodeTouches > 0) {
    badges.push(`${nodeTouches} Field-Impulse`);
  }
  const last = events[events.length - 1];
  const lastFilter = [...events]
    .reverse()
    .find((evt) => evt.action === 'filter_change' || evt.action === 'tag_filter_change');
  const lastConnector = [...events].reverse().find((evt) => evt.action === 'connector_action');

  const headline =
    nodeTouches > 0
      ? `Field reagiert auf ${nodeTouches} ${nodeTouches === 1 ? 'Berührung' : 'Berührungen'}.`
      : lastFilter
      ? 'Filter im Fokus'
      : lastConnector
      ? 'Connectoren senden Impulse'
      : 'Awareness aktiv';

  return {
    headline,
    detail: describeAwarenessDetail(last, lastFilter, lastConnector),
    badges: Array.from(new Set(badges)),
  };
}

function describeAwarenessDetail(
  last?: MoraEvent,
  lastFilter?: MoraEvent,
  lastConnector?: MoraEvent
): string {
  if (!last) {
    return 'Verbinde eine Quelle oder öffne ein Dokument, dann erzähle ich mehr.';
  }
  const payload = (last.payload ?? {}) as Record<string, unknown>;
  switch (last.action) {
    case 'node_click': {
      const title = typeof payload.title === 'string' ? payload.title : 'einen Knoten';
      const type = typeof payload.type === 'string' ? payload.type : undefined;
      return `Zuletzt hast du ${title}${type ? ` (${type})` : ''} im Field fokussiert.`;
    }
    case 'tag_filter_change':
    case 'filter_change': {
      const tag = typeof payload.tag === 'string' ? payload.tag : undefined;
      const orb = typeof payload.orb === 'string' ? payload.orb : undefined;
      if (tag) return `Tag-Filter auf #${tag} gesetzt – ich halte passende Vorschläge bereit.`;
      if (orb) return `Orb-Fokus auf ${orb} geschärft.`;
      break;
    }
    case 'connector_action': {
      const id = typeof payload.id === 'string' ? payload.id : 'Connector';
      const status = typeof payload.status === 'string' ? payload.status : 'aktualisiert';
      return `${id} meldet ${status}. Ich halte währenddessen die Balance.`;
    }
    default:
      break;
  }

  if (lastFilter) {
    const filterPayload = (lastFilter.payload ?? {}) as Record<string, unknown>;
    const tag = typeof filterPayload.tag === 'string' ? filterPayload.tag : null;
    if (tag) {
      return `Filterblick auf #${tag}.`;
    }
  }

  if (lastConnector) {
    const connectorPayload = (lastConnector.payload ?? {}) as Record<string, unknown>;
    const id = typeof connectorPayload.id === 'string' ? connectorPayload.id : 'Connector';
    return `${id} baut gerade Verbindung auf.`;
  }

  return 'Môra beobachtet deine Bewegungen und passt Vorschläge an.';
}
