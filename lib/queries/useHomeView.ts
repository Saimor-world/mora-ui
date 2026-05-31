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
    severity: number | null;
    category: string;
    scope: string | null;
}

export interface HomeViewNextStep {
    id: string;
    title: string;
    source: string;
}

export interface HomeView {
    company: HomeViewCompany;
    greeting: string;
    changes: HomeViewChange[];
    attention: HomeViewAttention[];
    next_steps: HomeViewNextStep[];
}

export interface HomeInsight {
    summary: string;
    suggested_focus: string;
}

export function useHomeView() {
    return useQuery<HomeView>({
        queryKey: queryKeys.viewHome(),
        queryFn: () => coreGet('/v3/views/home'),
    });
}

export function useHomeInsight(enabled: boolean = true) {
    return useQuery<HomeInsight>({
        queryKey: queryKeys.viewHomeInsight(),
        queryFn: () => coreGet('/v3/views/home/insight'),
        enabled,
    });
}
