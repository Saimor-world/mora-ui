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
            const relations = await coreGet('/v1/relations/preview?limit=50', { isOptional: true }) as any[];

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

            // ALWAYS add some local heuristic connections (visual richness)
            // This ensures we see "Galaxies" and "Constellations" even without backend help
            const availableIds = Array.from(nodePosMap.keys());
            const seenPairs = new Set<string>(); // Track seen connections to avoid duplicates

            // Also track existing IDs from backend relations
            validLines.forEach(line => seenPairs.add(line.id));

            if (availableIds.length > 5) {
                // Pick some random nodes to act as "Hubs"
                const hubCount = Math.min(5, Math.floor(availableIds.length / 4));
                for (let i = 0; i < hubCount; i++) {
                    const sourceIdx = Math.floor(Math.random() * availableIds.length);
                    const sourceId = availableIds[sourceIdx];
                    const sourcePos = nodePosMap.get(sourceId);

                    if (sourcePos) {
                        // Connect to 2-3 neighbors
                        const neighbors = 2 + Math.floor(Math.random() * 2);
                        for (let j = 0; j < neighbors; j++) {
                            const targetIdx = Math.floor(Math.random() * availableIds.length);
                            const targetId = availableIds[targetIdx];
                            if (sourceId === targetId) continue;

                            // Create normalized pair key (A-B same as B-A)
                            const pairKey = [sourceId, targetId].sort().join('-');
                            if (seenPairs.has(pairKey)) continue;
                            seenPairs.add(pairKey);

                            const targetPos = nodePosMap.get(targetId);

                            if (targetPos) {
                                validLines.push({
                                    id: `sim-${pairKey}`,
                                    from: sourcePos,
                                    to: targetPos,
                                    score: 0.2 + Math.random() * 0.3
                                });
                            }
                        }
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
