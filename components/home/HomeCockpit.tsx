'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle, ArrowRight, CalendarDays, CheckCircle2,
    FileText, Folder, Mail, MessageSquare, Plug, Settings,
    Sparkles, Users, BarChart2, Brain, TrendingUp,
} from 'lucide-react';
import type { HomeView } from '@/lib/queries/useHomeView';
import type { IncidentStatusPanel } from '@/lib/panel/types';
import type { PaneOpenRequest } from '@/lib/store/paneStore';
import type { RecentKind } from '@/components/home/homeSurfaceFormat';
import { WIDGET_REGISTRY } from '@/components/widgets/registry';
import type { WidgetContext } from '@/lib/widgets/types';

// ─── Prop types (kept local — these mirror HomeSurface's local shapes) ─────────

export interface CockpitMailPreview  { id: string; subject: string; from: string; snippet?: string; date?: string; }
export interface CockpitCalPreview   { id: string; title: string; date?: string; time?: string; }
export interface CockpitTeamActivity { id: string; user_name?: string; action?: string; target_name?: string; timestamp?: string; }
export interface CockpitTeamMessage  { id: string; sender_name?: string; content: string; timestamp?: string; }
export interface CockpitRecentItem   { id: string; label: string; kind: RecentKind; openedAt: number; paneData?: any; }
export interface CockpitDeptTile     { dept: { id: string; name: string }; count: number; active: boolean; }

export interface HomeCockpitProps {
    firstName:         string | null;
    greeting:          string;
    todayLabel:        string;
    mailPreview:       CockpitMailPreview[];
    calendarPreview:   CockpitCalPreview[];
    mailConfigured:    boolean;
    calendarConfigured: boolean;
    teamActivities:    CockpitTeamActivity[];
    teamMessages:      CockpitTeamMessage[];
    onlineCount:       number;
    unreadTeamMessages: number;
    homeView:          HomeView | undefined;
    incidentStatusPanels: IncidentStatusPanel[];
    recentActivityItems: CockpitRecentItem[];
    deptTiles:         CockpitDeptTile[];
    onOpenMail:        () => void;
    onOpenCalendar:    () => void;
    onOpenTeam:        () => void;
    onOpenIntegrations: () => void;
    onOpenFinder:      () => void;
    onOpenMora:        () => void;
    onOpenRecentActivity: (item: CockpitRecentItem) => void;
    onGoExplore:       () => void;
    onOpenNightwatch?: () => void;
}

// ─── Small UI helpers ──────────────────────────────────────────────────────────

function ZoneCard({ children, accent, className = '' }: {
    children: React.ReactNode;
    accent: string;
    className?: string;
}) {
    return (
        <div
            className={`relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.09] backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] ${className}`}
            style={{ backgroundColor: 'rgba(6, 8, 20, 0.72)' }}
        >
            {/* Top accent bar */}
            <div className={`pointer-events-none absolute left-0 top-0 h-[2px] w-full ${accent}`} />
            {/* Scene-tinted ambient glow */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.45]" style={{ background: 'linear-gradient(155deg, rgba(var(--scene-rgb, 16,185,129), 0.07), transparent 50%)' }} />
            {/* Bottom edge darkening */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-2xl" style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.25))' }} />
            <div className="relative z-[1] flex flex-col">{children}</div>
        </div>
    );
}

function ZoneLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="px-4 pt-4 pb-2.5 text-[9.5px] font-semibold uppercase tracking-[0.28em] text-white/30 flex items-center gap-1.5">{children}</div>
    );
}

/**
 * WidgetGlanceCard — renders a registry widget as a calm, read-only Home glance
 * card. Home is the lock-screen view: one widget system, no editing here. The
 * full editable desktop lives in Universe.
 */
function WidgetGlanceCard({ type, accent, context }: { type: string; accent: string; context: WidgetContext }) {
    const def = WIDGET_REGISTRY[type];
    if (!def) return null;
    return (
        <div
            className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.16] backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.10)]"
            style={{ backgroundColor: 'rgba(8, 12, 30, 0.68)' }}
        >
            <div className={`pointer-events-none absolute left-0 top-0 h-[2px] w-full ${accent}`} />
            <div className="pointer-events-none absolute inset-0 opacity-[0.5]" style={{ background: 'linear-gradient(155deg, rgba(var(--scene-rgb, 16,185,129), 0.09), transparent 55%)' }} />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-2xl" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.03), transparent)' }} />
            <ZoneLabel>{def.icon}{def.label}</ZoneLabel>
            <div className="relative z-[1] min-h-0 flex-1 px-4 pb-4">
                {def.render({ context })}
            </div>
        </div>
    );
}


// ─── Weiterarbeiten strip ──────────────────────────────────────────────────────

function WeiterarbeitenStrip({ recentActivityItems, deptTiles, onOpenRecentActivity, onOpenFinder, onGoExplore }: Pick<HomeCockpitProps, 'recentActivityItems' | 'deptTiles' | 'onOpenRecentActivity' | 'onOpenFinder' | 'onGoExplore'>) {
    const ICON: Record<string, React.ReactNode> = {
        document: <FileText size={14} />,
        finder:   <Folder size={14} />,
        notes:    <FileText size={14} />,
        chat:     <MessageSquare size={14} />,
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.26em] text-white/28">Weiterarbeiten</div>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {recentActivityItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenRecentActivity(item)}
                        className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.038] px-3 py-2 text-[12px] text-white/64 transition-all hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white/88 hover:shadow-[0_0_16px_rgba(255,255,255,0.05)]"
                    >
                        <span className="shrink-0 opacity-62">{ICON[item.kind] ?? <FileText size={14} />}</span>
                        <span className="max-w-[120px] truncate">{item.label}</span>
                    </button>
                ))}
                {deptTiles.filter((d) => d.active).slice(0, 4).map(({ dept }) => (
                    <button
                        key={dept.id}
                        type="button"
                        onClick={onGoExplore}
                        className="flex shrink-0 items-center gap-2 rounded-xl border border-indigo-300/14 bg-indigo-400/[0.055] px-3 py-2 text-[12px] text-white/56 transition-all hover:bg-indigo-400/[0.13] hover:border-indigo-300/26 hover:shadow-[0_0_14px_rgba(99,102,241,0.12)]"
                    >
                        <Folder size={14} className="shrink-0 text-indigo-300/64" />
                        <span className="max-w-[100px] truncate">{dept.name}</span>
                    </button>
                ))}
                <button
                    type="button"
                    onClick={onOpenFinder}
                    className="flex shrink-0 items-center gap-2 rounded-xl border border-dashed border-white/[0.09] px-3 py-2 text-[12px] text-white/32 transition-all hover:border-white/[0.22] hover:text-white/55 hover:bg-white/[0.03]"
                >
                    <Folder size={14} />
                    Finder
                </button>
            </div>
        </div>
    );
}

// ─── Main export ───────────────────────────────────────────────────────────────

const fade = (delay: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: 'easeOut' as const, delay },
});

export function HomeCockpit(props: HomeCockpitProps) {
    const {
        firstName, greeting, todayLabel,
        mailPreview, calendarPreview, mailConfigured, calendarConfigured,
        teamActivities, teamMessages, onlineCount, unreadTeamMessages,
        homeView, incidentStatusPanels,
        recentActivityItems, deptTiles,
        onOpenMail, onOpenCalendar, onOpenTeam, onOpenIntegrations,
        onOpenFinder, onOpenMora, onOpenRecentActivity, onGoExplore,
        onOpenNightwatch,
    } = props;

    // Honest MÔRA presence state — reflects real UI activity, never fabricated insight.
    const moraSignalCount =
        (homeView?.changes ?? []).filter((c) => c.title && c.title.trim().length > 0).length +
        (homeView?.attention?.length ?? 0);
    const moraStatusLabel = moraSignalCount > 0
        ? `beobachtet · ${moraSignalCount} ${moraSignalCount === 1 ? 'Signal' : 'Signale'}`
        : 'wach · beobachtet im Hintergrund';

    // Live truth + handlers passed to the glance widgets (single widget system,
    // same components the editable Universe desktop uses).
    const glanceContext: WidgetContext = {
        surface: 'home',
        data: { mailPreview, calendarPreview, mailConfigured, calendarConfigured, onlineCount },
        openMail: onOpenMail,
        openCalendar: onOpenCalendar,
        openIntegrations: onOpenIntegrations,
        openMora: onOpenMora,
        openTeam: onOpenTeam,
        openFinder: onOpenFinder,
        openNightwatch: onOpenNightwatch,
        goExplore: onGoExplore,
    };

    return (
        <div className="flex h-full flex-col gap-3 overflow-hidden pr-1">

            {/* ── Greeting header with living MÔRA presence ── */}
            <motion.div {...fade(0)} className="flex shrink-0 items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    {/* MÔRA orb — breathing, scene-coloured, opens MÔRA on click */}
                    <button
                        type="button"
                        onClick={onOpenMora}
                        aria-label="MÔRA öffnen"
                        className="group relative flex h-14 w-14 shrink-0 items-center justify-center outline-none"
                    >
                        <motion.span
                            className="absolute inset-0 rounded-full"
                            style={{ background: 'radial-gradient(circle, rgba(var(--scene-rgb, 16,185,129), 0.32) 0%, transparent 70%)' }}
                            animate={{ scale: [1, 1.22, 1], opacity: [0.55, 0.22, 0.55] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <motion.span
                            className="absolute inset-[5px] rounded-full border-[1.5px]"
                            style={{ borderColor: 'rgba(var(--scene-rgb, 16,185,129), 0.45)', borderTopColor: 'transparent', borderRightColor: 'transparent' }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
                        />
                        <span
                            className="relative flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-105"
                            style={{
                                background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.45), rgba(var(--scene-rgb, 16,185,129), 0.62) 46%, rgba(0,0,0,0.32))',
                                boxShadow: '0 0 26px rgba(var(--scene-rgb, 16,185,129), 0.5), inset 0 1px 2px rgba(255,255,255,0.4)',
                            }}
                        >
                            <Sparkles size={14} className="text-white/95" />
                        </span>
                    </button>
                    <div>
                        <h1 className="text-[clamp(22px,2.2vw,32px)] font-light leading-tight tracking-[-0.03em] text-white/90">
                            {greeting}{firstName ? <span className="text-white/44">, {firstName}.</span> : '.'}
                        </h1>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="text-white/32">{todayLabel}</span>
                            <span className="text-white/16">·</span>
                            <button
                                type="button"
                                onClick={onOpenMora}
                                className="inline-flex items-center gap-1.5 text-white/45 transition-colors hover:text-white/75"
                            >
                                <span className="font-medium" style={{ color: 'rgba(var(--scene-rgb, 16,185,129), 0.9)' }}>MÔRA</span>
                                <span>{moraStatusLabel}</span>
                            </button>
                        </div>
                    </div>
                </div>
                {/* Live status pills — premium glass badges */}
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {onlineCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/22 bg-emerald-400/[0.09] px-2.5 py-1 text-[10.5px] text-emerald-200/75 shadow-[0_0_12px_rgba(52,211,153,0.12)] backdrop-blur-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {onlineCount} online
                        </span>
                    )}
                    {mailPreview.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-2.5 py-1 text-[10.5px] text-violet-200/70 shadow-[0_0_12px_rgba(139,92,246,0.10)] backdrop-blur-sm">
                            <Mail size={10} />
                            {mailPreview.length} {mailPreview.length === 1 ? 'Mail' : 'Mails'}
                        </span>
                    )}
                    {incidentStatusPanels.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/22 bg-rose-400/[0.09] px-2.5 py-1 text-[10.5px] text-rose-200/75 shadow-[0_0_12px_rgba(244,63,94,0.12)] backdrop-blur-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                            {incidentStatusPanels.length} {incidentStatusPanels.length === 1 ? 'Vorfall' : 'Vorfälle'}
                        </span>
                    )}
                    {calendarPreview[0] && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-2.5 py-1 text-[10.5px] text-cyan-200/70 shadow-[0_0_12px_rgba(34,211,238,0.10)] backdrop-blur-sm">
                            <CalendarDays size={10} />
                            {calendarPreview[0].time ?? 'Termin'}
                        </span>
                    )}
                </div>
            </motion.div>

            {/* ── Org stats strip — glass badges with glow ── */}
            {homeView?.org_stats && (homeView.org_stats.departments > 0 || homeView.org_stats.documents > 0) && (
                <motion.div {...fade(0.04)} className="flex shrink-0 flex-wrap gap-1.5">
                    {[
                        { label: 'Abteilungen', value: homeView.org_stats.departments, icon: <Users size={11} /> },
                        { label: 'Dokumente', value: homeView.org_stats.documents, icon: <FileText size={11} /> },
                        { label: 'Ordner', value: homeView.org_stats.folders, icon: <Folder size={11} /> },
                        { label: 'Aufgaben', value: homeView.org_stats.tasks, icon: <CheckCircle2 size={11} /> },
                        ...(homeView.org_stats.members != null ? [{ label: 'Mitglieder', value: homeView.org_stats.members, icon: <Users size={11} /> }] : []),
                    ].filter(s => s.value > 0).map(stat => (
                        <div key={stat.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-1 text-[10.5px] text-white/50 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                            <span className="opacity-55">{stat.icon}</span>
                            <span className="tabular-nums font-medium text-white/78">{stat.value}</span>
                            <span>{stat.label}</span>
                        </div>
                    ))}
                    {(homeView.changes.length > 0 || homeView.attention.length > 0) && (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/22 bg-violet-400/[0.08] px-3 py-1 text-[10.5px] text-violet-200/72 shadow-[0_0_14px_rgba(139,92,246,0.10)] backdrop-blur-sm">
                            <Brain size={11} className="opacity-80" />
                            <span className="tabular-nums font-medium text-violet-100/84">{homeView.changes.length + homeView.attention.length}</span>
                            <span>Môra-Signale</span>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ── Môra changes (intelligence stream) — only render changes that
                 carry a real title, and hide the whole card if none do. No empty
                 rows, no fake system-truth. ── */}
            {(() => {
                const titledChanges = (homeView?.changes ?? []).filter(c => c.title && c.title.trim().length > 0);
                if (titledChanges.length === 0) return null;
                return (
                    <motion.div {...fade(0.06)} className="shrink-0">
                        <ZoneCard accent="bg-gradient-to-r from-violet-400/55 via-indigo-300/35 to-transparent">
                            <ZoneLabel>
                                <Brain size={11} className="mr-1.5 inline opacity-70" aria-hidden />
                                Môra beobachtet
                            </ZoneLabel>
                            <div className="flex flex-col gap-1.5 px-4 pb-4">
                                {titledChanges.slice(0, 3).map(change => (
                                    <div key={change.id} className="flex items-start gap-2.5 rounded-xl border border-violet-400/12 bg-violet-400/[0.05] px-3 py-2.5">
                                        <TrendingUp size={12} className="mt-0.5 shrink-0 text-violet-300/60" />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[12px] leading-snug text-white/82">{change.title}</div>
                                            {change.scope && (
                                                <div className="mt-0.5 text-[10px] text-white/36 uppercase tracking-[0.14em]">{change.scope}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ZoneCard>
                    </motion.div>
                );
            })()}

            {/* ── Widget glance — fills all remaining height proportionally.
                 No fixed px: two flex rows (55/45 split) fill the available
                 lock-screen space without scrolling. ── */}
            <div className="flex min-h-0 flex-1 flex-col gap-3">
                {/* Row 1: meinTag / team / signals — 55% of widget area */}
                <div className="min-h-0 flex-[55]">
                    <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <motion.div {...fade(0.08)} className="min-h-0 h-full">
                            <WidgetGlanceCard type="meinTag" accent="bg-gradient-to-r from-cyan-400/60 via-sky-300/40 to-transparent" context={glanceContext} />
                        </motion.div>
                        <motion.div {...fade(0.14)} className="min-h-0 h-full">
                            <WidgetGlanceCard type="team" accent="bg-gradient-to-r from-violet-400/60 via-indigo-300/40 to-transparent" context={glanceContext} />
                        </motion.div>
                        <motion.div {...fade(0.20)} className="min-h-0 h-full">
                            <WidgetGlanceCard type="signals" accent="bg-gradient-to-r from-emerald-400/50 via-teal-300/30 to-transparent" context={glanceContext} />
                        </motion.div>
                    </div>
                </div>

                {/* Row 2: Nightwatch (server pulse) + clock — 45% of widget area */}
                <div className="min-h-0 flex-[45]">
                    <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-3">
                        <motion.div {...fade(0.24)} className="min-h-0 h-full sm:col-span-2">
                            <WidgetGlanceCard type="nightwatch" accent="bg-gradient-to-r from-rose-400/50 via-orange-300/30 to-transparent" context={glanceContext} />
                        </motion.div>
                        <motion.div {...fade(0.28)} className="min-h-0 h-full">
                            <WidgetGlanceCard type="clock" accent="bg-gradient-to-r from-white/30 via-white/15 to-transparent" context={glanceContext} />
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
