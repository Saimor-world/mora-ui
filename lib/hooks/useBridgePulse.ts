'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchSystemStats, type SystemStats } from '@/lib/api/statsClient';

const REFRESH_MS = 45_000;

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
    dashboard: 'https://dash.saimor.world',
    larry: 'https://larry.saimor.world',
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

export function useBridgePulse(enabled = true): BridgePulseSnapshot {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [loaded, setLoaded] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const next = await fetchSystemStats();
            setStats(next);
        } catch {
            setStats(null);
        } finally {
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        const run = async () => {
            await refresh();
            if (cancelled) return;
        };
        run();
        const id = window.setInterval(refresh, REFRESH_MS);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, [enabled, refresh]);

    return {
        loaded,
        stats,
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
        ambientIntensity: deriveAmbientIntensity(stats),
    };
}
