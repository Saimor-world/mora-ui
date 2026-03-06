/**
 * Mindloop API Client
 * Connects to saimor-core Mindloop Intelligence endpoints
 */

import { coreGet, corePost, CoreError } from './coreClient';
import type { MindloopEvent } from '@/lib/types/mindloop';

export type { MindloopEvent } from '@/lib/types/mindloop';

export interface MindloopCluster {
    id: string;
    node_ids: string[];
    center?: { x: number; y: number };
    label?: string;
}

/**
 * Synthesis Response from Core API
 * Contains aggregated intelligence and risk scoring
 */
export interface SynthesisResponse {
    summary: {
        total_nodes: number;
        total_events: number;
        risk_level: 'low' | 'medium' | 'high';
        last_activity: string;
    };
    top_risks?: Array<{
        node_id: string;
        title: string;
        risk_score: number;
        reasons: string[];
    }>;
    active_clusters?: number;
    insights?: string[];
}

/**
 * Events Query Options
 */
export interface EventsQueryOptions {
    limit?: number;
    node_id?: string;
    folder_id?: string;
    type?: 'create' | 'edit' | 'view' | 'delete' | 'link';
    since?: string; // ISO timestamp
}

/**
 * Fetch Mindloop Synthesis
 *
 * Returns aggregated intelligence summary from the Core API
 * Includes: risk levels, event counts, top risks, insights
 *
 * @returns {Promise<SynthesisResponse>} Synthesis data
 */
export async function fetchSynthesis(): Promise<SynthesisResponse> {
    const emptyResponse: SynthesisResponse = {
        summary: {
            total_nodes: 0,
            total_events: 0,
            risk_level: 'low',
            last_activity: new Date().toISOString()
        }
    };

    try {
        const data = await coreGet('/v3/mindloop/synthesis');
        // null = auth failed silently
        if (!data) {
            return emptyResponse;
        }
        return data;
    } catch (error: any) {
        // Silent fallback for any error
        return emptyResponse;
    }
}

/**
 * Fetch Mindloop Events
 *
 * Returns event timeline (create, edit, view, delete, link events)
 * Can be filtered by node_id, type, or time range
 *
 * @param {EventsQueryOptions} options - Query filters
 * @returns {Promise<MindloopEvent[]>} Event list
 */
export async function fetchEvents(options: EventsQueryOptions = {}): Promise<MindloopEvent[]> {
    try {
        const params = new URLSearchParams();

        if (options.limit) params.append('limit', options.limit.toString());
        if (options.node_id) params.append('node_id', options.node_id);
        if (options.folder_id) params.append('folder_id', options.folder_id);
        if (options.type) params.append('type', options.type);
        if (options.since) params.append('since', options.since);

        const queryString = params.toString();
        const endpoint = `/v3/mindloop/events${queryString ? `?${queryString}` : ''}`;

        const data = await coreGet(endpoint);
        if (!data) return []; // null = auth failed
        return data.events || [];
    } catch (error: any) {
        return [];
    }
}

/**
 * Fetch Mindloop Clusters
 *
 * Returns semantic clusters of related nodes
 * Each cluster represents a group of conceptually similar objects
 *
 * @returns {Promise<MindloopCluster[]>} Cluster list
 */
export async function fetchClusters(): Promise<MindloopCluster[]> {
    try {
        const data = await corePost('/v3/mindloop/clusters', {});
        if (!data) return []; // null = auth failed
        return data.clusters || [];
    } catch (error: any) {
        return [];
    }
}

/**
 * Get Recent Activity
 *
 * Helper function to fetch recent events (last 10)
 *
 * @returns {Promise<MindloopEvent[]>} Recent events
 */
export async function getRecentActivity(): Promise<MindloopEvent[]> {
    return fetchEvents({ limit: 10 });
}

/**
 * Get Node Events
 *
 * Helper function to fetch events for a specific node
 *
 * @param {string} nodeId - Target node ID
 * @param {number} limit - Max events to return (default 20)
 * @returns {Promise<MindloopEvent[]>} Node events
 */
export async function getNodeEvents(nodeId: string, limit = 20): Promise<MindloopEvent[]> {
    return fetchEvents({ node_id: nodeId, limit });
}

/**
 * Get Folder Events
 *
 * Helper function to fetch events for a specific folder
 *
 * @param {string} folderId - Target folder ID
 * @param {number} limit - Max events to return (default 50)
 * @returns {Promise<MindloopEvent[]>} Folder events
 */
export async function getFolderEvents(folderId: string, limit = 50): Promise<MindloopEvent[]> {
    return fetchEvents({ folder_id: folderId, limit });
}

/**
 * Run Intelligence Scan
 *
 * Triggers a full scan and optionally generates a report in the folder
 */
export async function runScan(folderId?: string): Promise<any> {
    // We need corePost, but it's not exported from coreClient in the file I viewed?
    // Let's check imports.
    // coreGet is imported. I need to update imports to include corePost.
    // But I can't see imports here.
    // I'll assume corePost is available or I need to add it to imports.
    // Wait, I viewed mindloopClient.ts earlier and it had: import { coreGet } from './coreClient';
    // So I need to update the import line too.
    return corePost('/v3/mindloop/scan', { folder_id: folderId });
}
