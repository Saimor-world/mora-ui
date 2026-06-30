'use client';



import React from 'react';

import { motion } from 'framer-motion';

import {

    AlertTriangle, ArrowRight, CalendarDays, CheckCircle2,

    FileText, Folder, Mail, MessageSquare, Plug, Settings,

    Sparkles, Users, BarChart2, Brain, TrendingUp, FolderOpen, Compass, Radio, Activity, Network,

} from 'lucide-react';

import type { HomeView } from '@/lib/queries/useHomeView';

import type { IncidentStatusPanel } from '@/lib/panel/types';

import type { PaneOpenRequest } from '@/lib/store/paneStore';

import type { RecentKind } from '@/components/home/homeSurfaceFormat';

import { WIDGET_REGISTRY } from '@/components/widgets/registry';

import type { WidgetContext } from '@/lib/widgets/types';

import type { IntegrationConnectionState } from '@/lib/integrations/connectionState';

import { PersonalHomeZone } from '@/components/home/PersonalHomeZone';

import { usePaneStore } from '@/lib/store/paneStore';

import { useBridgePulse } from '@/lib/hooks/useBridgePulse';

import { feedsPaneRequest } from '@/lib/rss/feedsPane';
import { GLASS_SHEET_SIZE } from '@/lib/os/glassSheet';



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

    feedPreview?:      Array<{ id: string; sourceTitle: string; title: string; summary?: string }>;

    mailState:         IntegrationConnectionState;

    calendarState:     IntegrationConnectionState;

    cloudState:        IntegrationConnectionState;

    rssState:          IntegrationConnectionState;

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

    onOpenLagefeld?: () => void;

    onOpenFeed?: () => void;

    /** Personal / private scope — server-backed home note + content counts */

    privateAreaLabel?: string | null;

    privateFolderCount?: number;

    privateDocumentCount?: number;

    privateFileCount?: number;

    onOpenPrivateArea?: () => void;

    /** When false, org-wide stats strip is hidden (scoped employees). */

    showOrgOverview?: boolean;

}



// ─── Small UI helpers ──────────────────────────────────────────────────────────



function WidgetGlanceCard({ type, accent, context, className = '', compact = false }: {

    type: string;

    accent: string;

    context: WidgetContext;

    className?: string;

    compact?: boolean;

}) {

    const def = WIDGET_REGISTRY[type];

    if (!def) return null;

    const widgetContext: WidgetContext = {
        ...context,
        homeGlance: !compact,
        glanceLimit: compact ? 1 : 2,
        compact,
    };

    const openSheet = WIDGET_SHEET_OPEN[type];

    const shellMin = compact ? 'min-h-[104px]' : 'min-h-[148px]';

    return (

        <div

            className={`relative flex h-full ${shellMin} flex-col overflow-hidden rounded-[1.15rem] border border-white/[0.09] shadow-[0_10px_36px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md ${className}`}

            style={{ backgroundColor: compact ? 'rgba(8, 6, 22, 0.48)' : 'rgba(8, 6, 22, 0.54)' }}

        >

            <div className={`pointer-events-none absolute left-0 top-0 h-[2px] w-full ${accent}`} />

            <div className="pointer-events-none absolute inset-0 opacity-[0.28]" style={{ background: 'linear-gradient(155deg, rgba(var(--scene-rgb, 16,185,129), 0.07), transparent 54%)' }} />

            <div className={`relative z-[1] flex shrink-0 items-center justify-between ${compact ? 'px-3 pt-2 pb-1' : 'px-4 pt-3 pb-1.5'}`}>

                <div className={`flex items-center gap-1.5 font-semibold uppercase tracking-[0.22em] text-white/40 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>

                    {def.icon}

                    {def.label}

                </div>

            </div>

            <div className={`relative z-[1] min-h-0 flex-1 overflow-hidden ${compact ? 'px-3 pb-1.5' : 'px-4 pb-2'}`} data-testid={`home-widget-${type}`}>

                {def.render({ context: widgetContext })}

            </div>

            {openSheet && !compact && (

                <div className="relative z-[1] shrink-0 border-t border-white/[0.06] px-4 py-2">

                    <button

                        type="button"

                        onClick={() => openSheet(widgetContext)}

                        className="flex w-full items-center justify-between text-[9px] font-medium uppercase tracking-[0.18em] text-white/36 transition-colors hover:text-cyan-100/78"

                    >

                        Alle anzeigen

                        <ArrowRight size={11} className="opacity-50" />

                    </button>

                </div>

            )}

        </div>

    );

}



const WIDGET_SHEET_OPEN: Record<string, (ctx: WidgetContext) => void> = {

    meinTag: (c) => { c.openFeed?.() ?? c.openMail?.() ?? c.openCalendar?.() ?? c.openIntegrations?.(); },

    deinFeed: (c) => { c.openFeed?.() ?? c.openIntegrations?.(); },

    team: (c) => { c.openTeam?.(); },

    signals: (c) => { c.openMora?.(); },

    bridgePulse: (c) => { c.openDashboard?.(); },

    larryWork: (c) => { c.openDashboard?.(); },

    nightwatch: (c) => { c.openNightwatch?.(); },

    clock: (c) => { c.openCalendar?.(); },

    orgStats: (c) => { c.openDashboard?.(); },

};



function HomeMicroSparkline({ values, color = 'rgba(52,211,153,0.75)' }: { values: readonly number[]; color?: string }) {

    if (values.length === 0) return null;

    const max = Math.max(...values, 1);

    const w = 48;

    const h = 12;

    const pts = values.map((v, i) => ({

        x: values.length === 1 ? w / 2 : (i / (values.length - 1)) * w,

        y: h - Math.max((v / max) * (h - 2), v > 0 ? 2 : 0),

    }));

    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    return (

        <svg viewBox={`0 0 ${w} ${h}`} className="h-[12px] w-[48px] shrink-0 opacity-75" aria-hidden="true">

            <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

        </svg>

    );

}



function ArbeitseinstiegeStrip({

    mailPreview,

    calendarPreview,

    onlineCount,

    recentCount,

    onOpenFinder,

    onOpenMora,

    onOpenMail,

    onOpenTeam,

    onGoExplore,

    onOpenNightwatch,

    onOpenLagefeld,

    onOpenFeed,

    incidentCount,

}: {

    mailPreview: CockpitMailPreview[];

    calendarPreview: CockpitCalPreview[];

    onlineCount: number;

    recentCount: number;

    onOpenFinder: () => void;

    onOpenMora: () => void;

    onOpenMail: () => void;

    onOpenTeam: () => void;

    onGoExplore: () => void;

    onOpenNightwatch?: () => void;

    onOpenLagefeld?: () => void;

    onOpenFeed?: () => void;

    incidentCount: number;

}) {

    const pulse = useBridgePulse(true);

    const mailSpark = React.useMemo(() => {

        const n = mailPreview.length;

        return [Math.max(0, n - 2), Math.max(0, n - 1), n, n];

    }, [mailPreview.length]);

    const bridgeSpark = React.useMemo(() => {

        const cpu = pulse.cpu ?? 0;

        const load = (pulse.moraLoad ?? 0) * 100;

        const incidents = pulse.openIncidents ?? 0;

        return [cpu * 0.85, cpu, load * 0.4 + cpu * 0.15, incidents > 0 ? cpu + 12 : cpu * 0.92];

    }, [pulse.cpu, pulse.moraLoad, pulse.openIncidents]);

    const activitySpark = React.useMemo(() => {

        const n = recentCount;

        return [Math.max(0, n - 2), Math.max(0, n - 1), n];

    }, [recentCount]);

    const feedSpark = React.useMemo(() => {

        const n = mailPreview.length;

        return [Math.max(0, n - 1), n, n + 1];

    }, [mailPreview.length]);

    const chips = [

        { id: 'finder', label: 'Finder', icon: <FolderOpen size={13} />, onClick: onOpenFinder, spark: activitySpark, color: 'rgba(52,211,153,0.75)' },

        { id: 'mora', label: 'MÔRA', icon: <Sparkles size={13} />, onClick: onOpenMora, spark: bridgeSpark, color: 'rgba(167,139,250,0.8)' },

        ...(onOpenLagefeld ? [{ id: 'lagefeld', label: 'Raum', icon: <Network size={13} />, onClick: onOpenLagefeld, spark: bridgeSpark, color: 'rgba(45,212,191,0.8)' }] : []),

        ...(onOpenFeed ? [{ id: 'feeds', label: 'Feed', icon: <Radio size={13} />, onClick: onOpenFeed, spark: feedSpark, color: 'rgba(52,211,153,0.72)' }] : []),

        { id: 'mail', label: 'Post', icon: <Mail size={13} />, onClick: onOpenMail, spark: mailSpark, color: 'rgba(139,92,246,0.78)' },

        { id: 'team', label: 'Team', icon: <Users size={13} />, onClick: onOpenTeam, spark: [Math.max(0, onlineCount - 1), onlineCount, onlineCount], color: 'rgba(34,211,238,0.75)' },

        { id: 'explore', label: 'Universe', icon: <Compass size={13} />, onClick: onGoExplore, spark: calendarPreview.length > 0 ? [1, 2, calendarPreview.length] : [0, 1, 1], color: 'rgba(251,191,36,0.78)' },

        ...(onOpenNightwatch ? [{ id: 'nightwatch', label: 'Nightwatch', icon: <Activity size={13} />, onClick: onOpenNightwatch, spark: [incidentCount, incidentCount, incidentCount], color: incidentCount > 0 ? 'rgba(248,113,113,0.85)' : 'rgba(52,211,153,0.65)' }] : []),

    ];

    return (

        <div data-testid="arbeitseinstiege-strip" className="flex flex-col gap-2">

            <div className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/32">Arbeitseinstiege</div>

            <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>

                {chips.map((chip) => (

                    <button

                        key={chip.id}

                        type="button"

                        onClick={chip.onClick}

                        className="flex min-w-[88px] shrink-0 flex-col gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-left transition-all hover:border-white/[0.16] hover:bg-white/[0.07]"

                    >

                        <span className="flex items-center gap-1.5 text-[11px] text-white/72">

                            <span className="opacity-65">{chip.icon}</span>

                            {chip.label}

                        </span>

                        <HomeMicroSparkline values={[...chip.spark]} color={chip.color} />

                    </button>

                ))}

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

        <div className="flex flex-col gap-2.5">

            <div className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/32">Weiterarbeiten</div>

            <div className="flex gap-2.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>

                {recentActivityItems.map((item) => (

                    <button

                        key={item.id}

                        type="button"

                        onClick={() => onOpenRecentActivity(item)}

                        className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-2.5 text-[12px] text-white/68 transition-all hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-white/90"

                    >

                        <span className="shrink-0 opacity-62">{ICON[item.kind] ?? <FileText size={14} />}</span>

                        <span className="max-w-[140px] truncate">{item.label}</span>

                    </button>

                ))}

                {deptTiles.filter((d) => d.active).slice(0, 4).map(({ dept }) => (

                    <button

                        key={dept.id}

                        type="button"

                        onClick={onGoExplore}

                        className="flex shrink-0 items-center gap-2 rounded-xl border border-indigo-300/14 bg-indigo-400/[0.05] px-3.5 py-2.5 text-[12px] text-white/58 transition-all hover:bg-indigo-400/[0.12] hover:border-indigo-300/24"

                    >

                        <Folder size={14} className="shrink-0 text-indigo-300/64" />

                        <span className="max-w-[110px] truncate">{dept.name}</span>

                    </button>

                ))}

                <button

                    type="button"

                    onClick={onOpenFinder}

                    className="flex shrink-0 items-center gap-2 rounded-xl border border-dashed border-white/[0.08] px-3.5 py-2.5 text-[12px] text-white/34 transition-all hover:border-white/[0.18] hover:text-white/52 hover:bg-white/[0.03]"

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

        mailPreview, calendarPreview, feedPreview = [], mailState, calendarState, cloudState, rssState,

        teamActivities, teamMessages, onlineCount, unreadTeamMessages,

        homeView, incidentStatusPanels,

        recentActivityItems, deptTiles,

        onOpenMail, onOpenCalendar, onOpenTeam, onOpenIntegrations,

        onOpenFinder, onOpenMora, onOpenRecentActivity, onGoExplore,

        onOpenNightwatch,

        onOpenLagefeld,

        onOpenFeed,

        privateAreaLabel, privateFolderCount, privateDocumentCount, privateFileCount,

        onOpenPrivateArea,

        showOrgOverview = true,

    } = props;

    const openPane = usePaneStore((s) => s.openPane);



    const moraSignalCount =

        (homeView?.changes ?? []).filter((c) => c.title && c.title.trim().length > 0).length +

        (homeView?.attention?.length ?? 0);

    const moraStatusLabel = moraSignalCount > 0

        ? `beobachtet · ${moraSignalCount} ${moraSignalCount === 1 ? 'Signal' : 'Signale'}`

        : 'wach · beobachtet im Hintergrund';



    const glanceContext: WidgetContext = {

        surface: 'home',

        homeGlance: true,

        glanceLimit: 2,

        data: { mailPreview, calendarPreview, feedPreview, mailState, calendarState, cloudState, rssState, onlineCount },

        openMail: onOpenMail,

        openCalendar: onOpenCalendar,

        openFeed: () => openPane(feedsPaneRequest()),

        openIntegrations: onOpenIntegrations,

        openApps: () => openPane({ id: 'apps-main', type: 'apps', title: 'Apps', size: { width: 900, height: 680 } }),

        openMora: onOpenMora,

        openSignals: () => openPane({ id: 'chat-main', type: 'chat', title: 'Mora', size: { width: 860, height: 680 }, data: { chatView: 'signals' } }),

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



    const titledChanges = (homeView?.changes ?? []).filter(c => c.title && c.title.trim().length > 0);



    return (

        <div data-testid="home-cockpit" className="flex h-full flex-col gap-4 overflow-hidden xl:gap-5">



            {/* ── 1. Greeting row ── */}

            <motion.div {...fade(0)} className="flex shrink-0 items-start justify-between gap-5">

                <div className="flex min-w-0 items-center gap-4">

                    <button

                        type="button"

                        onClick={onOpenMora}

                        aria-label="MÔRA öffnen"

                        className="group relative flex h-12 w-12 shrink-0 items-center justify-center outline-none"

                    >

                        <motion.span

                            className="absolute inset-0 rounded-full"

                            style={{ background: 'radial-gradient(circle, rgba(var(--scene-rgb, 16,185,129), 0.32) 0%, transparent 70%)' }}

                            animate={{ scale: [1, 1.22, 1], opacity: [0.55, 0.22, 0.55] }}

                            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}

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

                    <div className="min-w-0">

                        <h1 className="text-[clamp(24px,2.4vw,36px)] font-medium leading-[1.05] tracking-[-0.03em] text-white/92">

                            {greeting}{firstName ? <span className="font-light text-white/46">, {firstName}.</span> : '.'}

                        </h1>

                        <div className="mt-1.5 text-[11px] text-white/34">{todayLabel}</div>

                    </div>

                </div>

            </motion.div>



            {/* ── 2. Hero strip: stats + MÔRA status + compact personal note ── */}

            <motion.div {...fade(0.04)} className="flex shrink-0 flex-col gap-3 xl:flex-row xl:items-stretch">

                <div className="relative flex min-w-0 flex-1 flex-col gap-2.5 rounded-[1.25rem] border border-white/[0.08] bg-black/18 px-4 py-3 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">

                    <div className="pointer-events-none absolute left-0 top-0 h-[1px] w-full bg-gradient-to-r from-emerald-400/40 via-violet-300/25 to-transparent" />

                    <div className="flex flex-wrap items-center gap-2">

                        <button

                            type="button"

                            onClick={onOpenMora}

                            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] text-white/52 transition-colors hover:text-white/78"

                        >

                            <span className="font-semibold" style={{ color: 'rgba(var(--scene-rgb, 16,185,129), 0.92)' }}>MÔRA</span>

                            <span>{moraStatusLabel}</span>

                        </button>

                        {onlineCount > 0 && (

                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1 text-[10px] text-emerald-200/78">

                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />

                                {onlineCount} online

                            </span>

                        )}

                        {mailPreview.length > 0 && (

                            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/18 bg-violet-400/[0.07] px-2.5 py-1 text-[10px] text-violet-200/72">

                                <Mail size={10} />

                                {mailPreview.length} {mailPreview.length === 1 ? 'Mail' : 'Mails'}

                            </span>

                        )}

                        {incidentStatusPanels.length > 0 && (

                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/20 bg-rose-400/[0.08] px-2.5 py-1 text-[10px] text-rose-200/75">

                                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />

                                {incidentStatusPanels.length} {incidentStatusPanels.length === 1 ? 'Vorfall' : 'Vorfälle'}

                            </span>

                        )}

                        {calendarPreview[0] && (

                            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/18 bg-cyan-400/[0.07] px-2.5 py-1 text-[10px] text-cyan-200/72">

                                <CalendarDays size={10} />

                                {calendarPreview[0].time ?? 'Termin'}

                            </span>

                        )}

                    </div>



                    {showOrgOverview && homeView?.org_stats && (homeView.org_stats.departments > 0 || homeView.org_stats.documents > 0) && (

                        <div className="flex flex-wrap gap-1.5">

                            {[

                                { label: 'Abteilungen', value: homeView.org_stats.departments, icon: <Users size={11} /> },

                                { label: 'Dokumente', value: homeView.org_stats.documents, icon: <FileText size={11} /> },

                                { label: 'Ordner', value: homeView.org_stats.folders, icon: <Folder size={11} /> },

                                { label: 'Aufgaben', value: homeView.org_stats.tasks, icon: <CheckCircle2 size={11} /> },

                                ...(homeView.org_stats.members != null ? [{ label: 'Mitglieder', value: homeView.org_stats.members, icon: <Users size={11} /> }] : []),

                            ].filter(s => s.value > 0).map(stat => (

                                <div key={stat.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/48">

                                    <span className="opacity-55">{stat.icon}</span>

                                    <span className="tabular-nums font-semibold text-white/82">{stat.value}</span>

                                    <span>{stat.label}</span>

                                </div>

                            ))}

                            {(homeView.changes.length > 0 || homeView.attention.length > 0) && (

                                <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-2.5 py-1 text-[10px] text-violet-200/72">

                                    <Brain size={11} className="opacity-80" />

                                    <span className="tabular-nums font-semibold text-violet-100/86">{homeView.changes.length + homeView.attention.length}</span>

                                    <span>Môra-Signale</span>

                                </div>

                            )}

                        </div>

                    )}



                    {titledChanges.length > 0 && (

                        <div className="flex flex-wrap gap-2 pt-0.5">

                            {titledChanges.slice(0, 2).map(change => (

                                <div key={change.id} className="inline-flex max-w-full items-center gap-2 rounded-xl border border-violet-400/12 bg-violet-400/[0.05] px-2.5 py-1.5">

                                    <TrendingUp size={11} className="shrink-0 text-violet-300/58" />

                                    <span className="truncate text-[11px] text-white/72">{change.title}</span>

                                </div>

                            ))}

                        </div>

                    )}

                </div>



                <div className="w-full xl:max-w-[min(420px,38%)]">

                    <PersonalHomeZone

                        privateLabel={privateAreaLabel}

                        folderCount={privateFolderCount}

                        documentCount={privateDocumentCount}

                        fileCount={privateFileCount}

                        onOpenPrivateArea={onOpenPrivateArea}

                        variant="compact"

                    />

                </div>

            </motion.div>



            {/* ── 3. Arbeitseinstiege + compact bento glances ──
                 Home is a personal cockpit — no cosmos hero. Mein Tag stays tall left;
                 Nightwatch is a compact edge glance, not a centre column. */}

            <motion.div {...fade(0.06)} className="shrink-0 rounded-[1.1rem] border border-white/[0.06] bg-black/14 px-4 py-3 backdrop-blur-sm">

                <ArbeitseinstiegeStrip

                    mailPreview={mailPreview}

                    calendarPreview={calendarPreview}

                    onlineCount={onlineCount}

                    recentCount={recentActivityItems.length}

                    onOpenFinder={onOpenFinder}

                    onOpenMora={onOpenMora}

                    onOpenMail={onOpenMail}

                    onOpenTeam={onOpenTeam}

                    onGoExplore={onGoExplore}

                    onOpenNightwatch={onOpenNightwatch}

                    onOpenLagefeld={onOpenLagefeld}

                    onOpenFeed={onOpenFeed}

                    incidentCount={incidentStatusPanels.length}

                />

            </motion.div>



            <div
                className="min-h-0 flex-1 overflow-y-auto pr-1 pb-2"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.28) transparent' }}
            >

                <div className="grid min-h-full grid-cols-1 gap-3 md:h-full md:min-h-[344px] md:grid-cols-12 md:grid-rows-[repeat(3,minmax(104px,1fr))] md:gap-4">

                    <motion.div {...fade(0.08)} className="min-h-[148px] md:col-span-5 md:row-span-3 md:min-h-0">

                        <WidgetGlanceCard type="meinTag" accent="bg-gradient-to-r from-cyan-400/65 via-sky-300/42 to-transparent" context={glanceContext} />

                    </motion.div>

                    <motion.div {...fade(0.12)} className="min-h-[104px] md:col-span-3 md:min-h-0">

                        <WidgetGlanceCard type="team" accent="bg-gradient-to-r from-violet-400/65 via-indigo-300/42 to-transparent" context={glanceContext} compact />

                    </motion.div>

                    <motion.div {...fade(0.14)} className="min-h-[104px] md:col-span-4 md:min-h-0">

                        <WidgetGlanceCard type="signals" accent="bg-gradient-to-r from-emerald-400/55 via-teal-300/35 to-transparent" context={glanceContext} compact />

                    </motion.div>

                    <motion.div {...fade(0.18)} className="min-h-[104px] md:col-span-3 md:row-start-2 md:min-h-0">

                        <WidgetGlanceCard type="nightwatch" accent="bg-gradient-to-r from-rose-400/50 via-orange-300/30 to-transparent" context={glanceContext} compact />

                    </motion.div>

                    <motion.div {...fade(0.20)} className="min-h-[104px] md:col-span-4 md:row-start-2 md:min-h-0">

                        <WidgetGlanceCard type="deinFeed" accent="bg-gradient-to-r from-emerald-400/55 via-cyan-300/32 to-transparent" context={glanceContext} compact />

                    </motion.div>

                    <motion.div {...fade(0.22)} className="min-h-[104px] md:col-span-7 md:row-start-3 md:min-h-0">

                        <WidgetGlanceCard type="bridgePulse" accent="bg-gradient-to-r from-amber-400/50 via-cyan-300/30 to-transparent" context={glanceContext} compact />

                    </motion.div>

                </div>

            </div>



            {(recentActivityItems.length > 0 || deptTiles.some((d) => d.active)) && (

                <motion.div {...fade(0.30)} className="shrink-0 rounded-[1.1rem] border border-white/[0.06] bg-black/12 px-4 py-3 backdrop-blur-sm">

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

