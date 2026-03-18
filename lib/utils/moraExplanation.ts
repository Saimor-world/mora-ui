export const MYCELIUM_REVIEW_READY_EVENT = 'saimor:mycelium-review-ready';
export const MYCELIUM_BATCH_COMPLETE_EVENT = 'saimor:mycelium-batch-complete';

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

export function dispatchMyceliumReviewReady(detail: MyceliumShellSummary) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<MyceliumShellSummary>(MYCELIUM_REVIEW_READY_EVENT, { detail }));
}

export function dispatchMyceliumBatchComplete(detail: MyceliumShellSummary) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<MyceliumShellSummary>(MYCELIUM_BATCH_COMPLETE_EVENT, { detail }));
}
