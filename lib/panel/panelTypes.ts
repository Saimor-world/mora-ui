export type PanelState = 'verified' | 'unknown' | 'missing' | 'permission_missing' | 'placeholder';

export interface PanelEvidence {
    source: string;
    source_type: string;
    timestamp?: string;
    status: string;
    reason: string;
}

export interface ContextualPanel<T = Record<string, any>> {
    id: string;
    type: string;
    state: PanelState;
    source: string;
    source_type: string;
    timestamp?: string;
    confidence: 'verified' | 'warning' | 'unverified';
    reason: string;
    role_scope?: string[];
    allowed_actions?: string[];
    required_permission?: string;
    next_step_allowed?: boolean;
    payload: T;
    evidence?: PanelEvidence[];
}
