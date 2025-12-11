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

        // VISUAL SIMULATION for Stability Step
        // In a real implementation this would fetch from /v1/search/semantic
        // For now, we find random existing nodes in the view to connect to
        // to demonstrate the visual system without hitting a potentially offline backend.

        // Convert map keys to array to pick random neighbors
        const availableIds = Array.from(nodePosMap.keys()).filter(id => id !== nodeId);

        if (availableIds.length === 0) return;

        const sourcePos = nodePosMap.get(nodeId);
        if (!sourcePos) return;

        // Pick 3-5 random neighbors
        const count = Math.floor(Math.random() * 3) + 3;
        const neighbors: string[] = [];

        for (let i = 0; i < count; i++) {
            if (availableIds.length === 0) break;
            const randomIndex = Math.floor(Math.random() * availableIds.length);
            neighbors.push(availableIds[randomIndex]);
            availableIds.splice(randomIndex, 1); // Avoid duplicates
        }

        const newLines: SemanticLine[] = neighbors.map(targetId => {
            const targetPos = nodePosMap.get(targetId);
            if (!targetPos) return null;

            return {
                id: `${nodeId}-${targetId}`,
                from: sourcePos,
                to: targetPos,
                score: 0.3 + Math.random() * 0.7 // Random score between 0.3 and 1.0
            };
        }).filter((l): l is SemanticLine => l !== null);

        setState({
            activeNodeId: nodeId,
            lines: newLines
        });

    }, [state.activeNodeId]);

    return {
        connections: state.lines,
        fetchConstellation,
        clearConstellation
    };
};
