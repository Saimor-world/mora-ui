// ============================================================================
// MINDLOOP API TYPES - Phase F Preparation
// ============================================================================
// These types prepare for the upcoming Mindloop integration (Phase F)
// Endpoints: /v1/mindloop/events, /synthesis, /clusters, /scan
// NOT YET IMPLEMENTED - Interface definitions only
// ============================================================================

/**
 * Semantic Event - represents a knowledge interaction
 * Emitted when user creates/edits/views nodes
 */
export interface MindloopEvent {
    id: string;
    type: 'create' | 'edit' | 'view' | 'delete' | 'link';
    node_id: string;
    timestamp: string;
    user_id?: string;
    metadata?: Record<string, any>;
}

/**
 * Synthesis Result - AI-generated insights from knowledge graph
 */
export interface MindloopSynthesis {
    id: string;
    query: string;
    result: string;
    confidence: number; // 0-1
    sources: string[]; // node IDs
    created_at: string;
}

/**
 * Semantic Cluster - grouped related nodes
 */
export interface MindloopCluster {
    id: string;
    name: string;
    node_ids: string[];
    centroid_embedding?: number[]; // Vector representation
    coherence_score: number; // 0-1
    created_at: string;
}

/**
 * Scan Result - semantic analysis of knowledge base
 */
export interface MindloopScan {
    id: string;
    total_nodes: number;
    clusters: MindloopCluster[];
    orphaned_nodes: string[]; // Nodes without semantic connections
    recommendations: string[];
    scanned_at: string;
}

/**
 * Mindloop API Client Interface (NOT YET IMPLEMENTED)
 * Placeholder for Phase F
 */
export interface MindloopClient {
    // Event tracking
    trackEvent(event: Omit<MindloopEvent, 'id' | 'timestamp'>): Promise<MindloopEvent>;

    // Synthesis
    synthesize(query: string, context?: string[]): Promise<MindloopSynthesis>;

    // Clustering
    getClusters(): Promise<MindloopCluster[]>;
    createCluster(nodeIds: string[]): Promise<MindloopCluster>;

    // Scanning
    scanKnowledgeBase(): Promise<MindloopScan>;
}

/**
 * Mindloop State (for future Zustand integration)
 * NOT YET ADDED TO STORE
 */
export interface MindloopState {
    events: MindloopEvent[];
    syntheses: MindloopSynthesis[];
    clusters: MindloopCluster[];
    lastScan: MindloopScan | null;

    // Actions (placeholders)
    trackEvent: (event: Omit<MindloopEvent, 'id' | 'timestamp'>) => Promise<void>;
    requestSynthesis: (query: string) => Promise<MindloopSynthesis>;
    refreshClusters: () => Promise<void>;
    runScan: () => Promise<MindloopScan>;
}
