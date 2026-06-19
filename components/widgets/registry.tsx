'use client';

import React from 'react';
import {
    Sparkles, CalendarDays, Mail, Users, AlertTriangle, CheckCircle2,
    BarChart2, Compass, FolderOpen, Plug, Clock, TrendingUp, Building2,
    ArrowRight, Activity, Cpu, ExternalLink, Radio,
} from 'lucide-react';
import { useHomeView } from '@/lib/queries/useHomeView';
import { usePresence } from '@/lib/hooks/usePresence';
import { useSpaces } from '@/lib/queries/useSpaces';
import { fetchAllNightwatchIncidents } from '@/lib/api/nightwatchClient';
import { useBridgePulse } from '@/lib/hooks/useBridgePulse';
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

const CAL_COLORS = [
    'rgba(var(--scene-rgb,16,185,129),0.8)',
    'rgba(139,92,246,0.75)',
    'rgba(59,130,246,0.75)',
    'rgba(236,72,153,0.7)',
];

const MeinTagWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
    const { data: homeView } = useHomeView();
    const tasks = homeView?.next_steps ?? [];
    const mail = context.data?.mailPreview ?? [];
    const cal = context.data?.calendarPreview ?? [];
    const mailConfigured = context.data?.mailConfigured ?? false;
    const calConfigured = context.data?.calendarConfigured ?? false;

    return (
        <div className="flex h-full flex-col gap-3 overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin' }}>
            {/* Termine — colored left-border blocks */}
            <div>
                <SectionLabel icon={<CalendarDays size={10} className="opacity-70" />}>Termine</SectionLabel>
                {cal.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                        {cal.slice(0, 3).map((c, i) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={context.openCalendar}
                                className="flex items-stretch overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] text-left transition-colors hover:bg-white/[0.05]"
                            >
                                <div className="w-1 shrink-0 rounded-l-xl" style={{ background: CAL_COLORS[i % CAL_COLORS.length] }} />
                                <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2">
                                    {c.time && <span className="w-9 shrink-0 text-[10px] tabular-nums text-white/40">{c.time}</span>}
                                    <span className="min-w-0 flex-1 truncate text-[12px] text-white/75">{c.title}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : calConfigured ? (
                    <Empty>Keine Termine heute</Empty>
                ) : (
                    <ConnectCTA label="Kalender verbinden" onClick={context.openIntegrations} />
                )}
            </div>

            {/* Posteingang — sender avatar circles */}
            <div>
                <SectionLabel icon={<Mail size={10} className="opacity-70" />}>Posteingang</SectionLabel>
                {mail.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                        {mail.slice(0, 3).map((m) => {
                            const initials = nameInitials(m.from || '?');
                            const hue = nameHue(m.from || '');
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={context.openMail}
                                    className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-left transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]"
                                >
                                    <div
                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-medium"
                                        style={{ background: `hsla(${hue},55%,40%,0.25)`, color: `hsla(${hue},80%,75%,0.9)` }}
                                    >
                                        {initials}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-[12px] text-white/75">{m.subject}</div>
                                        <div className="truncate text-[10px] text-white/38">{m.from}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : mailConfigured ? (
                    <Empty>Posteingang leer</Empty>
                ) : (
                    <ConnectCTA label="Mail verbinden" onClick={context.openIntegrations} />
                )}
            </div>

            {/* Aufgaben — open circle checkboxes */}
            <div className="min-h-0">
                <SectionLabel icon={<CheckCircle2 size={10} className="opacity-70" />}>Aufgaben</SectionLabel>
                {tasks.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                        {tasks.slice(0, 4).map((t) => (
                            <div key={t.id} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                                <span
                                    className="h-4 w-4 shrink-0 rounded-full border"
                                    style={{ borderColor: 'rgba(var(--scene-rgb,16,185,129),0.4)' }}
                                />
                                <span className="min-w-0 flex-1 text-[12px] text-white/72">{t.title}</span>
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

function nameInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || '??';
}
function nameHue(name: string): number {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
}

const TeamWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
    const { peers } = usePresence();
    const online = peers.filter((p) => p.status === 'online');
    const away = peers.filter((p) => p.status !== 'online');
    const compact = context.compact;

    const AvatarRow: React.FC<{ name: string; isOnline: boolean }> = ({ name, isOnline }) => {
        const initials = nameInitials(name || 'Mitglied');
        const hue = nameHue(name || '');
        return (
            <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                    <div
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium"
                        style={{
                            background: `hsla(${hue},55%,40%,0.25)`,
                            color: `hsla(${hue},80%,75%,0.9)`,
                            border: isOnline ? `1.5px solid hsla(${hue},70%,60%,0.5)` : '1.5px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        {initials}
                    </div>
                    <span
                        className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full"
                        style={{
                            background: isOnline ? 'rgb(52,211,153)' : 'rgba(255,255,255,0.18)',
                            boxShadow: isOnline ? '0 0 0 1.5px rgba(0,0,0,0.6)' : '0 0 0 1.5px rgba(0,0,0,0.6)',
                        }}
                    />
                </div>
                <span className="min-w-0 flex-1 truncate text-[12px] text-white/72">{name || 'Mitglied'}</span>
                {isOnline && <span className="shrink-0 text-[9px] uppercase tracking-[.12em] text-emerald-400/70">online</span>}
            </div>
        );
    };

    if (compact) {
        return (
            <button type="button" onClick={context.openTeam} className="flex h-full w-full flex-col justify-center gap-2 text-left">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${online.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                    <span className="text-[10px] text-white/68">{online.length} online</span>
                </div>
                <div className="flex -space-x-1.5">
                    {[...online, ...away].slice(0, 4).map((p) => {
                        const initials = nameInitials(p.name || 'M');
                        const hue = nameHue(p.name || '');
                        return (
                            <div
                                key={p.sessionId}
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-black/40 text-[8px] font-medium"
                                style={{ background: `hsla(${hue},55%,40%,0.35)`, color: `hsla(${hue},80%,75%,0.9)` }}
                            >
                                {initials}
                            </div>
                        );
                    })}
                    {peers.length === 0 && <span className="text-[10px] text-white/38">Niemand online</span>}
                </div>
            </button>
        );
    }

    return (
        <div className="flex h-full flex-col gap-2">
            <div className="flex items-center gap-2 mb-0.5">
                <span className={`h-2 w-2 rounded-full shrink-0 ${online.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                <span className="text-[12px] text-white/72">{online.length} {online.length === 1 ? 'Person' : 'Personen'} online</span>
            </div>
            <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                {online.slice(0, 5).map((p) => <AvatarRow key={p.sessionId} name={p.name} isOnline={true} />)}
                {away.slice(0, 3).map((p) => <AvatarRow key={p.sessionId} name={p.name} isOnline={false} />)}
                {peers.length === 0 && <Empty>Gerade niemand online.</Empty>}
            </div>
            <ActionButton icon={<Users size={13} />} label="Team öffnen" onClick={context.openTeam} />
        </div>
    );
};

const SignalsWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
    const { data } = useHomeView();
    const attention = data?.attention ?? [];
    const compact = context.compact;

    if (compact) {
        return (
            <button type="button" onClick={context.openMora} className="flex h-full w-full flex-col justify-center gap-1.5 text-left">
                <div className="flex items-center justify-between">
                    <span className="text-[8px] uppercase tracking-[.16em] text-white/32">Signale</span>
                    <span
                        className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] tabular-nums"
                        style={{ background: attention.length > 0 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.06)', color: attention.length > 0 ? 'rgb(251,191,36)' : 'rgba(255,255,255,0.35)' }}
                    >
                        {attention.length}
                    </span>
                </div>
                {attention[0] ? (
                    <span className="line-clamp-2 text-[10px] leading-snug text-white/62">{attention[0].title}</span>
                ) : (
                    <span className="flex items-center gap-1.5 text-[10px] text-white/40">
                        <CheckCircle2 size={11} className="text-emerald-400/55" /> Alles ruhig
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="flex h-full flex-col gap-1.5 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {attention.length > 0 && (
                <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] uppercase tracking-[.16em] text-white/35">Signale</span>
                    <span
                        className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-medium tabular-nums"
                        style={{ background: 'rgba(251,191,36,0.15)', color: 'rgb(251,191,36)' }}
                    >
                        {attention.length}
                    </span>
                </div>
            )}
            {attention.length > 0 ? (
                attention.slice(0, 6).map((a) => (
                    <button
                        key={a.id}
                        type="button"
                        onClick={context.openMora}
                        className="flex items-stretch overflow-hidden rounded-xl border border-amber-300/15 bg-amber-400/[0.04] text-left transition-colors hover:border-amber-300/28 hover:bg-amber-400/[0.08]"
                    >
                        <div className="w-0.5 shrink-0" style={{ background: 'rgba(251,191,36,0.5)' }} />
                        <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2">
                            <AlertTriangle size={11} className="shrink-0 text-amber-300/65" />
                            <span className="min-w-0 flex-1 truncate text-[12px] text-white/72">{a.title}</span>
                        </div>
                    </button>
                ))
            ) : (
                <div className="flex h-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-[12px] text-white/45">
                    <CheckCircle2 size={14} className="text-emerald-400/60" /> Keine offenen Signale
                </div>
            )}
        </div>
    );
};

const OrgStatsWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
    const { data } = useHomeView();
    const pulse = useBridgePulse();
    const s = data?.org_stats;
    const compact = context.compact;
    if (!s && !pulse.loaded) return <Empty>Noch keine Organisationsdaten.</Empty>;

    const rows = [
        ...(s ? [
            { label: 'Abteilungen', value: s.departments ?? 0 },
            { label: 'Bereiche',    value: s.spaces      ?? 0 },
            { label: 'Ordner',      value: s.folders     ?? 0 },
            { label: 'Dokumente',   value: s.documents   ?? 0 },
            ...(s.members != null && !compact ? [{ label: 'Mitglieder', value: s.members }] : []),
        ] : []),
        ...(pulse.bridgeNodes != null && !compact ? [{ label: 'Knoten (Bridge)', value: pulse.bridgeNodes }] : []),
    ];
    if (rows.length === 0) return <Empty>Noch keine Organisationsdaten.</Empty>;
    const maxVal = Math.max(...rows.map((r) => r.value), 1);

    const pulseLine = pulse.loaded && (pulse.cpu != null || pulse.moraLoad != null) ? (
        <div className={`flex flex-wrap gap-1.5 ${compact ? 'mt-1' : 'mt-2'}`}>
            {pulse.cpu != null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[9px] tabular-nums text-white/50">
                    <Cpu size={9} className="opacity-60" />
                    {Math.round(pulse.cpu)}% CPU
                </span>
            )}
            {pulse.moraLoad != null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/16 bg-cyan-500/[0.06] px-2 py-0.5 text-[9px] tabular-nums text-cyan-200/70">
                    <Radio size={9} className="opacity-70" />
                    MÔRA {Math.round(pulse.moraLoad * 100)}%
                </span>
            )}
            {pulse.openIncidents != null && pulse.openIncidents > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/18 bg-rose-500/[0.08] px-2 py-0.5 text-[9px] text-rose-200/75">
                    {pulse.openIncidents} NW
                </span>
            )}
        </div>
    ) : null;

    return (
        <div className={`flex h-full flex-col justify-center ${compact ? 'gap-1' : 'gap-2'}`}>
            {rows.map(({ label, value }) => (
                <div key={label} className="flex items-center gap-1.5">
                    <span className={`shrink-0 text-right uppercase tracking-[.12em] text-white/35 ${compact ? 'w-[52px] text-[7px]' : 'w-[72px] text-[9px]'}`}>{label}</span>
                    <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${(value / maxVal) * 100}%`,
                                background: 'rgba(var(--scene-rgb, 16,185,129), 0.6)',
                                transition: 'width 0.5s ease',
                            }}
                        />
                    </div>
                    <span className={`shrink-0 text-right tabular-nums text-white/55 ${compact ? 'w-5 text-[9px]' : 'w-7 text-[11px]'}`}>{value}</span>
                </div>
            ))}
            {pulseLine}
            {!compact && context.openDashboard && (
                <button
                    type="button"
                    onClick={context.openDashboard}
                    className="mt-auto flex items-center gap-1.5 text-[10px] text-white/38 transition-colors hover:text-cyan-200/80"
                >
                    <ExternalLink size={10} />
                    Larry Dashboard
                </button>
            )}
        </div>
    );
};

const BridgePulseWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
    const pulse = useBridgePulse();
    const compact = context.compact;

    if (!pulse.loaded) {
        return <Empty>Bridge-Puls verbindet…</Empty>;
    }

    const statusTone =
        pulse.criticalIncidents && pulse.criticalIncidents > 0
            ? 'text-rose-300/85'
            : pulse.openIncidents && pulse.openIncidents > 0
                ? 'text-amber-300/85'
                : 'text-emerald-300/85';

    const statusLabel =
        pulse.criticalIncidents && pulse.criticalIncidents > 0
            ? `${pulse.criticalIncidents} kritisch`
            : pulse.openIncidents && pulse.openIncidents > 0
                ? `${pulse.openIncidents} Nightwatch`
                : pulse.cognitionRate === 'elevated'
                    ? 'Erhöhte Last'
                    : 'Ruhig';

    if (compact) {
        return (
            <button
                type="button"
                onClick={context.openDashboard}
                className="flex h-full w-full flex-col justify-center gap-2 text-left"
            >
                <div className="flex items-center gap-2">
                    <span
                        className="h-2 w-2 shrink-0 rounded-full animate-pulse"
                        style={{ background: pulse.ambientIntensity > 0.5 ? 'rgb(251,191,36)' : 'rgb(52,211,153)' }}
                    />
                    <span className={`text-[11px] font-medium ${statusTone}`}>{statusLabel}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px] tabular-nums text-white/45">
                    <span>CPU {pulse.cpu != null ? `${Math.round(pulse.cpu)}%` : '–'}</span>
                    <span>MÔRA {pulse.moraLoad != null ? `${Math.round(pulse.moraLoad * 100)}%` : '–'}</span>
                </div>
            </button>
        );
    }

    return (
        <div className="flex h-full flex-col gap-2">
            <div className="flex items-center gap-2">
                <span
                    className="h-2 w-2 shrink-0 rounded-full animate-pulse"
                    style={{ background: pulse.ambientIntensity > 0.5 ? 'rgb(251,191,36)' : 'rgb(52,211,153)' }}
                />
                <div>
                    <div className={`text-[12px] font-medium ${statusTone}`}>{statusLabel}</div>
                    <div className="text-[9px] uppercase tracking-[0.16em] text-white/32">Bridge · Core · Nightwatch</div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
                <Stat label="CPU" value={pulse.cpu != null ? `${Math.round(pulse.cpu)}%` : '–'} icon={<Cpu size={10} />} />
                <Stat label="MÔRA Load" value={pulse.moraLoad != null ? `${Math.round(pulse.moraLoad * 100)}%` : '–'} icon={<Radio size={10} />} />
                <Stat label="Analysten" value={pulse.activeAnalysts ?? '–'} icon={<Users size={10} />} />
                <Stat label="Knoten" value={pulse.bridgeNodes ?? '–'} icon={<Building2 size={10} />} />
            </div>
            <div className="mt-auto flex gap-2">
                <ActionButton icon={<Activity size={13} />} label="Nightwatch" onClick={context.openNightwatch} />
                <ActionButton icon={<ExternalLink size={13} />} label="Dashboard" onClick={context.openDashboard} />
            </div>
        </div>
    );
};

const QuickActionsWidget: React.FC<{ context: WidgetContext }> = ({ context }) => (
    <div className="grid h-full grid-cols-2 gap-2 content-start">
        {([
            { icon: <FolderOpen size={20} />, label: 'Finder',       onClick: context.openFinder },
            { icon: <Sparkles  size={20} />, label: 'MÔRA',          onClick: context.openMora },
            { icon: <Compass   size={20} />, label: 'Erkunden',      onClick: context.goExplore },
            { icon: <Plug      size={20} />, label: 'Integrationen', onClick: context.openIntegrations },
        ] as const).map(({ icon, label, onClick }) => (
            <button
                key={label}
                type="button"
                onClick={onClick}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 transition-all hover:border-white/[0.18] hover:bg-white/[0.09]"
            >
                <span className="text-white/45">{icon}</span>
                <span className="text-[10px] uppercase tracking-[.14em] text-white/45">{label}</span>
            </button>
        ))}
    </div>
);

const ClockWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
    const [now, setNow] = React.useState(() => new Date());
    React.useEffect(() => {
        const t = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(t);
    }, []);

    const h = now.getHours() % 12;
    const m = now.getMinutes();
    const s = now.getSeconds();
    const hourDeg  = (h / 12) * 360 + (m / 60) * 30;
    const minDeg   = (m / 60) * 360 + (s / 60) * 6;
    const secDeg   = (s / 60) * 360;
    const hand = (deg: number, len: number) => {
        const a = (deg - 90) * (Math.PI / 180);
        return { x: 50 + len * Math.cos(a), y: 50 + len * Math.sin(a) };
    };
    const hr = hand(hourDeg, 22);
    const mr = hand(minDeg, 30);
    const sr = hand(secDeg, 33);
    const ticks = Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const major = i % 3 === 0;
        return { x1: 50 + (major ? 35 : 37) * Math.cos(a), y1: 50 + (major ? 35 : 37) * Math.sin(a), x2: 50 + 42 * Math.cos(a), y2: 50 + 42 * Math.sin(a), major };
    });
    const date = now.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
    const compact = context.compact || (context.gridSize && context.gridSize.w <= 2 && context.gridSize.h <= 2);

    const face = (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-label={`Uhr ${h}:${String(m).padStart(2,'0')}`}>
            <circle cx="50" cy="50" r="44" fill="rgba(8,11,24,0.35)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(var(--scene-rgb,16,185,129),0.18)" strokeWidth="1.5" />
            {ticks.map((t, i) => (
                <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                    stroke={t.major ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.1)'}
                    strokeWidth={t.major ? 1.5 : 0.8} strokeLinecap="round"
                />
            ))}
            <line x1="50" y1="50" x2={hr.x} y2={hr.y} stroke="rgba(255,255,255,0.78)" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="50" y1="50" x2={mr.x} y2={mr.y} stroke="rgba(255,255,255,0.6)"  strokeWidth="1.5" strokeLinecap="round" />
            <line x1="50" y1="50" x2={sr.x} y2={sr.y} stroke="rgba(var(--scene-rgb,16,185,129),0.9)" strokeWidth="1" strokeLinecap="round" />
            <circle cx="50" cy="50" r="2.5" fill="rgba(var(--scene-rgb,16,185,129),0.9)" />
        </svg>
    );

    if (compact) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center">
                <div className="aspect-square h-[88%] w-[88%] max-h-full max-w-full">{face}</div>
                <div className="mt-0.5 text-[7px] uppercase tracking-[0.14em] text-white/30">{date}</div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col items-center justify-center gap-1">
            <div className="w-full" style={{ maxHeight: 110 }}>{face}</div>
            <div className="text-[11px] text-white/38">{date}</div>
        </div>
    );
};

function catmullRomPath(pts: Array<{ x: number; y: number }>): string {
    if (pts.length < 2) return '';
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(i + 2, pts.length - 1)];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
}
const NW_ARC_C = 163.4; // 2*PI*r (r=26)

const _NW_RESOLVED = new Set(['resolved', 'dismissed', 'closed']);

const NightwatchWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
    const [incidents, setIncidents] = React.useState<NightwatchIncidentItem[]>([]);
    const [loaded, setLoaded] = React.useState(false);
    const compact = context.compact || (context.gridSize && context.gridSize.h <= 4);

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
    const resolved = incidents.filter((i) => _NW_RESOLVED.has((i.status || '').toLowerCase())).length;

    const tsNow = Date.now();
    const bars = Array.from({ length: 7 }, (_, idx) => {
        const dayStart = tsNow - (6 - idx) * 864e5;
        const dayEnd = dayStart + 864e5;
        return incidents.filter((i) => {
            const ts = i.detected_at ? new Date(i.detected_at).getTime() : 0;
            return ts >= dayStart && ts < dayEnd;
        }).length;
    });
    const maxBar = Math.max(...bars, 1);

    const cleanDays = bars.filter((b) => b === 0).length;
    const uptimePct = loaded ? Math.round((cleanDays / 7) * 100) : 0;
    const arcOffset = NW_ARC_C * (1 - uptimePct / 100);
    const arcColor = critical > 0 ? 'rgb(248,113,113)' : warnings > 0 ? 'rgb(251,191,36)' : 'rgb(52,211,153)';

    // Smooth SVG area chart
    const CW = 200;
    const CH = 44;
    const pts = bars.map((b, i) => ({
        x: (i / 6) * CW,
        y: CH - Math.max((b / maxBar) * CH * 0.9, b > 0 ? 4 : 0),
    }));
    const linePath = catmullRomPath(pts);
    const areaPath = `${linePath} L${CW},${CH} L0,${CH} Z`;
    const lineStroke = critical > 0 ? 'rgba(248,113,113,0.85)' : warnings > 0 ? 'rgba(251,191,36,0.85)' : 'rgba(52,211,153,0.7)';
    const areaFill = critical > 0 ? 'rgba(248,113,113,0.08)' : warnings > 0 ? 'rgba(251,191,36,0.08)' : 'rgba(52,211,153,0.06)';

    if (compact) {
        return (
            <button
                type="button"
                onClick={context.openNightwatch}
                className="flex h-full w-full flex-col gap-2 text-left"
            >
                <div className="flex items-center gap-2">
                    <svg width="40" height="40" viewBox="0 0 64 64" aria-label={`Uptime ${uptimePct}%`} className="shrink-0">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
                        <circle
                            cx="32" cy="32" r="26" fill="none"
                            stroke={arcColor}
                            strokeWidth="5"
                            strokeDasharray={`${NW_ARC_C}`}
                            strokeDashoffset={arcOffset}
                            strokeLinecap="round"
                            transform="rotate(-90 32 32)"
                        />
                        <text x="32" y="36" textAnchor="middle" fontSize="12" fontWeight="500" fill="rgba(255,255,255,0.85)">{uptimePct}%</text>
                    </svg>
                    <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-medium text-white/82">Nightwatch</div>
                        <div className="text-[8px] uppercase tracking-[.14em] text-white/32">
                            {!loaded ? 'Lädt…' : open.length === 0 ? 'Alles ruhig' : `${open.length} offen`}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                    {[
                        { label: 'Krit.', value: critical, color: critical > 0 ? 'rgb(248,113,113)' : undefined },
                        { label: 'Warn.', value: warnings, color: warnings > 0 ? 'rgb(251,191,36)' : undefined },
                        { label: 'Gel.', value: resolved, color: undefined },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-1.5 py-1 text-center">
                            <div className="text-[13px] font-light tabular-nums leading-none" style={{ color: color ?? 'rgba(255,255,255,0.78)' }}>{loaded ? value : '–'}</div>
                            <div className="mt-0.5 text-[7px] uppercase tracking-[.1em] text-white/28">{label}</div>
                        </div>
                    ))}
                </div>
            </button>
        );
    }

    return (
        <div className="flex h-full flex-col gap-2.5 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {/* Header + uptime arc */}
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span
                            className={`h-2 w-2 rounded-full shrink-0 ${loaded ? 'animate-pulse' : ''}`}
                            style={{ backgroundColor: arcColor }}
                        />
                        <span className="text-[13px] font-medium text-white/88">Nightwatch</span>
                    </div>
                    <span className="text-[9px] uppercase tracking-[.16em] text-white/35 block">
                        {!loaded ? 'Lädt…' : open.length === 0 ? 'Alles in Ordnung' : `${open.length} offene Vorfälle`}
                    </span>
                </div>
                <div className="flex flex-col items-center shrink-0 ml-2">
                    <svg width="50" height="50" viewBox="0 0 64 64" aria-label={`Uptime ${uptimePct}%`}>
                        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
                        <circle
                            cx="32" cy="32" r="26" fill="none"
                            stroke={arcColor}
                            strokeWidth="5"
                            strokeDasharray={`${NW_ARC_C}`}
                            strokeDashoffset={arcOffset}
                            strokeLinecap="round"
                            transform="rotate(-90 32 32)"
                            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
                        />
                        <text x="32" y="36" textAnchor="middle" fontSize="12" fontWeight="500" fill="rgba(255,255,255,0.85)">{uptimePct}%</text>
                    </svg>
                    <span className="text-[8px] uppercase tracking-[.13em] text-white/28 -mt-0.5">Uptime</span>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-1.5">
                {[
                    { label: 'Kritisch', value: critical, color: critical > 0 ? 'rgb(248,113,113)' : undefined as string | undefined },
                    { label: 'Warnung', value: warnings, color: warnings > 0 ? 'rgb(251,191,36)' : undefined as string | undefined },
                    { label: 'Gelöst', value: resolved, color: undefined as string | undefined },
                ].map(({ label, value, color }) => (
                    <div
                        key={label}
                        className="flex flex-col gap-0.5 rounded-xl border px-2.5 py-2"
                        style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
                    >
                        <span className="text-[18px] font-light tabular-nums leading-none" style={{ color: color ?? 'rgba(255,255,255,0.82)' }}>{loaded ? value : '–'}</span>
                        <span className="mt-0.5 text-[9px] uppercase tracking-[.12em] text-white/35">{label}</span>
                    </div>
                ))}
            </div>

            {/* SVG area chart */}
            <div>
                <SectionLabel icon={<TrendingUp size={10} className="opacity-70" />}>Vorfälle · 7 Tage</SectionLabel>
                <svg viewBox={`-2 -2 ${CW + 4} ${CH + 4}`} className="w-full" style={{ height: 44 }} aria-hidden="true">
                    <path d={areaPath} fill={areaFill} />
                    <path d={linePath} fill="none" stroke={lineStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    {pts.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={bars[i] > 0 ? lineStroke : 'rgba(255,255,255,0.12)'} />
                    ))}
                </svg>
                <div className="flex justify-between mt-1">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
                        <span key={d} className="text-[8px] uppercase tracking-[.1em] text-white/25">{d}</span>
                    ))}
                </div>
            </div>

            {/* Incident list */}
            {loaded && open.length === 0 && <Empty>Keine aktiven Vorfälle</Empty>}
            {loaded && open.length > 0 && (
                <div className="flex flex-col gap-1">
                    {open.slice(0, 3).map((inc) => {
                        const sev = (inc.severity || 'warning').toLowerCase();
                        const sevColor = sev === 'critical' ? 'rgb(248,113,113)' : sev === 'info' ? 'rgb(96,165,250)' : 'rgb(251,191,36)';
                        const sevBg = sev === 'critical' ? 'rgba(248,113,113,0.1)' : sev === 'info' ? 'rgba(96,165,250,0.1)' : 'rgba(251,191,36,0.1)';
                        return (
                            <div key={inc.id} className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: sevColor }} />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[11px] text-white/72">{inc.title || inc.host || 'Vorfall'}</div>
                                    {inc.host && <div className="truncate text-[10px] text-white/35">{inc.host}</div>}
                                </div>
                                <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[.1em]" style={{ background: sevBg, color: sevColor }}>{sev}</span>
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
    const rows = [
        { label: 'Bereiche', value: spaces.length },
        { label: 'Ordner',   value: folders },
    ];
    const maxVal = Math.max(...rows.map((r) => r.value), 1);
    return (
        <div className="flex h-full flex-col justify-center gap-3">
            {rows.map(({ label, value }) => (
                <div key={label} className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-right text-[9px] uppercase tracking-[.12em] text-white/35">{label}</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${(value / maxVal) * 100}%`,
                                background: 'rgba(var(--scene-rgb,16,185,129),0.6)',
                                transition: 'width 0.5s ease',
                            }}
                        />
                    </div>
                    <span className="w-7 shrink-0 text-right text-[13px] font-light tabular-nums text-white/65">{value}</span>
                </div>
            ))}
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
        defaultW: 4, defaultH: 6, minW: 3, minH: 4, surfaces: ['home', 'universe'],
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
        type: 'orgStats', label: 'Organisation', hint: 'Abteilungen, Dokumente, Bridge-Puls', icon: <BarChart2 size={14} />,
        defaultW: 6, defaultH: 3, minW: 3, minH: 2, surfaces: ['home', 'universe'],
        render: ({ context }) => <OrgStatsWidget context={context} />,
    },
    bridgePulse: {
        type: 'bridgePulse', label: 'Bridge Puls', hint: 'Core, Larry Dashboard & Live-Last', icon: <Radio size={14} />,
        defaultW: 3, defaultH: 3, minW: 2, minH: 2, surfaces: ['home', 'universe'],
        render: ({ context }) => <BridgePulseWidget context={context} />,
    },
    quickActions: {
        type: 'quickActions', label: 'Schnellzugriff', hint: 'Finder, MÔRA, Erkunden', icon: <Compass size={14} />,
        defaultW: 6, defaultH: 3, minW: 3, minH: 2, surfaces: ['home', 'department', 'universe'],
        render: ({ context }) => <QuickActionsWidget context={context} />,
    },
    clock: {
        type: 'clock', label: 'Uhr', hint: 'Zeit & Datum', icon: <Clock size={14} />,
        defaultW: 2, defaultH: 2, minW: 2, minH: 2, surfaces: ['home', 'department', 'universe'],
        render: ({ context }) => <ClockWidget context={context} />,
    },
    deptStats: {
        type: 'deptStats', label: 'Datenlage', hint: 'Bereiche & Ordner der Abteilung', icon: <TrendingUp size={14} />,
        defaultW: 6, defaultH: 3, minW: 3, minH: 2, surfaces: ['department'],
        render: ({ context }) => <DeptStatsWidget context={context} />,
    },
    nightwatch: {
        type: 'nightwatch', label: 'Nightwatch', hint: 'Infrastruktur-Vorfälle & 7-Tage-Verlauf', icon: <Activity size={14} />,
        defaultW: 4, defaultH: 6, minW: 3, minH: 4, surfaces: ['home', 'department', 'universe'],
        render: ({ context }) => <NightwatchWidget context={context} />,
    },
};

export const WIDGET_TYPES = Object.keys(WIDGET_REGISTRY);
