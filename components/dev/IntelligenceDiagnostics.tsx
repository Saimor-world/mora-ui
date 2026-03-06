"use client";

/**
 * IntelligenceDiagnostics — Dev-only floating panel
 *
 * Shows live intelligence signal metadata so engineers can verify
 * the SSE → Awareness → OrbState wiring is working correctly.
 *
 * Only rendered when NODE_ENV=development OR when ?diagnostics=1 is in the URL.
 *
 * Tracks:
 *  - Current orbState and how long ago it changed
 *  - Awareness pulse state (from /v1/awareness/pulse)
 *  - Source of last orbState update (sse | mindloop | pulse | store | unknown)
 *  - Selected AI provider/profile (from /v3/chat/providers)
 *  - API version cutover telemetry (/v3/system/performance/api-versions)
 *  - MindLoop SSE connection status
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { fetchAwarenessPulse, type OrbState } from '@/lib/api/awarenessClient';
import { coreGet, getApiVersionPerformance, type ApiVersionPerformance } from '@/lib/api/coreClient';
import { useUiPerfMetrics } from '@/lib/hooks/useUiPerfMetrics';

type SignalSource = 'sse_chat' | 'mindloop' | 'pulse' | 'store_action' | 'unknown';

interface DiagnosticsState {
    orbState: OrbState;
    orbStateChangedAt: number;
    orbStateSource: SignalSource;
    pulseState: OrbState | null;
    pulseLastFetchedAt: number | null;
    providers: Array<{ id: string; name: string; active?: boolean; profile?: string }> | null;
    providersError: string | null;
    apiVersions: ApiVersionPerformance | null;
    isMinimised: boolean;
}

const SOURCE_COLORS: Record<SignalSource, string> = {
    sse_chat: '#3B82F6',
    mindloop: '#8B5CF6',
    pulse: '#10B981',
    store_action: '#F59E0B',
    unknown: '#6B7280',
};

const SOURCE_LABELS: Record<SignalSource, string> = {
    sse_chat: 'SSE / Chat',
    mindloop: 'MindLoop SSE',
    pulse: '/awareness/pulse',
    store_action: 'Store Action',
    unknown: 'Unknown',
};

function relativeTime(ts: number): string {
    const diffMs = Date.now() - ts;
    if (diffMs < 1000) return 'just now';
    if (diffMs < 60_000) return `${Math.floor(diffMs / 1000)}s ago`;
    return `${Math.floor(diffMs / 60_000)}m ago`;
}

export function IntelligenceDiagnostics() {
    const [visible, setVisible] = useState(false);
    const perf = useUiPerfMetrics(visible);
    const orbState = useMoraStore((s) => s.orbState);
    const lastChatScope = useMoraStore((s) => s.lastChatScope);
    const prevOrbRef = useRef<OrbState>(orbState);
    const [state, setState] = useState<DiagnosticsState>({
        orbState,
        orbStateChangedAt: Date.now(),
        orbStateSource: 'unknown',
        pulseState: null,
        pulseLastFetchedAt: null,
        providers: null,
        providersError: null,
        apiVersions: null,
        isMinimised: false,
    });
    const tickRef = useRef<ReturnType<typeof setInterval>>();

    // Detect orbState changes and guess the source based on timing
    useEffect(() => {
        if (orbState !== prevOrbRef.current) {
            prevOrbRef.current = orbState;
            // Heuristic: if changed very recently after a pulse fetch → pulse source
            // Otherwise assume SSE/mindloop (they set it more immediately)
            setState((prev) => ({
                ...prev,
                orbState,
                orbStateChangedAt: Date.now(),
                orbStateSource: prev.pulseLastFetchedAt && Date.now() - prev.pulseLastFetchedAt < 500
                    ? 'pulse'
                    : 'mindloop', // best guess — mindloop SSE is always running
            }));
        }
    }, [orbState]);

    // Poll /v1/awareness/pulse every 20s for the diagnostics view
    const fetchPulse = useCallback(async () => {
        try {
            const result = await fetchAwarenessPulse();
            setState((prev) => ({
                ...prev,
                pulseState: result.state,
                pulseLastFetchedAt: Date.now(),
            }));
        } catch {
            // ignore — pulse unavailable
        }
    }, []);

    // Fetch providers once on mount
    const fetchProviders = useCallback(async () => {
        try {
            const data = await coreGet('/v3/chat/providers', { isOptional: true });
            if (data && typeof data === 'object') {
                const raw = (data as any).providers ?? (Array.isArray(data) ? data : []);
                const normalized = Array.isArray(raw)
                    ? raw
                    : (raw && typeof raw === 'object' ? Object.values(raw) : []);
                setState((prev) => ({ ...prev, providers: normalized as any, providersError: null }));
            } else {
                setState((prev) => ({ ...prev, providers: [], providersError: null }));
            }
        } catch (e: any) {
            setState((prev) => ({ ...prev, providersError: e?.message ?? 'fetch failed' }));
        }
    }, []);

    const fetchApiVersions = useCallback(async () => {
        try {
            const data = await getApiVersionPerformance(900, 5);
            setState((prev) => ({ ...prev, apiVersions: data }));
        } catch {
            // diagnostics only
        }
    }, []);

    useEffect(() => {
        // Show if dev mode or ?diagnostics=1
        const isDev = process.env.NODE_ENV === 'development';
        const hasParam = typeof window !== 'undefined' && window.location.search.includes('diagnostics=1');
        if (isDev || hasParam) setVisible(true);
    }, []);

    useEffect(() => {
        if (!visible) return;
        void fetchPulse();
        void fetchProviders();
        void fetchApiVersions();
        const pulseInterval = setInterval(fetchPulse, 20_000);
        const versionsInterval = setInterval(fetchApiVersions, 20_000);
        // Re-render every second to keep relative timestamps fresh
        tickRef.current = setInterval(() => setState((prev) => ({ ...prev })), 1000);
        return () => {
            clearInterval(pulseInterval);
            clearInterval(versionsInterval);
            clearInterval(tickRef.current);
        };
    }, [visible, fetchPulse, fetchProviders, fetchApiVersions]);

    if (!visible) return null;

    const { isMinimised } = state;
    const safeProviders = Array.isArray(state.providers) ? state.providers : [];
    const activeProvider = safeProviders.find((p) => p?.active) ?? safeProviders[0];

    return (
        <div
            className="fixed bottom-36 right-4 z-[9999] font-mono text-[10px] select-none"
            style={{ maxWidth: 240 }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between gap-2 rounded-t-lg px-2 py-1 cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.85)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                onClick={() => setState((prev) => ({ ...prev, isMinimised: !prev.isMinimised }))}
            >
                <div className="flex items-center gap-1.5">
                    <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: SOURCE_COLORS[state.orbStateSource] }}
                    />
                    <span className="text-white/70 uppercase tracking-widest text-[9px]">Intelligence Diagnostics</span>
                </div>
                <span className="text-white/30">{isMinimised ? '▲' : '▼'}</span>
            </div>

            {/* Body */}
            {!isMinimised && (
                <div
                    className="rounded-b-lg px-2 py-2 space-y-1.5"
                    style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)' }}
                >
                    {/* Orb State */}
                    <Row label="Orb State" value={state.orbState} color={SOURCE_COLORS[state.orbStateSource]} />
                    <Row
                        label="Source"
                        value={SOURCE_LABELS[state.orbStateSource]}
                        color={SOURCE_COLORS[state.orbStateSource]}
                    />
                    <Row
                        label="Changed"
                        value={relativeTime(state.orbStateChangedAt)}
                        color="rgba(255,255,255,0.45)"
                    />

                    <Divider />

                    {/* Pulse */}
                    <Row
                        label="Pulse State"
                        value={state.pulseState ?? '…'}
                        color="#10B981"
                    />
                    <Row
                        label="Pulse Fetched"
                        value={state.pulseLastFetchedAt ? relativeTime(state.pulseLastFetchedAt) : '—'}
                        color="rgba(255,255,255,0.35)"
                    />

                    <Divider />

                    {/* Provider */}
                    {state.providersError ? (
                        <Row label="Providers" value="unavailable" color="#EF4444" />
                    ) : activeProvider ? (
                        <>
                            <Row label="Provider" value={activeProvider.name ?? activeProvider.id} color="#F59E0B" />
                            {activeProvider.profile && (
                                <Row label="Profile" value={activeProvider.profile} color="rgba(255,255,255,0.45)" />
                            )}
                        </>
                    ) : (
                        <Row label="Providers" value="loading…" color="rgba(255,255,255,0.3)" />
                    )}

                    <Divider />

                    {/* API Version Phaseout */}
                    <Row
                        label="API v3"
                        value={`${state.apiVersions?.versions?.v3?.count ?? 0} (${Math.round((state.apiVersions?.versions?.v3?.share ?? 0) * 100)}%)`}
                        color="#10B981"
                    />
                    <Row
                        label="API v1"
                        value={`${state.apiVersions?.versions?.v1?.count ?? 0} (${Math.round((state.apiVersions?.versions?.v1?.share ?? 0) * 100)}%)`}
                        color={(state.apiVersions?.versions?.v1?.count ?? 0) === 0 ? "#10B981" : "#F59E0B"}
                    />
                    <Row
                        label="Legacy Crit"
                        value={String(state.apiVersions?.critical_legacy_routes?.count ?? 0)}
                        color={(state.apiVersions?.critical_legacy_routes?.count ?? 0) === 0 ? "#10B981" : "#EF4444"}
                    />
                    <Row
                        label="Gate"
                        value={(state.apiVersions?.phaseout_gate?.pass ?? false) ? "pass" : "violations"}
                        color={(state.apiVersions?.phaseout_gate?.pass ?? false) ? "#10B981" : "#EF4444"}
                    />
                    {state.apiVersions?.legacy_routes_top?.[0] && (
                        <Row
                            label="Top Legacy"
                            value={state.apiVersions.legacy_routes_top[0].route}
                            color="rgba(255,255,255,0.45)"
                        />
                    )}

                    <Divider />

                    {/* Scope Contract (from v3/v1 chat metadata + SSE preamble) */}
                    <Row
                        label="Scope Policy"
                        value={lastChatScope?.scope_policy ?? "—"}
                        color="rgba(255,255,255,0.45)"
                    />
                    <Row
                        label="Boundary"
                        value={lastChatScope?.scope_contract?.boundary_level ?? "—"}
                        color="#F59E0B"
                    />
                    <Row
                        label="Enforced"
                        value={String(lastChatScope?.scope_enforced ?? false)}
                        color={(lastChatScope?.scope_enforced ?? false) ? "#F59E0B" : "rgba(255,255,255,0.45)"}
                    />
                    <Row
                        label="Contract"
                        value={lastChatScope?.scope_contract?.contract_version ?? "—"}
                        color="rgba(255,255,255,0.45)"
                    />
                    <Row
                        label="Dropped"
                        value={
                            lastChatScope?.scope_contract?.dropped_fields?.length
                                ? lastChatScope.scope_contract.dropped_fields.join(",")
                                : "—"
                        }
                        color="rgba(255,255,255,0.35)"
                    />

                    <Divider />

                    {/* UI Performance (live) */}
                    <Row
                        label="FPS avg"
                        value={perf.fpsAvg ? perf.fpsAvg.toFixed(1) : "…"}
                        color={perf.fpsAvg >= 50 ? "#10B981" : perf.fpsAvg >= 35 ? "#F59E0B" : "#EF4444"}
                    />
                    <Row
                        label="Frame p95"
                        value={perf.frameP95Ms ? `${perf.frameP95Ms.toFixed(1)}ms` : "…"}
                        color={perf.frameP95Ms <= 20 ? "#10B981" : perf.frameP95Ms <= 28 ? "#F59E0B" : "#EF4444"}
                    />
                    <Row
                        label="Input p95"
                        value={perf.inputDelayP95Ms ? `${perf.inputDelayP95Ms.toFixed(1)}ms` : "…"}
                        color={perf.inputDelayP95Ms <= 100 ? "#10B981" : perf.inputDelayP95Ms <= 180 ? "#F59E0B" : "#EF4444"}
                    />
                    <Row
                        label="LongTasks"
                        value={`${perf.longTaskCount} / max ${perf.longTaskMaxMs.toFixed(0)}ms`}
                        color={perf.longTaskMaxMs <= 50 ? "#10B981" : perf.longTaskMaxMs <= 150 ? "#F59E0B" : "#EF4444"}
                    />
                </div>
            )}
        </div>
    );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="flex items-baseline justify-between gap-2">
            <span className="text-white/35 shrink-0">{label}</span>
            <span className="truncate text-right" style={{ color }}>{value}</span>
        </div>
    );
}

function Divider() {
    return <div className="border-t border-white/[0.06] my-0.5" />;
}
