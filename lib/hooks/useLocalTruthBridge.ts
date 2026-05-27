'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    refresh: (options?: { force?: boolean; announce?: boolean }) => Promise<void>;
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

const withDefaultUiCandidates = (overview?: IntegrationsOverview | null) => {
    const candidates = overview?.runtime?.local_truth?.ui_candidates;
    if (Array.isArray(candidates) && candidates.length > 0) {
        return candidates;
    }
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : null;
    return [
        ...(currentOrigin ? [currentOrigin + '/', currentOrigin + '/home'] : []),
        'http://127.0.0.1:3000/',
        'http://localhost:3000/',
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

    // Detect cross-origin probe: even on a "local surface" page, probing
    // 127.0.0.1 from a localhost origin (or vice versa) is cross-origin per
    // the same-origin policy. Browsers block default-mode fetches across
    // those, producing console CORS noise. Use 'no-cors' mode for any probe
    // whose hostname doesn't match the current page hostname.
    let sameHostProbe = false;
    try {
        if (typeof window !== 'undefined') {
            const target = new URL(url);
            sameHostProbe = target.hostname === window.location.hostname;
        }
    } catch {
        sameHostProbe = false;
    }

    try {
        if (isLocalSurface && sameHostProbe) {
            // Genuine same-origin probe: read response.ok for accurate signal.
            const response = await fetch(url, {
                method: 'GET',
                cache: 'no-store',
                credentials: 'omit',
                signal: controller.signal,
            });
            return response.ok;
        }

        // Cross-origin or remote: use no-cors so a successful network
        // round-trip is enough; we cannot read the body anyway.
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
    const inFlightRef = useRef<Promise<void> | null>(null);
    const lastRefreshAtRef = useRef<number>(0);

    const uiCandidates = useMemo(() => withDefaultUiCandidates(overview), [overview]);
    const coreCandidates = useMemo(() => withDefaultCoreCandidates(overview), [overview]);

    const refresh = useCallback(async (options?: { force?: boolean; announce?: boolean }) => {
        if (typeof window === 'undefined') return;
        if (!isLocalSurface) {
            setUiReachable(false);
            setCoreReachable(false);
            setSelectedUiUrl(null);
            setSelectedCoreUrl(null);
            setLastCheckedAt(new Date().toISOString());
            setState('blocked');
            setError('Lokale Desktop-Instanzen werden von HQ nicht automatisch abgefragt. Nutze eine lokale SAIMOR-Session oder verbinde spaeter den Desktop-Bridge-Agent.');
            return;
        }

        const force = Boolean(options?.force);
        const announce = Boolean(options?.announce);
        const now = Date.now();

        if (!force && now - lastRefreshAtRef.current < 4000) {
            return;
        }

        if (inFlightRef.current) {
            return inFlightRef.current;
        }

        if (announce) {
            setState('checking');
            setError(null);
        }

        const request = (async () => {
            let resolvedUi: string | null = null;
            let resolvedCore: string | null = null;
            const shouldProbeLocalCore = process.env.NEXT_PUBLIC_LOCAL_CORE === 'true' || announce;

            for (const candidate of uiCandidates) {
                // eslint-disable-next-line no-await-in-loop
                const reachable = await probeUrl(candidate, isLocalSurface);
                if (reachable) {
                    resolvedUi = candidate;
                    break;
                }
            }

            if (shouldProbeLocalCore) {
                for (const candidate of coreCandidates) {
                    // eslint-disable-next-line no-await-in-loop
                    const reachable = await probeUrl(candidate, isLocalSurface);
                    if (reachable) {
                        resolvedCore = candidate;
                        break;
                    }
                }
            }

            const nextUiReachable = Boolean(resolvedUi);
            const nextCoreReachable = Boolean(resolvedCore);
            setUiReachable(nextUiReachable);
            setCoreReachable(nextCoreReachable);
            setSelectedUiUrl(resolvedUi);
            setSelectedCoreUrl(resolvedCore);
            setLastCheckedAt(new Date().toISOString());
            lastRefreshAtRef.current = Date.now();

            if (nextUiReachable && nextCoreReachable) {
                setState('ready');
                setError(null);
                return;
            }
            if (nextCoreReachable) {
                setState('core_only');
                setError('Lokaler Core antwortet, aber die lokale UI ist noch nicht erreichbar.');
                return;
            }
            if (nextUiReachable) {
                setState('ui_only');
                setError(shouldProbeLocalCore
                    ? 'Lokale UI antwortet, aber der lokale Core ist noch nicht erreichbar.'
                    : 'Lokale UI antwortet. Lokalen Core pruefen wir erst, wenn du es bewusst anstoesst.');
                return;
            }

            setState(isLocalSurface ? 'offline' : 'blocked');
            setError(
                isLocalSurface
                    ? 'Lokale Instanz antwortet noch nicht. Starte UI und Core auf localhost.'
                    : 'Von HQ konnte keine lokale Instanz erreicht werden. Browser oder lokale Runtime blockieren die Verbindung noch.'
            );
        })();

        inFlightRef.current = request;
        try {
            await request;
        } finally {
            inFlightRef.current = null;
        }
    }, [coreCandidates, isLocalSurface, uiCandidates]);

    useEffect(() => {
        void refresh({ force: true, announce: false });
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
