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
            // Using /v3/relations/preview which returns heuristic & semantic connections
            const relations = await coreGet('/v3/relations/preview?limit=50', { isOptional: true }) as any[];

            if (!Array.isArray(relations)) return;

            // Filter relations relevant to the current view (nodes that exist in nodePosMap)
            const validLines: SemanticLine[] = [];

            relations.forEach((rel) => {
                // Backend returns "source"/"target", not "source_id"/"target_id"
                const sourceId = rel.source_id || rel.source;
                const targetId = rel.target_id || rel.target;

                if (!sourceId || !targetId) return;

                // Only keep relations that actually touch the hovered node
                if (sourceId !== nodeId && targetId !== nodeId) return;

                // Only draw lines if BOTH nodes are currently visible on screen
                const sourcePos = nodePosMap.get(sourceId);
                const targetPos = nodePosMap.get(targetId);

                if (sourcePos && targetPos) {
                    validLines.push({
                        id: rel.id || `${sourceId}-${targetId}`,
                        from: sourcePos,
                        to: targetPos,
                        score: rel.weight || rel.strength || 0.5
                    });
                }
            });

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
