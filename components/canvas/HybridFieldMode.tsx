"use client";

import { useMemo, useState, useEffect, useRef } from 'react';
import { Layers, Database, Activity, Cpu } from 'lucide-react';
import MyceliumGraph2D, {
  type MyceliumGraph2DRef,
  type GraphStats,
} from './FieldMode/MyceliumGraph2D';
import { mockSnapshots } from '@/lib/mockData';
import { useSnapshots } from '@/lib/hooks/useApi';
import type { MoraObject } from '@/lib/types';
import { useSessionStore } from '@/store/session';
import { useRole } from '@/lib/hooks/useRole';
import { useMyceliumSelection, mapObjectToNode } from '@/lib/mycelium/selection';
import { useSemanticEvents } from '@/lib/hooks/useSemanticEvents';
import { useMindloopSynthesis } from '@/lib/hooks/useMindloopSynthesis';

// Organic components from Antigravity
import { OrganicBackground } from '@/components/organic/OrganicBackground';
import { MoraOrb } from '@/components/organic/MoraOrb';
import { OrganicInput } from '@/components/organic/OrganicInput';
import { DataCluster } from '@/components/organic/DataCluster';
import SpaceHeader from '@/components/spaces/SpaceHeader';

interface HybridFieldModeProps {
  onNodeSelect?: (node: MoraObject) => void;
  initialFocusIds?: string[];
  spaceId?: string;
}

export function computeAmbientStrength(highestSeverity?: number) {
  if (typeof highestSeverity !== 'number') return 0;
  const intensity = (highestSeverity - 0.7) / 0.3;
  if (!Number.isFinite(intensity)) return 0;
  return Math.max(0, Math.min(1, intensity));
}

export default function HybridFieldMode({ onNodeSelect, initialFocusIds, spaceId }: HybridFieldModeProps) {
  const [currentSnapshot, setCurrentSnapshot] = useState(0);
  const [selectedNode, setSelectedNode] = useState<MoraObject | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [graphStats, setGraphStats] = useState<GraphStats | null>(null);
  const [blueprintMode, setBlueprintMode] = useState(false);
  const [orbState, setOrbState] = useState<'idle' | 'speaking' | 'processing' | 'listening'>('idle');

  const initialFocusAppliedRef = useRef(false);
  const lastSemanticEventIdRef = useRef<string | null>(null);
  const setLastSnapshotId = useSessionStore((state) => state.setLastSnapshotId);
  const graphRef = useRef<MyceliumGraph2DRef>(null);
  const { definition: roleDefinition } = useRole();
  const { selection, setSelection } = useMyceliumSelection();

  // Fetch real snapshots from API
  const { data: apiSnapshots, isLoading, error } = useSnapshots();

  // Fetch semantic events
  const { data: semanticEvents } = useSemanticEvents();
  const { summary: synthesisSummary } = useMindloopSynthesis();
  const ambientSignalStrength = computeAmbientStrength(synthesisSummary?.highest_severity);

  // Prefer API snapshots only if they contain node data
  const hasLiveSnapshots = apiSnapshots?.some((snap) => (snap?.nodes?.length ?? 0) > 0) ?? false;
  const snapshots = hasLiveSnapshots ? apiSnapshots! : mockSnapshots;

  const snapshot = snapshots[currentSnapshot] || snapshots[0];
  const snapshotHasNodes = (snapshot?.nodes?.length ?? 0) > 0;

  // Detect AI activity and update orb state
  useEffect(() => {
    if (semanticEvents && semanticEvents.length > 0) {
      setOrbState('processing');
      const timer = setTimeout(() => setOrbState('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [semanticEvents]);

  useEffect(() => {
    if (selection.kind !== 'node') return;
    const found = snapshot?.nodes.find((node) => node.id === selection.node.id);
    if (found) {
      setSelectedNode(found);
    } else {
      const fallback: MoraObject = {
        id: selection.node.id,
        title: selection.node.label,
        type: selection.node.type ?? 'document',
        tags: selection.node.tags ?? [],
        spaceId: (selection.node.space as string) ?? '',
      };
      setSelectedNode(fallback);
    }
  }, [selection, snapshot]);

  useEffect(() => {
    if (!snapshot || initialFocusAppliedRef.current) return;
    if (initialFocusIds && initialFocusIds.length > 0) {
      const firstFocusId = initialFocusIds[0];
      const foundNode = snapshot.nodes.find(n => n.id === firstFocusId);
      if (foundNode) {
        handleNodeClick(foundNode);
        initialFocusAppliedRef.current = true;
      }
    }
  }, [snapshot, initialFocusIds]);

  useEffect(() => {
    if (snapshot?.ts) {
      setLastSnapshotId(snapshot.ts);
    }
  }, [snapshot, setLastSnapshotId]);

  const handleNodeClick = (node: MoraObject) => {
    setSelectedNode(node);
    onNodeSelect?.(node);
    setSelection({ kind: 'node', node: mapObjectToNode(node), object: node });
  };

  const handleResetView = () => {
    setResetSignal((value) => value + 1);
    graphRef.current?.resetView();
  };

  const handleChatSend = (message: string) => {
    console.log('Chat message:', message);
    setOrbState('speaking');
    setTimeout(() => setOrbState('idle'), 2000);
  };

  const BlueprintLabel = ({ text, side = 'right' }: { text: string; side?: 'left' | 'right' }) => {
    if (!blueprintMode) return null;
    return (
      <div className={`absolute z-50 bg-blue-600/90 text-white text-[10px] font-mono px-2 py-1 rounded border border-blue-400/50 shadow-lg pointer-events-none whitespace-nowrap ${side === 'left' ? '-left-2 transform -translate-x-full' : '-right-2 transform translate-x-full'} top-0`}>
        ➔ {text}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Animated Organic Background */}
      <OrganicBackground intensity={1.2} breathingSpeed={3300} />

      {/* Space Header (wenn in space context) */}
      {spaceId && (
        <div className="absolute top-6 left-6 z-40">
          <SpaceHeader spaceId={spaceId} />
        </div>
      )}

      {/* Blueprint Mode Toggle */}
      <button
        onClick={() => setBlueprintMode(!blueprintMode)}
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs uppercase tracking-widest transition-all"
      >
        <Layers className="w-4 h-4" />
        {blueprintMode ? 'Blueprint: On' : 'Visual Mode'}
      </button>

      {/* Main Content Area */}
      <div className="flex-1 relative flex">
        {/* Mycelium Graph Layer (behind everything) */}
        {snapshotHasNodes && (
          <div className="absolute inset-0 z-10">
            <MyceliumGraph2D
              ref={graphRef}
              snapshot={snapshot}
              onNodeClick={handleNodeClick}
              resetSignal={resetSignal}
              focusNodeId={selectedNode?.id ?? null}
              selectedNodeId={selection.kind === 'node' ? selection.node.id : null}
              onStatsChange={setGraphStats}
              semanticEvents={semanticEvents || []}
              ambientSignalStrength={ambientSignalStrength}
            />
          </div>
        )}

        {/* Central Orb (nur wenn kein Node selected) */}
        {!selection && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <MoraOrb state={orbState} scale={0.8} />
            <BlueprintLabel text="MoraOrb - Breathing Heart" side="right" />
          </div>
        )}

        {/* Floating DataClusters - Satelliten */}
        {snapshotHasNodes && (
          <>
            <DataCluster
              top="15%"
              left="10%"
              label={`${snapshot.nodes.length} Nodes`}
              icon={Database}
              delay={0}
            />
            <BlueprintLabel text="Data Cluster 1" side="right" />

            <DataCluster
              top="15%"
              right="10%"
              label={`${snapshot.edges.length} Connections`}
              icon={Activity}
              delay={0.5}
            />

            <DataCluster
              bottom="25%"
              left="12%"
              label={hasLiveSnapshots ? '🟢 Live Data' : '🟡 Demo Mode'}
              icon={Cpu}
              delay={1}
            />

            {graphStats && (
              <DataCluster
                bottom="25%"
                right="12%"
                label={`${graphStats.fps} FPS`}
                icon={Activity}
                delay={1.5}
              />
            )}
          </>
        )}

        {/* Loading State */}
        {isLoading && !hasLiveSnapshots && (
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-mora-gold border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-emerald-200/70">
                Môra erwacht...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Chat Bar */}
      <div className="h-24 w-full flex items-center justify-center relative z-40 border-t border-white/5 bg-mora-forest/60 backdrop-blur-xl">
        <BlueprintLabel text="Organic Input - @ Comm System" side="right" />
        <OrganicInput onSend={handleChatSend} />
      </div>
    </div>
  );
}
