"use client";

import React, { useEffect, useState } from 'react';
import { MyceliumField3D } from './MyceliumField3D';
import { applyMyceliumRelations, mapNodesToMycelium, type MyceliumNode } from '@/lib/utils/myceliumDataMapper';
import { getRelationsForSpace } from '@/lib/api/relationsClient';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import type { CoreNode } from '@/lib/types/core';

/**
 * MyceliumLayer
 *
 * Intelligent wrapper for Mycelium25D that:
 * - Fetches space relations from backend
 * - Converts to MyceliumNode format
 * - Handles loading/error states
 * - Auto-refreshes on space change
 */

interface MyceliumLayerProps {
    variant?: 'folder' | 'node' | 'department' | 'space';
    onNodeClick?: (nodeId: string) => void;
}

export const MyceliumLayer: React.FC<MyceliumLayerProps> = ({
    variant = 'space',
    onNodeClick
}) => {
    const activeSpaceId = useNavStore((s) => s.activeSpaceId);
    const activeNodeId = usePaneStore(s => {
        if (!s.activePaneId) return null;
        const pane = s.panes.find(p => p.id === s.activePaneId);
        return pane?.type === 'document' ? (pane.data?.nodeId ?? null) : null;
    });
    const [myceliumNodes, setMyceliumNodes] = useState<MyceliumNode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadMyceliumData = async () => {
            // Only load if we have a space context
            if (!activeSpaceId) {
                setMyceliumNodes([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // Fetch space graph (nodes + relations) from backend
                const spaceGraph = await getRelationsForSpace(activeSpaceId);

                if (!spaceGraph || !spaceGraph.nodes) {
                    console.warn('No space graph data received');
                    setMyceliumNodes([]);
                    setIsLoading(false);
                    return;
                }

                // Convert nodes to CoreNode format (ensure type compatibility)
                const coreNodes: CoreNode[] = spaceGraph.nodes.map(node => ({
                    id: node.id,
                    space_id: activeSpaceId,
                    folder_id: node.folder_id,
                    title: node.title || node.name || 'Untitled',
                    name: node.name || node.title || 'Untitled',
                    type: node.type || 'document',
                    url: node.url,
                    content: node.content,
                    metadata: node.metadata || {},
                    size: node.size || 0,
                    created_at: node.created_at,
                    updated_at: node.updated_at
                }));

                // Map to Mycelium format with semantic connections
                const myceliumData = applyMyceliumRelations(mapNodesToMycelium(coreNodes, {
                    useSemanticConnections: true,
                    activeNodeId
                }), spaceGraph.relations);

                setMyceliumNodes(myceliumData);
            } catch (err: any) {
                console.error('Failed to load Mycelium data:', err);
                setError(err.message || 'Failed to load visualization data');
                setMyceliumNodes([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadMyceliumData();

        // Refresh every 30 seconds to catch new nodes/relations
        const interval = setInterval(loadMyceliumData, 30000);
        return () => clearInterval(interval);
    }, [activeSpaceId, activeNodeId]);

    if (isLoading && myceliumNodes.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#030806]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-mora-gold/30 border-t-mora-gold rounded-full animate-spin" />
                    <p className="text-xs text-emerald-500/50 font-mono tracking-widest">
                        LOADING MYCELIUM NETWORK...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#030806]">
                <div className="text-center">
                    <p className="text-xs text-red-400/70 font-mono">ERROR: {error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <MyceliumField3D
            nodes={myceliumNodes}
            onNodeClick={onNodeClick}
            activeNodeId={activeNodeId}
        />
    );
};
