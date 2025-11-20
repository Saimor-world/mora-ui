'use client';

import React, { useRef, useEffect, useState } from 'react';
import MyceliumGraph2D from './FieldMode/MyceliumGraph2D';
import type { Snapshot } from '@/lib/types';

interface MyceliumBackgroundProps {
    snapshots: Snapshot[];
    isLoading?: boolean;
    blur?: boolean;
    opacity?: number;
    onNodeClick?: (node: any) => void;
}

export const MyceliumBackground: React.FC<MyceliumBackgroundProps> = ({
    snapshots,
    isLoading = false,
    blur = false,
    opacity = 1,
    onNodeClick,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    const handleNodeClick = (node: any) => {
        const nodeId = typeof node === 'string' ? node : node?.id;
        setSelectedNode(nodeId);
        console.log('🌿 Mycelium node selected:', nodeId);
        if (onNodeClick) {
            onNodeClick(node);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedNode(null);
                if (onNodeClick) onNodeClick(null);
            }
            if (e.key === 'r' || e.key === 'R') {
                console.log('🔄 Reset camera view');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNodeClick]);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-0 pointer-events-auto transition-all duration-500"
            style={{
                opacity,
                filter: blur ? 'blur(8px)' : 'blur(0px)',
            }}
        >
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
                }}
            />

            {!isLoading && snapshots.length > 0 && (
                <MyceliumGraph2D
                    snapshot={snapshots[0]}
                    selectedNodeId={selectedNode || undefined}
                    onNodeClick={handleNodeClick}
                />
            )}

            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <div className="relative w-32 h-32 mx-auto">
                            <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full animate-ping" />
                            <div className="absolute inset-4 border-4 border-mora-gold/40 rounded-full animate-pulse" />
                            <div className="absolute inset-8 border-4 border-emerald-400/60 rounded-full animate-spin" />
                        </div>
                        <p className="text-emerald-400/70 text-sm font-light tracking-wide">
                            Growing mycelium network...
                        </p>
                    </div>
                </div>
            )}

            {!isLoading && snapshots.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-3 px-6">
                        <div className="text-6xl opacity-30">🌱</div>
                        <p className="text-emerald-500/50 text-sm">
                            No data sources connected yet
                        </p>
                        <p className="text-emerald-600/40 text-xs max-w-xs mx-auto">
                            Connect data sources in the intro flow to see your knowledge graph grow
                        </p>
                    </div>
                </div>
            )}

            {selectedNode && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/60 backdrop-blur-md border border-emerald-500/30 rounded-full">
                    <p className="text-emerald-400 text-sm font-mono">
                        Selected: <span className="text-mora-gold">{selectedNode}</span>
                    </p>
                    <p className="text-emerald-600 text-xs mt-1">
                        Press <kbd className="px-2 py-0.5 bg-white/10 rounded">ESC</kbd> to deselect
                    </p>
                </div>
            )}

            <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/40 backdrop-blur-sm border border-emerald-900/30 rounded text-xs text-emerald-600/60 font-mono">
                Press <kbd className="px-1.5 bg-white/10 rounded">R</kbd> to reset view
            </div>
        </div>
    );
};
