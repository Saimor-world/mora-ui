import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Globe, Home, LayoutGrid, Orbit, PanelTopOpen, Shield } from 'lucide-react';
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
    activeCompany: { id: string; name: string } | undefined;
    companies?: { id: string; name: string }[];
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
    const { viewLevel, coreMode, setCoreMode, activeCompanyId, activeDepartmentId, activeSpaceId, activeFolderId } = useNavStore();
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

    const handleContextClick = () => {
        if (!companies.length || !activeCompany || !onSwitchCompany) return;

        const currentIndex = companies.findIndex((company) => company.id === activeCompany.id);
        const nextIndex = (currentIndex + 1) % companies.length;
        const nextCompany = companies[nextIndex];

        onSwitchCompany(nextCompany.id);
    };

    const handleOpenContextBridge = () => {
        requestCommandDeckOpen({ pinned: true });
    };

    const showCoreSurfaceSwitch = viewLevel === 'core';
    const showModeSwitches = visibleModes.length > 1 && !surfaceProfile.isLocalTruthSurface;
    const contextModeLabel = surfaceProfile.isLocalTruthSurface
        ? 'Lokale Instanz'
        : workspaceLabel || 'Kontext';
    const showCompanySwitcher = Boolean(
        activeCompany &&
        companies.length > 1 &&
        !disableContextSwitch &&
        !surfaceProfile.isLocalTruthSurface &&
        !activeCompanyId
    );

    return (
        <div className="fixed top-6 left-1/2 z-50 flex w-[min(1040px,calc(100vw-2rem))] lg:w-[min(900px,calc(100vw-22rem))] -translate-x-1/2 items-center gap-3 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(4,10,9,0.74),rgba(0,0,0,0.54))] px-3 py-2.5 text-white shadow-[0_22px_70px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2">
                {showModeSwitches ? (
                    <>
                        {visibleModes.includes('owner') && (
                            <ControlButton
                                isActive={viewMode === 'owner'}
                                onClick={() => setViewMode('owner')}
                                icon={Shield}
                                label="Owner"
                            />
                        )}

                        {visibleModes.includes('owner') && visibleModes.includes('workspace') && (
                            <div className="h-5 w-px bg-white/12" />
                        )}

                        {visibleModes.includes('workspace') && (
                            <ControlButton
                                isActive={viewMode === 'workspace'}
                                onClick={() => setViewMode('workspace')}
                                icon={LayoutGrid}
                                label={workspaceLabel || 'Kontext'}
                            />
                        )}

                        {visibleModes.includes('workspace') && visibleModes.includes('demo') && (
                            <div className="h-5 w-px bg-white/12" />
                        )}

                        {visibleModes.includes('demo') && (
                            <ControlButton
                                isActive={viewMode === 'demo'}
                                onClick={() => setViewMode('demo')}
                                icon={Activity}
                                label="Demo"
                                showLabelAlways={true}
                            />
                        )}
                    </>
                ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.10] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-emerald-100">
                        <LayoutGrid size={13} />
                        <span>{contextModeLabel}</span>
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={handleOpenContextBridge}
                className="min-w-0 flex-1 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-left transition-colors hover:border-emerald-400/22 hover:bg-emerald-500/[0.08]"
            >
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/36">
                    <span>Layer {surfaceLabel}</span>
                    <span className="text-white/18">/</span>
                    <span style={{ color: shellContext.accent }}>{contextLabelOverride || shellContext.contextLabel}</span>
                </div>
                <div className="mt-1 truncate text-sm text-white/86">{shellContext.title}</div>
                <div className="mt-1 truncate text-[11px] text-white/44">
                    {contextSubtitleOverride || shellContext.subtitle}
                </div>
            </button>

            {showCoreSurfaceSwitch && (
                <div className="hidden shrink-0 items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1 md:flex">
                    <CoreSurfaceButton
                        isActive={coreMode === 'home'}
                        onClick={() => setCoreMode('home')}
                        icon={Home}
                        label="Home"
                    />
                    <CoreSurfaceButton
                        isActive={coreMode === 'explore'}
                        onClick={() => setCoreMode('explore')}
                        icon={Orbit}
                        label="Universe"
                    />
                </div>
            )}

            {showCompanySwitcher && (
                <button
                    type="button"
                    onClick={handleContextClick}
                    className="hidden shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white/74 transition-colors hover:border-emerald-400/18 hover:text-emerald-200 md:flex"
                    title="Organisation wechseln"
                >
                    <Globe className="h-3 w-3" />
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/56">
                        Organisationen
                    </span>
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-emerald-300/68">
                        {companyCountLabel || operationalCompanyCount}
                    </span>
                </button>
            )}

            <button
                type="button"
                onClick={handleOpenContextBridge}
                className="flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-white/58 transition-colors hover:border-emerald-400/20 hover:bg-emerald-500/[0.08] hover:text-emerald-200 xl:hidden"
                title="Control Center öffnen"
            >
                <PanelTopOpen size={16} />
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
        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] uppercase tracking-[0.18em] transition-all ${
            isActive
                ? 'border border-cyan-400/22 bg-cyan-500/[0.10] text-cyan-100'
                : 'border border-transparent bg-transparent text-white/46 hover:border-white/10 hover:bg-white/[0.05] hover:text-white/78'
        }`}
    >
        <Icon size={13} />
        <span>{label}</span>
    </button>
);

const ControlButton: React.FC<{ isActive: boolean; onClick: () => void; icon: any; label: string; showLabelAlways?: boolean }> = ({
    isActive, onClick, icon: Icon, label, showLabelAlways = false
}) => (
    <button
        onClick={onClick}
        className={`relative group flex items-center justify-center rounded-xl p-2 transition-all duration-300 ${isActive ? 'bg-emerald-500/20 text-emerald-300' : 'text-white/54 hover:bg-white/6 hover:text-white'}`}
    >
        <Icon className={`h-4 w-4 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
        <span className={`ml-2 overflow-hidden text-[10px] font-medium transition-all duration-300 ${(isActive || showLabelAlways) ? 'max-w-[52px] opacity-100' : 'max-w-0 opacity-0 group-hover:max-w-[52px] group-hover:opacity-100'}`}>
            {label}
        </span>

        {isActive && (
            <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-xl border border-emerald-500/30"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
        )}
    </button>
);
