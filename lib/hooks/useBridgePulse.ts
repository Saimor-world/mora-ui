'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSystemStats, type SystemStats } from '@/lib/api/statsClient';
import { queryKeys, STALE_TIMES } from '@/lib/queries/queryKeys';
import { ESTATE } from '@/lib/estate';

export interface BridgePulseSnapshot {
    loaded: boolean;
    stats: SystemStats | null;
    cpu: number | null;
    moraLoad: number | null;
    activeAnalysts: number | null;
    cognitionRate: string | null;
    bridgeDepartments: number | null;
    bridgeNodes: number | null;
    larryNodes: number | null;
    openIncidents: number | null;
    criticalIncidents: number | null;
    dashboardUrl: string;
    larryUrl: string;
    /** 0–1 ambient intensity for nebula / pulse visuals */
    ambientIntensity: number;
}

const DEFAULT_URLS = {
    dashboard: ESTATE.desk,
    larry: ESTATE.runtime,
};

function deriveAmbientIntensity(stats: SystemStats | null): number {
    if (!stats) return 0.12;
    const cpu = (stats.metrics?.cpu ?? 0) / 100;
    const mem = (stats.metrics?.memory_usage ?? 0) / 100;
    const load = stats.intelligence?.mora_load ?? 0;
    const incidents = stats.nightwatch?.open_incidents ?? 0;
    const incidentPressure = Math.min(incidents / 5, 1);
    return Math.min(1, cpu * 0.25 + mem * 0.15 + load * 0.35 + incidentPressure * 0.25);
}

/** Shared TanStack Query cache — one poll for OrgStats, BridgePulse, and Universe nebula. */
export function useBridgePulse(enabled = true): BridgePulseSnapshot {
    const { data: stats, isSuccess: loaded } = useQuery({
        queryKey: queryKeys.bridgePulse(),
        queryFn: async () => {
            try {
                return await fetchSystemStats();
            } catch {
                return null;
            }
        },
        enabled,
        staleTime: STALE_TIMES.bridgePulse,
        refetchInterval: STALE_TIMES.bridgePulse,
        refetchIntervalInBackground: false,
        placeholderData: (previous) => previous,
    });

    return {
        loaded,
        stats: stats ?? null,
        cpu: stats?.metrics?.cpu ?? null,
        moraLoad: stats?.intelligence?.mora_load ?? null,
        activeAnalysts: stats?.intelligence?.active_analysts ?? null,
        cognitionRate: stats?.intelligence?.cognition_rate ?? null,
        bridgeDepartments: stats?.bridge?.departments ?? null,
        bridgeNodes: stats?.bridge?.nodes ?? null,
        larryNodes: stats?.bridge?.larry_nodes ?? null,
        openIncidents: stats?.nightwatch?.open_incidents ?? null,
        criticalIncidents: stats?.nightwatch?.critical ?? null,
        dashboardUrl: stats?.dashboard?.url ?? DEFAULT_URLS.dashboard,
        larryUrl: stats?.dashboard?.larry_url ?? DEFAULT_URLS.larry,
        ambientIntensity: deriveAmbientIntensity(stats ?? null),
    };
}
