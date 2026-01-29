import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Globe, Shield, Activity } from 'lucide-react';

export type ViewMode = 'owner' | 'demo' | 'workspace';

interface UniverseControlsProps {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    activeCompany: { id: string; name: string } | undefined;
    companies?: { id: string; name: string }[];
    onSwitchCompany?: (companyId: string) => void;
    visibleModes?: ViewMode[];
    workspaceLabel?: string;
}

export const UniverseControls: React.FC<UniverseControlsProps> = ({
    viewMode,
    setViewMode,
    activeCompany,
    companies = [],
    onSwitchCompany,
    visibleModes = ['owner', 'workspace', 'demo'],
    workspaceLabel = 'Space'
}) => {

    // Cycle to next company
    const handleContextClick = () => {
        if (!companies.length || !activeCompany || !onSwitchCompany) return;

        const currentIndex = companies.findIndex(c => c.id === activeCompany.id);
        const nextIndex = (currentIndex + 1) % companies.length;
        const nextCompany = companies[nextIndex];

        onSwitchCompany(nextCompany.id);
    };

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-2xl">
            {visibleModes.includes('owner') && (
                <ControlButton
                    isActive={viewMode === 'owner'}
                    onClick={() => setViewMode('owner')}
                    icon={Shield}
                    label="Owner"
                />
            )}

            {visibleModes.includes('owner') && visibleModes.includes('workspace') && (
                <div className="w-px h-4 bg-white/20 mx-1" />
            )}

            {visibleModes.includes('workspace') && (
                <ControlButton
                    isActive={viewMode === 'workspace'}
                    onClick={() => setViewMode('workspace')}
                    icon={LayoutGrid}
                    label={workspaceLabel}
                />
            )}

            {visibleModes.includes('workspace') && visibleModes.includes('demo') && (
                <div className="w-px h-4 bg-white/20 mx-1" />
            )}

            {visibleModes.includes('demo') && (
                <ControlButton
                    isActive={viewMode === 'demo'}
                    onClick={() => setViewMode('demo')}
                    icon={Activity}
                    label="Demo"
                />
            )}

            {/* Current Context Indicator - Now Clickable Switcher */}
            {activeCompany && (
                <div
                    onClick={handleContextClick}
                    className={`ml-4 pl-4 border-l border-white/10 hidden md:flex items-center gap-2 
                        ${companies.length > 1 ? 'cursor-pointer hover:text-emerald-400 opacity-80 hover:opacity-100 transition-colors' : 'opacity-60 cursor-default'}`}
                    role={companies.length > 1 ? "button" : "status"}
                    title={companies.length > 1 ? "Click to switch context (HQ vs Local)" : "Current Context"}
                >
                    <Globe className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wider font-mono select-none">
                        {activeCompany.name}
                    </span>
                    {companies.length > 1 && (
                        <span className="text-[9px] text-emerald-500/50 bg-emerald-500/10 px-1 rounded ml-1">TAB</span>
                    )}
                </div>
            )}
        </div>
    );
};

const ControlButton: React.FC<{ isActive: boolean; onClick: () => void; icon: any; label: string }> = ({
    isActive, onClick, icon: Icon, label
}) => (
    <button
        onClick={onClick}
        className={`relative group flex items-center justify-center p-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/5 text-white/50 hover:text-white'
            }`}
    >
        <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
        <span className={`text-[10px] font-medium ml-2 overflow-hidden transition-all duration-300 ${isActive ? 'max-w-[40px] opacity-100' : 'max-w-0 opacity-0 group-hover:max-w-[40px] group-hover:opacity-100'}`}>
            {label}
        </span>

        {isActive && (
            <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-lg border border-emerald-500/30"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
        )}
    </button>
);
