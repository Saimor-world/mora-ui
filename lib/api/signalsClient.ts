// lib/api/signalsClient.ts
// Awareness signals, semantic similarity, and AI node actions.
// Extracted from remainingClient.ts.

import type { CoreNode } from '@/lib/types/core';
import { coreGet, corePost, coreRequest, normalizeList } from './http';

// ========== AWARENESS / CORE SIGNALS ==========

export async function recordAwarenessSignal(signalType: string, payload: any = {}): Promise<void> {
    try {
        // SECURITY: Always include tenant_id for proper signal isolation
        const tenantId = typeof window !== 'undefined'
            ? localStorage.getItem('saimor_tenant') || 'tenant-default'
            : 'tenant-default';

        await corePost('/v3/system/awareness', {
            signal_type: signalType,
            payload: {
                ...payload,
                tenant_id: tenantId
            },
            timestamp: new Date().toISOString()
        }, { isOptional: true });
    } catch (err) {
        // Silent fail for awareness signals - no logging to keep console clean
    }
}


// Intelligence / Resonance
export async function getSemanticallySimilarNodes(nodeId: string): Promise<CoreNode[]> {
    const result = await coreGet(`/v3/nodes/${nodeId}/similar?limit=3&threshold=0.6`, { isOptional: true });
    return normalizeList<CoreNode>(result, ['results', 'nodes', 'similar']);
}

// AI Actions
export interface AIAction {
    label: string;
    action_type: string; // 'summarize' | 'chat' | 'explain' | 'related' | 'open'
    payload: any;
    confidence: number;
}

export async function getNodeActions(nodeId: string): Promise<AIAction[]> {
    try {
        const response = await coreRequest('/ai/actions', {
            method: 'POST',
            body: { node_id: nodeId }
        });
        if (!response) return [];
        if (Array.isArray(response)) return response as AIAction[];
        return normalizeList<AIAction>(response.actions, ['actions', 'items']);
    } catch (e) {
        console.error("AI Actions fetch failed", e);
        return [];
    }
}
