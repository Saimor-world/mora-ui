// lib/api/workSessionClient.ts
// Grounded Work Session API (Core 0df2d28).
// Extracted from remainingClient.ts.

import { coreGet, corePost } from './http';

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
