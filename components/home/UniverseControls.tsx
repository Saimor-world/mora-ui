import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Globe, LayoutGrid, PanelTopOpen, Shield } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { requestCommandDeckOpen } from '@/lib/os/commandDeck';
import { buildShellContextSnapshot } from '@/lib/os/shellContext';

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
}

export const UniverseControls: React.FC<UniverseControlsProps> = ({
    viewMode,
    setViewMode,
    activeCompany,
    companies = [],
    onSwitchCompany,
    visibleModes = ['owner', 'workspace', 'demo'],
    workspaceLabel = 'Workspace',
}) => {
    const user = useMoraStore((state) => state.user);
    const viewLevel = useMoraStore((state) => state.viewLevel);
    const departments = useMoraStore((state) => state.departments);
    const activeDepartmentId = useMoraStore((state) => state.activeDepartmentId);
    const activeSpaceId = useMoraStore((state) => state.activeSpaceId);
    const activeFolderId = useMoraStore((state) => state.activeFolderId);
    const spacesByDepartment = useMoraStore((state) => state.spacesByDepartment);
    const foldersBySpace = useMoraStore((state) => state.foldersBySpace);

    const safeDepartments = useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);
    const activeDepartment = useMemo(
        () => safeDepartments.find((department) => department.id === activeDepartmentId) ?? null,
        [safeDepartments, activeDepartmentId]
    );
    const activeSpaces = useMemo(
        () => activeDepartmentId ? (spacesByDepartment[activeDepartmentId] || []) : [],
        [activeDepartmentId, spacesByDepartment]
    );
    const activeSpace = useMemo(
        () => activeSpaces.find((space) => space.id === activeSpaceId) ?? null,
        [activeSpaces, activeSpaceId]
    );
    const activeFolders = useMemo(
        () => activeSpaceId ? (foldersBySpace[activeSpaceId] || []) : [],
        [activeSpaceId, foldersBySpace]
    );
    const activeFolder = useMemo(
        () => activeFolders.find((folder) => folder.id === activeFolderId) ?? null,
        [activeFolders, activeFolderId]
    );

    const shellContext = useMemo(() => buildShellContextSnapshot({
        viewLevel,
        activeCompany,
        activeDepartment,
        activeSpace,
        activeFolder,
        activeSpaces,
        activeFolders,
        foldersBySpace,
        companyCount: companies.length,
        departmentCount: safeDepartments.length,
        userCompanyName: user?.active_company_name,
        accent: activeDepartment?.color || '#10B981',
    }), [
        viewLevel,
        activeCompany,
        activeDepartment,
        activeSpace,
        activeFolder,
        activeSpaces,
        activeFolders,
        foldersBySpace,
        companies.length,
        safeDepartments.length,
        user?.active_company_name,
    ]);

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

    return (
        <div className="fixed top-5 left-1/2 z-50 flex w-[min(1024px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-2 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(4,10,9,0.72),rgba(0,0,0,0.5))] px-3 py-2.5 text-white shadow-[0_18px_56px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
            <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2">
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
                        label={workspaceLabel || 'Workspace'}
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
            </div>

            <button
                type="button"
                onClick={handleOpenContextBridge}
                className="min-w-0 flex-1 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-left transition-colors hover:border-emerald-400/22 hover:bg-emerald-500/[0.08]"
            >
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/36">
                    <span>Layer {shellContext.scopeLabel}</span>
                    <span className="text-white/18">/</span>
                    <span style={{ color: shellContext.accent }}>{shellContext.contextLabel}</span>
                </div>
                <div className="mt-1 truncate text-sm text-white/86">{shellContext.title}</div>
                <div className="mt-1 truncate text-[11px] text-white/44">
                    {shellContext.signalA} / {shellContext.signalB}
                </div>
            </button>

            {activeCompany && (
                <div
                    onClick={handleContextClick}
                    className={`hidden shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 xl:flex ${companies.length > 1 ? 'cursor-pointer opacity-82 transition-colors hover:border-emerald-400/18 hover:text-emerald-200 hover:opacity-100' : 'cursor-default opacity-60'}`}
                    role={companies.length > 1 ? 'button' : 'status'}
                    title={companies.length > 1 ? 'Kontext wechseln' : 'Aktueller Kontext'}
                >
                    <Globe className="h-3 w-3" />
                    <div className="flex flex-col">
                        <span className="max-w-[168px] truncate text-[10px] uppercase tracking-[0.18em] text-white/78">
                            {activeCompany.name}
                        </span>
                        <span className="text-[10px] text-white/34">
                            {viewMode === 'demo' ? 'Demo workspace' : shellContext.subtitle}
                        </span>
                    </div>
                    {companies.length > 1 && (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-emerald-300/58">
                            Tab
                        </span>
                    )}
                </div>
            )}

            <button
                type="button"
                onClick={handleOpenContextBridge}
                className="flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-white/58 transition-colors hover:border-emerald-400/20 hover:bg-emerald-500/[0.08] hover:text-emerald-200 xl:hidden"
                title="Control Center oeffnen"
            >
                <PanelTopOpen size={16} />
            </button>
        </div>
    );
};

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
