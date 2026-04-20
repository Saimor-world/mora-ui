// lib/api/searchClient.ts
// Global keyword search, open-intent resolution, and semantic search.
// Extracted from remainingClient.ts.

import { coreGet, corePost, normalizeList } from './http';

// ========== SEARCH ==========

export interface SearchResult {
    query: string;
    results: any[];
    total: number;
    search_type: string;
}

export interface OpenIntentCandidate {
    id: string;
    title: string;
    type: string;
    node_id?: string;
    folder_id?: string;
    space_id?: string;
    department_id?: string;
    company_id?: string;
    path?: string;
    scope_path?: string;
    source?: string;
    rank_score?: number;
    decision_signals?: string[];
    exact_title_match?: boolean;
    title_match?: boolean;
}

export interface OpenIntentResolution {
    query: string;
    resolution: 'act' | 'choose' | 'none' | string;
    headline: string;
    reason: string;
    chosen?: OpenIntentCandidate | null;
    candidates: OpenIntentCandidate[];
    scope?: {
        company_id?: string;
        department_id?: string;
        space_id?: string;
        folder_id?: string;
    };
    metadata?: {
        total_candidates?: number;
        plausible_candidates?: number;
        timestamp?: string;
    };
    destination?: {
        company_id?: string;
        department_id?: string;
        space_id?: string;
        folder_id?: string;
        node_id?: string;
        target_type?: string;
        label?: string;
        path?: string;
    } | null;
    open_explanation?: {
        kind?: string;
        headline?: string;
        reason?: string;
        signal_labels?: string[];
    };
    next?: {
        mode?: 'open' | 'choose' | 'review' | string;
        label?: string;
        message?: string;
    };
}

export async function searchGlobal(query: string, companyId?: string): Promise<SearchResult> {
    const q = encodeURIComponent(query);
    const c = companyId ? `&company_id=${encodeURIComponent(companyId)}` : '';
    const result = await corePost(`/v3/search/keyword?query=${q}${c}`, {}, { isOptional: true });
    if (result && typeof result === 'object') {
        return {
            query,
            results: normalizeList<any>(result, ['results', 'items', 'matches', 'data']),
            total: typeof (result as any).total === 'number'
                ? (result as any).total
                : normalizeList<any>(result, ['results', 'items', 'matches', 'data']).length,
            search_type: (result as any).search_type || 'keyword',
        };
    }
    return {
        query,
        results: [],
        total: 0,
        search_type: 'keyword',
    };
}

export async function resolveOpenIntent(payload: {
    query: string;
    company_id?: string | null;
    department_id?: string | null;
    space_id?: string | null;
    folder_id?: string | null;
    limit?: number;
}): Promise<OpenIntentResolution> {
    const result = await corePost('/v3/search/open-intent', payload);
    return {
        query: String((result as any)?.query || payload.query || ''),
        resolution: String((result as any)?.resolution || 'none'),
        headline: String((result as any)?.headline || 'Kein klarer Treffer'),
        reason: String((result as any)?.reason || ''),
        chosen: ((result as any)?.chosen || null) as OpenIntentCandidate | null,
        candidates: normalizeList<OpenIntentCandidate>(result, ['candidates', 'items', 'results', 'data']),
        scope: (result as any)?.scope,
        metadata: (result as any)?.metadata,
        destination: (result as any)?.destination || null,
        open_explanation: (result as any)?.open_explanation,
        next: (result as any)?.next,
    };
}

export interface SemanticSearchResult {
    node_id: string;
    score: number;
    content: string;
    // Top-level path fields returned by the v3 backend alongside metadata
    scope_path?: string | null;
    path?: string | null;
    company_id?: string | null;
    folder_id?: string | null;
    department_id?: string | null;
    space_id?: string | null;
    metadata?: {
        title?: string;
        type?: string;
        space_id?: string;
        folder_id?: string;
    };
}

// GET /v3/search/semantic — vector similarity search, ranked by relevance score
export async function searchSemantic(
    query: string,
    companyId: string | null,
    limit = 10,
    threshold = 0.55,
): Promise<SemanticSearchResult[]> {
    const q = encodeURIComponent(query);
    const c = companyId ? `&company_id=${encodeURIComponent(companyId)}` : '';
    const result = await coreGet(
        `/v3/search/semantic?q=${q}&limit=${String(limit)}&threshold=${String(threshold)}${c}`,
        { isOptional: true },
    );
    return normalizeList<SemanticSearchResult>(result, ['results', 'items', 'matches', 'data']);
}
