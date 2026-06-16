'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, RefreshCw, Shield, ShieldAlert, ShieldCheck, Clock, Wifi, WifiOff } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import { usePaneStore } from '@/lib/store/paneStore';
import { priorityFromSeverityLabel, toneForPriority, TONES } from '@/lib/ui/status';
import {
    fetchNightwatchIncidents,
    fetchNightwatchMonitors,
    type NightwatchMonitorItem,
} from '@/lib/api/nightwatchClient';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';

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

// severity → visual config
function severityConfig(sev?: string) {
    if (sev === 'critical') return {
        border: 'border-red-500/30',
        bg: 'bg-red-500/[0.06]',
        dot: 'bg-red-400',
        ping: 'bg-red-500',
        text: 'text-red-300',
        label: 'KRITISCH',
        badgeBg: 'bg-red-500/15 border-red-400/25',
    };
    if (sev === 'warning') return {
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/[0.06]',
        dot: 'bg-amber-400',
        ping: 'bg-amber-500',
        text: 'text-amber-300',
        label: 'WARNUNG',
        badgeBg: 'bg-amber-500/15 border-amber-400/25',
    };
    return {
        border: 'border-sky-500/25',
        bg: 'bg-sky-500/[0.05]',
        dot: 'bg-sky-400',
        ping: 'bg-sky-400',
        text: 'text-sky-300',
        label: 'INFO',
        badgeBg: 'bg-sky-500/12 border-sky-400/20',
    };
}

// ── sub-components ────────────────────────────────────────────────────────────

function PulseDot({ color, animate = true, size = 'sm' }: { color: string; animate?: boolean; size?: 'xs' | 'sm' | 'md' }) {
    const dim = size === 'xs' ? 'h-1.5 w-1.5' : size === 'md' ? 'h-3 w-3' : 'h-2 w-2';
    return (
        <span className={`relative inline-flex ${dim} shrink-0`}>
            {animate && (
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-60`} />
            )}
            <span className={`relative inline-flex ${dim} rounded-full ${color}`} />
        </span>
    );
}

function MonitorCard({ monitor, isDown }: { monitor: NightwatchMonitorItem; isDown: boolean }) {
    return (
        <div className={`group relative overflow-hidden rounded-2xl border px-4 py-3 transition-colors ${
            isDown
                ? 'border-red-500/30 bg-red-500/[0.06] hover:bg-red-500/[0.09]'
                : 'border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.04]'
        }`}>
            <div className="flex items-center gap-3">
                <PulseDot color={isDown ? 'bg-red-400' : 'bg-emerald-400'} animate={isDown} />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-white/85">{monitor.name || monitor.host}</p>
                    {monitor.name && monitor.host && (
                        <p className="truncate text-[11px] text-white/35">{monitor.host}</p>
                    )}
                </div>
                <span className={`shrink-0 text-[10px] uppercase tracking-[0.14em] font-medium ${isDown ? 'text-red-300/80' : 'text-emerald-300/70'}`}>
                    {isDown ? 'Kritisch' : 'Online'}
                </span>
            </div>
        </div>
    );
}

function IncidentCard({ incident, onOpen }: { incident: NightwatchIncidentItem; onOpen: () => void }) {
    const cfg = severityConfig(incident.severity);
    return (
        <article className={`relative overflow-hidden rounded-2xl border ${cfg.border} ${cfg.bg}`}>
            {/* Left severity stripe */}
            <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${cfg.dot}`} />
            <div className="px-5 py-4">
                <div className="flex items-start gap-4">
                    <div className="mt-0.5 shrink-0">
                        <PulseDot color={cfg.dot} animate={incident.severity === 'critical'} size="sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] font-semibold ${cfg.badgeBg} ${cfg.text}`}>
                                {cfg.label}
                            </span>
                            {incident.host && (
                                <span className="text-[11px] text-white/40 font-mono">{incident.host}</span>
                            )}
                        </div>
                        <h3 className="text-sm font-medium text-white/90 leading-snug">
                            {incident.title || `Vorfall: ${incident.host || 'Infrastruktur'}`}
                        </h3>
                        {incident.summary && (
                            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-white/48">
                                {incident.summary}
                            </p>
                        )}
                        {incident.detected_at && (
                            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/30">
                                <Clock size={10} />
                                <span>{absoluteTime(incident.detected_at)}</span>
                                <span>·</span>
                                <span>{relativeTime(incident.detected_at)}</span>
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onOpen}
                        className="shrink-0 self-start rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] text-white/60 transition-colors hover:bg-white/[0.1] hover:text-white/85 active:scale-95"
                    >
                        Öffnen
                    </button>
                </div>
            </div>
        </article>
    );
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function NightwatchApp({ paneId }: AppProps) {
    const { removePane, openPane } = usePaneStore();

    const [incidents, setIncidents] = useState<NightwatchIncidentItem[]>([]);
    const [monitors, setMonitors] = useState<NightwatchMonitorItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const mountedRef = useRef(true);

    const close = useCallback(() => removePane(paneId), [removePane, paneId]);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [close]);

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const [inc, mon] = await Promise.all([fetchNightwatchIncidents(), fetchNightwatchMonitors()]);
            if (!mountedRef.current) return;
            setIncidents(inc);
            setMonitors(mon);
            setLastRefresh(new Date());
        } catch {
            if (!mountedRef.current) return;
            setIncidents([]);
            setMonitors([]);
        } finally {
            if (mountedRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // auto-refresh every 60s
    useEffect(() => {
        const id = setInterval(() => load(true), 60_000);
        return () => clearInterval(id);
    }, [load]);

    const downHosts = useMemo(
        () => new Set(incidents.map((i) => i.host).filter(Boolean) as string[]),
        [incidents],
    );

    const sortedMonitors = useMemo(() => {
        const down = monitors.filter((m) => m.host && downHosts.has(m.host));
        const up = monitors.filter((m) => !m.host || !downHosts.has(m.host));
        return [...down, ...up];
    }, [monitors, downHosts]);

    const criticalCount = incidents.filter((i) => i.severity === 'critical').length;
    const warningCount = incidents.filter((i) => i.severity === 'warning').length;

    const systemStatus: 'ok' | 'warning' | 'critical' =
        criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'ok';

    const heroBg = {
        ok:       'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16,185,129,0.10) 0%, transparent 70%)',
        warning:  'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,0.10) 0%, transparent 70%)',
        critical: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(239,68,68,0.12) 0%, transparent 70%)',
    }[systemStatus];

    const openIncident = (id: string, title?: string) =>
        openPane({ id: `document-${id}`, type: 'document', title: title || 'Vorfall', size: { width: 900, height: 700 }, data: { nodeId: id } });

    const sortedIncidents = useMemo(() => {
        const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
        return [...incidents].sort((a, b) => (order[a.severity || 'info'] ?? 2) - (order[b.severity || 'info'] ?? 2));
    }, [incidents]);

    return (
        <div
            data-testid="nightwatch-app"
            className="relative h-full w-full overflow-hidden"
            style={{ background: 'linear-gradient(165deg, #05080f 0%, #030610 50%, #02040a 100%)' }}
        >
            {/* Status-reactive ambient glow */}
            <div className="pointer-events-none absolute inset-0 transition-all duration-1000" style={{ background: heroBg }} />

            {/* Subtle grid texture */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.015]"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '48px 48px' }}
            />

            {/* Top bar */}
            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-white/[0.05] px-6 py-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <Shield size={14} className="text-cyan-400/70" />
                    <span className="text-[11px] uppercase tracking-[0.25em] text-white/40">Nightwatch</span>
                    {refreshing && (
                        <RefreshCw size={11} className="animate-spin text-white/25" />
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {lastRefresh && (
                        <span className="text-[10px] text-white/25">
                            {lastRefresh.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => load(true)}
                        disabled={refreshing}
                        className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-1.5 text-white/35 transition-colors hover:bg-white/[0.07] hover:text-white/65 disabled:opacity-40"
                        aria-label="Aktualisieren"
                    >
                        <RefreshCw size={12} />
                    </button>
                    <button
                        type="button"
                        onClick={close}
                        className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-1.5 text-white/35 transition-colors hover:bg-white/[0.07] hover:text-white/65"
                        aria-label="Schließen"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* Scrollable content */}
            <div className="h-full overflow-y-auto pt-16 pb-10 px-8 lg:px-16 xl:px-24" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.12) transparent' }}>

                {/* ── HERO ───────────────────────────────────────────────── */}
                <div className="mt-8 mb-10">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="mb-3 flex items-center gap-3">
                                {loading ? (
                                    <div className="h-2 w-2 rounded-full bg-white/20 animate-pulse" />
                                ) : systemStatus === 'ok' ? (
                                    <PulseDot color="bg-emerald-400" animate={false} size="sm" />
                                ) : (
                                    <PulseDot color={systemStatus === 'critical' ? 'bg-red-400' : 'bg-amber-400'} animate size="sm" />
                                )}
                                <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                                    loading ? 'text-white/25' :
                                    systemStatus === 'ok' ? 'text-emerald-300/80' :
                                    systemStatus === 'critical' ? 'text-red-300/80' : 'text-amber-300/80'
                                }`}>
                                    {loading ? 'Verbinde…' : systemStatus === 'ok' ? 'Alle Systeme normal' : systemStatus === 'critical' ? 'Kritischer Zustand' : 'Achtung erforderlich'}
                                </span>
                            </div>

                            {!loading && (
                                <h1 className="text-4xl font-extralight tracking-tight text-white lg:text-5xl">
                                    {systemStatus === 'ok' ? (
                                        'MÔRA beobachtet alles.'
                                    ) : systemStatus === 'critical' ? (
                                        <span>
                                            <span className="text-red-300">{criticalCount}</span>
                                            <span className="text-white/70"> kritischer{criticalCount !== 1 ? 'e' : ''} Vorfall{criticalCount !== 1 ? 'e' : ''}</span>
                                        </span>
                                    ) : (
                                        <span>
                                            <span className="text-amber-300">{warningCount}</span>
                                            <span className="text-white/70"> Warnung{warningCount !== 1 ? 'en' : ''}</span>
                                        </span>
                                    )}
                                </h1>
                            )}

                            {loading && (
                                <div className="mt-2 h-12 w-80 rounded-xl bg-white/[0.04] animate-pulse" />
                            )}
                        </div>

                        {/* Stat cards */}
                        {!loading && (
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="flex flex-col items-center rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-3 text-center">
                                    <span className="text-2xl font-light text-white">{monitors.length}</span>
                                    <span className="text-[10px] uppercase tracking-[0.14em] text-white/35 mt-0.5">Monitore</span>
                                </div>
                                <div className={`flex flex-col items-center rounded-2xl border px-5 py-3 text-center ${criticalCount > 0 ? 'border-red-500/30 bg-red-500/[0.05]' : 'border-white/[0.07] bg-white/[0.02]'}`}>
                                    <span className={`text-2xl font-light ${criticalCount > 0 ? 'text-red-300' : 'text-white'}`}>{criticalCount}</span>
                                    <span className="text-[10px] uppercase tracking-[0.14em] text-white/35 mt-0.5">Kritisch</span>
                                </div>
                                <div className={`flex flex-col items-center rounded-2xl border px-5 py-3 text-center ${warningCount > 0 ? 'border-amber-500/25 bg-amber-500/[0.05]' : 'border-white/[0.07] bg-white/[0.02]'}`}>
                                    <span className={`text-2xl font-light ${warningCount > 0 ? 'text-amber-300' : 'text-white'}`}>{warningCount}</span>
                                    <span className="text-[10px] uppercase tracking-[0.14em] text-white/35 mt-0.5">Warnung</span>
                                </div>
                                <div className={`flex flex-col items-center rounded-2xl border px-5 py-3 text-center ${systemStatus === 'ok' ? 'border-emerald-500/25 bg-emerald-500/[0.04]' : 'border-white/[0.07] bg-white/[0.02]'}`}>
                                    <span className={`text-2xl font-light ${systemStatus === 'ok' ? 'text-emerald-300' : 'text-white'}`}>{monitors.length - downHosts.size}</span>
                                    <span className="text-[10px] uppercase tracking-[0.14em] text-white/35 mt-0.5">Online</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── MONITORS ───────────────────────────────────────────── */}
                <section className="mb-10">
                    <div className="mb-3 flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-white/35 font-medium">Monitore</span>
                        <div className="h-px flex-1 bg-white/[0.06]" />
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-14 rounded-2xl bg-white/[0.03] animate-pulse" />
                            ))}
                        </div>
                    ) : monitors.length === 0 ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 text-sm text-white/35">
                            <Wifi size={14} className="shrink-0 text-white/25" />
                            Noch keine Monitore eingerichtet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {sortedMonitors.map((m) => (
                                <MonitorCard
                                    key={m.id}
                                    monitor={m}
                                    isDown={!!m.host && downHosts.has(m.host)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* ── INCIDENTS ──────────────────────────────────────────── */}
                <section>
                    <div className="mb-3 flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-white/35 font-medium">Offene Vorfälle</span>
                        {!loading && incidents.length > 0 && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${criticalCount > 0 ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>
                                {incidents.length}
                            </span>
                        )}
                        <div className="h-px flex-1 bg-white/[0.06]" />
                    </div>

                    {loading ? (
                        <div className="grid gap-3">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="h-24 rounded-2xl bg-white/[0.03] animate-pulse" />
                            ))}
                        </div>
                    ) : incidents.length === 0 ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] px-5 py-5">
                            <ShieldCheck size={18} className="shrink-0 text-emerald-300/60" />
                            <div>
                                <p className="text-sm font-medium text-emerald-100/75">Keine offenen Vorfälle</p>
                                <p className="text-[12px] text-emerald-200/40 mt-0.5">Alles ruhig — MÔRA überwacht weiter.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-3 lg:grid-cols-2">
                            {sortedIncidents.map((i) => (
                                <IncidentCard
                                    key={i.id}
                                    incident={i}
                                    onOpen={() => openIncident(i.id, i.title)}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
