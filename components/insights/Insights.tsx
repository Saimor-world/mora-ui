'use client';

import { useAppContext } from '@/lib/contexts';
import { useMemoryFacts, useSnapshots } from '@/lib/hooks/useApi';
import ContextPanel from './ContextPanel';
import WorkflowRunner from './WorkflowRunner';
import BroadcastInbox from './Broadcast/BroadcastInbox';

export default function Insights() {
  const { selectedObject } = useAppContext();

  // Fetch real stats
  const { data: objects, isLoading: objectsLoading } = useMemoryFacts();
  const { data: snapshots, isLoading: snapshotsLoading } = useSnapshots();

  const objectCount = objects?.length || 0;
  const relationCount = snapshots?.[2]?.edges.length || 0; // Use latest snapshot (t2)
  const isOnline = !objectsLoading && !snapshotsLoading; // Consider online if not loading

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
        {/* Context Panel */}
        <ContextPanel selectedObject={selectedObject} />

        {/* Workflow Runner */}
        <WorkflowRunner />

        {/* Broadcast Inbox */}
        <BroadcastInbox />
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
