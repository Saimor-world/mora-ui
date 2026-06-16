'use client';

import React from 'react';
import {
    Sparkles, CalendarDays, Mail, Users, AlertTriangle, CheckCircle2,
    BarChart2, Compass, FolderOpen, Plug, Clock, TrendingUp, Building2,
    ArrowRight, Activity, Shield,
} from 'lucide-react';
import { useHomeView } from '@/lib/queries/useHomeView';
import { usePresence } from '@/lib/hooks/usePresence';
import { useSpaces } from '@/lib/queries/useSpaces';
import { fetchAllNightwatchIncidents } from '@/lib/api/nightwatchClient';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import type { WidgetContext, WidgetDefinition } from '@/lib/widgets/types';

// ── Small shared building blocks ────────────────────────────────────────────
// Scene-tinted, consistent, a touch more elevated than flat cards. Every accent
// resolves through --scene-rgb so widgets breathe with the active ritual scene.

const SectionLabel: React.FC<{ icon?: React.ReactNode; children: React.ReactNode; trailing?: React.ReactNode }> = ({ icon, children, trailing }) => (
    <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-white/38">
            {icon}{children}
        </span>
        {trailing}
    </div>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex h-full min-h-[44px] items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-center text-[11px] leading-relaxed text-white/38">
        {children}
    </div>
);

const ConnectCTA: React.FC<{ label: string; onClick?: () => void }> = ({ label, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="group flex items-center gap-1.5 rounded-xl border border-dashed px-3 py-2 text-left text-[11px] transition-colors"
        style={{
            borderColor: 'rgba(var(--scene-rgb, 16,185,129), 0.28)',
            background: 'rgba(var(--scene-rgb, 16,185,129), 0.05)',
            color: 'rgba(var(--scene-rgb, 16,185,129), 0.85)',
        }}
    >
        <Plug size={12} className="opacity-80" />
        {label}
        <ArrowRight size={11} className="ml-auto opacity-50 transition-transform group-hover:translate-x-0.5" />
    </button>
);

const Stat: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({ label, value, icon }) => (
    <div
        className="flex flex-col gap-1 rounded-xl border px-3 py-2.5"
        style={{
            borderColor: 'rgba(var(--scene-rgb, 16,185,129), 0.12)',
            background: 'linear-gradient(155deg, rgba(var(--scene-rgb, 16,185,129), 0.06), rgba(255,255,255,0.015) 60%)',
        }}
    >
        <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-white/40">
            {icon}{label}
        </span>
        <span className="text-xl font-light tabular-nums text-white/88">{value}</span>
    </div>
);

const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-left text-[12px] text-white/62 transition-all hover:border-white/[0.18] hover:bg-white/[0.09] hover:text-white/90"
    >
        <span className="opacity-70">{icon}</span>
        {label}
    </button>
);

/** A single live row (mail / calendar / signal) with leading icon + meta. */
const LiveRow: React.FC<{
    icon: React.ReactNode;
    title: string;
    meta?: string;
    onClick?: () => void;
}> = ({ icon, title, meta, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-left transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]"
    >
        <span className="mt-0.5 shrink-0 opacity-70">{icon}</span>
        <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] text-white/78">{title}</span>
            {meta && <span className="mt-0.5 block truncate text-[10px] text-white/40">{meta}</span>}
        </span>
    </button>
);

// ── Widget bodies ───────────────────────────────────────────────────────────

const MoraWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
    const { data } = useHomeView();
    const titled = (data?.changes ?? []).filter((c) => c.title && c.title.trim().length > 0);
    const signalCount = titled.length + (data?.attention?.length ?? 0);
    return (
        <button type="button" onClick={context.openMora} className="flex h-full w-full items-center gap-4 text-left">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                <span
                    className="absolute inset-0 animate-pulse rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(var(--scene-rgb, 16,185,129), 0.3) 0%, transparent 70%)' }}
                />
                <span
                    className="relative flex h-8 w-8 items-center justify-center rounded-full"
                    style={{
                        background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.45), rgba(var(--scene-rgb, 16,185,129), 0.62) 46%, rgba(0,0,0,0.32))',
                        boxShadow: '0 0 22px rgba(var(--scene-rgb, 16,185,129), 0.5)',
                    }}
                >
                    <Sparkles size={13} className="text-white/95" />
                </span>
            </span>
            <div className="min-w-0 flex-1">
                <div className="text-sm text-white/85">MÔRA</div>
                <div className="mt-0.5 text-[11px] text-white/45">
                    {signalCount > 0 ? `beobachtet · ${signalCount} ${signalCount === 1 ? 'Signal' : 'Signale'}` : 'wach · beobachtet im Hintergrund'}
                </div>
                {titled[0] && (
                    <div className="mt-1.5 truncate text-[11px] text-white/55">{titled[0].title}</div>
                )}
            </div>
            <ArrowRight size={14} className="shrink-0 text-white/25" />
        </button>
    );
};

const MeinTagWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
    const { data: homeView } = useHomeView();
    const tasks = homeView?.next_steps ?? [];
    const mail = context.data?.mailPreview ?? [];
    const cal = context.data?.calendarPreview ?? [];
    const mailConfigured = context.data?.mailConfigured ?? false;
    const calConfigured = context.data?.calendarConfigured ?? false;

    return (
        <div className="flex h-full flex-col gap-3 overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin' }}>
            {/* Termine */}
            <div>
                <SectionLabel icon={<CalendarDays size={10} className="opacity-70" />}>Termine</SectionLabel>
                {cal.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                        {cal.slice(0, 3).map((c) => (
                            <LiveRow
                                key={c.id}
                                icon={<CalendarDays size={13} style={{ color: 'rgba(var(--scene-rgb, 16,185,129), 0.8)' }} />}
                                title={c.title}
                                meta={[c.time, c.location].filter(Boolean).join(' · ') || undefined}
                                onClick={context.openCalendar}
                            />
                        ))}
                    </div>
                ) : calConfigured ? (
                    <Empty>Keine Termine heute</Empty>
                ) : (
                    <ConnectCTA label="Kalender verbinden" onClick={context.openIntegrations} />
                )}
            </div>

            {/* Posteingang */}
            <div>
                <SectionLabel icon={<Mail size={10} className="opacity-70" />}>Posteingang</SectionLabel>
                {mail.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                        {mail.slice(0, 3).map((m) => (
                            <LiveRow
                                key={m.id}
                                icon={<Mail size={13} className="text-violet-300/75" />}
                                title={m.subject}
                                meta={m.from}
                                onClick={context.openMail}
                            />
                        ))}
                    </div>
                ) : mailConfigured ? (
                    <Empty>Posteingang leer</Empty>
                ) : (
                    <ConnectCTA label="Mail verbinden" onClick={context.openIntegrations} />
                )}
            </div>

            {/* Aufgaben (MÔRA-erkannt, evidenzbasiert) */}
            <div className="min-h-0">
                <SectionLabel icon={<CheckCircle2 size={10} className="opacity-70" />}>Aufgaben</SectionLabel>
                {tasks.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                        {tasks.slice(0, 4).map((t) => (
                            <div key={t.id} className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[12px] text-white/72">
                                <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-white/40" />
                                <span className="min-w-0 flex-1">{t.title}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Empty>MÔRA hat noch keine Aufgaben erkannt.</Empty>
                )}
            </div>
        </div>
    );
};

const TeamWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
    const { peers } = usePresence();
    const online = peers.filter((p) => p.status === 'online');
    return (
        <div className="flex h-full flex-col gap-2">
            <div className="flex items-center gap-2 text-[12px] text-white/72">
                <span className={`h-2 w-2 rounded-full ${online.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                {online.length} {online.length === 1 ? 'Person' : 'Personen'} online
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                {online.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {online.slice(0, 8).map((p) => (
                            <span key={p.sessionId} className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2.5 py-0.5 text-[11px] text-white/60">
                                {p.name || 'Mitglied'}
                            </span>
                        ))}
                    </div>
                ) : (
                    <Empty>Gerade niemand online.</Empty>
                )}
            </div>
            <ActionButton icon={<Users size={13} />} label="Team öffnen" onClick={context.openTeam} />
        </div>
    );
};

const SignalsWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
    const { data } = useHomeView();
    const attention = data?.attention ?? [];
    return (
        <div className="flex h-full flex-col gap-1.5 overflow-y-auto">
            {attention.length > 0 ? (
                attention.slice(0, 6).map((a) => (
                    <button
                        key={a.id}
                        type="button"
                        onClick={context.openMora}
                        className="flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-400/[0.05] px-3 py-2 text-left text-[12px] text-white/74 transition-colors hover:border-amber-300/30 hover:bg-amber-400/[0.1]"
                    >
                        <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-300/75" />
                        <span className="min-w-0 flex-1">{a.title}</span>
                    </button>
                ))
            ) : (
                <div className="flex h-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-[12px] text-white/55">
                    <CheckCircle2 size={14} /> Keine offenen Signale gemeldet
                </div>
            )}
        </div>
    );
};

const OrgStatsWidget: React.FC<{ context: WidgetContext }> = () => {
    const { data } = useHomeView();
    const s = data?.org_stats;
    if (!s) return <Empty>Noch keine Organisationsdaten.</Empty>;
    return (
        <div className="grid h-full grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Abteilungen" value={s.departments} icon={<Building2 size={10} />} />
            <Stat label="Dokumente" value={s.documents} icon={<FolderOpen size={10} />} />
            <Stat label="Ordner" value={s.folders} icon={<FolderOpen size={10} />} />
            <Stat label="Aufgaben" value={s.tasks} icon={<CheckCircle2 size={10} />} />
            <Stat label="Bereiche" value={s.spaces} icon={<BarChart2 size={10} />} />
            {s.members != null && <Stat label="Mitglieder" value={s.members} icon={<Users size={10} />} />}
        </div>
    );
};

const QuickActionsWidget: React.FC<{ context: WidgetContext }> = ({ context }) => (
    <div className="grid h-full grid-cols-2 gap-2 content-start">
        <ActionButton icon={<FolderOpen size={13} />} label="Finder" onClick={context.openFinder} />
        <ActionButton icon={<Sparkles size={13} />} label="MÔRA fragen" onClick={context.openMora} />
        <ActionButton icon={<Compass size={13} />} label="Erkunden" onClick={context.goExplore} />
        <ActionButton icon={<Plug size={13} />} label="Integrationen" onClick={context.openIntegrations} />
    </div>
);

const ClockWidget: React.FC<{ context: WidgetContext }> = () => {
    const [now, setNow] = React.useState(() => new Date());
    React.useEffect(() => {
        const t = window.setInterval(() => setNow(new Date()), 1000 * 30);
        return () => window.clearInterval(t);
    }, []);
    const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    return (
        <div className="flex h-full flex-col items-center justify-center">
            <div className="text-3xl font-extralight tabular-nums text-white/88" style={{ textShadow: '0 0 24px rgba(var(--scene-rgb, 16,185,129), 0.3)' }}>{time}</div>
            <div className="mt-1 text-[11px] text-white/40">{date}</div>
        </div>
    );
};

const _NW_RESOLVED = new Set(['resolved', 'dismissed', 'closed']);

const NightwatchWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
    const [incidents, setIncidents] = React.useState<NightwatchIncidentItem[]>([]);
    const [loaded, setLoaded] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        fetchAllNightwatchIncidents()
            .then((data) => { if (!cancelled) { setIncidents(data); setLoaded(true); } })
            .catch(() => { if (!cancelled) setLoaded(true); });
        return () => { cancelled = true; };
    }, []);

    const open = incidents.filter((i) => !_NW_RESOLVED.has((i.status || 'open').toLowerCase()));
    const critical = open.filter((i) => i.severity === 'critical').length;
    const warnings = open.filter((i) => i.severity === 'warning').length;

    const now = Date.now();
    const bars = Array.from({ length: 7 }, (_, idx) => {
        const dayStart = now - (6 - idx) * 864e5;
        const dayEnd = dayStart + 864e5;
        return incidents.filter((i) => {
            const ts = i.detected_at ? new Date(i.detected_at).getTime() : 0;
            return ts >= dayStart && ts < dayEnd;
        }).length;
    });
    const maxBar = Math.max(...bars, 1);
    const statusRgb = critical > 0 ? '248,113,113' : warnings > 0 ? '251,191,36' : '52,211,153';

    return (
        <div className="flex h-full flex-col gap-2.5 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {/* Status */}
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${open.length > 0 ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: `rgb(${statusRgb})` }}
                />
                <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-white/80">
                        {open.length === 0 ? 'Alles in Ordnung' : `${open.length} offene Vorfälle`}
                    </div>
                    {(critical > 0 || warnings > 0) && (
                        <div className="mt-0.5 flex gap-2 text-[10px]">
                            {critical > 0 && <span style={{ color: 'rgb(248,113,113)' }}>{critical} kritisch</span>}
                            {warnings > 0 && <span style={{ color: 'rgb(251,191,36)' }}>{warnings} Warnung</span>}
                        </div>
                    )}
                </div>
                <Shield size={14} className="shrink-0 text-white/20" />
            </div>

            {/* 7-day bar chart */}
            <div>
                <SectionLabel icon={<TrendingUp size={10} className="opacity-70" />}>Letzte 7 Tage</SectionLabel>
                <div className="flex items-end gap-1" style={{ height: 36 }}>
                    {bars.map((count, i) => (
                        <div
                            key={i}
                            className="flex-1 rounded-sm transition-all duration-300"
                            style={{
                                height: `${Math.max((count / maxBar) * 100, 8)}%`,
                                background: count === 0
                                    ? 'rgba(255,255,255,0.05)'
                                    : `rgba(${statusRgb}, ${0.25 + (count / maxBar) * 0.55})`,
                            }}
                        />
                    ))}
                </div>
                <div className="mt-1 flex justify-between text-[9px] text-white/25">
                    <span>–6d</span><span>heute</span>
                </div>
            </div>

            {/* Incident list */}
            {!loaded && <Empty>Lädt…</Empty>}
            {loaded && open.length === 0 && <Empty>Keine aktiven Vorfälle</Empty>}
            {loaded && open.length > 0 && (
                <div className="flex flex-col gap-1">
                    {open.slice(0, 4).map((inc) => {
                        const sev = (inc.severity || 'warning').toLowerCase();
                        const sevColor = sev === 'critical' ? 'rgb(248,113,113)' : sev === 'info' ? 'rgb(96,165,250)' : 'rgb(251,191,36)';
                        return (
                            <div key={inc.id} className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: sevColor }} />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[11px] text-white/72">{inc.title || inc.host || 'Vorfall'}</div>
                                    {inc.host && <div className="truncate text-[10px] text-white/38">{inc.host}</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-auto pt-1">
                <ActionButton icon={<Activity size={13} />} label="Nightwatch öffnen" onClick={context.openNightwatch} />
            </div>
        </div>
    );
};

const DeptStatsWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
    const { data: spaces = [] } = useSpaces(context.departmentId);
    const folders = spaces.reduce((sum, s) => sum + (s.folder_count ?? 0), 0);
    return (
        <div className="grid h-full grid-cols-2 gap-2">
            <Stat label="Bereiche" value={spaces.length} icon={<BarChart2 size={10} />} />
            <Stat label="Ordner" value={folders} icon={<FolderOpen size={10} />} />
        </div>
    );
};

// ── Registry ────────────────────────────────────────────────────────────────

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
    mora: {
        type: 'mora', label: 'MÔRA', hint: 'Lebendige Präsenz & Signale', icon: <Sparkles size={14} />,
        defaultW: 12, defaultH: 2, minW: 4, minH: 2, surfaces: ['home', 'department', 'universe'],
        render: ({ context }) => <MoraWidget context={context} />,
    },
    meinTag: {
        type: 'meinTag', label: 'Mein Tag', hint: 'Kalender, Mail & Aufgaben', icon: <CalendarDays size={14} />,
        defaultW: 4, defaultH: 6, minW: 3, minH: 4, surfaces: ['home', 'department', 'universe'],
        render: ({ context }) => <MeinTagWidget context={context} />,
    },
    team: {
        type: 'team', label: 'Team', hint: 'Wer ist gerade da', icon: <Users size={14} />,
        defaultW: 4, defaultH: 5, minW: 3, minH: 3, surfaces: ['home', 'department', 'universe'],
        render: ({ context }) => <TeamWidget context={context} />,
    },
    signals: {
        type: 'signals', label: 'Signale', hint: 'Vorfälle & Aufmerksamkeit', icon: <AlertTriangle size={14} />,
        defaultW: 4, defaultH: 5, minW: 3, minH: 3, surfaces: ['home', 'department', 'universe'],
        render: ({ context }) => <SignalsWidget context={context} />,
    },
    orgStats: {
        type: 'orgStats', label: 'Organisation', hint: 'Abteilungen, Dokumente, Ordner', icon: <BarChart2 size={14} />,
        defaultW: 6, defaultH: 3, minW: 3, minH: 2, surfaces: ['home', 'universe'],
        render: ({ context }) => <OrgStatsWidget context={context} />,
    },
    quickActions: {
        type: 'quickActions', label: 'Schnellzugriff', hint: 'Finder, MÔRA, Erkunden', icon: <Compass size={14} />,
        defaultW: 6, defaultH: 3, minW: 3, minH: 2, surfaces: ['home', 'department', 'universe'],
        render: ({ context }) => <QuickActionsWidget context={context} />,
    },
    clock: {
        type: 'clock', label: 'Uhr', hint: 'Zeit & Datum', icon: <Clock size={14} />,
        defaultW: 3, defaultH: 3, minW: 2, minH: 2, surfaces: ['home', 'department', 'universe'],
        render: ({ context }) => <ClockWidget context={context} />,
    },
    deptStats: {
        type: 'deptStats', label: 'Datenlage', hint: 'Bereiche & Ordner der Abteilung', icon: <TrendingUp size={14} />,
        defaultW: 6, defaultH: 3, minW: 3, minH: 2, surfaces: ['department'],
        render: ({ context }) => <DeptStatsWidget context={context} />,
    },
    nightwatch: {
        type: 'nightwatch', label: 'Nightwatch', hint: 'Infrastruktur-Vorfälle & 7-Tage-Verlauf', icon: <Activity size={14} />,
        defaultW: 4, defaultH: 8, minW: 3, minH: 5, surfaces: ['home', 'department', 'universe'],
        render: ({ context }) => <NightwatchWidget context={context} />,
    },
};

export const WIDGET_TYPES = Object.keys(WIDGET_REGISTRY);
