'use client';

import React from 'react';
import {
    Sparkles, CalendarDays, Mail, Users, AlertTriangle, CheckCircle2,
    BarChart2, Compass, FolderOpen, Plug, Clock, TrendingUp, Building2,
} from 'lucide-react';
import { useHomeView } from '@/lib/queries/useHomeView';
import { usePresence } from '@/lib/hooks/usePresence';
import { useSpaces } from '@/lib/queries/useSpaces';
import type { WidgetContext, WidgetDefinition } from '@/lib/widgets/types';

// ── Small shared building blocks ────────────────────────────────────────────

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex h-full items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center text-[11px] leading-relaxed text-white/38">
        {children}
    </div>
);

const Stat: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="flex flex-col gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
        <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-white/35">
            {icon}{label}
        </span>
        <span className="text-lg font-light tabular-nums text-white/85">{value}</span>
    </div>
);

const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-left text-[12px] text-white/62 transition-colors hover:border-white/[0.18] hover:bg-white/[0.09] hover:text-white/90"
    >
        <span className="opacity-70">{icon}</span>
        {label}
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
        </button>
    );
};

const MeinTagWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
    const { data } = useHomeView();
    const tasks = data?.next_steps ?? [];
    return (
        <div className="flex h-full flex-col gap-2">
            <div className="flex gap-2">
                <ActionButton icon={<CalendarDays size={13} />} label="Kalender" onClick={context.openCalendar} />
                <ActionButton icon={<Mail size={13} />} label="Mail" onClick={context.openMail} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                {tasks.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                        {tasks.slice(0, 5).map((t) => (
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
                {online.length} online
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

const SignalsWidget: React.FC<{ context: WidgetContext }> = () => {
    const { data } = useHomeView();
    const attention = data?.attention ?? [];
    return (
        <div className="flex h-full flex-col gap-1.5 overflow-y-auto">
            {attention.length > 0 ? (
                attention.slice(0, 6).map((a) => (
                    <div key={a.id} className="flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[12px] text-white/72">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-300/70" />
                        <span className="min-w-0 flex-1">{a.title}</span>
                    </div>
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
        defaultW: 12, defaultH: 2, minW: 4, minH: 2, surfaces: ['home', 'department'],
        render: ({ context }) => <MoraWidget context={context} />,
    },
    meinTag: {
        type: 'meinTag', label: 'Mein Tag', hint: 'Kalender, Mail & Aufgaben', icon: <CalendarDays size={14} />,
        defaultW: 4, defaultH: 6, minW: 3, minH: 4, surfaces: ['home', 'department'],
        render: ({ context }) => <MeinTagWidget context={context} />,
    },
    team: {
        type: 'team', label: 'Team', hint: 'Wer ist gerade da', icon: <Users size={14} />,
        defaultW: 4, defaultH: 5, minW: 3, minH: 3, surfaces: ['home', 'department'],
        render: ({ context }) => <TeamWidget context={context} />,
    },
    signals: {
        type: 'signals', label: 'Signale', hint: 'Vorfälle & Aufmerksamkeit', icon: <AlertTriangle size={14} />,
        defaultW: 4, defaultH: 5, minW: 3, minH: 3, surfaces: ['home', 'department'],
        render: () => <SignalsWidget context={{ surface: 'home' }} />,
    },
    orgStats: {
        type: 'orgStats', label: 'Organisation', hint: 'Abteilungen, Dokumente, Ordner', icon: <BarChart2 size={14} />,
        defaultW: 6, defaultH: 3, minW: 3, minH: 2, surfaces: ['home'],
        render: () => <OrgStatsWidget context={{ surface: 'home' }} />,
    },
    quickActions: {
        type: 'quickActions', label: 'Schnellzugriff', hint: 'Finder, MÔRA, Erkunden', icon: <Compass size={14} />,
        defaultW: 6, defaultH: 3, minW: 3, minH: 2, surfaces: ['home', 'department'],
        render: ({ context }) => <QuickActionsWidget context={context} />,
    },
    clock: {
        type: 'clock', label: 'Uhr', hint: 'Zeit & Datum', icon: <Clock size={14} />,
        defaultW: 3, defaultH: 3, minW: 2, minH: 2, surfaces: ['home', 'department'],
        render: () => <ClockWidget context={{ surface: 'home' }} />,
    },
    deptStats: {
        type: 'deptStats', label: 'Datenlage', hint: 'Bereiche & Ordner der Abteilung', icon: <TrendingUp size={14} />,
        defaultW: 6, defaultH: 3, minW: 3, minH: 2, surfaces: ['department'],
        render: ({ context }) => <DeptStatsWidget context={context} />,
    },
};

export const WIDGET_TYPES = Object.keys(WIDGET_REGISTRY);
