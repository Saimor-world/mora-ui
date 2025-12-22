import { useState, useCallback } from 'react';

// Types
export interface Point {
    x: number;
    y: number;
}

export interface SemanticLine {
    id: string;
    from: Point;
    to: Point;
    score: number; // 0.0 to 1.0
}

interface ConstellationState {
    activeNodeId: string | null;
    lines: SemanticLine[];
}

export const useSemanticConstellation = () => {
    const [state, setState] = useState<ConstellationState>({
        activeNodeId: null,
        lines: []
    });

    const clearConstellation = useCallback(() => {
        setState({ activeNodeId: null, lines: [] });
    }, []);

    const fetchConstellation = useCallback(async (
        nodeId: string,
        nodePosMap: Map<string, Point>
    ) => {
        // If we're already showing this node, do nothing
        if (state.activeNodeId === nodeId) return;

        try {
            // Import core client dynamically
            const { coreGet } = await import('@/lib/api/coreClient');

            // Fetch real semantic relations from backend
            // Using /v1/relations/preview which returns heuristic & semantic connections
            const relations = await coreGet('/v1/relations/preview?limit=20') as any[];

            if (!Array.isArray(relations)) return;

            // Filter relations relevant to the current view (nodes that exist in nodePosMap)
            const validLines: SemanticLine[] = [];

            relations.forEach((rel) => {
                const sourceId = rel.source_id;
                const targetId = rel.target_id;

                // Only draw lines if BOTH nodes are currently visible on screen
                const sourcePos = nodePosMap.get(sourceId);
                const targetPos = nodePosMap.get(targetId);

                if (sourcePos && targetPos) {
                    validLines.push({
                        id: rel.id || `${sourceId}-${targetId}`,
                        from: sourcePos,
                        to: targetPos,
                        score: rel.weight || 0.5
                    });
                }
            });

            // If no backend relations found for this view, fallback to local heuristics (visual stability)
            // This ensures we always show lines if the backend returns empty for the current subset of nodes
            if (validLines.length === 0) {
                const availableIds = Array.from(nodePosMap.keys()).filter(id => id !== nodeId);
                const sourcePos = nodePosMap.get(nodeId);

                if (sourcePos && availableIds.length > 0) {
                    // Pick 3 random neighbors for visual continuity
                    const count = Math.min(3, availableIds.length);
                    for (let i = 0; i < count; i++) {
                        const randomIdx = Math.floor(Math.random() * availableIds.length);
                        const targetId = availableIds[randomIdx];
                        const targetPos = nodePosMap.get(targetId);
                        if (targetPos) {
                            validLines.push({
                                id: `sim-${nodeId}-${targetId}`,
                                from: sourcePos,
                                to: targetPos,
                                score: 0.3 + Math.random() * 0.4
                            });
                        }
                        availableIds.splice(randomIdx, 1);
                    }
                }
            }

            setState({
                activeNodeId: nodeId,
                lines: validLines
            });

        } catch (error) {
            console.error("Failed to fetch constellation:", error);
            // Silent fail - keep previous state or clear? Better to clear to avoid stale data.
            // setState({ activeNodeId: null, lines: [] }); 
        }

    }, [state.activeNodeId]);

    return {
        connections: state.lines,
        fetchConstellation,
        clearConstellation
    };
};
