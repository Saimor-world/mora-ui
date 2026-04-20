// lib/api/perfClient.ts
// Cache and performance telemetry endpoints.
// Extracted from remainingClient.ts.

import { coreGet } from './http';

// GET /v3/system/performance/caches — Cache telemetry (dev/diagnostics mode)
export interface CacheBucket {
    hits: number;
    misses: number;
    evictions?: number;
    invalidations?: number;
    entries: number;
    active_entries?: number;
}

export interface CachePerformance {
    learning_brain: {
        search: CacheBucket;
        metrics: CacheBucket;
    };
    folder_context: CacheBucket;
    entity_context?: CacheBucket;         // core 3161388
    default_company_scope?: CacheBucket;  // core 65fc157
    memory_debug_scope?: CacheBucket;     // core 41d8acb
    [key: string]: CacheBucket | { search: CacheBucket; metrics: CacheBucket } | undefined;
}

export async function getCachePerformance(): Promise<CachePerformance | null> {
    return coreGet('/v3/system/performance/caches', { isOptional: true });
}

// GET /v3/system/performance/critical-flows - Deploy/runtime guardrail summary
export interface CriticalFlowPerformance {
    window_seconds: number;
    generated_at: string;
    total_events: number;
    legacy_v1_critical_calls: {
        count: number;
        routes: Record<string, number>;
    };
    context_routes: {
        count: number;
        status_4xx: number;
        status_5xx: number;
        avg_ms: number;
        p95_ms: number;
    };
    v3_list_routes: {
        count: number;
        unbounded_count: number;
        unbounded_unscoped_count: number;
        unbounded_by_route: Record<string, number>;
    };
    gate: {
        pass: boolean;
        violations: string[];
    };
}

export async function getCriticalFlowPerformance(windowSeconds: number = 900): Promise<CriticalFlowPerformance | null> {
    const clamped = Math.max(60, Math.min(3600, Math.floor(windowSeconds)));
    return coreGet(`/v3/system/performance/critical-flows?window_seconds=${clamped}`, { isOptional: true });
}

export interface ApiVersionShare {
    count: number;
    share: number;
}

export interface ApiVersionPerformance {
    window_seconds: number;
    generated_at: string;
    total_events: number;
    versions: {
        v1: ApiVersionShare;
        v2: ApiVersionShare;
        v3: ApiVersionShare;
        other: ApiVersionShare;
    };
    legacy_routes_top: Array<{
        route: string;
        count: number;
    }>;
    critical_legacy_routes: {
        count: number;
        routes: Record<string, number>;
    };
    phaseout_gate: {
        pass: boolean;
        violations: string[];
    };
}

export async function getApiVersionPerformance(
    windowSeconds: number = 900,
    top: number = 10
): Promise<ApiVersionPerformance | null> {
    const clampedWindow = Math.max(60, Math.min(3600, Math.floor(windowSeconds)));
    const clampedTop = Math.max(1, Math.min(25, Math.floor(top)));
    return coreGet(
        `/v3/system/performance/api-versions?window_seconds=${clampedWindow}&top=${clampedTop}`,
        { isOptional: true }
    );
}
