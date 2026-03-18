export const MYCELIUM_REVIEW_READY_EVENT = 'saimor:mycelium-review-ready';
export const MYCELIUM_BATCH_COMPLETE_EVENT = 'saimor:mycelium-batch-complete';
export const WORK_SESSION_PLAN_EVENT = 'saimor:work-session-plan';

export interface MyceliumRouteExplanation {
    headline?: string;
    reason?: string;
    learning_summary?: string;
}

export interface MyceliumShellSummary {
    phase: 'review' | 'complete';
    batchId?: string;
    companyId?: string;
    total: number;
    confirmed?: number;
    rejected?: number;
    pending?: number;
    routes: Array<{
        path: string;
        folderId?: string;
        count?: number;
        confirmed?: number;
        rejected?: number;
    }>;
    primaryFile?: {
        name?: string;
        nodeId?: string;
        folderId?: string;
        result?: string;
        routeExplanation?: MyceliumRouteExplanation;
    };
}

export interface WorkSessionShellSummary {
    planId: string;
    sessionId?: string;
    source?: 'chat' | 'pane' | 'navigation';
    state: string;
    title: string;
    summary?: string;
    mode?: string;
    scope?: {
        company_id?: string;
        view_level?: string;
        active_entity_id?: string;
        active_entity_type?: string;
    };
    stats?: {
        total_steps?: number;
        read_steps?: number;
        write_steps?: number;
        planned_steps?: number;
        completed_steps?: number;
        pending_confirmations?: number;
        running_steps?: number;
        failed_steps?: number;
        skipped_steps?: number;
    };
    transparencyNote?: string;
}

export function dispatchMyceliumReviewReady(detail: MyceliumShellSummary) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<MyceliumShellSummary>(MYCELIUM_REVIEW_READY_EVENT, { detail }));
}

export function dispatchMyceliumBatchComplete(detail: MyceliumShellSummary) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<MyceliumShellSummary>(MYCELIUM_BATCH_COMPLETE_EVENT, { detail }));
}

export function dispatchWorkSessionPlan(detail: WorkSessionShellSummary) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<WorkSessionShellSummary>(WORK_SESSION_PLAN_EVENT, { detail }));
}
