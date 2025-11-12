'use client';

import { useAppContext } from '@/lib/contexts';
import { useMemoryFacts, useSnapshots, useHealthCheck } from '@/lib/hooks/useApi';
import ContextPanel from './ContextPanel';
import QuickActions from './QuickActions';
import WorkflowRunner from './WorkflowRunner';
import BroadcastInbox from './Broadcast/BroadcastInbox';
import DataUploadPlaceholder from './DataUploadPlaceholder';
import MonitoringPlaceholder from './MonitoringPlaceholder';
import CoreOfflineMessage from '@/components/errors/CoreOfflineMessage';

const ONLINE_STATUSES = new Set(['healthy', 'ok', 'warning']);
const OFFLINE_STATUSES = new Set(['unreachable', 'error', 'unauthorized']);

export default function Insights() {
  const { selectedObject, orb, activeTagFilter, setActiveTagFilter } = useAppContext();

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
