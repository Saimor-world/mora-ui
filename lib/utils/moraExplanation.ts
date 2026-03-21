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
        // V5 segmentation:
        has_continuation?: boolean;
        continuation_segments?: number;
        segments?: number;
    };
    transparencyNote?: string;
    // Execution focus (V5+):
    running_step_title?: string;         // execution.current_step_title - only set when state === 'running'
    pending_confirmation_title?: string; // execution.pending_confirmation_title - only set when state === 'waiting_confirmation'
    /** "What's next" - primary source for waiting/continue emphasis */
    next_label?: string;                 // execution.next_label
    next_message?: string;               // execution.next_message
    last_transition_step_id?: string;
    last_transition_type?: string;
    last_transition_message?: string;
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

/**
 * Returns progress-aware body copy for the MoraShell work-session card.
 * Exported for unit testing.
 */
export function getSessionBodyText(s: WorkSessionShellSummary): string {
    const completed = s.stats?.completed_steps ?? 0;
    const total = s.stats?.total_steps ?? 0;
    const pending = s.stats?.pending_confirmations ?? 0;

    if (s.state === 'failed') {
        return 'Arbeitsplan nicht abgeschlossen.';
    }
    if (s.state === 'partial') {
        return total > 0
            ? `${completed} von ${total} Schritten abgeschlossen (partiell).`
            : 'Arbeitsplan partiell abgeschlossen.';
    }
    if (s.state === 'waiting_confirmation' && pending > 0) {
        return pending === 1
            ? 'Ein Schritt wartet auf Freigabe.'
            : `${pending} Schritte warten auf Freigabe.`;
    }
    if (s.state === 'done') {
        return total > 0
            ? `${completed} von ${total} Schritten abgeschlossen.`
            : 'Arbeitsplan abgeschlossen.';
    }
    if (s.state === 'running') {
        if (total > 0 && completed > 0) {
            return `${completed} von ${total} Schritten abgeschlossen.`;
        }
        return 'Mora arbeitet am Arbeitsplan.';
    }
    return 'Mora haelt den aktuellen Arbeitsplan im Scope bereit.';
}

/**
 * Returns a note if navigation has extended the session beyond the original plan.
 * Returns null when the plan has not grown.
 * Exported for unit testing.
 */
export function getSessionExtendedNote(s: WorkSessionShellSummary): string | null {
    // V5 primary: explicit continuation flag from backend
    if (s.stats?.has_continuation === true) {
        const n = s.stats.continuation_segments ?? 1;
        return n === 1
            ? 'Mora hat die Session fortgesetzt.'
            : `Mora hat die Session ${n}\u00d7 fortgesetzt.`;
    }
    if (s.stats?.has_continuation === false) {
        return null;
    }
    // Pre-V5 fallback: infer from total vs planned step count
    const total = s.stats?.total_steps ?? 0;
    const planned = s.stats?.planned_steps ?? 0;
    if (planned > 0 && total > planned) {
        const added = total - planned;
        return added === 1
            ? 'Navigation hat einen Schritt zum Verlauf ergaenzt.'
            : `Navigation hat ${added} Schritte zum Verlauf ergaenzt.`;
    }
    return null;
}

export function getSessionRunningSignal(s: WorkSessionShellSummary): {
    isPostDecision: boolean;
    primaryText: string;
    secondaryText: string | null;
} {
    const isPostDecision = !!s.last_transition_step_id;
    const postDecisionMessage = s.last_transition_message ?? s.next_message;
    if (isPostDecision && postDecisionMessage) {
        return {
            isPostDecision,
            primaryText: postDecisionMessage,
            secondaryText: s.running_step_title ?? null,
        };
    }

    return {
        isPostDecision,
        primaryText: s.running_step_title ?? getSessionBodyText(s),
        secondaryText: null,
    };
}
