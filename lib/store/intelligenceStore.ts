import { create } from 'zustand';

// Types
interface Point {
    x: number;
    y: number;
}

interface IntelligenceStore {
    nodePositions: Map<string, Point>;
    setNodePositions: (positions: Map<string, Point>) => void;
    // We export the latest position map for the overlay to consume
}

export const useIntelligenceStore = create<IntelligenceStore>((set) => ({
    nodePositions: new Map(),
    setNodePositions: (positions) => set({ nodePositions: positions }),
}));
