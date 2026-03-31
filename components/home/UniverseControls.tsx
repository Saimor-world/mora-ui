import React from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    Building2,
    Globe,
    LayoutGrid,
    Layers3,
    Shield,
    type LucideIcon,
} from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';

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

interface ContextHero {
    eyebrow: string;
    title: string;
    subtitle: string;
    icon: LucideIcon;
}

export const UniverseControls: React.FC<UniverseControlsProps> = ({
    viewMode,
    setViewMode,
    activeCompany,
    companies = [],
    onSwitchCompany,
    visibleModes = ['owner', 'workspace', 'demo'],
    workspaceLabel = 'Workspace',
    scopeLabel = 'Universe',
}) => {
    const viewLevel = useMoraStore((state) => state.viewLevel);
    const activeDepartmentId = useMoraStore((state) => state.activeDepartmentId);
    const activeSpaceId = useMoraStore((state) => state.activeSpaceId);
    const activeFolderId = useMoraStore((state) => state.activeFolderId);
    const departments = useMoraStore((state) => state.departments);
    const spacesByDepartment = useMoraStore((state) => state.spacesByDepartment);
    const foldersBySpace = useMoraStore((state) => state.foldersBySpace);

    const safeDepartments = React.useMemo(
        () => (Array.isArray(departments) ? departments : []),
        [departments]
    );
    const currentDepartment = React.useMemo(
        () => safeDepartments.find((department) => department.id === activeDepartmentId) ?? null,
        [safeDepartments, activeDepartmentId]
    );
    const currentSpace = React.useMemo(
        () => (activeDepartmentId ? (spacesByDepartment[activeDepartmentId] || []) : []).find((space) => space.id === activeSpaceId) ?? null,
        [activeDepartmentId, activeSpaceId, spacesByDepartment]
    );
    const currentFolder = React.useMemo(
        () => (activeSpaceId ? (foldersBySpace[activeSpaceId] || []) : []).find((folder) => folder.id === activeFolderId) ?? null,
        [activeFolderId, activeSpaceId, foldersBySpace]
    );

    const isLayerFocus = viewLevel === 'department' || viewLevel === 'space' || viewLevel === 'folder';

    const contextHero = React.useMemo<ContextHero>(() => {
        if (viewLevel === 'folder' && currentFolder) {
            return {
                eyebrow: `${scopeLabel} focus`,
                title: currentFolder.name,
                subtitle: [currentSpace?.name, currentDepartment?.name].filter(Boolean).join(' / '),
                icon: Layers3,
            };
        }

        if (viewLevel === 'space' && currentSpace) {
            return {
                eyebrow: `${scopeLabel} focus`,
                title: currentSpace.name,
                subtitle: currentDepartment?.name || activeCompany?.name || 'Workspace',
                icon: LayoutGrid,
            };
        }

        if (viewLevel === 'department' && currentDepartment) {
            return {
                eyebrow: `${scopeLabel} focus`,
                title: currentDepartment.name,
                subtitle: activeCompany?.name || 'Workspace',
                icon: Building2,
            };
        }

        return {
            eyebrow: 'Layer',
            title: scopeLabel,
            subtitle: activeCompany?.name || 'Workspace',
            icon: Globe,
        };
    }, [
        activeCompany?.name,
        currentDepartment,
        currentFolder,
        currentSpace,
        scopeLabel,
        viewLevel,
    ]);

    const handleContextClick = () => {
        if (!companies.length || !activeCompany || !onSwitchCompany) return;

        const currentIndex = companies.findIndex((company) => company.id === activeCompany.id);
        const nextIndex = (currentIndex + 1) % companies.length;
        const nextCompany = companies[nextIndex];
        if (!nextCompany) return;

        onSwitchCompany(nextCompany.id);
    };

    return (
        <motion.div
            layout
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className={`fixed left-1/2 top-6 z-50 flex max-w-[min(920px,calc(100vw-2rem))] -translate-x-1/2 items-center rounded-full border border-white/10 bg-black/45 text-white shadow-2xl backdrop-blur-xl ${isLayerFocus ? 'gap-3 px-3 py-2.5' : 'gap-2 px-4 py-2'}`}
        >
            <div className={`flex items-center ${isLayerFocus ? 'gap-1' : 'gap-2'}`}>
                {visibleModes.includes('owner') && (
                    <ControlButton
                        compact={isLayerFocus}
                        isActive={viewMode === 'owner'}
                        onClick={() => setViewMode('owner')}
                        icon={Shield}
                        label="Owner"
                    />
                )}

                {!isLayerFocus && visibleModes.includes('owner') && visibleModes.includes('workspace') && (
                    <div className="mx-1 h-4 w-px bg-white/20" />
                )}

                {visibleModes.includes('workspace') && (
                    <ControlButton
                        compact={isLayerFocus}
                        isActive={viewMode === 'workspace'}
                        onClick={() => setViewMode('workspace')}
                        icon={LayoutGrid}
                        label={workspaceLabel || 'Workspace'}
                    />
                )}

                {!isLayerFocus && visibleModes.includes('workspace') && visibleModes.includes('demo') && (
                    <div className="mx-1 h-4 w-px bg-white/20" />
                )}

                {visibleModes.includes('demo') && (
                    <ControlButton
                        compact={isLayerFocus}
                        isActive={viewMode === 'demo'}
                        onClick={() => setViewMode('demo')}
                        icon={Activity}
                        label="Demo"
                        showLabelAlways={!isLayerFocus}
                    />
                )}
            </div>

            {isLayerFocus ? (
                <motion.div
                    layout
                    className="flex min-w-[240px] flex-1 items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2"
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/18 bg-cyan-500/10 text-cyan-200">
                        <contextHero.icon size={15} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-white/40">
                            {contextHero.eyebrow}
                        </div>
                        <div className="truncate text-sm text-white/86">
                            {contextHero.title}
                        </div>
                        <div className="truncate text-[10px] text-white/42">
                            {contextHero.subtitle}
                        </div>
                    </div>
                </motion.div>
            ) : (
                <div className="ml-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/55">Layer</span>
                    <span className="ml-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200">{scopeLabel}</span>
                </div>
            )}

            {activeCompany && (
                <div
                    onClick={handleContextClick}
                    className={`min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] transition-colors ${isLayerFocus ? 'flex max-w-[220px] px-3 py-2' : 'ml-2 hidden pl-3 md:flex'} ${companies.length > 1 ? 'cursor-pointer hover:border-emerald-400/20 hover:text-emerald-300' : 'opacity-65 cursor-default'}`}
                    role={companies.length > 1 ? 'button' : 'status'}
                    title={companies.length > 1 ? 'Switch workspace' : 'Current workspace'}
                >
                    <Globe className="h-3 w-3 shrink-0" />
                    <div className="min-w-0">
                        <span className="block truncate text-[10px] font-mono uppercase tracking-wider select-none">
                            {activeCompany.name}
                        </span>
                        <span className="block text-[8px] uppercase tracking-[0.2em] text-white/38">
                            {viewMode === 'demo'
                                ? 'Demo'
                                : companies.length > 1
                                    ? isLayerFocus ? 'Switch' : 'TAB'
                                    : 'Active'}
                        </span>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

const ControlButton: React.FC<{
    compact?: boolean;
    isActive: boolean;
    onClick: () => void;
    icon: LucideIcon;
    label: string;
    showLabelAlways?: boolean;
}> = ({
    compact = false,
    isActive,
    onClick,
    icon: Icon,
    label,
    showLabelAlways = false,
}) => (
    <button
        onClick={onClick}
        className={`relative group flex items-center justify-center rounded-lg transition-all duration-300 ${compact ? 'px-2.5 py-2' : 'p-2'} ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
    >
        <Icon className={`h-4 w-4 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
        <span
            className={`overflow-hidden text-[10px] font-medium transition-all duration-300 ${compact ? 'ml-0' : 'ml-2'} ${(isActive || showLabelAlways)
                ? compact
                    ? 'max-w-0 opacity-0'
                    : 'max-w-[54px] opacity-100'
                : compact
                    ? 'max-w-0 opacity-0'
                    : 'max-w-0 opacity-0 group-hover:max-w-[54px] group-hover:opacity-100'}`}
        >
            {label}
        </span>

        {isActive && (
            <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-lg border border-emerald-500/30"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
        )}
    </button>
);
