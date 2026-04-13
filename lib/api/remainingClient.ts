// lib/api/remainingClient.ts
// Remaining exports from the original coreClient.ts that were not yet extracted
// into a dedicated domain client. Grouped by domain for future extraction.
// New code should prefer the specific client modules.

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

// POST /v3/memory/approve/{id} - Review Item bestaetigen
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

// ========== GROUNDED WORK SESSION (Core 0df2d28) ==========

export interface WorkSessionScope {
    company_id?: string;
    view_level?: string;
    active_entity_id?: string;
    active_entity_type?: string;
}

export type WorkSessionStepStatus =
    | 'pending'
    | 'running'
    | 'done'
    | 'failed'
    | 'pending_confirmation'
    | 'skipped';

export type WorkSessionPlanState =
    | 'pending'
    | 'running'
    | 'done'
    | 'failed'
    | 'partial'
    | 'waiting_confirmation';

export interface WorkSessionStep {
    step_id: string;
    /** Semantic kind: 'read', 'search', 'create', 'update', 'move', 'delete', etc. */
    kind: string;
    title: string;
    status: WorkSessionStepStatus;
    confirm_required?: boolean;
    tool_name?: string;
    action_label?: string;
    summary?: string;
    why?: string;
    output_summary?: string;
    /** V5: which planning segment this step belongs to (0 = original plan, 1+ = continuation) */
    segment_index?: number;
    /** V5: semantic origin of this step within its segment */
    origin?: 'planning' | 'continuation' | 'navigation' | 'native' | string;
    navigation?: {
        target_type?: string;
        open_mode?: string;
        company_id?: string;
        department_id?: string;
        space_id?: string;
        folder_id?: string;
        node_id?: string;
        label?: string;
    };
    result?: {
        change_summary?: string;
        result_summary?: string;
        summary?: string;
        destination_summary?: string;
        previous_content_preview?: string;
        content_preview?: string;
        content_change?: {
            before_preview?: string | null;
            after_preview?: string | null;
            before_length?: number;
            after_length?: number;
            delta_chars?: number;
            change_kind?: string;
            summary?: string;
        };
        destination?: {
            company_id?: string;
            department_id?: string;
            space_id?: string;
            folder_id?: string;
            node_id?: string;
            path?: string;
        };
    };
}

export interface WorkSessionStats {
    total_steps: number;
    read_steps: number;
    write_steps: number;
    planned_steps: number;
    completed_steps: number;
    running_steps?: number;
    failed_steps?: number;
    skipped_steps?: number;
    pending_steps: number;
    pending_confirmations: number;
    // V5 segmentation stats:
    segments?: number;
    continuation_segments?: number;
    initial_steps?: number;
    continuation_steps?: number;
    latest_segment_index?: number;
    latest_segment_steps?: number;
    has_continuation?: boolean;
}

/**
 * V5+: Execution focus — delivered on work_session_plan in GET, agent, and navigation responses.
 * Primary source for what is currently running, waiting, or next.
 */
export interface WorkSessionExecution {
    state: string;
    can_continue: boolean;
    is_waiting_for_confirmation?: boolean;
    current_segment_index?: number;
    current_segment_origin?: string;
    current_segment_origin_label?: string;
    current_segment_state?: string;
    current_segment_title?: string;
    current_segment_summary?: string;
    current_step_id?: string;
    current_step_title?: string;
    current_step_status?: string;
    current_step_kind?: string;
    current_step_action_label?: string;
    current_step_origin?: string;
    pending_confirmation_step_id?: string;
    pending_confirmation_title?: string;
    pending_confirmation_action_label?: string;
    /** "What's next" — primary source for waiting/continue emphasis in the shell card */
    next_step_id?: string;
    next_mode?: string;
    next_label?: string;
    next_message?: string;
    last_transition_step_id?: string;
    last_transition_type?: string;
    last_transition_label?: string;
    last_transition_message?: string;
    latest_activity_at?: string;
}

/**
 * V5: Per-segment summary delivered by the backend in WorkSessionPlan.segment_summaries.
 * Primary render contract for segmented work-session timelines.
 */
export interface WorkSessionSegmentSummary {
    segment_index: number;
    origin: 'planning' | 'continuation' | 'navigation' | 'native' | string;
    origin_label?: string;
    state?: string;
    latest?: boolean;
    total_steps?: number;
    completed_steps?: number;
    running_steps?: number;
    failed_steps?: number;
    skipped_steps?: number;
    pending_steps?: number;
    pending_confirmations?: number;
    has_navigation?: boolean;
    /** Compat alias for total_steps — backend may send either */
    step_count?: number;
    title?: string;
    summary?: string;
    titles?: string[];
}

export interface WorkSessionPendingConfirmation {
    step_id?: string;
    action_id?: string;
    confirmation_token?: string;
    tool_name?: string;
    message?: string;
    summary?: string;
    [key: string]: unknown;
}

export interface WorkSessionPlan {
    plan_id: string;
    session_id?: string;
    state: WorkSessionPlanState;
    title: string;
    summary?: string;
    ownership?: {
        session_scope?: string;
        shared_operational_scope?: string;
        actor_user_id?: string;
        company_id?: string;
    };
    scope: WorkSessionScope;
    /** Aggregate step counters — use these instead of computing from steps[] */
    stats?: WorkSessionStats;
    steps: WorkSessionStep[];
    pending_confirmations?: WorkSessionPendingConfirmation[];
    mode?: string;
    provider?: string;
    transparency_note?: string;
    /** V5: canonical segmentation list — primary render contract for segmented timelines */
    segment_summaries?: WorkSessionSegmentSummary[];
    /** V5+: execution focus — primary source for current step, waiting state, and next action */
    execution?: WorkSessionExecution;
}

/** Fetch a work-session plan by ID (GET /v3/work-session/plan/{id}) */
export async function fetchWorkSessionPlan(planId: string): Promise<WorkSessionPlan | null> {
    return coreGet(`/v3/work-session/plan/${encodeURIComponent(planId)}`);
}

/** Create / start a work-session plan (POST /v3/work-session/plan) */
export async function postWorkSessionPlan(
    params: Record<string, unknown>
): Promise<WorkSessionPlan | null> {
    return corePost('/v3/work-session/plan', params);
}

// ── Terminal ──────────────────────────────────────────────────────────────────

/** Live identity of the remote Core terminal returned by GET /v3/terminal/info */
export interface TerminalInfo {
    terminal_type: string;         // always "remote_core"
    execution_model: string;       // always "request_response"
    host_label?: string;
    platform?: string;             // e.g. "linux"
    cwd?: string;
    role?: string;
    mode?: string;
    tenant_id?: string;
    user_id?: string;
    supports_sessions: boolean;    // always false for now
    supports_streaming: boolean;   // always false for now
    supports_cwd: boolean;         // always false for now
}

/** Structured result from POST /v3/terminal/execute */
export interface TerminalExecuteResult {
    success: boolean;
    command: string;
    stdout?: string;
    stderr?: string;
    exit_code?: number;
    denied_reason?: string;
    executed_at?: string;
    terminal?: Partial<TerminalInfo>;
}

/**
 * Fetch live server identity from GET /v3/terminal/info.
 * Returns null when Core is unreachable (used as both probe and identity source).
 */
export async function fetchTerminalInfo(): Promise<TerminalInfo | null> {
    return coreGet('/v3/terminal/info', { isOptional: true });
}

/**
 * Execute a command on the remote Core server via POST /v3/terminal/execute.
 * Returns null only when Core is completely unreachable.
 */
export async function executeRemoteCommand(command: string): Promise<TerminalExecuteResult | null> {
    return corePost('/v3/terminal/execute', { command }, { isOptional: true });
}

// ── Terminal Sessions (v3) ────────────────────────────────────────────────────

/**
 * One entry from the server-owned session history[].
 * The server is the authoritative source of the transcript.
 */
export interface TerminalHistoryEntry {
    command: string;
    stdout?: string;
    stderr?: string;
    exit_code?: number;
    denied_reason?: string;
    type?: string;           // "command" | "system" | "banner"
    executed_at?: string;
}

/** Explicit lifecycle state of a terminal session (Core fdac89e+). */
export type TerminalSessionState = 'stateless' | 'active' | 'closed' | 'expired';

/**
 * Full session object returned by POST /v3/terminal/session and
 * GET /v3/terminal/session/{id}.
 *
 * supports_sessions = true, supports_cwd = true, supports_streaming = false.
 * session_state / expires_at / close_reason / history_count / history_limit
 * are the new lifecycle-truth fields added in Core dca969f.
 */
export interface TerminalSession {
    session_id: string;
    terminal_type: string;       // "remote_core"
    execution_model: string;     // "session_request_response"
    host_label?: string;
    platform?: string;
    cwd?: string;
    role?: string;
    mode?: string;
    tenant_id?: string;
    user_id?: string;
    supports_sessions: boolean;
    supports_cwd: boolean;
    supports_streaming: boolean;
    active: boolean;
    started_at?: string;
    updated_at?: string;
    closed_at?: string;
    last_command?: string;
    last_exit_code?: number;
    history: TerminalHistoryEntry[];
    // ── Lifecycle-truth fields (Core dca969f) ────────────────────────────────
    session_state?: TerminalSessionState;  // stateless | active | closed | expired
    expires_at?: string;                   // ISO-8601 expiry timestamp
    close_reason?: string;                 // why the session was closed
    history_count?: number;               // current server-owned transcript entries
    history_limit?: number;               // server-imposed transcript cap
}

/** Structured result from POST /v3/terminal/session/{id}/input */
export interface TerminalInputResult {
    success: boolean;
    command: string;
    stdout?: string;
    stderr?: string;
    exit_code?: number;
    denied_reason?: string;
    executed_at?: string;
    cwd?: string;                // updated cwd after command (if supports_cwd)
    session?: Partial<TerminalSession>;
}

/** Create a new terminal session. Returns null when Core is unreachable. */
export async function createTerminalSession(): Promise<TerminalSession | null> {
    return corePost('/v3/terminal/session', {}, { isOptional: true });
}

/**
 * Recover an existing session and its server-owned history[].
 * Returns null when Core is unreachable or session expired.
 */
export async function getTerminalSession(sessionId: string): Promise<TerminalSession | null> {
    return coreGet(`/v3/terminal/session/${sessionId}`, { isOptional: true });
}

/** Send a command to a live session. Returns null only on Core unreachability. */
export async function executeSessionInput(
    sessionId: string,
    command: string
): Promise<TerminalInputResult | null> {
    return corePost(`/v3/terminal/session/${sessionId}/input`, { command }, { isOptional: true });
}

/** Close a session. Fire-and-forget — returns void. */
export async function closeTerminalSession(sessionId: string): Promise<void> {
    await corePost(`/v3/terminal/session/${sessionId}/close`, {}, { isOptional: true });
}

// -- User Memberships (v3) --

/**
 * A department the current user is a member of.
 * Returned by GET /v3/users/me/memberships (Codex endpoint -- live).
 *
 * The backend carries visibility truth. Frontend uses this list only to
 * determine WHICH departments the user is a member of.
 * Visibility for rendering comes from the department object itself (CoreDepartment.visibility).
 */
export interface UserMembership {
    department_id: string;
    department_name: string;
    role?: string; // user's role within this department
    /**
     * The endpoint may return visibility per membership record.
     * Frontend does not use this for rendering decisions -- visibility comes from
     * CoreDepartment.visibility (server truth on the department object).
     * Included here for forward-compatibility with the API response shape.
     */
    visibility?: 'public' | 'visible' | 'private';
}

export interface UserMembershipsResponse {
    department_memberships: UserMembership[];
    personal_space_id: string | null;
    has_department_assignments: boolean;
}

/**
 * Fetch the current user's department memberships.
 * Returns null if the endpoint is unavailable -- callers must degrade gracefully.
 * On null: treat all departments as visible (legacy fallback).
 */
export async function fetchUserMemberships(): Promise<UserMembershipsResponse | null> {
    return coreGet('/v3/users/me/memberships', { isOptional: true });
}
