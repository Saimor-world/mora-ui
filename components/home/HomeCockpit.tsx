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
        <div className={`relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.042] backdrop-blur-sm ${className}`}>
            <div className={`pointer-events-none absolute left-0 top-0 h-[2px] w-full ${accent}`} />
            {children}
        </div>
    );
}

function ZoneLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="px-4 pt-4 pb-2 text-[10px] uppercase tracking-[0.22em] text-white/35">{children}</div>
    );
}

function ConnectCTA({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="mt-1 flex items-center gap-2 rounded-xl border border-dashed border-white/[0.14] bg-white/[0.03] px-3 py-2.5 text-[12px] text-white/40 transition-colors hover:border-white/28 hover:bg-white/[0.07] hover:text-white/65"
        >
            <Plug size={13} className="shrink-0" />
            <span>{label}</span>
            <Settings size={11} className="ml-auto shrink-0 opacity-50" />
        </button>
    );
}

function EmptyRow({ label }: { label: string }) {
    return (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[12px] text-white/32 italic">
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
                        <EmptyRow label="MÔRA analysiert deine Mails automatisch" />
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
                <Users size={11} className="mr-1.5 inline opacity-70" aria-hidden />
                Team
            </ZoneLabel>
            <div className="flex flex-col gap-2.5 px-4 pb-4">

                {/* Online presence */}
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${onlineCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                            <span className="text-[13px] text-white/75">
                                {onlineCount > 0 ? `${onlineCount} online` : 'Alle offline'}
                            </span>
                        </div>
                        {unreadTeamMessages > 0 && (
                            <span className="rounded-full bg-violet-500/30 px-1.5 py-0.5 text-[10px] text-violet-200/90">
                                {unreadTeamMessages} neu
                            </span>
                        )}
                    </div>
                    {knownUsers.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {knownUsers.map((name) => (
                                <span key={name} className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/55">
                                    {name.split(' ')[0]}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Latest message */}
                {latestMsg ? (
                    <div className="flex items-start gap-2.5 rounded-xl border border-violet-300/10 bg-violet-400/[0.05] px-3 py-2.5">
                        <MessageSquare size={13} className="mt-0.5 shrink-0 text-violet-300/60" />
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] text-violet-200/55">{latestMsg.sender_name ?? 'Team'}</div>
                            <div className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-white/65">
                                {latestMsg.content}
                            </div>
                        </div>
                    </div>
                ) : (
                    <EmptyRow label="Keine neuen Nachrichten" />
                )}

                {/* Latest activity */}
                {latestActivity ? (
                    <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/50" />
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] text-white/60">
                                {ACTIVITY_LABELS[latestActivity.action ?? ''] ?? latestActivity.target_name ?? 'Aktivität'}
                            </div>
                            {latestActivity.user_name && (
                                <div className="text-[10px] text-white/30">{latestActivity.user_name}</div>
                            )}
                        </div>
                    </div>
                ) : !hasAnyTeamSignal ? (
                    <EmptyRow label="Noch keine Teamaktivitäten" />
                ) : null}

                <button
                    type="button"
                    onClick={onOpenTeam}
                    className="mt-auto flex items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-400/[0.07] px-3 py-2 text-[11px] text-violet-100/65 transition-colors hover:bg-violet-400/[0.14]"
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
                <AlertTriangle size={11} className="mr-1.5 inline opacity-70" aria-hidden />
                Signale
            </ZoneLabel>
            <div className="flex flex-col gap-2.5 px-4 pb-4">

                {/* Nightwatch incidents */}
                {incidentStatusPanels.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                        {incidentStatusPanels.slice(0, 3).map((panel) => (
                            <div key={panel.id} className="flex items-start gap-2.5 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] px-3 py-2.5">
                                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400 animate-pulse" />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[12px] text-white/82">{panel.payload.title}</div>
                                    {panel.payload.summary && (
                                        <div className="mt-0.5 line-clamp-1 text-[11px] text-white/42">{panel.payload.summary}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {incidentStatusPanels.length > 3 && (
                            <div className="px-1 text-[11px] text-rose-300/50">
                                +{incidentStatusPanels.length - 3} weitere Vorfälle
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-400/14 bg-emerald-400/[0.05] px-3 py-2.5">
                        <CheckCircle2 size={13} className="shrink-0 text-emerald-300/70" />
                        <span className="text-[12px] text-emerald-100/65">Alles ruhig — keine Vorfälle</span>
                    </div>
                )}

                {/* MÔRA attention items */}
                {attentionItems.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/28">
                            <Sparkles size={9} className="mr-1 inline" />
                            MÔRA bemerkt
                        </div>
                        {attentionItems.slice(0, 2).map((item) => (
                            <div key={item.id} className="flex items-start gap-2.5 rounded-xl border border-amber-300/12 bg-amber-400/[0.05] px-3 py-2">
                                <SevDot severity={item.severity} />
                                <span className="text-[12px] leading-relaxed text-white/65">{item.title}</span>
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
                    className="mt-auto flex items-center gap-2 rounded-xl border border-amber-300/14 bg-amber-400/[0.06] px-3 py-2 text-[11px] text-amber-100/60 transition-colors hover:bg-amber-400/[0.12]"
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
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/28">Weiterarbeiten</div>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {recentActivityItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenRecentActivity(item)}
                        className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] text-white/62 transition-colors hover:border-white/[0.16] hover:bg-white/[0.09] hover:text-white/85"
                    >
                        <span className="shrink-0 opacity-60">{ICON[item.kind] ?? <FileText size={14} />}</span>
                        <span className="max-w-[120px] truncate">{item.label}</span>
                    </button>
                ))}
                {deptTiles.filter((d) => d.active).slice(0, 4).map(({ dept }) => (
                    <button
                        key={dept.id}
                        type="button"
                        onClick={onGoExplore}
                        className="flex shrink-0 items-center gap-2 rounded-xl border border-indigo-300/12 bg-indigo-400/[0.05] px-3 py-2 text-[12px] text-white/55 transition-colors hover:bg-indigo-400/[0.12]"
                    >
                        <Folder size={14} className="shrink-0 text-indigo-300/60" />
                        <span className="max-w-[100px] truncate">{dept.name}</span>
                    </button>
                ))}
                <button
                    type="button"
                    onClick={onOpenFinder}
                    className="flex shrink-0 items-center gap-2 rounded-xl border border-dashed border-white/[0.10] px-3 py-2 text-[12px] text-white/35 transition-colors hover:border-white/[0.22] hover:text-white/55"
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

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto pb-2 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.3) transparent' }}>

            {/* ── Greeting header ── */}
            <motion.div {...fade(0)} className="flex items-baseline justify-between gap-4">
                <div>
                    <h1 className="text-[clamp(22px,2.2vw,32px)] font-light leading-tight tracking-[-0.03em] text-white/90">
                        {greeting}{firstName ? <span className="text-white/44">, {firstName}.</span> : '.'}
                    </h1>
                    <div className="mt-1 text-[11px] text-white/32">{todayLabel}</div>
                </div>
                {/* Live status pills */}
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {onlineCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] text-emerald-200/70">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {onlineCount} online
                        </span>
                    )}
                    {mailPreview.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/18 bg-violet-400/[0.07] px-2.5 py-1 text-[11px] text-violet-200/65">
                            <Mail size={10} />
                            {mailPreview.length} {mailPreview.length === 1 ? 'Mail' : 'Mails'}
                        </span>
                    )}
                    {incidentStatusPanels.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-400/[0.08] px-2.5 py-1 text-[11px] text-rose-200/70">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                            {incidentStatusPanels.length} {incidentStatusPanels.length === 1 ? 'Vorfall' : 'Vorfälle'}
                        </span>
                    )}
                    {calendarPreview[0] && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/18 bg-cyan-400/[0.07] px-2.5 py-1 text-[11px] text-cyan-200/65">
                            <CalendarDays size={10} />
                            {calendarPreview[0].time ?? 'Termin'}
                        </span>
                    )}
                </div>
            </motion.div>

            {/* ── Org stats strip ── */}
            {homeView?.org_stats && (homeView.org_stats.departments > 0 || homeView.org_stats.documents > 0) && (
                <motion.div {...fade(0.04)} className="flex flex-wrap gap-2">
                    {[
                        { label: 'Abteilungen', value: homeView.org_stats.departments, icon: <Users size={11} /> },
                        { label: 'Dokumente', value: homeView.org_stats.documents, icon: <FileText size={11} /> },
                        { label: 'Ordner', value: homeView.org_stats.folders, icon: <Folder size={11} /> },
                        { label: 'Aufgaben', value: homeView.org_stats.tasks, icon: <CheckCircle2 size={11} /> },
                        ...(homeView.org_stats.members != null ? [{ label: 'Mitglieder', value: homeView.org_stats.members, icon: <Users size={11} /> }] : []),
                    ].filter(s => s.value > 0).map(stat => (
                        <div key={stat.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] text-white/52">
                            <span className="opacity-60">{stat.icon}</span>
                            <span className="tabular-nums text-white/76">{stat.value}</span>
                            <span>{stat.label}</span>
                        </div>
                    ))}
                    {(homeView.changes.length > 0 || homeView.attention.length > 0) && (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3 py-1 text-[11px] text-violet-200/70">
                            <Brain size={11} className="opacity-80" />
                            <span className="tabular-nums text-violet-100/80">{homeView.changes.length + homeView.attention.length}</span>
                            <span>Môra-Signale</span>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ── Môra changes (intelligence stream) ── */}
            {homeView && homeView.changes.length > 0 && (
                <motion.div {...fade(0.06)}>
                    <ZoneCard accent="bg-gradient-to-r from-violet-400/55 via-indigo-300/35 to-transparent">
                        <ZoneLabel>
                            <Brain size={11} className="mr-1.5 inline opacity-70" aria-hidden />
                            Môra beobachtet
                        </ZoneLabel>
                        <div className="flex flex-col gap-1.5 px-4 pb-4">
                            {homeView.changes.slice(0, 3).map(change => (
                                <div key={change.id} className="flex items-start gap-2.5 rounded-xl border border-violet-400/12 bg-violet-400/[0.05] px-3 py-2.5">
                                    <TrendingUp size={12} className="mt-0.5 shrink-0 text-violet-300/60" />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[12px] leading-snug text-white/78">{change.title}</div>
                                        {change.scope && (
                                            <div className="mt-0.5 text-[10px] text-white/36 uppercase tracking-[0.14em]">{change.scope}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ZoneCard>
                </motion.div>
            )}

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
