'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    ArrowUpRight,
    CheckCircle2,
    FileText,
    Folder,
    Mail,
    Network,
    Sparkles,
    Users,
} from 'lucide-react';
import { usePaneStore } from '@/lib/store/paneStore';
import type { WidgetContext } from '@/lib/widgets/types';
import { feedsPaneRequest } from '@/lib/rss/feedsPane';
import { GLASS_SHEET_SIZE } from '@/lib/os/glassSheet';
import { PersonalHomeZone } from '@/components/home/PersonalHomeZone';
import {
    HomeSignalCard,
    WidgetGlanceCard,
    type HomeCockpitProps,
} from '@/components/home/HomeCockpit';

const fade = (delay: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.42, ease: 'easeOut' as const, delay },
});

/**
 * OrganizationHome is the HQ home surface.
 *
 * Its job is deliberately narrow: one organizational priority, one personal
 * day view inside that context, four shared truth signals, and a short resume
 * path. App launching remains the Dock's job; Home no longer mirrors it.
 */
export function OrganizationHome(props: HomeCockpitProps) {
    const {
        firstName,
        greeting,
        todayLabel,
        mailPreview,
        calendarPreview,
        feedPreview = [],
        mailState,
        calendarState,
        cloudState,
        rssState,
        onlineCount,
        unreadTeamMessages,
        homeView,
        incidentStatusPanels,
        recentActivityItems,
        deptTiles,
        onOpenMail,
        onOpenCalendar,
        onOpenTeam,
        onOpenIntegrations,
        onOpenFinder,
        onOpenMora,
        onOpenRecentActivity,
        onGoExplore,
        onOpenNightwatch,
        privateAreaLabel,
        privateFolderCount,
        privateDocumentCount,
        privateFileCount,
        onOpenPrivateArea,
        showOrgOverview = true,
    } = props;
    const openPane = usePaneStore((state) => state.openPane);

    const titledChanges = useMemo(
        () => (homeView?.changes ?? []).filter((change) => change.title?.trim()),
        [homeView?.changes],
    );
    const moraSignalCount = titledChanges.length + (homeView?.attention?.length ?? 0);
    const moraStatusLabel = moraSignalCount > 0
        ? `${moraSignalCount} ${moraSignalCount === 1 ? 'Signal' : 'Signale'}`
        : 'beobachtet im Hintergrund';

    const glanceContext: WidgetContext = {
        surface: 'home',
        homeGlance: true,
        glanceLimit: 2,
        data: {
            mailPreview,
            calendarPreview,
            feedPreview,
            mailState,
            calendarState,
            cloudState,
            rssState,
            onlineCount,
        },
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

    const orgStats = homeView?.org_stats;
    const orgStatItems = showOrgOverview
        ? [
            { label: 'Abteilungen', value: orgStats?.departments ?? 0, icon: <Users size={11} /> },
            { label: 'Dokumente', value: orgStats?.documents ?? 0, icon: <FileText size={11} /> },
            { label: 'Ordner', value: orgStats?.folders ?? 0, icon: <Folder size={11} /> },
            { label: 'Aufgaben', value: orgStats?.tasks ?? 0, icon: <CheckCircle2 size={11} /> },
        ].filter((item) => item.value > 0)
        : [];

    const nightwatchAction = onOpenNightwatch ?? onOpenMora;
    const primarySignals = [
        {
            label: 'Betrieb',
            value: incidentStatusPanels.length > 0 ? String(incidentStatusPanels.length) : 'OK',
            detail: incidentStatusPanels.length > 0 ? 'offene Nightwatch-Vorfälle' : 'keine offenen Vorfälle',
            icon: <Activity size={16} />,
            onClick: nightwatchAction,
            tone: incidentStatusPanels.length > 0 ? 'rose' as const : 'emerald' as const,
        },
        {
            label: 'Gewebe',
            value: moraSignalCount > 0 ? String(moraSignalCount) : 'wach',
            detail: titledChanges[0]?.title ?? 'Môra beobachtet den Kontext',
            icon: <Network size={16} />,
            onClick: onOpenMora,
            tone: 'violet' as const,
        },
        {
            label: 'Post',
            value: mailPreview.length > 0 ? String(mailPreview.length) : 'klar',
            detail: mailPreview[0]?.subject ?? 'nichts Neues im Lagebild',
            icon: <Mail size={16} />,
            onClick: onOpenMail,
            tone: 'cyan' as const,
        },
        {
            label: 'Team',
            value: onlineCount > 0 ? String(onlineCount) : 'still',
            detail: unreadTeamMessages > 0 ? `${unreadTeamMessages} ungelesen` : 'kein akuter Druck',
            icon: <Users size={16} />,
            onClick: onOpenTeam,
            tone: 'amber' as const,
        },
    ];

    const leadPriority = incidentStatusPanels.length > 0
        ? {
            eyebrow: 'Betrieb braucht Aufmerksamkeit',
            title: `${incidentStatusPanels.length} offene ${incidentStatusPanels.length === 1 ? 'Meldung' : 'Meldungen'}`,
            detail: 'Nightwatch hat einen Zustand erkannt, der geprüft werden sollte.',
            action: nightwatchAction,
            tone: 'text-rose-200',
        }
        : titledChanges.length > 0
            ? {
                eyebrow: 'Neu im Gewebe',
                title: titledChanges[0].title,
                detail: 'Môra hat diese Veränderung als relevant für den gemeinsamen Kontext erkannt.',
                action: onOpenMora,
                tone: 'text-cyan-100',
            }
            : {
                eyebrow: 'Lage ruhig',
                title: 'Kein akuter Handlungsdruck',
                detail: 'Betrieb und Gewebe laufen stabil. Du kannst bewusst in die nächste Arbeit einsteigen.',
                action: onOpenMora,
                tone: 'text-emerald-100',
            };

    const resumeItems = recentActivityItems.slice(0, 3);
    const activeDepartments = deptTiles.filter((item) => item.active).slice(0, 2);

    return (
        <div
            data-testid="home-cockpit"
            className="h-full min-h-0 overflow-y-auto overscroll-contain pr-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.28) transparent' }}
        >
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 pb-7 sm:gap-5">
                <motion.div
                    {...fade(0)}
                    className="relative grid overflow-hidden rounded-[1.5rem] border border-white/[0.11] bg-[radial-gradient(circle_at_10%_0%,rgba(var(--scene-rgb,16,185,129),0.17),transparent_36%),linear-gradient(135deg,rgba(12,20,28,0.86),rgba(10,12,27,0.74))] p-4 shadow-[0_18px_54px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:gap-8"
                >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-300/70 via-cyan-200/40 to-violet-300/45" />
                    <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/42">Organisationslage · {todayLabel}</div>
                        <h1 className="mt-3 max-w-[850px] text-[clamp(26px,3.4vw,48px)] font-semibold leading-[1.02] tracking-[-0.035em] text-white/95">
                            {greeting}{firstName ? <span className="font-light text-white/55">, {firstName}.</span> : '.'}
                        </h1>
                        <p className="mt-3 max-w-[720px] text-[13px] leading-5 text-white/58 sm:text-[14px] sm:leading-6">
                            Was die Organisation jetzt wissen muss — verdichtet aus Betrieb, Gewebe, Post und Team.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <button type="button" onClick={onOpenMora} className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.055] px-3 py-2 text-[11px] text-white/68 transition-colors hover:border-white/[0.18] hover:text-white">
                                <Sparkles size={13} className="text-emerald-200/76" />
                                <span>{moraStatusLabel}</span>
                            </button>
                            {orgStatItems.slice(0, 3).map((stat) => (
                                <span key={stat.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.075] bg-black/[0.12] px-3 py-2 text-[11px] text-white/52">
                                    <span className="opacity-60">{stat.icon}</span>
                                    <span className="tabular-nums font-semibold text-white/86">{stat.value}</span>
                                    <span>{stat.label}</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    <button type="button" data-testid="home-priority-card" onClick={leadPriority.action} className="group mt-5 flex min-h-[154px] flex-col justify-between rounded-[1.25rem] border border-white/[0.1] bg-black/[0.18] p-4 text-left transition-all hover:border-white/[0.18] hover:bg-white/[0.055] lg:mt-0">
                        <div>
                            <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/38">
                                <span>{leadPriority.eyebrow}</span>
                                <ArrowUpRight size={14} className="opacity-45 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            </div>
                            <div className={`mt-4 text-[20px] font-medium leading-tight ${leadPriority.tone}`}>{leadPriority.title}</div>
                            <p className="mt-2 text-[12px] leading-5 text-white/48">{leadPriority.detail}</p>
                        </div>
                        <div className="mt-4 h-px w-full bg-gradient-to-r from-cyan-300/55 to-transparent" />
                    </button>
                </motion.div>

                <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
                    <section className="lg:col-span-8">
                        <div className="mb-3 px-1">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/34">Heute</div>
                            <h2 className="mt-1 text-[18px] font-medium text-white/86">Persönliche Lage im Organisationskontext</h2>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <motion.div {...fade(0.06)} className="min-h-[290px] sm:col-span-2">
                                <WidgetGlanceCard type="meinTag" accent="bg-gradient-to-r from-cyan-400/65 via-sky-300/42 to-transparent" context={glanceContext} />
                            </motion.div>
                            <motion.div {...fade(0.10)} className="min-h-[172px]">
                                <WidgetGlanceCard type="signals" accent="bg-gradient-to-r from-emerald-400/55 via-teal-300/35 to-transparent" context={glanceContext} compact />
                            </motion.div>
                            <motion.div {...fade(0.12)} className="min-h-[172px]">
                                <WidgetGlanceCard type="deinFeed" accent="bg-gradient-to-r from-violet-400/55 via-cyan-300/32 to-transparent" context={glanceContext} compact />
                            </motion.div>
                        </div>
                    </section>

                    <aside className="flex flex-col gap-4 lg:col-span-4">
                        <motion.div {...fade(0.10)} data-testid="home-status-grid" className="rounded-[1.35rem] border border-white/[0.09] bg-white/[0.045] p-3.5 backdrop-blur-lg sm:p-4">
                            <div className="px-1 pb-3">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/34">Organisation</div>
                                <h2 className="mt-1 text-[17px] font-medium text-white/84">Vier Wahrheiten, ein Lagebild</h2>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                {primarySignals.map((signal) => <HomeSignalCard key={signal.label} {...signal} />)}
                            </div>
                        </motion.div>
                        <motion.div {...fade(0.14)} className="min-h-[190px]">
                            <WidgetGlanceCard type="team" accent="bg-gradient-to-r from-violet-400/65 via-indigo-300/42 to-transparent" context={glanceContext} compact />
                        </motion.div>
                        <PersonalHomeZone
                            privateLabel={privateAreaLabel}
                            folderCount={privateFolderCount}
                            documentCount={privateDocumentCount}
                            fileCount={privateFileCount}
                            onOpenPrivateArea={onOpenPrivateArea}
                            variant="compact"
                        />
                    </aside>
                </div>

                {(resumeItems.length > 0 || activeDepartments.length > 0) && (
                    <motion.div {...fade(0.18)} data-testid="home-resume-strip" className="rounded-[1.25rem] border border-white/[0.07] bg-black/[0.12] p-4 backdrop-blur-sm">
                        <div className="mb-3 flex items-center justify-between gap-4">
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/34">Weiterarbeiten</div>
                                <div className="mt-1 text-[13px] text-white/55">Nur die letzten belastbaren Einstiege — der Rest bleibt im Finder.</div>
                            </div>
                            <button type="button" onClick={onOpenFinder} className="shrink-0 rounded-full border border-white/[0.08] px-3 py-1.5 text-[10px] text-white/46 transition-colors hover:border-white/16 hover:text-white/72">Finder</button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                            {resumeItems.map((item) => (
                                <button key={item.id} type="button" onClick={() => onOpenRecentActivity(item)} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-left text-[12px] text-white/66 transition-colors hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-white/90">
                                    <FileText size={14} className="shrink-0 opacity-55" />
                                    <span className="truncate">{item.label}</span>
                                </button>
                            ))}
                            {activeDepartments.map(({ dept }) => (
                                <button key={dept.id} type="button" onClick={onGoExplore} className="flex min-w-0 items-center gap-2 rounded-xl border border-indigo-300/14 bg-indigo-400/[0.05] px-3 py-3 text-left text-[12px] text-white/60 transition-colors hover:border-indigo-300/24 hover:bg-indigo-400/[0.1] hover:text-white/82">
                                    <Folder size={14} className="shrink-0 text-indigo-300/64" />
                                    <span className="truncate">{dept.name}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
