/**
 * Mindloop Types
 * Type definitions for Mindloop Intelligence features
 */

export interface MindloopEvent {
    id: string;
    node_id: string;
    event_type: 'create' | 'edit' | 'view' | 'delete' | 'link';
    timestamp: string;
    user_id?: string;
    metadata?: Record<string, any>;
}

export interface MindloopCluster {
    cluster_id: string;
    label: string;
    nodes: string[];
    centroid?: number[];
    coherence_score?: number;
    created_at: string;
}

export interface MindloopRisk {
    node_id: string;
    title: string;
    risk_score: number;
    reasons: string[];
    detected_at: string;
}

export interface MindloopSynthesis {
    summary: {
        total_nodes: number;
        total_events: number;
        risk_level: 'low' | 'medium' | 'high';
        last_activity: string;
    };
    top_risks?: MindloopRisk[];
    active_clusters?: number;
    insights?: string[];
}
