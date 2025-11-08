'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Timeline from './FieldMode/Timeline';
import { mockSnapshots } from '@/lib/mockData';
import { useSnapshots } from '@/lib/hooks/useApi';
import type { MoraObject } from '@/lib/types';

// Dynamically import Scene to avoid SSR issues with Three.js
const Scene = dynamic(() => import('./FieldMode/Scene'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="text-muted-foreground">Loading 3D Scene...</div>
    </div>
  ),
});

interface FieldModeProps {
  onNodeSelect?: (node: MoraObject) => void;
}

export default function FieldMode({ onNodeSelect }: FieldModeProps) {
  const [currentSnapshot, setCurrentSnapshot] = useState(0);

  // Fetch real snapshots from API
  const { data: apiSnapshots, isLoading, error } = useSnapshots();

  // Prefer API snapshots only if they contain node data, otherwise fall back to mock data
  const hasLiveSnapshots = apiSnapshots?.some((snap) => (snap?.nodes?.length ?? 0) > 0) ?? false;
  const snapshots = hasLiveSnapshots ? apiSnapshots! : mockSnapshots;

  const snapshot = snapshots[currentSnapshot] || snapshots[0];
  const snapshotTimestamps = snapshots.map((s) => s.ts);
  const snapshotHasNodes = (snapshot?.nodes?.length ?? 0) > 0;

  const handleNodeClick = (node: MoraObject) => {
    console.log('Node clicked:', node);
    onNodeSelect?.(node);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">🌐 Field Mode</h2>
          <div className="text-sm text-muted-foreground">
            {isLoading ? 'Loading snapshots...' : error ? 'Using offline data' : 'Live data'}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#F5B800]" />
            <span className="text-muted-foreground">Project</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#60A5FA]" />
            <span className="text-muted-foreground">Document</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#34D399]" />
            <span className="text-muted-foreground">Code</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#F472B6]" />
            <span className="text-muted-foreground">Insight</span>
          </div>
        </div>
      </div>

      {/* 3D Scene */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading 3D data...</p>
            </div>
          </div>
        ) : snapshotHasNodes ? (
          <>
            <Scene snapshot={snapshot} onNodeClick={handleNodeClick} />

            {/* Stats overlay */}
            <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 text-sm">
              <div className="font-medium mb-2 flex items-center gap-2">
                <span>Snapshot: {snapshot?.ts}</span>
                {error && <span className="text-xs text-amber-500">offline</span>}
              </div>
              <div className="text-muted-foreground space-y-1">
                <div>{snapshot?.nodes.length || 0} nodes</div>
                <div>{snapshot?.edges.length || 0} edges</div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
            <div className="text-primary font-semibold">No snapshot data available</div>
            <p className="text-sm text-muted-foreground">
              Could not load timeline data from the Core API. Showing fallback mock data once available.
              Please ensure the API is running on <code className="px-1">http://localhost:8081</code> or refresh to retry.
            </p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <Timeline
        snapshots={snapshotTimestamps}
        current={currentSnapshot}
        onChange={setCurrentSnapshot}
      />
    </div>
  );
}
