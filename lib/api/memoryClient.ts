// lib/api/memoryClient.ts
// Memory / Learning Brain API.
// Extracted from remainingClient.ts.

import { coreGet, corePost, normalizeList } from './http';

// ========== MEMORY / LEARNING BRAIN API ==========

function requireMemoryCompanyId(companyId?: string): string {
    if (!companyId) {
        throw new Error('Memory API requires company_id');
    }
    return companyId;
}

// POST /v3/memory/learn - Neues Insight lernen
export async function learnInsight(payload: {
    insight: string;
    category: string;
    auto_commit?: boolean;
    company_id: string;
}): Promise<{ status: string; message: string; committed?: boolean; risk?: string }> {
    // v3: envelope unwrap handled transparently in coreRequest()
    return corePost('/v3/memory/learn', payload);
}

// GET /v3/memory/search - Gedaechtnis durchsuchen
export async function searchMemory(query: string, limit: number = 10, companyId: string): Promise<any[]> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    const companyQuery = `&company_id=${encodeURIComponent(resolvedCompanyId)}`;
    // v3: envelope unwrap handled transparently in coreRequest().
    // Awaited explicitly so the || [] fallback applies to the resolved value, not the Promise.
    const result = await coreGet(`/v3/memory/search?q=${encodeURIComponent(query)}&limit=${limit}${companyQuery}`, { isOptional: true });
    return normalizeList<any>(result, ['results', 'items', 'memories', 'data']);
}

// GET /v3/memory/pending - Review Queue laden
export async function getMemoryPending(companyId: string): Promise<any[]> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    const companyQuery = `?company_id=${encodeURIComponent(resolvedCompanyId)}`;
    // v3: envelope unwrap handled transparently in coreRequest().
    // Awaited explicitly so the || [] fallback applies to the resolved value, not the Promise.
    const result = await coreGet(`/v3/memory/pending${companyQuery}`, { isOptional: true });
    return normalizeList<any>(result, ['pending', 'items', 'queue', 'data']);
}

// POST /v3/memory/approve/{id} - Review Item bestätigen
export async function approveMemoryItem(id: string | number, companyId: string): Promise<{ success: boolean }> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    const companyQuery = `?company_id=${encodeURIComponent(resolvedCompanyId)}`;
    // v3: envelope unwrap handled transparently in coreRequest()
    return corePost(`/v3/memory/approve/${id}${companyQuery}`, {});
}

// POST /v3/memory/reject/{id} - Review Item ablehnen
export async function rejectMemoryItem(id: string | number, companyId: string): Promise<{ success: boolean }> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    const companyQuery = `?company_id=${encodeURIComponent(resolvedCompanyId)}`;
    // v3: envelope unwrap handled transparently in coreRequest()
    return corePost(`/v3/memory/reject/${id}${companyQuery}`, {});
}

// GET /v1/memory/metrics - Statistiken
export async function getMemoryMetrics(companyId: string): Promise<any> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    const companyQuery = `?company_id=${encodeURIComponent(resolvedCompanyId)}`;
    // v3: envelope unwrap handled transparently in coreRequest()
    return coreGet(`/v3/memory/metrics${companyQuery}`, { isOptional: true });
}

// GET /v3/memory/overview - Aggregated memory surface (MR19)
export interface MemoryOverviewMetrics {
    structured_facts: number;
    pending_reviews: number;
    episodic_total: number;
    episodic_memories?: Record<string, number>;
    ownership_breakdown?: {
        personal_recent?: number;
        personal_pending?: number;
        company_structured_facts?: number;
    };
}

export interface MemoryOverviewLayerItem {
    id?: string;
    title: string;
    summary: string;
    detail?: string;
    kind?: string;
    scope?: string;
    source?: string;
    timestamp?: string;
    updated_at?: string;
    confidence?: number;
    score?: number;
    risk_level?: string;
}

export interface MemoryOverviewLayer {
    label: string;
    scope: string;
    description?: string;
    count: number;
    items: MemoryOverviewLayerItem[];
    pending_reviews?: MemoryOverviewLayerItem[];
}

export interface MemoryOverview {
    metrics: MemoryOverviewMetrics;
    memory_model?: {
        ground_knowledge_scope?: string;
        chat_memory_scope?: string;
        shared_operational_scope?: string;
        recent_scope?: string;
        pending_scope?: string;
        metrics_scope?: string;
    };
    ownership?: {
        recent?: string;
        pending?: string;
        metrics?: string;
        user_id?: string;
        company_id?: string;
    };
    layers?: {
        foundation?: MemoryOverviewLayer;
        scope?: MemoryOverviewLayer;
        personal?: MemoryOverviewLayer;
    };
}

export async function getMemoryOverview(companyId: string): Promise<MemoryOverview | null> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    const companyQuery = `?company_id=${encodeURIComponent(resolvedCompanyId)}`;
    return coreGet(`/v3/memory/overview${companyQuery}`);
}

// GET /v3/memory/debug/scope - Diagnostics endpoint (dev mode or ?diagnostics=1)
export interface MemoryDebugScope {
    memory_model?: {
        chat_memory_scope?: string;
        shared_operational_scope?: string;
    };
    ownership?: {
        recent?: string;
        pending?: string;
        legacy_memories?: string;
        user_id?: string;
        company_id?: string;
    };
    scope: { type: string; tenant_id?: string; company_id?: string; user_id?: string };
    counts: {
        mem_episodic: number;
        mem_facts: number;
        mem_review_queue: number;
        memories: number;
    };
    sample_limit: number;
    hints: string[];
    errors: string[];
    samples?: any[];
    diagnostics?: {
        cached: boolean;
        query_time_ms: number;
    };
}

export async function getMemoryDebugScope(
    companyId: string,
    sampleLimit: number = 5
): Promise<MemoryDebugScope | null> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    return coreGet(
        `/v3/memory/debug/scope?company_id=${encodeURIComponent(resolvedCompanyId)}&sample_limit=${sampleLimit}`,
        { isOptional: true }
    );
}

// POST /v3/memory/debug/reconcile - Migrate legacy memories to v3 scope
export interface MemoryReconcileResult {
    applied: boolean;
    created: number;
    skipped: number;
    already_present: number;
    errors: string[];
    preview?: any[];
}

export async function reconcileMemory(
    companyId: string,
    apply: boolean = false
): Promise<MemoryReconcileResult | null> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    return corePost(
        `/v3/memory/debug/reconcile?apply=${apply}`,
        { company_id: resolvedCompanyId },
        { isOptional: true }
    );
}
