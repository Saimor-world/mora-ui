'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Timeline from './FieldMode/Timeline';
import MyceliumGraph2D, {
  type MyceliumGraph2DRef,
  type GraphStats,
} from './FieldMode/MyceliumGraph2D';
import FilterBadge from '@/components/ui/FilterBadge';
import { mockSnapshots } from '@/lib/mockData';
import { useSnapshots } from '@/lib/hooks/useApi';
import type { MoraObject } from '@/lib/types';
import { useSessionStore } from '@/store/session';
import { emitMoraEvent } from '@/lib/mora/listener';
import { useRole } from '@/lib/hooks/useRole';
import { useMyceliumSelection, mapObjectToNode } from '@/lib/mycelium/selection';
import { useSemanticEvents } from '@/lib/hooks/useSemanticEvents';
import { useMindloopSynthesis } from '@/lib/hooks/useMindloopSynthesis';
import { useThoughtBubbles } from '@/lib/contexts/ThoughtBubbleContext';
import SpaceHeader from '@/components/spaces/SpaceHeader';
import { OrganicStatePanel } from '@/components/organic/OrganicStatePanel';

interface FieldModeProps {
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

export default function FieldMode({ onNodeSelect, initialFocusIds, spaceId }: FieldModeProps) {
  const [currentSnapshot, setCurrentSnapshot] = useState(0);
  const [selectedNode, setSelectedNode] = useState<MoraObject | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [graphStats, setGraphStats] = useState<GraphStats | null>(null);
  const initialFocusAppliedRef = useRef(false);
  const lastSemanticEventIdRef = useRef<string | null>(null);
  const setLastSnapshotId = useSessionStore((state) => state.setLastSnapshotId);
  const graphRef = useRef<MyceliumGraph2DRef>(null);
  const { definition: roleDefinition } = useRole();
  const { selection, setSelection } = useMyceliumSelection();
  const { pushBubble } = useThoughtBubbles();

  // Fetch real snapshots from API
  const { data: apiSnapshots, isLoading, error } = useSnapshots();

  // Fetch semantic events (polling every 8s when enabled + online)
  const { data: semanticEvents } = useSemanticEvents();
  const { summary: synthesisSummary } = useMindloopSynthesis();
  const ambientSignalStrength = computeAmbientStrength(synthesisSummary?.highest_severity);

  // Prefer API snapshots only if they contain node data, otherwise fall back to mock data
  const hasLiveSnapshots = apiSnapshots?.some((snap) => (snap?.nodes?.length ?? 0) > 0) ?? false;
  const snapshots = hasLiveSnapshots ? apiSnapshots! : mockSnapshots;

  const snapshot = snapshots[currentSnapshot] || snapshots[0];
  const snapshotTimestamps = useMemo(() => snapshots.map((s) => s.ts), [snapshots]);
  const snapshotHasNodes = (snapshot?.nodes?.length ?? 0) > 0;
  const snapshotLabel = `t${currentSnapshot}`;
  const showLoadingState = isLoading && !hasLiveSnapshots;
  const showErrorState = !isLoading && !hasLiveSnapshots && !!error;
  const snapshotError = error instanceof Error ? error.message : undefined;

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
    // Apply deep-linked focus (query param) once when available
    if (!initialFocusIds || initialFocusAppliedRef.current) return;
    const targetId = initialFocusIds.find((id) => snapshot?.nodes.some((node) => node.id === id));
    if (targetId) {
      const found = snapshot?.nodes.find((node) => node.id === targetId);
      if (found) {
        setSelection({ kind: 'node', node: mapObjectToNode(found), object: found });
        setSelectedNode(found);
      }
    }
    // Ensure we only attempt to apply incoming focus once
    initialFocusAppliedRef.current = true;
  }, [initialFocusIds, snapshot, setSelection]);

  useEffect(() => {
    const latest = semanticEvents && semanticEvents.length > 0 ? semanticEvents[0] : null;
    if (latest?.message && latest.event_id !== lastSemanticEventIdRef.current) {
      lastSemanticEventIdRef.current = latest.event_id;
      pushBubble({ message: latest.message, title: 'Semantic', source: 'semantic' });
    }
  }, [semanticEvents, pushBubble]);

  useEffect(() => {
    if (snapshot?.ts) {
      setLastSnapshotId(snapshot.ts);
    }
  }, [snapshot?.ts, setLastSnapshotId]);

  const handleNodeClick = (node: MoraObject) => {
    // Awareness: keep Home feed in sync with focused nodes
    emitMoraEvent('node_click', {
      id: node.id,
      title: node.title,
      type: node.type,
      tags: node.tags,
    });
    setSelectedNode(node);
    onNodeSelect?.(node);
    setSelection({ kind: 'node', node: mapObjectToNode(node), object: node });
  };

  const handleResetView = () => {
    setResetSignal((value) => value + 1);
    graphRef.current?.resetView();
  };

  const handleTimelineJump = () => {
    setCurrentSnapshot(snapshots.length - 1);
  };

  if (showLoadingState) {
    return <OrganicStatePanel variant="loading" />;
  }

  if (showErrorState) {
    return (
      <OrganicStatePanel
        variant="error"
        description={snapshotError}
        actionLabel="Erneut versuchen"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="h-full relative bg-gradient-to-b from-[#08120e] via-[#0a1612] to-[#06100c] overflow-hidden">
      {/* The Field - Pure Mycelium Canvas mit stärkerem Mondlicht */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.12),transparent_60%),radial-gradient(circle_at_70%_80%,rgba(251,191,36,0.08),transparent_55%),radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.06),transparent_65%),radial-gradient(ellipse_at_85%_15%,rgba(168,85,247,0.05),transparent_40%)]">

        {/* Floating Organism: Core Status */}
        {!hasLiveSnapshots && !isLoading && (
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10 max-w-md animate-in fade-in slide-in-from-top duration-1000">
            <div className="bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent backdrop-blur-xl border border-amber-500/20 rounded-3xl p-5 shadow-[0_8px_32px_0_rgba(251,191,36,0.15)] hover:shadow-[0_12px_48px_0_rgba(251,191,36,0.25)] transition-all duration-700">
              <div className="flex items-start gap-3">
                <div className="text-xl animate-pulse">🍄</div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-sm font-medium text-amber-200/90">
                    Myzelium im Demo-Modus
                  </p>
                  <p className="text-xs text-amber-300/60 leading-relaxed">
                    Core schläft. Das Geflecht zeigt Erinnerungen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {showLoadingState ? (
          <div className="h-full flex items-center justify-center" role="status" aria-live="polite">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">
                Mora sammelt Snapshot-Daten. Einen Moment bitte.
              </p>
            </div>
          </div>
        ) : snapshotHasNodes ? (
          <>
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

            {/* Space Header (if in space context) */}
            {spaceId && <SpaceHeader spaceId={spaceId} />}

            {/* Floating Organism: Field Stats */}
            <div className={`absolute ${spaceId ? 'top-24' : 'top-6'} left-6 bg-gradient-to-br from-emerald-950/30 via-emerald-900/15 to-transparent backdrop-blur-2xl border border-emerald-500/10 rounded-3xl p-5 text-sm space-y-3 shadow-[0_8px_32px_0_rgba(16,185,129,0.08)] hover:shadow-[0_12px_48px_0_rgba(16,185,129,0.15)] transition-all duration-700 animate-in fade-in slide-in-from-left duration-1000`}>
              <div className="font-medium flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase">
                  {snapshotLabel}
                </span>
                <span>{snapshot?.ts}</span>
                {error && <span className="text-xs text-amber-500">offline</span>}
                {!hasLiveSnapshots && (
                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded border border-amber-500/30">
                    Demo-Daten
                  </span>
                )}
                <button
                  onClick={handleResetView}
                  className="ml-auto px-3 py-1.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 backdrop-blur-sm text-xs transition-all duration-700 hover:scale-105 border border-emerald-500/20 text-emerald-200/70"
                >
                  Feld zentrieren
                </button>
              </div>
              <div className="text-muted-foreground space-y-1">
                <div>{snapshot?.nodes.length || 0} Nodes</div>
                <div>{snapshot?.edges.length || 0} Edges</div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                {roleDefinition.fieldHint}
              </p>
            </div>

            {/* Telemetry toggle */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="absolute bottom-4 left-4 flex flex-col gap-2">
                <button
                  onClick={() => setShowTelemetry((prev) => !prev)}
                  className="px-3 py-1.5 rounded-full bg-card/80 border border-border text-xs font-semibold shadow"
                >
                  {showTelemetry ? 'Telemetry ausblenden' : 'Telemetry anzeigen'}
                </button>
                {showTelemetry && graphStats && (
                  <div className="px-3 py-2 rounded-2xl bg-card/80 border border-border text-xs shadow">
                    <div>{graphStats.nodes} Nodes</div>
                    <div>{graphStats.edges} Edges</div>
                    <div>{graphStats.fps} FPS</div>
                  </div>
                )}
              </div>
            )}

            {/* Floating Organisms: Navigation Spores */}
            <div className="absolute bottom-8 right-8 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom duration-1000">
              <button
                onClick={() => graphRef.current?.zoomOut()}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 backdrop-blur-2xl border border-emerald-400/20 shadow-[0_4px_16px_0_rgba(16,185,129,0.2)] flex items-center justify-center text-lg text-emerald-200/80 hover:from-emerald-500/30 hover:to-emerald-600/20 hover:scale-110 hover:rotate-12 transition-all duration-700 hover:shadow-[0_8px_24px_0_rgba(16,185,129,0.35)]"
                aria-label="Rauszoomen"
                title="Perspektive weiten"
              >
                −
              </button>
              <button
                onClick={handleResetView}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 backdrop-blur-2xl border border-amber-400/20 shadow-[0_4px_16px_0_rgba(251,191,36,0.2)] flex items-center justify-center text-base text-amber-200/80 hover:from-amber-500/30 hover:to-amber-600/20 hover:scale-110 hover:rotate-12 transition-all duration-700 hover:shadow-[0_8px_24px_0_rgba(251,191,36,0.35)]"
                aria-label="Zentrieren"
                title="Zum Zentrum des Geflechts"
              >
                ◉
              </button>
              <button
                onClick={() => graphRef.current?.fitView()}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-2xl border border-blue-400/20 shadow-[0_4px_16px_0_rgba(59,130,246,0.2)] flex items-center justify-center text-base text-blue-200/80 hover:from-blue-500/30 hover:to-blue-600/20 hover:scale-110 hover:rotate-12 transition-all duration-700 hover:shadow-[0_8px_24px_0_rgba(59,130,246,0.35)]"
                aria-label="Alles sehen"
                title="Gesamtes Geflecht zeigen"
              >
                ⊡
              </button>
              <button
                onClick={handleTimelineJump}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-2xl border border-purple-400/20 shadow-[0_4px_16px_0_rgba(168,85,247,0.2)] flex items-center justify-center text-base text-purple-200/80 hover:from-purple-500/30 hover:to-purple-600/20 hover:scale-110 hover:rotate-180 transition-all duration-700 hover:shadow-[0_8px_24px_0_rgba(168,85,247,0.35)]"
                aria-label="Neuestes Wachstum"
                title="Zur Gegenwart springen"
              >
                ⟳
              </button>
            </div>

            {/* Floating Organism: Node Details - Growing Info Pod */}
            {selectedNode && (
              <div className="absolute top-20 right-8 w-96 bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-transparent backdrop-blur-2xl border border-emerald-400/15 rounded-3xl shadow-[0_12px_48px_0_rgba(16,185,129,0.2)] overflow-hidden animate-in slide-in-from-right fade-in duration-700">
                {/* Pod Header */}
                <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border-b border-emerald-400/10 p-5 backdrop-blur-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor:
                          selectedNode.type === 'project' ? '#F5B800' :
                          selectedNode.type === 'document' ? '#60A5FA' :
                          selectedNode.type === 'code' ? '#34D399' :
                          selectedNode.type === 'insight' ? '#F472B6' : '#9CA3AF'
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{selectedNode.title}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{selectedNode.type || 'Unknown'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 w-8 h-8 rounded-full border border-border/80 flex items-center justify-center hover:bg-card"
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Quick Actions - Organic Buttons */}
                  <div className="flex gap-2 mt-4">
                    {selectedNode.url && (
                      <a
                        href={selectedNode.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500/60 to-emerald-600/40 backdrop-blur-sm text-emerald-50 rounded-3xl text-sm font-medium hover:from-emerald-500/70 hover:to-emerald-600/50 transition-all duration-700 hover:shadow-[0_4px_16px_0_rgba(16,185,129,0.4)] hover:scale-[1.03] flex items-center justify-center gap-2"
                      >
                        <span>🌱</span>
                        <span>Öffnen</span>
                      </a>
                    )}
                    {selectedNode.source === 'mock' && (
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded border border-amber-500/30 whitespace-nowrap flex items-center gap-1">
                        <span>⚠️</span>
                        <span>Demo</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3 text-sm max-h-96 overflow-y-auto">
                  {selectedNode.path && (
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 font-medium">
                        <span className="text-base">📁</span>
                        <span>Path</span>
                      </div>
                      <div className="text-foreground/90 font-mono text-xs break-all">
                        {selectedNode.path}
                      </div>
                    </div>
                  )}

                  {selectedNode.spaceId && !selectedNode.path && (
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 font-medium">
                        <span className="text-base">🌐</span>
                        <span>Space</span>
                      </div>
                      <div className="text-foreground/90 font-mono text-xs break-all">
                        {selectedNode.spaceId}
                      </div>
                    </div>
                  )}

                  {selectedNode.url && (
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 font-medium">
                        <span className="text-base">🔗</span>
                        <span>URL</span>
                      </div>
                      <a
                        href={selectedNode.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline text-xs break-all inline-flex items-center gap-1 transition-colors"
                      >
                        {selectedNode.url}
                        <span className="text-xs">↗</span>
                      </a>
                    </div>
                  )}

                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Tags</div>
                    {selectedNode.tags && selectedNode.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-foreground">-</div>
                    )}
                  </div>

                  {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Metadata</div>
                      <div className="text-xs space-y-1">
                        {Object.entries(selectedNode.metadata).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="text-foreground font-mono">{JSON.stringify(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Created</div>
                    <div className="text-foreground">
                      {selectedNode.ts ? new Date(selectedNode.ts).toLocaleString() : '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
            <div className="text-primary font-semibold">Keine Objekte im aktuellen Snapshot.</div>
            <p className="text-sm text-muted-foreground max-w-md">
              Verbinde eine Quelle oder waehle eine andere Timeline, damit Mora das Myzel aufbauen kann.
            </p>
          </div>
        )}
      </div>

      {/* Floating Organism: Timeline - Growth Rings */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 max-w-3xl w-full px-8 animate-in fade-in slide-in-from-bottom duration-1000">
        <div className="bg-gradient-to-r from-emerald-950/20 via-emerald-900/10 to-emerald-950/20 backdrop-blur-2xl border border-emerald-500/10 rounded-full p-4 shadow-[0_8px_32px_0_rgba(16,185,129,0.12)]">
          <Timeline
            snapshots={snapshotTimestamps}
            current={currentSnapshot}
            onChange={setCurrentSnapshot}
          />
        </div>
      </div>
    </div>
  );
}
