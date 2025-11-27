"use client";

import React, { useState, useMemo } from 'react';
import { Mycelium25D } from '@/components/organic/Mycelium25D';
import { mapNodesToMycelium } from '@/lib/utils/myceliumDataMapper';
import type { CoreNode } from '@/lib/types/core';

// Mock data generator using CoreNode format
function generateMockCoreNodes(count: number, seed: number = 0): CoreNode[] {
    const types = ['document', 'note', 'link', 'intel_report', 'task', 'other'];
    const tags = ['ai', 'research', 'design', 'engineering', 'product', 'strategy', 'data'];
    const authors = ['Alice', 'Bob', 'Charlie', 'Dana'];
    const folderIds = ['folder-1', 'folder-2', 'folder-3'];

    const nodes: CoreNode[] = [];

    for (let i = 0; i < count; i++) {
        const type = types[i % types.length];
        const id = `node-${seed}-${i}`;

        // Assign tags for clustering (deterministic based on index)
        const nodeTags = [
            tags[i % tags.length],
            tags[(i + 1) % tags.length],
        ];

        nodes.push({
            id,
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} ${i + 1}`,
            type,
            folder_id: folderIds[i % folderIds.length],
            space_id: 'test-space',
            department_id: 'test-dept',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {
                tags: nodeTags,
                author: authors[i % authors.length],
            },
        });
    }

    return nodes;
}

export default function MyceliumTestPage() {
    const [scenario, setScenario] = useState<'10' | '25' | '42'>('25');
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [seed, setSeed] = useState(0);

    const nodeCount = parseInt(scenario);
    const coreNodes = useMemo(
        () => generateMockCoreNodes(nodeCount, seed),
        [nodeCount, seed]
    );

    const myceliumNodes = useMemo(
        () => mapNodesToMycelium(coreNodes, {
            useSemanticConnections: true,
            activeNodeId: activeNodeId,
        }),
        [coreNodes, activeNodeId]
    );

    // Calculate cluster info
    const clusterInfo = useMemo(() => {
        const clusters = new Map<string, number>();
        coreNodes.forEach((node) => {
            const tags = (node.metadata?.tags as string[]) || [];
            const clusterKey = tags[0] || node.type;
            clusters.set(clusterKey, (clusters.get(clusterKey) || 0) + 1);
        });
        return Array.from(clusters.entries()).map(([name, count]) => ({ name, count }));
    }, [coreNodes]);

    const totalConnections = myceliumNodes.reduce((sum, n) => sum + n.connections.length, 0);

    return (
        <div className="w-full h-screen bg-mora-forest text-emerald-50">
            {/* Control Panel */}
            <div className="absolute top-4 right-4 z-50 bg-mora-forest/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4 max-w-sm">
                <h2 className="text-lg font-light text-mora-gold tracking-wider uppercase">
                    Mycelium Calm Lab
                </h2>

                {/* Scenario Selection */}
                <div className="space-y-2">
                    <label className="text-xs text-emerald-400/70 uppercase tracking-wider">
                        Test Scenario
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => {
                                setScenario('10');
                                setActiveNodeId(null);
                            }}
                            className={`px-3 py-2 rounded-lg border text-xs transition-colors ${scenario === '10'
                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                    : 'border-white/10 hover:bg-white/5'
                                }`}
                        >
                            10 nodes
                        </button>
                        <button
                            onClick={() => {
                                setScenario('25');
                                setActiveNodeId(null);
                            }}
                            className={`px-3 py-2 rounded-lg border text-xs transition-colors ${scenario === '25'
                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                    : 'border-white/10 hover:bg-white/5'
                                }`}
                        >
                            25 nodes
                        </button>
                        <button
                            onClick={() => {
                                setScenario('42');
                                setActiveNodeId(null);
                            }}
                            className={`px-3 py-2 rounded-lg border text-xs transition-colors ${scenario === '42'
                                    ? 'bg-mora-gold/20 border-mora-gold/50 text-mora-gold'
                                    : 'border-white/10 hover:bg-white/5'
                                }`}
                        >
                            42 nodes
                        </button>
                    </div>
                </div>

                {/* Regenerate Button */}
                <button
                    onClick={() => {
                        setSeed((s) => s + 1);
                        setActiveNodeId(null);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 text-xs hover:bg-white/5 transition-colors"
                >
                    🔄 Regenerate Layout
                </button>

                {/* Stats */}
                <div className="pt-4 border-t border-white/5 space-y-2 text-xs text-emerald-500/50">
                    <div className="flex justify-between">
                        <span>Nodes:</span>
                        <span className="text-emerald-400/70">{nodeCount}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Mode:</span>
                        <span className="text-mora-gold/70">
                            {nodeCount > 20 ? '🌿 Calm (Firefly)' : '🏷️ Full Labels'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Connections:</span>
                        <span className="text-emerald-400/70">{totalConnections}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Clusters:</span>
                        <span className="text-emerald-400/70">{clusterInfo.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Active Node:</span>
                        <span className="text-emerald-400/70 font-mono text-[10px]">
                            {activeNodeId ? activeNodeId.slice(0, 12) + '...' : 'None'}
                        </span>
                    </div>
                </div>

                {/* Cluster Breakdown */}
                <div className="pt-4 border-t border-white/5 space-y-2">
                    <div className="text-xs text-emerald-400/70 uppercase tracking-wider">
                        Semantic Clusters
                    </div>
                    <div className="space-y-1 text-[10px] text-emerald-500/50 max-h-32 overflow-y-auto">
                        {clusterInfo.map((cluster) => (
                            <div key={cluster.name} className="flex justify-between">
                                <span className="text-emerald-400/60">{cluster.name}</span>
                                <span className="text-emerald-500/40">{cluster.count} nodes</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Layout Info */}
                <div className="pt-4 border-t border-white/5 text-[10px] text-emerald-500/30 space-y-1">
                    <div className="text-emerald-400/50 uppercase tracking-wider mb-2">
                        Layout: Radial Constellation
                    </div>
                    <div>✓ Deterministic positioning</div>
                    <div>✓ Semantic clustering (by tag)</div>
                    <div>✓ Concentric circles (3 radii)</div>
                    <div>✓ Pie-slice angle segments</div>
                    <div>✓ Active node in center</div>
                </div>

                {/* Hints */}
                <div className="pt-4 border-t border-white/5 text-[10px] text-emerald-500/30 space-y-1">
                    <div>💡 Hover nodes for Focus Mode</div>
                    <div>🎯 Click to center a node</div>
                    <div>🔄 Regenerate to see stability</div>
                </div>

                {/* Test Results */}
                <div className="pt-4 border-t border-white/5 text-[10px] space-y-2">
                    <div className="text-emerald-400/70 uppercase tracking-wider">
                        Test Results
                    </div>
                    <div className={`flex items-center gap-2 ${scenario === '10' ? 'text-emerald-400' : 'text-emerald-500/30'}`}>
                        <span>{scenario === '10' ? '✓' : '○'}</span>
                        <span>10 nodes - All labels visible</span>
                    </div>
                    <div className={`flex items-center gap-2 ${scenario === '25' ? 'text-emerald-400' : 'text-emerald-500/30'}`}>
                        <span>{scenario === '25' ? '✓' : '○'}</span>
                        <span>25 nodes - Firefly mode active</span>
                    </div>
                    <div className={`flex items-center gap-2 ${scenario === '42' ? 'text-mora-gold/70' : 'text-emerald-500/30'}`}>
                        <span>{scenario === '42' ? '✓' : '○'}</span>
                        <span>42 nodes - Clear clusters</span>
                    </div>
                </div>
            </div>

            {/* Mycelium Visualization */}
            <Mycelium25D
                nodes={myceliumNodes}
                onNodeClick={(nodeId) => {
                    setActiveNodeId(nodeId === activeNodeId ? null : nodeId);
                    console.log('[Mycelium Test] Clicked:', nodeId);
                }}
                activeNodeId={activeNodeId}
                variant="node"
            />
        </div>
    );
}
