'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IntegrationsOverview } from '@/lib/hooks/useIntegrationsOverview';

type ReachabilityState = 'unknown' | 'checking' | 'ready' | 'core_only' | 'ui_only' | 'offline' | 'blocked';

export interface LocalTruthBridge {
    state: ReachabilityState;
    isLocalSurface: boolean;
    uiReachable: boolean | null;
    coreReachable: boolean | null;
    selectedUiUrl: string | null;
    selectedCoreUrl: string | null;
    lastCheckedAt: string | null;
    error: string | null;
    refresh: () => Promise<void>;
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

const withDefaultUiCandidates = (overview?: IntegrationsOverview | null) => {
    const candidates = overview?.runtime?.local_truth?.ui_candidates;
    if (Array.isArray(candidates) && candidates.length > 0) {
        return candidates;
    }
    return [
        'http://127.0.0.1:3000/home',
        'http://localhost:3000/home',
        'http://127.0.0.1:3003/home',
        'http://localhost:3003/home',
    ];
};

const withDefaultCoreCandidates = (overview?: IntegrationsOverview | null) => {
    const candidates = overview?.runtime?.local_truth?.core_candidates;
    if (Array.isArray(candidates) && candidates.length > 0) {
        return candidates;
    }
    return [
        'http://127.0.0.1:8081/v3/health',
        'http://localhost:8081/v3/health',
    ];
};

const probeUrl = async (url: string, isLocalSurface: boolean) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2400);

    try {
        if (isLocalSurface) {
            const response = await fetch(url, {
                method: 'GET',
                cache: 'no-store',
                credentials: 'omit',
                signal: controller.signal,
            });
            return response.ok;
        }

        await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            mode: 'no-cors',
            credentials: 'omit',
            signal: controller.signal,
        });
        return true;
    } catch {
        return false;
    } finally {
        window.clearTimeout(timeout);
    }
};

export function useLocalTruthBridge(overview?: IntegrationsOverview | null): LocalTruthBridge {
    const isLocalSurface = typeof window !== 'undefined' && LOCAL_HOSTNAMES.has(window.location.hostname);
    const [state, setState] = useState<ReachabilityState>('unknown');
    const [uiReachable, setUiReachable] = useState<boolean | null>(null);
    const [coreReachable, setCoreReachable] = useState<boolean | null>(null);
    const [selectedUiUrl, setSelectedUiUrl] = useState<string | null>(null);
    const [selectedCoreUrl, setSelectedCoreUrl] = useState<string | null>(null);
    const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const uiCandidates = useMemo(() => withDefaultUiCandidates(overview), [overview]);
    const coreCandidates = useMemo(() => withDefaultCoreCandidates(overview), [overview]);

    const refresh = useCallback(async () => {
        if (typeof window === 'undefined') return;

        setState('checking');
        setError(null);

        let resolvedUi: string | null = null;
        let resolvedCore: string | null = null;

        for (const candidate of uiCandidates) {
            // eslint-disable-next-line no-await-in-loop
            const reachable = await probeUrl(candidate, isLocalSurface);
            if (reachable) {
                resolvedUi = candidate;
                break;
            }
        }

        for (const candidate of coreCandidates) {
            // eslint-disable-next-line no-await-in-loop
            const reachable = await probeUrl(candidate, isLocalSurface);
            if (reachable) {
                resolvedCore = candidate;
                break;
            }
        }

        const nextUiReachable = Boolean(resolvedUi);
        const nextCoreReachable = Boolean(resolvedCore);
        setUiReachable(nextUiReachable);
        setCoreReachable(nextCoreReachable);
        setSelectedUiUrl(resolvedUi);
        setSelectedCoreUrl(resolvedCore);
        setLastCheckedAt(new Date().toISOString());

        if (nextUiReachable && nextCoreReachable) {
            setState('ready');
            return;
        }
        if (nextCoreReachable) {
            setState('core_only');
            setError('Lokaler Core antwortet, aber die lokale UI ist noch nicht erreichbar.');
            return;
        }
        if (nextUiReachable) {
            setState('ui_only');
            setError('Lokale UI antwortet, aber der lokale Core ist noch nicht erreichbar.');
            return;
        }

        setState(isLocalSurface ? 'offline' : 'blocked');
        setError(
            isLocalSurface
                ? 'Lokale Instanz antwortet noch nicht. Starte UI und Core auf localhost.'
                : 'Von HQ konnte keine lokale Instanz erreicht werden. Browser oder lokale Runtime blockieren die Verbindung noch.'
        );
    }, [coreCandidates, isLocalSurface, uiCandidates]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return {
        state,
        isLocalSurface,
        uiReachable,
        coreReachable,
        selectedUiUrl,
        selectedCoreUrl,
        lastCheckedAt,
        error,
        refresh,
    };
}
