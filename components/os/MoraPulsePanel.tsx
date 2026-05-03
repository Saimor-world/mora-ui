'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    FileText,
    PanelTopOpen,
    Sparkles,
} from 'lucide-react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useNavStore } from '@/lib/store/navStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { useCompanies } from '@/lib/queries/useCompanies';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useSpaces } from '@/lib/queries/useSpaces';
import { useFolders } from '@/lib/queries/useFolders';
import { buildShellContextSnapshot } from '@/lib/os/shellContext';
import {
    RITUAL_SCENES,
    getEffectiveRitualScene,
    resolveRitualSettings,
} from '@/lib/os/ritualMode';
import { requestCommandDeckOpen, SAIMOR_COMMAND_DECK_STATE_EVENT } from '@/lib/os/commandDeck';
import { useAssistantRuntime } from '@/lib/hooks/useAssistantRuntime';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';
import { useWebsiteEntryContext } from '@/lib/hooks/useWebsiteEntryContext';

const ORB_LABELS: Record<string, string> = {
    idle: 'Standby',
    thinking: 'Denkt',
    insight: 'Erkenntnis',
    focus: 'Fokus',
    alert: 'Achtung',
    demo: 'Demo',
};

const VIEW_LEVEL_LABELS: Record<string, string> = {
    company: 'Kontext',
    core: 'Universe',
    department: 'Abteilung',
    space: 'Bereich',
    folder: 'Ordner',
};

const formatClock = (value: Date) => new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
}).format(value);

const formatDateLabel = (value: Date) => new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
}).format(value);

export const MoraPulsePanel: React.FC = () => {
    const user = useSessionStore((state) => state.user);
    const { data: companiesData = [] } = useCompanies();
    const companies = companiesData;
    const activeCompanyId = useNavStore((state) => state.activeCompanyId);
    const activeDepartmentId = useNavStore((state) => state.activeDepartmentId);
    const activeSpaceId = useNavStore((state) => state.activeSpaceId);
    const activeFolderId = useNavStore((state) => state.activeFolderId);
    const viewLevel = useNavStore((state) => state.viewLevel);
    const orbState = useOrbStore((state) => state.orbState);
    const { data: departments = [] } = useDepartments(activeCompanyId);
    const { data: activeSpaces = [] } = useSpaces(activeDepartmentId);
    const { data: activeFolders = [] } = useFolders(activeSpaceId);

    const [now, setNow] = useState(() => new Date());
    const [isDeckOpen, setIsDeckOpen] = useState(false);
    const assistantRuntime = useAssistantRuntime();
    const surfaceProfile = useSurfaceProfile();
    const websiteEntryContext = useWebsiteEntryContext();

    const ritualSettings = useMemo(() => resolveRitualSettings(user?.settings), [user?.settings]);
    const ritualScene = useMemo(
        () => RITUAL_SCENES[getEffectiveRitualScene(ritualSettings)],
        [ritualSettings]
    );
    const safeCompanies = useMemo(() => (Array.isArray(companies) ? companies : []), [companies]);
    const safeDepartments = useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);

    const activeCompany = useMemo(
        () => safeCompanies.find((company) => company.id === activeCompanyId) ?? null,
        [safeCompanies, activeCompanyId]
    );
    const displayCompany = useMemo(() => {
        if (!websiteEntryContext?.companyName) return activeCompany;
        return {
            id: activeCompany?.id || `website-entry-${websiteEntryContext.id || 'current'}`,
            name: websiteEntryContext.companyName,
        };
    }, [activeCompany, websiteEntryContext]);
    const activeDepartment = useMemo(
        () => safeDepartments.find((department) => department.id === activeDepartmentId) ?? null,
        [safeDepartments, activeDepartmentId]
    );
    const activeSpace = useMemo(
        () => activeSpaces.find((space) => space.id === activeSpaceId) ?? null,
        [activeSpaces, activeSpaceId]
    );
    const activeFolder = useMemo(
        () => activeFolders.find((folder) => folder.id === activeFolderId) ?? null,
        [activeFolders, activeFolderId]
    );

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 30000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleDeckState = (event: Event) => {
            const detail = (event as CustomEvent<{ open?: boolean }>).detail;
            setIsDeckOpen(Boolean(detail?.open));
        };

        window.addEventListener(SAIMOR_COMMAND_DECK_STATE_EVENT, handleDeckState as EventListener);
        return () => window.removeEventListener(SAIMOR_COMMAND_DECK_STATE_EVENT, handleDeckState as EventListener);
    }, []);

    // Build a foldersBySpace record from the current space's folders for shellContext
    const foldersBySpaceForContext = useMemo(() => {
        if (!activeSpaceId || !activeFolders.length) return {};
        return { [activeSpaceId]: activeFolders };
    }, [activeSpaceId, activeFolders]);

    const shellContext = useMemo(() => buildShellContextSnapshot({
        viewLevel,
        activeCompany: displayCompany,
        activeDepartment,
        activeFolder,
        activeFolders,
        activeSpace,
        activeSpaces,
        foldersBySpace: foldersBySpaceForContext,
        companyCount:
            surfaceProfile.isLocalTruthSurface ||
            !!activeCompanyId ||
            !!displayCompany ||
            !!user?.active_company_name
                ? 1
                : safeCompanies.length,
        departmentCount: safeDepartments.length,
        userCompanyName: user?.active_company_name,
        isPublicDemoSurface: websiteEntryContext ? false : surfaceProfile.isPublicDemoSurface,
        isLocalTruthSurface: surfaceProfile.isLocalTruthSurface,
    }), [
        displayCompany,
        activeCompanyId,
        activeDepartment,
        activeFolder,
        activeFolders,
        activeSpace,
        activeSpaces,
        foldersBySpaceForContext,
        safeCompanies.length,
        safeDepartments.length,
        surfaceProfile.isPublicDemoSurface,
        surfaceProfile.isLocalTruthSurface,
        user?.active_company_name,
        viewLevel,
        websiteEntryContext,
    ]);

    return (
        <div className="pointer-events-none fixed right-6 top-6 z-[78] hidden lg:block">
            <div
                className={`pointer-events-auto relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(28,78,64,0.22),_rgba(0,0,0,0.78)_55%)] shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition-all duration-300 ${isDeckOpen ? 'w-[220px] opacity-50' : 'w-[268px]'}`}
            >
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),transparent_45%,rgba(34,211,238,0.08))]" />
                <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />

                <div className="relative space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/18 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-200/80">
                                <Sparkles size={12} />
                                {ritualScene.shortLabel}-Szene
                            </div>
                            <div className="mt-3 flex items-end gap-2">
                                <div className="text-[32px] font-light tracking-tight text-white">{formatClock(now)}</div>
                                <div className="pb-1 text-[10px] uppercase tracking-[0.22em] text-white/35">{formatDateLabel(now)}</div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">Scope</div>
                            <div className="mt-1 text-sm text-white/78">{VIEW_LEVEL_LABELS[viewLevel] || 'Universe'}</div>
                            <div className="mt-1 text-[11px] text-emerald-200/70">{ORB_LABELS[orbState] || orbState}</div>
                        </div>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/35">
                                    <FileText size={12} />
                                    {shellContext.contextLabel}
                                </div>
                                <div className="mt-2 truncate text-sm text-white/85">
                                    {shellContext.title}
                                </div>
                                <div className="mt-1 text-xs text-white/45">
                                    {shellContext.subtitle}
                                </div>
                            </div>

                            <button
                                onClick={() => requestCommandDeckOpen({ pinned: true })}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10 text-emerald-200 transition-colors hover:bg-emerald-500/16"
                                title="Control Center öffnen"
                            >
                                <PanelTopOpen size={14} />
                            </button>
                        </div>

                        <div className="mt-3 text-[11px] text-white/50">
                            {shellContext.signalA} / {shellContext.signalB}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                            <div className="min-w-0">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Mora</div>
                                <div className="mt-1 truncate text-[11px] text-white/78">
                                    {assistantRuntime.title}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/70">
                                    {assistantRuntime.badge}
                                </div>
                                <div className="mt-1 max-w-[110px] truncate text-[11px] text-white/42">
                                    {assistantRuntime.subtitle}
                                </div>
                            </div>
                        </div>
                    </div>

                    {!isDeckOpen && (
                        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/42">
                            <span className="truncate">{displayCompany?.name || user?.active_company_name || surfaceProfile.fallbackCompanyName}</span>
                            <span>{ritualSettings.autoTime ? 'Auto' : 'Manuell'}</span>
                        </div>
                    )}

                    {isDeckOpen && (
                        <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-500/8 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-emerald-100/75">
                            <PanelTopOpen size={13} />
                            Control Center offen
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
