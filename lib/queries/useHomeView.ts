import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';
import { queryKeys } from '@/lib/queries/queryKeys';

export interface HomeViewCompany {
    id: string | null;
    name: string;
    is_visitor: boolean;
}

export interface HomeViewChange {
    id: number | string;
    title: string;
    scope: string | null;
    occurred_at: string;
    severity: number | null;
}

export interface HomeViewAttention {
    id: number | string;
    title: string;
    detail?: string | null;
    severity: number | null;
    category: string;
    scope: string | null;
}

export interface HomeViewPriority {
    state: 'attention' | 'change' | 'calm';
    domain: 'system' | 'organization';
    eyebrow: string;
    title: string;
    detail: string;
    severity: number | null;
    action: 'signals' | 'mora';
}

export interface HomeViewNextStep {
    id: string;
    title: string;
    source: string;
}

export interface HomeViewOrgStats {
    departments: number;
    documents: number;
    folders: number;
    spaces: number;
    tasks: number;
    members: number | null;
}

export interface HomeView {
    company: HomeViewCompany;
    greeting: string;
    changes: HomeViewChange[];
    attention: HomeViewAttention[];
    next_steps: HomeViewNextStep[];
    priority?: HomeViewPriority | null;
    org_stats?: HomeViewOrgStats;
}

export interface HomeInsight {
    summary: string;
    suggested_focus: string;
}

export interface HomeStatusEvidence {
    source: string;
    source_type: string;
    status: string;
    confidence?: string;
    reason: string;
    timestamp?: string;
}

export interface HomeStatusPlaceholder {
    label: string;
    reason: string;
}

export interface HomeStatusUnknown {
    id: string;
    label?: string;
    reason: string;
}

export interface HomeStatus {
    tenant_id: string;
    user_role: string;
    company: HomeViewCompany;
    home_truth: {
        changes: Array<HomeViewChange & { evidence?: HomeStatusEvidence[] }>;
        attention: Array<HomeViewAttention & { evidence?: HomeStatusEvidence[] }>;
        next_steps: Array<HomeViewNextStep & { evidence?: HomeStatusEvidence[] }>;
    };
    runtime: {
        status: 'connected' | 'missing' | 'unknown' | string;
        evidence?: HomeStatusEvidence[];
    };
    home_cards: {
        verified: Array<{ id: string; label: string; source: string }>;
        placeholder: HomeStatusPlaceholder[];
        unknown: HomeStatusUnknown[];
    };
    placeholders_detected: HomeStatusPlaceholder[];
    unknowns: HomeStatusUnknown[];
}

export function useHomeView() {
    return useQuery<HomeView>({
        queryKey: queryKeys.viewHome(),
        queryFn: () => coreGet('/v3/views/home'),
    });
}

export function useHomeStatus() {
    return useQuery<HomeStatus | null>({
        queryKey: queryKeys.viewHomeStatus(),
        queryFn: () => coreGet('/v3/views/home/status', { isOptional: true }),
        staleTime: 30_000,
    });
}

export function useHomeInsight(enabled: boolean = true) {
    return useQuery<HomeInsight>({
        queryKey: queryKeys.viewHomeInsight(),
        queryFn: () => coreGet('/v3/views/home/insight'),
        enabled,
    });
}
