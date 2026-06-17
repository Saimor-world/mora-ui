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

function ConnectCTA({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="mt-1 flex items-center gap-2 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.025] px-3 py-2.5 text-[12px] text-white/38 transition-all hover:border-white/22 hover:bg-white/[0.055] hover:text-white/60 hover:shadow-[0_0_18px_rgba(255,255,255,0.04)]"
        >
            <Plug size={13} className="shrink-0" />
            <span>{label}</span>
            <Settings size={11} className="ml-auto shrink-0 opacity-40" />
        </button>
    );
}

function EmptyRow({ label }: { label: string }) {
    return (
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] px-3 py-2.5 text-[11.5px] text-white/28 italic">
            {label}
        </div>
    );
}

function SevDot({ severity }: { severity: number | null }) {
    const color =
        severity === null || severity === undefined ? 'bg-white/30' :
        severity >= 0.7 ? 'bg-rose-400 animate-pulse' :
        severity >= 0.4 ? 'bg-amber-400' : 'bg-emerald-400';
    return <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${color}`} />;
}

// ─── Mein Tag zone ─────────────────────────────────────────────────────────────

function MeinTagZone({ mailPreview, calendarPreview, mailConfigured, calendarConfigured, homeView, onOpenMail, onOpenCalendar, onOpenIntegrations }: Pick<HomeCockpitProps, 'mailPreview' | 'calendarPreview' | 'mailConfigured' | 'calendarConfigured' | 'homeView' | 'onOpenMail' | 'onOpenCalendar' | 'onOpenIntegrations'>) {
    const nextEvent = calendarPreview[0] ?? null;
    const latestMail = mailPreview[0] ?? null;
    const tasks = homeView?.next_steps ?? [];

    return (
        <ZoneCard accent="bg-gradient-to-r from-cyan-400/60 via-sky-300/40 to-transparent">
            <ZoneLabel>
                <CalendarDays size={11} className="mr-1.5 inline opacity-70" aria-hidden />
                Mein Tag
            </ZoneLabel>
            <div className="flex flex-col gap-2.5 px-4 pb-4">

                {/* Calendar */}
                {calendarConfigured && nextEvent ? (
                    <button
                        type="button"
                        onClick={onOpenCalendar}
                        className="group flex items-start gap-3 rounded-xl border border-cyan-400/12 bg-cyan-400/[0.06] px-3 py-2.5 text-left transition-colors hover:bg-cyan-400/[0.12]"
                    >
                        <CalendarDays size={14} className="mt-0.5 shrink-0 text-cyan-300/70" />
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] text-white/85">{nextEvent.title}</div>
                            <div className="text-[11px] text-cyan-200/50">
                                {nextEvent.time ? `${nextEvent.time} Uhr` : nextEvent.date ?? 'Heute'}
                            </div>
                        </div>
                        <ArrowRight size={12} className="mt-0.5 shrink-0 text-white/20 transition-colors group-hover:text-white/50" />
                    </button>
                ) : calendarConfigured ? (
                    <EmptyRow label="Keine Termine heute" />
                ) : (
                    <ConnectCTA label="Kalender verbinden" onClick={onOpenIntegrations} />
                )}

                {/* Mail */}
                {mailConfigured && latestMail ? (
                    <button
                        type="button"
                        onClick={onOpenMail}
                        className="group flex items-start gap-3 rounded-xl border border-violet-400/12 bg-violet-400/[0.06] px-3 py-2.5 text-left transition-colors hover:bg-violet-400/[0.12]"
                    >
                        <Mail size={14} className="mt-0.5 shrink-0 text-violet-300/70" />
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] text-white/85">{latestMail.subject || 'Neue Mail'}</div>
                            <div className="truncate text-[11px] text-violet-200/50">{latestMail.from}</div>
                        </div>
                        {mailPreview.length > 1 && (
                            <span className="shrink-0 rounded-full bg-violet-500/25 px-1.5 py-0.5 text-[10px] text-violet-200/80">
                                +{mailPreview.length - 1}
                            </span>
                        )}
                    </button>
                ) : mailConfigured ? (
                    <EmptyRow label="Posteingang leer" />
                ) : (
                    <ConnectCTA label="Mail verbinden" onClick={onOpenIntegrations} />
                )}

                {/* Tasks from MÔRA */}
                <div className="mt-1">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/28">
                        <Sparkles size={9} />
                        Aufgaben (MÔRA)
                    </div>
                    {tasks.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                            {tasks.slice(0, 3).map((task) => (
                                <div key={task.id} className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-[12px] text-white/72">{task.title}</div>
                                        {task.source && (
                                            <div className="text-[10px] text-white/30 capitalize">{task.source}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyRow label="MÔRA hat noch keine Aufgaben erkannt." />
                    )}
                </div>
            </div>
        </ZoneCard>
    );
}

// ─── Team zone ─────────────────────────────────────────────────────────────────

const ACTIVITY_LABELS: Record<string, string> = {
    node_updated: 'Dokument bearbeitet',
    node_created: 'Neues Dokument',
    folder_created: 'Neuer Ordner',
    related_objects_cluster: 'Mora: Zusammenhänge',
    context_shift: 'Mora: Kontext-Shift',
};

function TeamZone({ teamActivities, teamMessages, onlineCount, unreadTeamMessages, onOpenTeam }: Pick<HomeCockpitProps, 'teamActivities' | 'teamMessages' | 'onlineCount' | 'unreadTeamMessages' | 'onOpenTeam'>) {
    const latestMsg = teamMessages[teamMessages.length - 1] ?? null;
    const latestActivity = teamActivities[0] ?? null;
    const knownUsers = Array.from(new Set(teamActivities.map((a) => a.user_name).filter(Boolean))).slice(0, 5) as string[];
    const hasAnyTeamSignal = onlineCount > 0 || latestMsg || latestActivity || knownUsers.length > 0;

    return (
        <ZoneCard accent="bg-gradient-to-r from-violet-400/60 via-indigo-300/40 to-transparent">
            <ZoneLabel>
                <Users size={11} className="opacity-70" aria-hidden />
                Team
            </ZoneLabel>
            <div className="flex flex-col gap-2.5 px-4 pb-4">

                {/* Online presence */}
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.028] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${onlineCount > 0 ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-white/18'}`} />
                            <span className="text-[13px] text-white/78">
                                {onlineCount > 0 ? `${onlineCount} online` : 'Alle offline'}
                            </span>
                        </div>
                        {unreadTeamMessages > 0 && (
                            <span className="rounded-full bg-violet-500/32 px-2 py-0.5 text-[10px] font-medium text-violet-200/92 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                                {unreadTeamMessages} neu
                            </span>
                        )}
                    </div>
                    {knownUsers.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {knownUsers.map((name) => (
                                <span key={name} className="rounded-full border border-white/[0.09] bg-white/[0.04] px-2 py-0.5 text-[10.5px] text-white/52">
                                    {name.split(' ')[0]}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Latest message */}
                {latestMsg ? (
                    <div className="flex items-start gap-2.5 rounded-xl border border-violet-300/12 bg-violet-400/[0.055] px-3 py-2.5 shadow-[0_0_18px_rgba(139,92,246,0.06)]">
                        <MessageSquare size={13} className="mt-0.5 shrink-0 text-violet-300/65" />
                        <div className="min-w-0 flex-1">
                            <div className="text-[10.5px] font-medium text-violet-200/58">{latestMsg.sender_name ?? 'Team'}</div>
                            <div className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-white/68">
                                {latestMsg.content}
                            </div>
                        </div>
                    </div>
                ) : (
                    <EmptyRow label="Keine neuen Nachrichten" />
                )}

                {/* Latest activity */}
                {latestActivity ? (
                    <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.028] px-3 py-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/55 shadow-[0_0_6px_rgba(103,232,249,0.4)]" />
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] text-white/62">
                                {ACTIVITY_LABELS[latestActivity.action ?? ''] ?? latestActivity.target_name ?? 'Aktivität'}
                            </div>
                            {latestActivity.user_name && (
                                <div className="text-[10px] text-white/32">{latestActivity.user_name}</div>
                            )}
                        </div>
                    </div>
                ) : !hasAnyTeamSignal ? (
                    <EmptyRow label="Noch keine Teamaktivitäten" />
                ) : null}

                <button
                    type="button"
                    onClick={onOpenTeam}
                    className="mt-auto flex items-center gap-2 rounded-xl border border-violet-300/16 bg-violet-400/[0.07] px-3 py-2 text-[11px] text-violet-100/68 transition-all hover:bg-violet-400/[0.16] hover:border-violet-300/28 hover:shadow-[0_0_18px_rgba(139,92,246,0.15)]"
                >
                    <Users size={12} />
                    Team öffnen
                    <ArrowRight size={11} className="ml-auto" />
                </button>
            </div>
        </ZoneCard>
    );
}

// ─── Signale zone ──────────────────────────────────────────────────────────────

function SignaleZone({ incidentStatusPanels, homeView, onOpenIntegrations, onOpenMora }: Pick<HomeCockpitProps, 'incidentStatusPanels' | 'homeView' | 'onOpenIntegrations' | 'onOpenMora'>) {
    const attentionItems = homeView?.attention ?? [];
    const hasSignals = incidentStatusPanels.length > 0 || attentionItems.length > 0;

    return (
        <ZoneCard accent={`bg-gradient-to-r ${incidentStatusPanels.length > 0 ? 'from-rose-400/60 via-orange-300/40' : 'from-emerald-400/50 via-teal-300/30'} to-transparent`}>
            <ZoneLabel>
                <AlertTriangle size={11} className="opacity-70" aria-hidden />
                Signale
            </ZoneLabel>
            <div className="flex flex-col gap-2.5 px-4 pb-4">

                {/* Nightwatch incidents */}
                {incidentStatusPanels.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                        {incidentStatusPanels.slice(0, 3).map((panel) => (
                            <div key={panel.id} className="flex items-start gap-2.5 rounded-xl border border-rose-400/18 bg-rose-400/[0.07] px-3 py-2.5 shadow-[0_0_14px_rgba(244,63,94,0.07)]">
                                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[12px] font-medium text-white/84">{panel.payload.title}</div>
                                    {panel.payload.summary && (
                                        <div className="mt-0.5 line-clamp-1 text-[11px] text-white/42">{panel.payload.summary}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {incidentStatusPanels.length > 3 && (
                            <div className="px-1 text-[11px] text-rose-300/52">
                                +{incidentStatusPanels.length - 3} weitere Vorfälle
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-400/14 bg-emerald-400/[0.04] px-3 py-2.5 shadow-[0_0_14px_rgba(52,211,153,0.05)]">
                        <CheckCircle2 size={13} className="shrink-0 text-emerald-400/60" />
                        <span className="text-[12px] text-white/55">Keine offenen Vorfälle gemeldet</span>
                    </div>
                )}

                {/* MÔRA attention items */}
                {attentionItems.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-white/28">
                            <Sparkles size={9} />
                            MÔRA bemerkt
                        </div>
                        {attentionItems.slice(0, 2).map((item) => (
                            <div key={item.id} className="flex items-start gap-2.5 rounded-xl border border-amber-300/14 bg-amber-400/[0.055] px-3 py-2">
                                <SevDot severity={item.severity} />
                                <span className="text-[12px] leading-relaxed text-white/67">{item.title}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Feed setup CTA */}
                {!hasSignals && (
                    <ConnectCTA label="Feeds & Integrationen einrichten" onClick={onOpenIntegrations} />
                )}

                <button
                    type="button"
                    onClick={onOpenMora}
                    className="mt-auto flex items-center gap-2 rounded-xl border border-amber-300/16 bg-amber-400/[0.065] px-3 py-2 text-[11px] text-amber-100/62 transition-all hover:bg-amber-400/[0.13] hover:border-amber-300/30 hover:shadow-[0_0_18px_rgba(245,158,11,0.14)]"
                >
                    <Sparkles size={12} />
                    MÔRA fragen
                    <ArrowRight size={11} className="ml-auto" />
                </button>
            </div>
        </ZoneCard>
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
    } = props;

    // Honest MÔRA presence state — reflects real UI activity, never fabricated insight.
    const moraSignalCount =
        (homeView?.changes ?? []).filter((c) => c.title && c.title.trim().length > 0).length +
        (homeView?.attention?.length ?? 0);
    const moraStatusLabel = moraSignalCount > 0
        ? `beobachtet · ${moraSignalCount} ${moraSignalCount === 1 ? 'Signal' : 'Signale'}`
        : 'wach · beobachtet im Hintergrund';

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto pb-2 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.3) transparent' }}>

            {/* ── Greeting header with living MÔRA presence ── */}
            <motion.div {...fade(0)} className="flex items-start justify-between gap-4">
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
                <motion.div {...fade(0.04)} className="flex flex-wrap gap-1.5">
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
                    <motion.div {...fade(0.06)}>
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

            {/* ── 3-zone cockpit grid ── */}
            <div className="grid flex-1 grid-cols-3 gap-3 min-h-0">
                <motion.div {...fade(0.08)} className="flex">
                    <MeinTagZone
                        mailPreview={mailPreview}
                        calendarPreview={calendarPreview}
                        mailConfigured={mailConfigured}
                        calendarConfigured={calendarConfigured}
                        homeView={homeView}
                        onOpenMail={onOpenMail}
                        onOpenCalendar={onOpenCalendar}
                        onOpenIntegrations={onOpenIntegrations}
                    />
                </motion.div>
                <motion.div {...fade(0.14)} className="flex">
                    <TeamZone
                        teamActivities={teamActivities}
                        teamMessages={teamMessages}
                        onlineCount={onlineCount}
                        unreadTeamMessages={unreadTeamMessages}
                        onOpenTeam={onOpenTeam}
                    />
                </motion.div>
                <motion.div {...fade(0.20)} className="flex">
                    <SignaleZone
                        incidentStatusPanels={incidentStatusPanels}
                        homeView={homeView}
                        onOpenIntegrations={onOpenIntegrations}
                        onOpenMora={onOpenMora}
                    />
                </motion.div>
            </div>

            {/* ── Weiterarbeiten ── */}
            {(recentActivityItems.length > 0 || deptTiles.some((d) => d.active)) && (
                <motion.div {...fade(0.28)}>
                    <WeiterarbeitenStrip
                        recentActivityItems={recentActivityItems}
                        deptTiles={deptTiles}
                        onOpenRecentActivity={onOpenRecentActivity}
                        onOpenFinder={onOpenFinder}
                        onGoExplore={onGoExplore}
                    />
                </motion.div>
            )}
        </div>
    );
}
