'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, Box, Clock, ExternalLink, RefreshCw, Server, Shield, ShieldCheck } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import type { AppProps } from '@/lib/apps/types';
import { usePaneStore } from '@/lib/store/paneStore';
import {
    fetchAllNightwatchIncidents,
    fetchNightwatchIncidents,
    fetchNightwatchMonitors,
    type NightwatchMonitorItem,
} from '@/lib/api/nightwatchClient';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';

const NIGHTWATCH_DASHBOARD_URL = 'https://dash.saimor.world/nightwatch';

// ── helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso?: string): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'gerade eben';
    if (mins < 60) return `vor ${mins} Min.`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `vor ${hrs} Std.`;
    return `vor ${Math.floor(hrs / 24)} T.`;
}

function absoluteTime(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function severityConfig(sev?: string) {
    if (sev === 'critical') return {
        border: 'border-red-400/22',
        bg: 'bg-red-500/[0.07]',
        dot: 'bg-red-400',
        text: 'text-red-300/90',
        label: 'Kritisch',
    };
    if (sev === 'warning') return {
        border: 'border-amber-400/22',
        bg: 'bg-amber-500/[0.07]',
        dot: 'bg-amber-400',
        text: 'text-amber-300/90',
        label: 'Warnung',
    };
    return {
        border: 'border-sky-400/18',
        bg: 'bg-sky-500/[0.05]',
        dot: 'bg-sky-400',
        text: 'text-sky-300/85',
        label: 'Info',
    };
}

function isMonitorDown(monitor: NightwatchMonitorItem, incidentHosts: Set<string>): boolean {
    const status = monitor.status?.toLowerCase();
    return status === 'down'
        || status === 'critical'
        || status === 'unhealthy'
        || status === 'exited'
        || (!!monitor.host && incidentHosts.has(monitor.host));
}

// ── sub-components ────────────────────────────────────────────────────────────

function PulseDot({ color, animate = true, size = 'sm' }: { color: string; animate?: boolean; size?: 'xs' | 'sm' }) {
    const dim = size === 'xs' ? 'h-1.5 w-1.5' : 'h-2 w-2';
    return (
        <span className={`relative inline-flex ${dim} shrink-0`}>
            {animate && (
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-50`} />
            )}
            <span className={`relative inline-flex ${dim} rounded-full ${color}`} />
        </span>
    );
}

function MonitorChip({ monitor, isDown }: { monitor: NightwatchMonitorItem; isDown: boolean }) {
    const label = monitor.name || monitor.host || 'Monitor';
    const hostHint = monitor.name && monitor.host && monitor.name !== monitor.host ? monitor.host : null;
    return (
        <div
            className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 transition-colors ${
                isDown
                    ? 'border-red-400/25 bg-red-500/[0.08]'
                    : 'border-white/[0.1] bg-white/[0.04]'
            }`}
            title={hostHint || label}
        >
            <PulseDot color={isDown ? 'bg-red-400' : 'bg-emerald-400'} animate={isDown} size="xs" />
            {monitor.target_type === 'container' ? <Box size={10} className="text-white/32" /> : <Server size={10} className="text-white/32" />}
            <span className="truncate text-[11px] font-medium text-white/78">{label}</span>
            <span className={`shrink-0 text-[9px] uppercase tracking-[0.14em] ${isDown ? 'text-red-300/75' : 'text-emerald-300/65'}`}>
                {isDown ? 'Down' : 'Online'}
            </span>
        </div>
    );
}

function IncidentRow({ incident, onOpen }: { incident: NightwatchIncidentItem; onOpen: () => void }) {
    const cfg = severityConfig(incident.severity);
    return (
        <article className={`rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-3`}>
            <div className="flex items-start gap-3">
                <PulseDot color={cfg.dot} animate={incident.severity === 'critical'} size="sm" />
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className={`text-[9px] uppercase tracking-[0.16em] font-semibold ${cfg.text}`}>
                            {cfg.label}
                        </span>
                        {incident.host && (
                            <span className="truncate text-[10px] font-mono text-white/38">{incident.host}</span>
                        )}
                    </div>
                    <h3 className="text-[13px] font-medium leading-snug text-white/88">
                        {incident.title || `Vorfall: ${incident.host || 'Infrastruktur'}`}
                    </h3>
                    {incident.summary && (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/45">
                            {incident.summary}
                        </p>
                    )}
                    {incident.detected_at && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-white/32">
                            <Clock size={9} />
                            <span>{absoluteTime(incident.detected_at)}</span>
                            <span>·</span>
                            <span>{relativeTime(incident.detected_at)}</span>
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onOpen}
                    aria-label="Vorfall öffnen"
                    className="shrink-0 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] text-white/55 transition-colors hover:bg-white/[0.1] hover:text-white/82"
                >
                    Öffnen
                </button>
            </div>
        </article>
    );
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function NightwatchApp({ paneId }: AppProps) {
    const {
        removePane,
        openPane,
        getPane,
        minimizePane,
        focusPane,
        updatePanePosition,
        updatePaneSize,
    } = usePaneStore();
    const isActive = usePaneStore((s) => s.activePaneId === paneId);
    const pane = getPane(paneId);

    const [incidents, setIncidents] = useState<NightwatchIncidentItem[]>([]);
    const [monitors, setMonitors] = useState<NightwatchMonitorItem[]>([]);
    const [history, setHistory] = useState<NightwatchIncidentItem[]>([]);
    const [available, setAvailable] = useState(true);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const [inc, mon, allIncidents] = await Promise.all([
                fetchNightwatchIncidents(),
                fetchNightwatchMonitors(),
                fetchAllNightwatchIncidents(),
            ]);
            if (!mountedRef.current) return;
            setIncidents(inc);
            setHistory(allIncidents);
            setMonitors(mon);
            setAvailable(true);
            setLastRefresh(new Date());
        } catch {
            if (!mountedRef.current) return;
            setIncidents([]);
            setMonitors([]);
            setHistory([]);
            setAvailable(false);
        } finally {
            if (mountedRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const id = setInterval(() => load(true), 60_000);
        return () => clearInterval(id);
    }, [load]);

    const downHosts = useMemo(
        () => new Set(incidents.map((i) => i.host).filter(Boolean) as string[]),
        [incidents],
    );

    const sortedMonitors = useMemo(() => {
        const down = monitors.filter((monitor) => isMonitorDown(monitor, downHosts));
        const up = monitors.filter((monitor) => !isMonitorDown(monitor, downHosts));
        return [...down, ...up];
    }, [monitors, downHosts]);

    const criticalCount = incidents.filter((i) => i.severity === 'critical').length;
    const warningCount = incidents.filter((i) => i.severity === 'warning').length;
    const downMonitorCount = sortedMonitors.filter((monitor) => isMonitorDown(monitor, downHosts)).length;
    const onlineMonitorCount = Math.max(0, monitors.length - downMonitorCount);

    const sevenDayTrend = useMemo(() => {
        const days = Array.from({ length: 7 }, (_, offset) => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - (6 - offset));
            return { key: date.toISOString().slice(0, 10), label: date.toLocaleDateString('de-DE', { weekday: 'short' }), count: 0 };
        });
        const byKey = new Map(days.map((day) => [day.key, day]));
        history.forEach((incident) => {
            if (!incident.detected_at) return;
            const day = byKey.get(new Date(incident.detected_at).toISOString().slice(0, 10));
            if (day) day.count += 1;
        });
        return days;
    }, [history]);
    const trendMax = Math.max(1, ...sevenDayTrend.map((day) => day.count));

    const systemStatus: 'ok' | 'warning' | 'critical' =
        criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'ok';

    const statusLine = loading
        ? 'Verbinde…'
        : !available
            ? 'Datenquelle nicht erreichbar'
        : systemStatus === 'ok'
            ? 'Alle Systeme normal'
            : systemStatus === 'critical'
                ? `${criticalCount} kritischer${criticalCount !== 1 ? 'e' : ''} Vorfall${criticalCount !== 1 ? 'e' : ''}`
                : `${warningCount} Warnung${warningCount !== 1 ? 'en' : ''}`;

    const statusTone =
        loading ? 'text-white/35'
            : !available ? 'text-red-300/85'
            : systemStatus === 'ok' ? 'text-emerald-300/85'
                : systemStatus === 'critical' ? 'text-red-300/85'
                    : 'text-amber-300/85';

    const openIncident = (id: string, title?: string) =>
        openPane({ id: `document-${id}`, type: 'document', title: title || 'Vorfall', size: { width: 900, height: 700 }, data: { nodeId: id } });

    const sortedIncidents = useMemo(() => {
        const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
        return [...incidents].sort((a, b) => (order[a.severity || 'info'] ?? 2) - (order[b.severity || 'info'] ?? 2));
    }, [incidents]);

    if (!pane) return null;

    return (
        <GlassPanel
            title={(
                <span className="flex items-center gap-2">
                    <Shield size={13} className="text-cyan-400/70" />
                    <span>Nightwatch</span>
                </span>
            )}
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
            onResize={(w, h) => updatePaneSize(paneId, w, h)}
            onClose={() => removePane(paneId)}
            onMinimize={() => minimizePane(paneId)}
            onFocus={() => focusPane(paneId)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
            paneId={paneId}
            dimBackground
            dimOpacity={0.28}
            blurIntensity={24}
            opacity={0.38}
        >
            <div
                data-testid="nightwatch-app"
                className="relative flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.15) transparent' }}
            >
                {/* Ambient status glow — no grid, universe shows through GlassPanel */}
                <div
                    className="pointer-events-none absolute -left-8 -right-8 -top-6 h-28 opacity-80 transition-all duration-700"
                    style={{
                        background: systemStatus === 'critical'
                            ? 'radial-gradient(ellipse 70% 80% at 50% 0%, rgba(239,68,68,0.14) 0%, transparent 72%)'
                            : systemStatus === 'warning'
                                ? 'radial-gradient(ellipse 70% 80% at 50% 0%, rgba(245,158,11,0.12) 0%, transparent 72%)'
                                : 'radial-gradient(ellipse 70% 80% at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 72%)',
                    }}
                />

                {/* Compact status row */}
                <div className="relative flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        {loading ? (
                            <span className="h-2 w-2 animate-pulse rounded-full bg-white/25" />
                        ) : (
                            <PulseDot
                                color={systemStatus === 'ok' ? 'bg-emerald-400' : systemStatus === 'critical' ? 'bg-red-400' : 'bg-amber-400'}
                                animate={systemStatus !== 'ok'}
                            />
                        )}
                        <div className="min-w-0">
                            <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${statusTone}`}>
                                {statusLine}
                            </p>
                            <p className="mt-0.5 text-[12px] text-white/52">
                                MÔRA beobachtet Infrastruktur und offene Vorfälle.
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {lastRefresh && (
                            <span className="text-[10px] tabular-nums text-white/28">
                                {lastRefresh.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => window.open(NIGHTWATCH_DASHBOARD_URL, '_blank', 'noopener,noreferrer')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[10px] text-white/42 transition-colors hover:bg-white/[0.08] hover:text-white/72"
                            aria-label="Larry Dashboard öffnen"
                            title="Vollständige Container- und Kapazitätsansicht öffnen"
                        >
                            <ExternalLink size={11} />
                            <span className="hidden sm:inline">Dashboard</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => load(true)}
                            disabled={refreshing}
                            className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-1.5 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/70 disabled:opacity-40"
                            aria-label="Aktualisieren"
                        >
                            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {!loading && available && (
                    <section className="nightwatch-overview" aria-label="Nightwatch Übersicht">
                        <div>
                            <span><ShieldCheck size={13} />Online</span>
                            <strong>{onlineMonitorCount}</strong>
                            <small>bestätigte Monitore</small>
                        </div>
                        <div data-tone={downMonitorCount > 0 ? 'critical' : 'quiet'}>
                            <span><Server size={13} />Down</span>
                            <strong>{downMonitorCount}</strong>
                            <small>nicht erreichbar</small>
                        </div>
                        <div data-tone={criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'quiet'}>
                            <span><AlertTriangle size={13} />Vorfälle</span>
                            <strong>{incidents.length}</strong>
                            <small>{criticalCount} kritisch · {warningCount} Warnung</small>
                        </div>
                        <div className="nightwatch-trend">
                            <span><Activity size={13} />7 Tage</span>
                            <div className="nightwatch-trend__bars" aria-label={`${history.length} Vorfälle im Verlauf`}>
                                {sevenDayTrend.map((day) => (
                                    <i key={day.key} title={`${day.label}: ${day.count}`} style={{ height: `${Math.max(8, (day.count / trendMax) * 100)}%` }} />
                                ))}
                            </div>
                            <small>{history.length} erfasste Ereignisse</small>
                        </div>
                    </section>
                )}

                {!loading && !available && (
                    <div className="nightwatch-unavailable" role="alert">
                        <AlertTriangle size={16} />
                        <div>
                            <strong>Keine belastbaren Betriebsdaten</strong>
                            <span>Nightwatch kann CORE gerade nicht bestätigen. Leere Listen werden nicht als „alles ruhig“ dargestellt.</span>
                        </div>
                    </div>
                )}

                {/* Monitor chips — compact, no sprawling grid */}
                <section className="relative space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-white/38">Monitore</span>
                        {!loading && monitors.length > 0 && (
                            <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] tabular-nums text-white/42">
                                {monitors.length}
                            </span>
                        )}
                    </div>
                    {loading ? (
                        <div className="flex flex-wrap gap-2">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-8 w-28 animate-pulse rounded-full bg-white/[0.04]" />
                            ))}
                        </div>
                    ) : !available ? null : monitors.length === 0 ? (
                        <p className="text-[11px] text-white/38">Noch keine Monitore eingerichtet.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {sortedMonitors.map((m) => (
                                <MonitorChip
                                    key={m.id}
                                    monitor={m}
                                    isDown={isMonitorDown(m, downHosts)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Incidents — tight list, calm empty state */}
                <section className="relative space-y-2 pb-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-white/38">Offene Vorfälle</span>
                        {!loading && incidents.length > 0 && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold tabular-nums ${
                                criticalCount > 0 ? 'bg-red-500/18 text-red-300/90' : 'bg-amber-500/14 text-amber-300/85'
                            }`}>
                                {incidents.length}
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="space-y-2">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.03]" />
                            ))}
                        </div>
                    ) : !available ? null : incidents.length === 0 ? (
                        <div className="flex items-center gap-3 rounded-xl border border-emerald-400/14 bg-emerald-500/[0.05] px-4 py-3">
                            <ShieldCheck size={16} className="shrink-0 text-emerald-300/65" />
                            <div>
                                <p className="text-[12px] font-medium text-emerald-100/78">Keine offenen Vorfälle</p>
                                <p className="mt-0.5 text-[10px] text-emerald-200/42">Alles ruhig — Überwachung läuft weiter.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sortedIncidents.map((i) => (
                                <IncidentRow
                                    key={i.id}
                                    incident={i}
                                    onOpen={() => openIncident(i.id, i.title)}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </GlassPanel>
    );
}
