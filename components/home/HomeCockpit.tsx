'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowRight, CalendarDays, CheckCircle2, Compass, FileText, Folder,
    Lock, Mail, Sparkles, Users,
} from 'lucide-react';
import type { HomeView } from '@/lib/queries/useHomeView';
import type { IncidentStatusPanel } from '@/lib/panel/types';
import type { RecentKind } from '@/components/home/homeSurfaceFormat';
import { WIDGET_REGISTRY } from '@/components/widgets/registry';
import type { WidgetContext } from '@/lib/widgets/types';
import { usePaneStore } from '@/lib/store/paneStore';
import { GLASS_SHEET_SIZE } from '@/lib/os/glassSheet';

// ─── Prop types ────────────────────────────────────────────────────────────────

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
    privateAreaLabel?: string | null;
    privateFolderCount?: number;
    privateDocumentCount?: number;
    privateFileCount?: number;
    onOpenPrivateArea?: () => void;
    showOrgOverview?: boolean;
}

// ─── UI helpers ────────────────────────────────────────────────────────────────

function GlanceCard({ type, accent, context }: { type: string; accent: string; context: WidgetContext }) {
    const def = WIDGET_REGISTRY[type];
    if (!def) return null;
    return (
        <div
            className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.10] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.07)]"
            style={{ backgroundColor: 'rgba(8, 12, 30, 0.62)' }}
        >
            <div className={`pointer-events-none absolute left-0 top-0 h-[2px] w-full ${accent}`} />
            <div className="pointer-events-none absolute inset-0 opacity-[0.35]" style={{ background: 'linear-gradient(155deg, rgba(var(--scene-rgb, 16,185,129), 0.07), transparent 55%)' }} />
            <div className="relative z-[1] min-h-0 flex-1 overflow-hidden p-3">
                {def.render({ context: { ...context, compact: true } })}
            </div>
        </div>
    );
}

function WeiterarbeitenStrip({ recentActivityItems, onOpenRecentActivity, onOpenFinder }: Pick<HomeCockpitProps, 'recentActivityItems' | 'onOpenRecentActivity' | 'onOpenFinder'>) {
    const items = recentActivityItems.slice(0, 4);
    if (items.length === 0) return null;

    const ICON: Record<string, React.ReactNode> = {
        document: <FileText size={13} />,
        finder:   <Folder size={13} />,
        notes:    <FileText size={13} />,
        chat:     <Sparkles size={13} />,
    };

    return (
        <div className="flex shrink-0 flex-col gap-1.5">
            <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/26">Weiterarbeiten</div>
            <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                {items.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenRecentActivity(item)}
                        className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/58 transition-all hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-white/82"
                    >
                        <span className="shrink-0 opacity-55">{ICON[item.kind] ?? <FileText size={13} />}</span>
                        <span className="max-w-[140px] truncate">{item.label}</span>
                    </button>
                ))}
                <button
                    type="button"
                    onClick={onOpenFinder}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-white/[0.08] px-3 py-1.5 text-[11px] text-white/30 transition-all hover:border-white/[0.18] hover:text-white/52"
                >
                    <Folder size={13} />
                    Finder
                </button>
            </div>
        </div>
    );
}

const fade = (delay: number) => ({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: 'easeOut' as const, delay },
});

// ─── Main export ───────────────────────────────────────────────────────────────

export function HomeCockpit(props: HomeCockpitProps) {
    const {
        firstName, greeting, todayLabel,
        mailPreview, calendarPreview, mailConfigured, calendarConfigured,
        onlineCount, incidentStatusPanels,
        homeView, recentActivityItems,
        onOpenMail, onOpenCalendar, onOpenTeam, onOpenIntegrations,
        onOpenFinder, onOpenMora, onOpenRecentActivity, onGoExplore,
        onOpenNightwatch,
        privateAreaLabel, privateFolderCount, privateDocumentCount, privateFileCount,
        onOpenPrivateArea,
        showOrgOverview = true,
    } = props;
    const openPane = usePaneStore((s) => s.openPane);

    const moraSignalCount =
        (homeView?.changes ?? []).filter((c) => c.title && c.title.trim().length > 0).length +
        (homeView?.attention?.length ?? 0);
    const moraStatusLabel = moraSignalCount > 0
        ? `${moraSignalCount} ${moraSignalCount === 1 ? 'Signal' : 'Signale'}`
        : 'ruhig';

    const glanceContext: WidgetContext = {
        surface: 'home',
        compact: true,
        data: { mailPreview, calendarPreview, mailConfigured, calendarConfigured, onlineCount },
        openMail: onOpenMail,
        openCalendar: onOpenCalendar,
        openIntegrations: onOpenIntegrations,
        openMora: onOpenMora,
        openTeam: onOpenTeam,
        openFinder: onOpenFinder,
        openNightwatch: onOpenNightwatch,
        openDashboard: () => window.open('https://dash.saimor.world', '_blank', 'noopener,noreferrer'),
        openLarryNode: (nodeId, title) => openPane({
            id: `document-${nodeId}`,
            type: 'document',
            title: title || 'Workspace',
            size: GLASS_SHEET_SIZE,
            data: { nodeId },
        }),
        goExplore: onGoExplore,
    };

    const orgSummary = useMemo(() => {
        const s = homeView?.org_stats;
        if (!s || !showOrgOverview) return null;
        const parts: string[] = [];
        if (s.departments > 0) parts.push(`${s.departments} Bereiche`);
        if (s.documents > 0) parts.push(`${s.documents} Docs`);
        if (s.tasks > 0) parts.push(`${s.tasks} Aufgaben`);
        if (s.members != null && s.members > 0) parts.push(`${s.members} Team`);
        return parts.length > 0 ? parts.join(' · ') : null;
    }, [homeView?.org_stats, showOrgOverview]);

    const privateContentCount = (privateDocumentCount ?? 0) + (privateFileCount ?? 0);
    const statusHint = [
        onlineCount > 0 ? `${onlineCount} online` : null,
        mailPreview.length > 0 ? `${mailPreview.length} Mail` : null,
        calendarPreview[0]?.time ? calendarPreview[0].time : null,
        incidentStatusPanels.length > 0 ? `${incidentStatusPanels.length} Vorfall` : null,
    ].filter(Boolean).slice(0, 2);

    return (
        <div className="flex h-full flex-col gap-4 overflow-hidden">

            {/* ── Greeting — calm header, no pill spam ── */}
            <motion.div {...fade(0)} className="flex shrink-0 items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        type="button"
                        onClick={onOpenMora}
                        aria-label="MÔRA öffnen"
                        className="group relative flex h-12 w-12 shrink-0 items-center justify-center outline-none"
                    >
                        <span
                            className="absolute inset-0 rounded-full opacity-60"
                            style={{ background: 'radial-gradient(circle, rgba(var(--scene-rgb, 16,185,129), 0.28) 0%, transparent 70%)' }}
                        />
                        <span
                            className="relative flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-105"
                            style={{
                                background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.4), rgba(var(--scene-rgb, 16,185,129), 0.58) 46%, rgba(0,0,0,0.28))',
                                boxShadow: '0 0 20px rgba(var(--scene-rgb, 16,185,129), 0.38)',
                            }}
                        >
                            <Sparkles size={13} className="text-white/95" />
                        </span>
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-[clamp(20px,2vw,28px)] font-light leading-tight tracking-[-0.03em] text-white/90">
                            {greeting}{firstName ? <span className="text-white/42">, {firstName}.</span> : '.'}
                        </h1>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/32">
                            <span>{todayLabel}</span>
                            <span className="text-white/16">·</span>
                            <button type="button" onClick={onOpenMora} className="transition-colors hover:text-white/62">
                                <span style={{ color: 'rgba(var(--scene-rgb, 16,185,129), 0.85)' }}>MÔRA</span>
                                {' '}{moraStatusLabel}
                            </button>
                            {statusHint.map((hint) => (
                                <React.Fragment key={hint}>
                                    <span className="text-white/16">·</span>
                                    <span>{hint}</span>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                {onOpenPrivateArea && (
                    <button
                        type="button"
                        onClick={onOpenPrivateArea}
                        className="hidden shrink-0 items-center gap-2 rounded-xl border border-cyan-300/14 bg-cyan-400/[0.06] px-3 py-2 text-left transition-colors hover:border-cyan-300/24 hover:bg-cyan-400/[0.10] sm:flex"
                    >
                        <Lock size={12} className="text-cyan-200/55" />
                        <div className="min-w-0">
                            <div className="text-[8px] uppercase tracking-[0.18em] text-cyan-100/45">Privat</div>
                            <div className="max-w-[120px] truncate text-[11px] text-white/62">{privateAreaLabel || 'Mein Bereich'}</div>
                            {privateContentCount > 0 && (
                                <div className="text-[9px] tabular-nums text-white/32">{privateContentCount} Inhalte</div>
                            )}
                        </div>
                    </button>
                )}
            </motion.div>

            {/* ── Org summary — one calm line, not a spreadsheet row ── */}
            {orgSummary && (
                <motion.div {...fade(0.04)} className="shrink-0 text-[10px] tracking-[0.06em] text-white/34">
                    {orgSummary}
                    {moraSignalCount > 0 && (
                        <span className="text-white/22"> · {moraSignalCount} Môra-Signale</span>
                    )}
                </motion.div>
            )}

            {/* ── Hero: Mein Tag — full width, fixed height, no inner scroll ── */}
            <motion.div {...fade(0.06)} className="shrink-0">
                <GlanceCard type="meinTag" accent="bg-gradient-to-r from-cyan-400/55 via-sky-300/35 to-transparent" context={glanceContext} />
            </motion.div>

            {/* ── Secondary glances: Team + Signale + Schnellzugriff ── */}
            <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3">
                <motion.div {...fade(0.10)} className="min-h-[108px]">
                    <GlanceCard type="team" accent="bg-gradient-to-r from-violet-400/50 via-indigo-300/30 to-transparent" context={glanceContext} />
                </motion.div>
                <motion.div {...fade(0.14)} className="min-h-[108px]">
                    <GlanceCard type="signals" accent="bg-gradient-to-r from-emerald-400/45 via-teal-300/28 to-transparent" context={glanceContext} />
                </motion.div>
                <motion.div {...fade(0.18)} className="min-h-[108px]">
                    <GlanceCard type="quickActions" accent="bg-gradient-to-r from-white/25 via-white/12 to-transparent" context={glanceContext} />
                </motion.div>
            </div>

            {/* ── Weiterarbeiten — horizontal strip, only when needed ── */}
            <motion.div {...fade(0.22)} className="shrink-0">
                <WeiterarbeitenStrip
                    recentActivityItems={recentActivityItems}
                    onOpenRecentActivity={onOpenRecentActivity}
                    onOpenFinder={onOpenFinder}
                />
            </motion.div>

            {/* ── Explore affordance — rest lives in Universe ── */}
            <motion.div {...fade(0.26)} className="mt-auto shrink-0 flex items-center justify-between gap-3 border-t border-white/[0.05] pt-3">
                <p className="text-[10px] leading-relaxed text-white/28">
                    Nightwatch, Workspace &amp; Uhr — im Explore-Modus anpassbar.
                </p>
                <button
                    type="button"
                    onClick={onGoExplore}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.04] px-3.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/52 transition-all hover:border-cyan-300/22 hover:bg-cyan-400/[0.08] hover:text-cyan-100/78"
                >
                    <Compass size={12} />
                    Explore
                    <ArrowRight size={11} />
                </button>
            </motion.div>
        </div>
    );
}
