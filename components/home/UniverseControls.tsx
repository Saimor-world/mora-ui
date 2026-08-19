import React, { useMemo } from 'react';
import { Activity, Globe, Home, LayoutGrid, Network, Orbit, PanelTopOpen, Shield, ChevronLeft, Mic } from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useSpaces } from '@/lib/queries/useSpaces';
import { useFolders } from '@/lib/queries/useFolders';
import { requestCommandDeckOpen } from '@/lib/os/commandDeck';
import { buildShellContextSnapshot } from '@/lib/os/shellContext';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';

export type ViewMode = 'owner' | 'demo' | 'workspace';

interface UniverseControlsProps {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    activeCompany: { id: string; name: string; is_demo?: boolean } | undefined;
    companies?: { id: string; name: string; is_demo?: boolean }[];
    onSwitchCompany?: (companyId: string) => void;
    visibleModes?: ViewMode[];
    workspaceLabel?: string;
    scopeLabel?: string;
    disableContextSwitch?: boolean;
    companyCountLabel?: string;
    isWebsiteEntryContext?: boolean;
    contextLabelOverride?: string;
    contextSubtitleOverride?: string;
}

export const UniverseControls: React.FC<UniverseControlsProps> = ({
    viewMode,
    setViewMode,
    activeCompany,
    companies = [],
    onSwitchCompany,
    visibleModes = ['owner', 'workspace', 'demo'],
    workspaceLabel = 'Organisation',
    disableContextSwitch = false,
    companyCountLabel,
    isWebsiteEntryContext = false,
    contextLabelOverride,
    contextSubtitleOverride,
}) => {
    const user = useSessionStore((state) => state.user);
    const { viewLevel, coreMode, setCoreMode, activeCompanyId, activeDepartmentId, activeSpaceId, activeFolderId, navigateToExplore } = useNavStore();
    const surfaceProfile = useSurfaceProfile();

    const { data: departments = [] } = useDepartments(activeCompany?.id ?? null);
    const { data: activeSpaces = [] } = useSpaces(activeDepartmentId);
    const { data: activeFolders = [] } = useFolders(activeSpaceId);

    const safeDepartments = useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);
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
    const foldersBySpace = useMemo(
        () => activeSpaceId ? { [activeSpaceId]: activeFolders } : {},
        [activeSpaceId, activeFolders]
    );
    const operationalCompanyCount =
        surfaceProfile.isLocalTruthSurface || !!activeCompanyId || !!activeCompany
            ? 1
            : companies.length;

    const shellContext = useMemo(() => buildShellContextSnapshot({
        viewLevel,
        activeCompany,
        activeDepartment,
        activeSpace,
        activeFolder,
        activeSpaces,
        activeFolders,
        foldersBySpace,
        companyCount: operationalCompanyCount,
        departmentCount: safeDepartments.length,
        userCompanyName: user?.active_company_name,
        accent: activeDepartment?.color || '#10B981',
        isPublicDemoSurface: disableContextSwitch && !isWebsiteEntryContext,
        isLocalTruthSurface: surfaceProfile.isLocalTruthSurface,
    }), [
        viewLevel,
        activeCompany,
        activeDepartment,
        activeSpace,
        activeFolder,
        activeSpaces,
        activeFolders,
        foldersBySpace,
        operationalCompanyCount,
        safeDepartments,
        user?.active_company_name,
        disableContextSwitch,
        isWebsiteEntryContext,
        surfaceProfile.isLocalTruthSurface,
    ]);
    const surfaceLabel = useMemo(() => {
        if (viewLevel !== 'core') return shellContext.scopeLabel;
        return coreMode === 'home' ? 'Home' : 'Universe';
    }, [coreMode, shellContext.scopeLabel, viewLevel]);

    // Cycle order: real companies first, demos last — so the switch reads
    // "real → real → demo", never a blind jump into a demo workspace.
    const switchOrder = useMemo(
        () => [...companies].sort((a, b) => Number(a.is_demo ?? false) - Number(b.is_demo ?? false)),
        [companies]
    );
    const nextCompany = useMemo(() => {
        if (!switchOrder.length || !activeCompany) return undefined;
        const currentIndex = switchOrder.findIndex((company) => company.id === activeCompany.id);
        return switchOrder[(currentIndex + 1) % switchOrder.length];
    }, [switchOrder, activeCompany]);

    const handleContextClick = () => {
        if (!nextCompany || !onSwitchCompany) return;
        onSwitchCompany(nextCompany.id);
    };

    const handleOpenContextBridge = () => {
        requestCommandDeckOpen({ pinned: true });
    };

    const showCoreSurfaceSwitch = viewLevel === 'core';
    const showDeptBack = viewLevel === 'department' || viewLevel === 'space';
    const showModeSwitches = visibleModes.length > 1 && !surfaceProfile.isLocalTruthSurface && !surfaceProfile.isHqSurface;
    const contextModeLabel = surfaceProfile.isHqSurface
        ? 'HQ'
        : surfaceProfile.isLocalTruthSurface
            ? 'Lokale Instanz'
            : workspaceLabel || 'Kontext';
    const showCompanySwitcher = Boolean(
        activeCompany &&
        companies.length > 1 &&
        !disableContextSwitch &&
        !surfaceProfile.isLocalTruthSurface &&
        (surfaceProfile.isHqSurface || !activeCompanyId)
    );

    return (
        <div className="fixed left-3 right-3 top-3 z-50 flex min-w-0 items-center justify-between gap-1 rounded-2xl border border-white/[0.10] bg-black/55 px-1.5 py-1.5 text-white shadow-[0_4px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:left-1/2 sm:right-auto sm:top-4 sm:max-w-[min(96vw,920px)] sm:-translate-x-1/2 sm:justify-center sm:gap-2 sm:px-2">
            {showDeptBack && (
                <button
                    type="button"
                    onClick={navigateToExplore}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/55 transition-colors hover:text-emerald-200"
                    title="Zurück zum Universum"
                >
                    <ChevronLeft size={14} />
                    <span className="hidden sm:inline">Universum</span>
                </button>
            )}
            {/* Context mode badge — compact, no switcher clutter */}
            <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[9px] uppercase tracking-[0.15em] sm:px-2.5 sm:text-[10px] sm:tracking-[0.18em]">
                {showModeSwitches ? (
                    <>
                        {visibleModes.includes('owner') && (
                            <ControlButton isActive={viewMode === 'owner'} onClick={() => setViewMode('owner')} icon={Shield} label="Owner" />
                        )}
                        {visibleModes.includes('workspace') && (
                            <ControlButton isActive={viewMode === 'workspace'} onClick={() => setViewMode('workspace')} icon={LayoutGrid} label={workspaceLabel || 'Kontext'} />
                        )}
                        {visibleModes.includes('demo') && (
                            <ControlButton isActive={viewMode === 'demo'} onClick={() => setViewMode('demo')} icon={Activity} label="Demo" showLabelAlways />
                        )}
                    </>
                ) : (
                    <span className="text-violet-200/80">{contextModeLabel}</span>
                )}
            </div>

            {/* Company name — single line, opens Control Center. A DEMO chip
                makes a guided-demo company unmistakable next to a real one. */}
            <button
                type="button"
                onClick={handleOpenContextBridge}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1 text-[11px] text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white/95 sm:flex-none sm:px-3 sm:text-[12px]"
            >
                <span className="truncate font-medium">{shellContext.title}</span>
                {activeCompany?.is_demo && (
                    <span className="shrink-0 rounded-full border border-amber-300/35 bg-amber-400/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-amber-200/90 sm:text-[9px]">
                        Demo
                    </span>
                )}
                {shellContext.contextLabel && (
                    <span className="hidden text-[10px] text-white/35 sm:inline" style={{ color: shellContext.accent }}>
                        {contextLabelOverride || shellContext.contextLabel}
                    </span>
                )}
            </button>

            {/* HOME / UNIVERSE / MINDFIELD surface toggle */}
            {showCoreSurfaceSwitch && (
                <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
                    <CoreSurfaceButton isActive={coreMode === 'home'} onClick={() => setCoreMode('home')} icon={Home} label="Home" />
                    <CoreSurfaceButton isActive={coreMode === 'explore'} onClick={() => setCoreMode('explore')} icon={Orbit} label="Universe" />
                    <CoreSurfaceButton isActive={coreMode === 'mindfield'} onClick={() => setCoreMode('mindfield')} icon={Network} label="Mindfield" />
                </div>
            )}

            {/* Company switcher — only when multi-company, collapsed to icon+count */}
            {showCompanySwitcher && (
                <button
                    type="button"
                    onClick={handleContextClick}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-white/55 transition-colors hover:text-emerald-200 ${surfaceProfile.isHqSurface ? 'sm:hidden' : ''}`}
                    title={nextCompany ? `Wechseln zu: ${nextCompany.name}${nextCompany.is_demo ? ' (Demo)' : ''}` : 'Organisation wechseln'}
                >
                    <Globe className="h-3 w-3" />
                    <span className="text-[10px] text-emerald-300/68">
                        {companyCountLabel || (surfaceProfile.isHqSurface ? companies.length : operationalCompanyCount)}
                    </span>
                </button>
            )}

            {/* Control center icon — collapsed on wide screens too */}
            <button
                type="button"
                onClick={handleOpenContextBridge}
                className="hidden shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-1.5 text-white/45 transition-colors hover:text-emerald-200 sm:flex"
                title="Control Center"
            >
                <PanelTopOpen size={14} />
            </button>
        </div>
    );
};

const CoreSurfaceButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    icon: any;
    label: string;
}> = ({ isActive, onClick, icon: Icon, label }) => (
    <button
        type="button"
        onClick={onClick}
        data-testid={label === 'Universe' ? 'universe-toggle' : undefined}
        className={`flex items-center gap-2 rounded-xl px-2 py-2 text-[10px] uppercase tracking-[0.18em] transition-all sm:px-3 ${
            isActive
                ? 'border border-cyan-400/22 bg-cyan-500/[0.10] text-cyan-100'
                : 'border border-transparent bg-transparent text-white/46 hover:border-white/10 hover:bg-white/[0.05] hover:text-white/78'
        }`}
    >
        <Icon size={13} />
        <span className="hidden sm:inline">{label}</span>
    </button>
);

const ControlButton: React.FC<{ isActive: boolean; onClick: () => void; icon: any; label: string; showLabelAlways?: boolean }> = ({
    isActive, onClick, icon: Icon, label, showLabelAlways = false
}) => (
    <button
        type="button"
        onClick={onClick}
        className={`group relative flex items-center justify-center rounded-xl p-2 transition-all duration-300 ${isActive ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/25' : 'text-white/54 hover:bg-white/6 hover:text-white'}`}
    >
        <Icon className={`h-4 w-4 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
        <span className={`ml-2 overflow-hidden text-[10px] font-medium transition-all duration-300 ${(isActive || showLabelAlways) ? 'max-w-[52px] opacity-100' : 'max-w-0 opacity-0 group-hover:max-w-[52px] group-hover:opacity-100'}`}>
            {label}
        </span>
    </button>
);
