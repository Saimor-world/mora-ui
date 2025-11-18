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

interface FieldModeProps {
  onNodeSelect?: (node: MoraObject) => void;
  initialFocusIds?: string[];
}

export function computeAmbientStrength(highestSeverity?: number) {
  if (typeof highestSeverity !== 'number') return 0;
  const intensity = (highestSeverity - 0.7) / 0.3;
  if (!Number.isFinite(intensity)) return 0;
  return Math.max(0, Math.min(1, intensity));
}

export default function FieldMode({ onNodeSelect, initialFocusIds }: FieldModeProps) {
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

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-background via-card/20 to-background">
      {/* Section header */}
      <div className="border-b border-border/60 bg-card/80 px-4 sm:px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">Myzel-Ansicht</p>
            <h2 className="text-2xl font-semibold leading-tight">Field Mode</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {roleDefinition.fieldHint}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end text-xs text-muted-foreground">
            <span className="px-3 py-1 rounded-full border border-border/70 bg-card/70">
              {isLoading ? 'Snapshots werden geladen' : error ? 'Offline-Daten' : 'Live-Daten'}
            </span>
            {snapshot && (
              <span className="px-3 py-1 rounded-full border border-border/70 bg-card/70">
                Snapshot {snapshot.ts}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-border/60 bg-card/60 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {snapshot && (
              <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                {snapshot.nodes?.length || 0} Objekte · {snapshot.edges?.length || 0} Verbindungen
              </div>
            )}
            <FilterBadge />
            <span className="text-xs text-muted-foreground">Myzel deines Teams: Klick auf einen Knoten, der Kontext fließt in Insights & Chat.</span>
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
      </div>

      {/* 3D Scene */}
      <div className="flex-1 relative px-4 sm:px-6 py-6 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.08),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(234,179,8,0.08),transparent_42%)]">
        <div className="absolute inset-2 pointer-events-none border border-border/50 rounded-3xl opacity-40 blur-[1px]" aria-hidden="true" />
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

            {/* Stats overlay */}
            <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 text-sm space-y-2 shadow-lg">
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
                  className="ml-auto px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-xs mora-transition"
                >
                  Ansicht zuruecksetzen
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

            {/* Mini Toolbar */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
              <button
                onClick={() => graphRef.current?.zoomOut()}
                className="w-10 h-10 rounded-full bg-card/90 border border-border shadow flex items-center justify-center text-base hover:bg-card"
                aria-label="Zoom out"
              >
                -
              </button>
              <button
                onClick={handleResetView}
                className="w-10 h-10 rounded-full bg-card/90 border border-border shadow flex items-center justify-center text-base hover:bg-card"
                aria-label="Ansicht zentrieren"
              >
                Center
              </button>
              <button
                onClick={() => graphRef.current?.fitView()}
                className="w-10 h-10 rounded-full bg-card/90 border border-border shadow flex items-center justify-center text-base hover:bg-card"
                aria-label="Fit to view"
              >
                Fit
              </button>
              <button
                onClick={handleTimelineJump}
                className="w-10 h-10 rounded-full bg-card/90 border border-border shadow flex items-center justify-center text-base hover:bg-card"
                aria-label="Zum neuesten Snapshot springen"
              >
                Neu
              </button>
            </div>

            {/* Node Detail Panel */}
            {selectedNode && (
              <div className="absolute top-4 right-4 w-80 bg-card/95 backdrop-blur-sm border border-border rounded-2xl p-4 text-sm shadow-xl">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor:
                        selectedNode.type === 'project' ? '#F5B800' :
                        selectedNode.type === 'document' ? '#60A5FA' :
                        selectedNode.type === 'code' ? '#34D399' :
                        selectedNode.type === 'insight' ? '#F472B6' : '#9CA3AF'
                      }}
                    />
                    <span className="font-semibold text-base truncate">{selectedNode.title}</span>
                    {selectedNode.source === 'mock' && (
                      <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded border border-amber-500/30 whitespace-nowrap flex-shrink-0">
                        Demo
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 text-xs px-2 py-1 rounded-full border border-border/80"
                  >
                    Schliessen
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Type</div>
                    <div className="text-foreground capitalize">{selectedNode.type || 'â€”'}</div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Path</div>
                    <div className="text-foreground font-mono text-xs break-all">
                      {selectedNode.path || selectedNode.spaceId || 'â€”'}
                    </div>
                  </div>

                  {selectedNode.url && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">URL</div>
                      <a
                        href={selectedNode.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline text-xs break-all"
                      >
                        {selectedNode.url}
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

      {/* Timeline */}
      <div className="px-4 sm:px-6 pb-6 bg-card/40 border-t border-border/60">
        <div className="max-w-6xl mx-auto">
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
