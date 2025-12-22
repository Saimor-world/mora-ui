import { create } from 'zustand';

export interface SemanticNode {
    id: string;
    position: { x: number; y: number };
    type: 'folder' | 'node' | 'concept';
    connections: string[]; // IDs of connected nodes
    strength: number; // Connection strength 0-1
    embedding?: number[]; // Vector representation
    metadata: Record<string, any>;
}

export interface ConstellationLine {
    id: string;
    sourceId: string;
    targetId: string;
    strength: number;
    type: 'explicit' | 'implicit' | 'contextual' | 'semantic';
    animated: boolean;
}

interface SemanticState {
    nodes: SemanticNode[];
    constellations: ConstellationLine[];
    isInitialized: boolean;
    isProcessing: boolean;

    // Actions
    initializeSemanticEngine: () => Promise<void>;
    addSemanticNode: (node: SemanticNode) => void;
    updateSemanticNode: (id: string, updates: Partial<SemanticNode>) => void;
    removeSemanticNode: (id: string) => void;
    generateConstellations: () => Promise<void>;
    findSemanticConnections: (nodeId: string) => SemanticNode[];
    updateNodePosition: (id: string, position: { x: number; y: number }) => void;
}

// UPGRADE E1: Mock Qdrant integration (would be replaced with real API calls)
const mockQdrantSearch = async (embedding: number[], limit = 10): Promise<Array<{id: string, score: number}>> => {
    // Simulate semantic similarity search
    return new Promise(resolve => {
        setTimeout(() => {
            const results = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
                id: `node-${i + 1}`,
                score: Math.random() * 0.8 + 0.2 // 0.2-1.0 similarity
            }));
            resolve(results);
        }, 300);
    });
};

export const useSemanticStore = create<SemanticState>((set, get) => ({
    nodes: [],
    constellations: [],
    isInitialized: false,
    isProcessing: false,

    initializeSemanticEngine: async () => {
        set({ isProcessing: true });

        try {
            // UPGRADE E1: Initialize Qdrant connection (mock)
            console.log('🔗 Initializing semantic engine with Qdrant...');

            // Generate initial semantic nodes from current data
            const initialNodes: SemanticNode[] = [
                {
                    id: 'company-root',
                    position: { x: 0, y: 0 },
                    type: 'concept',
                    connections: [],
                    strength: 1.0,
                    metadata: { label: 'Organization Root' }
                }
            ];

            set({
                nodes: initialNodes,
                isInitialized: true,
                isProcessing: false
            });

            console.log('✅ Semantic engine initialized');
        } catch (error) {
            console.error('❌ Failed to initialize semantic engine:', error);
            set({ isProcessing: false });
        }
    },

    addSemanticNode: (node) => set((state) => ({
        nodes: [...state.nodes, node]
    })),

    updateSemanticNode: (id, updates) => set((state) => ({
        nodes: state.nodes.map(node =>
            node.id === id ? { ...node, ...updates } : node
        )
    })),

    removeSemanticNode: (id) => set((state) => ({
        nodes: state.nodes.filter(node => node.id !== id),
        constellations: state.constellations.filter(line =>
            line.sourceId !== id && line.targetId !== id
        )
    })),

    generateConstellations: async () => {
        if (!get().isInitialized) return;

        set({ isProcessing: true });

        try {
            const nodes = get().nodes;
            const newConstellations: ConstellationLine[] = [];

            // UPGRADE E1: Generate semantic connections
            for (const node of nodes) {
                if (node.embedding && node.type !== 'concept') {
                    // Find semantically similar nodes
                    const similarNodes = await mockQdrantSearch(node.embedding, 3);

                    similarNodes.forEach(result => {
                        const targetNode = nodes.find(n => n.id === result.id);
                        if (targetNode && targetNode.id !== node.id) {
                            const existingConnection = get().constellations.find(
                                c => (c.sourceId === node.id && c.targetId === targetNode.id) ||
                                     (c.sourceId === targetNode.id && c.targetId === node.id)
                            );

                            if (!existingConnection) {
                                newConstellations.push({
                                    id: `const-${node.id}-${targetNode.id}`,
                                    sourceId: node.id,
                                    targetId: targetNode.id,
                                    strength: result.score,
                                    type: 'semantic',
                                    animated: result.score > 0.7
                                });
                            }
                        }
                    });
                }

                // Add hierarchical connections
                if (node.metadata.parentId) {
                    const parentNode = nodes.find(n => n.id === node.metadata.parentId);
                    if (parentNode) {
                        newConstellations.push({
                            id: `hier-${node.id}-${parentNode.id}`,
                            sourceId: node.id,
                            targetId: parentNode.id,
                            strength: 0.9,
                            type: 'contextual',
                            animated: false
                        });
                    }
                }
            }

            set((state) => ({
                constellations: [...state.constellations, ...newConstellations],
                isProcessing: false
            }));

            console.log(`✨ Generated ${newConstellations.length} new constellations`);
        } catch (error) {
            console.error('❌ Failed to generate constellations:', error);
            set({ isProcessing: false });
        }
    },

    findSemanticConnections: (nodeId) => {
        const constellations = get().constellations;
        const connectedIds = new Set<string>();

        constellations.forEach(line => {
            if (line.sourceId === nodeId) connectedIds.add(line.targetId);
            if (line.targetId === nodeId) connectedIds.add(line.sourceId);
        });

        return get().nodes.filter(node => connectedIds.has(node.id));
    },

    updateNodePosition: (id, position) => set((state) => ({
        nodes: state.nodes.map(node =>
            node.id === id ? { ...node, position } : node
        )
    }))
}));


