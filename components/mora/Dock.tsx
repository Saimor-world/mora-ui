"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Minus, Building2, ChevronUp,
    Home, MessageCircle, FolderOpen, Users, FileText, Settings, FolderHeart,
    Music2, Pause, Play, SkipForward, Sparkles, Brain, X, Mic
} from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useTree } from '@/lib/queries/useTree';
import { useFolders } from '@/lib/queries/useFolders';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { useCompanies } from '@/lib/queries/useCompanies';
import { usePaneStore } from '@/lib/store/paneStore';
import { useWorkSessionStore } from '@/lib/store/workSessionStore';
import { getCoreDockItems } from '@/lib/surface/surfaceRegistry';

// Derived from paneStore — consistent with other pane-opening components
type OpenPaneFn = ReturnType<typeof usePaneStore.getState>['openPane'];
type DockPane = ReturnType<typeof usePaneStore.getState>['panes'][number];
import { SearchPopup } from './SearchPopup';
import { usePlatformModifier } from '@/lib/hooks/usePlatformModifier';
import { NotificationCenter } from '@/components/os/NotificationCenter';
import { FocusModeWidget, useFocusModeShortcut } from '@/components/os/FocusMode';
// import { ActionTray } from '@/components/os/ActionTray';
import { AdminModeSwitcher } from '@/components/os/AdminModeSwitcher';
import { PlasmaOrb } from './PlasmaOrb';
import { DockCommandDeck, type DockCommandDeckAction } from './DockCommandDeck';
import { roleLabel } from '@/lib/auth/roles';
import {
    AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT,
    listAmbientAudioTracks,
    persistAmbientAudioSettings,
    resolveAmbientAudioSettings,
    type AmbientAudioTrackMeta,
} from '@/lib/audio/ambientAudio';
import {
    RITUAL_SCENES,
    cycleRitualScene,
    getEffectiveRitualScene,
    persistRitualSettings,
    resolveRitualSettings,
} from '@/lib/os/ritualMode';
import { SAIMOR_COMMAND_DECK_EVENT, publishCommandDeckState } from '@/lib/os/commandDeck';
import { buildShellContextSnapshot } from '@/lib/os/shellContext';
import { useAssistantRuntime } from '@/lib/hooks/useAssistantRuntime';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';
import { useWebsiteEntryContext } from '@/lib/hooks/useWebsiteEntryContext';
import { formatCompanyContextLabel } from '@/lib/os/surfaceProfile';
import { filterCompaniesForSurface } from '@/lib/os/companySurfaceFilter';
import { openMoraCenter } from '@/lib/utils/openMoraCenter';
import { AccountIdentityPod } from '@/components/os/shell/AccountIdentityPod';
import { MINIMIZED_ICON_MAP, type DockItem } from './dockTypes';
import type { CoreTreeNode } from '@/lib/types/core';

/**
 * V12 COMMAND CENTER DOCK
 *
 * Premium full-width bottom bar with:
 * - Avatar section (left)
 * - Search + Apps (center)
 * - Company info (right)
 * - Floating minimized panes above
 * - German labels
 */

// ─── Magnetic Dock Icon ──────────────────────────────────────────────────────
interface MagneticDockIconProps {
    item: DockItem;
    isStandardMode: boolean;
    onAction: (action: string) => void;
}

const MagneticDockIcon: React.FC<MagneticDockIconProps> = ({ item, isStandardMode, onAction }) => {
    return (
        <button
            aria-label={item.label}
            data-testid={`dock-${item.action}`}
            data-app-id={item.action}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all relative group duration-75 ease-out will-change-transform ${item.disabled
                ? isStandardMode
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-white/20 cursor-not-allowed'
                : item.action === 'memory'
                    ? 'text-violet-400 hover:text-violet-300 hover:bg-violet-500/15 hover:scale-110 active:scale-95'
                    : isStandardMode
                        ? 'text-gray-600 hover:text-[#0078D4] hover:bg-gray-100 hover:scale-110 active:scale-95'
                        : 'text-cyan-50/64 hover:text-cyan-100 hover:bg-cyan-200/[0.075] hover:shadow-[0_0_24px_rgba(34,211,238,0.12)] hover:scale-110 active:scale-95'
                }`}
            onClick={() => !item.disabled && onAction(item.action)}
            disabled={item.disabled}
        >
            <item.icon size={20} strokeWidth={1.45} />

            {/* Badge */}
            {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-violet-500 text-[10px] text-white font-bold items-center justify-center">
                        {item.badge > 9 ? '!' : item.badge}
                    </span>
                </span>
            )}

            {/* Tooltip */}
            {/* Bridge element to allow pointer crossing without dropout */}
            <div className="absolute -top-3 left-0 w-full h-3 bg-transparent z-50 pointer-events-auto opacity-0 hidden group-hover:block" />
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-75 ease-out pointer-events-none z-[9999]">
                <div className={`rounded-lg px-3 py-2 min-w-[120px] text-center shadow-2xl ${isStandardMode
                    ? 'bg-gray-800 border border-gray-700'
                    : 'bg-black/95 backdrop-blur-xl border border-white/10'
                    }`}>
                    <div className="text-white text-xs font-medium">{item.label}</div>
                    <div className="text-white/50 text-[10px] mt-0.5">{item.description}</div>
                    {item.shortcut && (
                        <kbd className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono ${isStandardMode ? 'bg-gray-700 text-blue-300' : 'bg-white/10 text-emerald-400'
                            }`}>
                            {item.shortcut}
                        </kbd>
                    )}
                </div>
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${isStandardMode
                    ? 'bg-gray-800 border-r border-b border-gray-700'
                    : 'bg-black/95 border-r border-b border-white/10'
                    }`} />
            </div>

            {/* Active dot */}
            {!item.disabled && (
                <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-colors ${isStandardMode
                    ? 'bg-transparent group-hover:bg-[#0078D4]'
                    : 'bg-emerald-400/0 group-hover:bg-emerald-400'
                    }`} />
            )}
        </button>
    );
};
// ─── End MagneticDockIcon (memoized to prevent spurious re-renders) ───────────────────────
const MagneticDockIconMemo = React.memo(MagneticDockIcon);

// ─── Capsule Dock Icon (Unified rounded icon with custom tooltips) ────────────────────────
interface CapsuleDockIconProps {
    icon: React.ComponentType<any>;
    label: string;
    description: string;
    shortcut?: string | null;
    active?: boolean;
    onClick: () => void;
    onDoubleClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    badge?: number;
    isStandardMode: boolean;
    pulse?: boolean;
    children?: React.ReactNode;
}

const CapsuleDockIcon: React.FC<CapsuleDockIconProps> = ({
    icon: Icon,
    label,
    description,
    shortcut,
    active = false,
    onClick,
    onDoubleClick,
    onContextMenu,
    badge,
    isStandardMode,
    pulse = false,
    children,
}) => {
    return (
        <button
            type="button"
            aria-label={label}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all relative group duration-75 ease-out will-change-transform ${
                active
                    ? isStandardMode
                        ? 'bg-[#0078D4]/10 text-[#0078D4]'
                        : 'bg-cyan-400/16 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.15)] border border-cyan-300/30'
                    : isStandardMode
                        ? 'text-gray-600 hover:text-[#0078D4] hover:bg-gray-100 hover:scale-110 active:scale-95'
                        : 'text-cyan-50/64 hover:text-cyan-100 hover:bg-cyan-200/[0.075] hover:shadow-[0_0_24px_rgba(34,211,238,0.12)] hover:scale-110 active:scale-95'
            }`}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
        >
            <Icon size={20} strokeWidth={1.45} className={pulse ? 'animate-pulse' : ''} />
            {children}

            {/* Badge */}
            {badge && badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-violet-500 text-[10px] text-white font-bold items-center justify-center">
                        {badge > 9 ? '!' : badge}
                    </span>
                </span>
            )}

            {/* Tooltip */}
            <div className="absolute -top-3 left-0 w-full h-3 bg-transparent z-50 pointer-events-auto opacity-0 hidden group-hover:block" />
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-75 ease-out pointer-events-none z-[9999]">
                <div className={`rounded-lg px-3 py-2 min-w-[140px] text-center shadow-2xl ${
                    isStandardMode
                        ? 'bg-gray-800 border border-gray-700'
                        : 'bg-black/95 backdrop-blur-xl border border-white/10'
                }`}>
                    <div className="text-white text-xs font-medium">{label}</div>
                    <div className="text-white/50 text-[10px] mt-0.5">{description}</div>
                    {shortcut && (
                        <kbd className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono ${
                            isStandardMode ? 'bg-gray-700 text-blue-300' : 'bg-white/10 text-emerald-400'
                        }`}>
                            {shortcut}
                        </kbd>
                    )}
                </div>
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${
                    isStandardMode
                        ? 'bg-gray-800 border-r border-b border-gray-700'
                        : 'bg-black/95 border-r border-b border-white/10'
                }`} />
            </div>
        </button>
    );
};

// ─── Session Chip ─────────────────────────────────────────────────────────────
// Quiet ambient indicator: renders only when a work-session plan is active.
// Clicking opens / focuses the WorkSessionPane. Exported for testing.
// Follows the MagneticDockIcon inline sub-component pattern.
interface SessionChipProps {
    planId: string; // always non-null — Dock gates with {activePlanId && ...}
    openPane: OpenPaneFn;
    isStandardMode: boolean;
}

export const SessionChip: React.FC<SessionChipProps> = ({ planId, openPane, isStandardMode }) => {
    const paneData = React.useMemo(() => ({ plan_id: planId }), [planId]);

    const handleClick = React.useCallback(() => {
        openPane({
            id: `work-session-${paneData.plan_id}`,
            type: 'work-session',
            title: 'Arbeitsplan',
            size: { width: 900, height: 700 },
            data: paneData,
        });
    }, [openPane, paneData]);

    return (
        <button
            type="button"
            onClick={handleClick}
            title="Aktiven Arbeitsplan öffnen"
            data-testid="session-chip"
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] transition-all ${
                isStandardMode
                    ? 'bg-blue-50 border border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-100'
                    : 'bg-violet-500/10 border border-violet-400/20 text-violet-200/80 hover:border-violet-300/35 hover:bg-violet-500/20'
            }`}
        >
            <span
                className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${
                    isStandardMode ? 'bg-blue-500' : 'bg-violet-400'
                }`}
            />
            Plan aktiv
        </button>
    );
};

interface DockNowPlayingProps {
    isStandardMode: boolean;
    isDeckOpen: boolean;
    trackName: string | null;
    trackCount: number;
    isPlaying: boolean;
    onToggle: () => void;
    onNext: () => void;
    onOpen: () => void;
}

const DockNowPlaying: React.FC<DockNowPlayingProps> = ({
    isStandardMode,
    isDeckOpen,
    trackName,
    trackCount,
    isPlaying,
    onToggle,
    onNext,
    onOpen,
}) => {
    if (isDeckOpen) {
        return null;
    }

    return (
        <div className={`hidden xl:flex max-w-[280px] items-center gap-2.5 rounded-[20px] border px-3 py-2 ${isStandardMode
            ? 'border-gray-200 bg-gray-100'
            : 'border-white/10 bg-white/[0.04]'
            }`}>
            <button
                onClick={onOpen}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${isStandardMode
                    ? 'border-[#0078D4]/15 bg-white text-[#0078D4] hover:border-[#0078D4]/40'
                    : 'border-emerald-400/20 bg-emerald-500/12 text-emerald-200 hover:bg-emerald-500/18'
                    }`}
                title="Audio-Einstellungen öffnen"
            >
                <Music2 size={16} />
            </button>

            <button onClick={onOpen} className="min-w-0 text-left">
                <div className={`text-[10px] uppercase tracking-[0.2em] ${isStandardMode ? 'text-gray-500' : 'text-white/35'}`}>
                    Audio
                </div>
                <div className={`mt-1 max-w-[132px] truncate text-sm ${isStandardMode ? 'text-gray-800' : 'text-white/82'}`}>
                    {trackName || 'Mora Ambient'}
                </div>
                <div className={`mt-1 text-[11px] ${isStandardMode ? 'text-gray-500' : 'text-white/40'}`}>
                    {trackCount > 0 ? `${trackCount} Tracks` : 'Eingebauter Pad'}
                </div>
            </button>

            <div className="flex items-end gap-1 px-1">
                {[10, 18, 12, 20, 14].map((baseH, index) => (
                    <motion.span
                        key={`bar-${index}`}
                        className={`w-1 rounded-full ${isStandardMode ? 'bg-[#0078D4]/50' : 'bg-gradient-to-t from-emerald-400/35 to-cyan-300/70'}`}
                        animate={isPlaying ? {
                            height: [baseH * 0.35, baseH * 1.5, baseH * 0.55, baseH * 1.3, baseH * 0.35],
                            opacity: [0.6, 1, 0.75, 1, 0.6],
                        } : {
                            height: Math.max(3, baseH * 0.28),
                            opacity: 0.25,
                        }}
                        transition={isPlaying ? {
                            duration: 0.72 + index * 0.11,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: index * 0.09,
                        } : { duration: 0.3 }}
                        style={{ height: baseH }}
                    />
                ))}
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={onToggle}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${isStandardMode
                        ? 'border-gray-200 bg-white text-[#0078D4] hover:border-[#0078D4]/40'
                        : 'border-white/10 bg-white/5 text-white/75 hover:border-white/20 hover:bg-white/10 hover:text-white'
                        }`}
                    title={isPlaying ? 'Musik pausieren' : 'Musik abspielen'}
                >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                    onClick={onNext}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${isStandardMode
                        ? 'border-gray-200 bg-white text-[#0078D4] hover:border-[#0078D4]/40'
                        : 'border-white/10 bg-white/5 text-white/75 hover:border-white/20 hover:bg-white/10 hover:text-white'
                        }`}
                    title="Naechsten Track waehlen"
                >
                    <SkipForward size={14} />
                </button>
            </div>
        </div>
    );
};

interface DockSearchLauncherProps {
    isStandardMode: boolean;
    shortcutLabel: string;
    isActive: boolean;
    onOpen: () => void;
}

const DockSearchLauncher: React.FC<DockSearchLauncherProps> = ({
    isStandardMode,
    shortcutLabel,
    isActive,
    onOpen,
}) => (
    <button
        type="button"
        onClick={onOpen}
        className={`hidden xl:flex min-w-[154px] max-w-[182px] items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all ${isStandardMode
            ? 'border-gray-200 bg-gray-100 text-gray-700 hover:border-[#0078D4]/35 hover:text-[#0078D4]'
            : `border-white/10 ${isActive ? 'bg-emerald-500/[0.1] text-emerald-200' : 'bg-white/[0.04] text-white/72 hover:border-emerald-400/22 hover:bg-emerald-500/[0.08] hover:text-emerald-200'}`
            }`}
    >
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${isStandardMode
            ? 'border-[#0078D4]/15 bg-white text-[#0078D4]'
            : 'border-white/10 bg-white/[0.05] text-white/68'
            }`}>
            <Search size={15} />
        </div>
        <div className="min-w-0 flex-1">
            <div className={`text-[10px] uppercase tracking-[0.2em] ${isStandardMode ? 'text-gray-500' : 'text-white/35'}`}>
                Suche
            </div>
            <div className={`mt-1 truncate text-sm ${isStandardMode ? 'text-gray-800' : 'text-white/84'}`}>
                System
            </div>
        </div>
        <kbd className={`rounded-lg px-2 py-1 text-[10px] font-mono ${isStandardMode ? 'bg-white text-gray-500' : 'bg-white/10 text-white/40'}`}>
            {shortcutLabel}
        </kbd>
    </button>
);

interface DockPodProps {
    isStandardMode: boolean;
    className?: string;
    children: React.ReactNode;
}

const DockPod: React.FC<DockPodProps> = ({
    isStandardMode,
    className = '',
    children,
}) => (
    <div
        className={`rounded-[24px] border ${isStandardMode
            ? 'border-gray-200 bg-white/85 shadow-[0_8px_24px_rgba(15,23,42,0.06)]'
            : 'border-cyan-200/[0.10] bg-[linear-gradient(180deg,rgba(123,233,255,0.055),rgba(83,65,160,0.055)_48%,rgba(2,10,14,0.20))] shadow-[0_18px_70px_rgba(0,0,0,0.20),0_0_34px_rgba(34,211,238,0.055),inset_0_1px_0_rgba(255,255,255,0.075)] backdrop-blur-[22px]'
            } ${className}`}
    >
        {children}
    </div>
);

interface RunningWindowsBarProps {
    panes: DockPane[];
    activePaneId: string | null;
    isStandardMode: boolean;
    onActivate: (pane: DockPane) => void;
    onClose: (id: string) => void;
}

const RunningWindowsBar: React.FC<RunningWindowsBarProps> = ({
    panes,
    activePaneId,
    isStandardMode,
    onActivate,
    onClose,
}) => {
    const shouldShow = panes.length > 1 || panes.some((pane) => pane.minimized);
    if (!shouldShow) return null;

    return (
        <div className="mb-3 flex w-[calc(100vw-20px)] justify-center px-2 pointer-events-auto">
            <div className={`flex max-w-[min(1180px,calc(100vw-36px))] items-center gap-2 overflow-x-auto rounded-[22px] border px-2.5 py-2 shadow-2xl ${isStandardMode
                ? 'border-gray-200 bg-white/92'
                : 'border-white/10 bg-black/48 backdrop-blur-2xl'
                }`}>
                <div className={`hidden shrink-0 px-2 text-[10px] uppercase tracking-[0.22em] lg:block ${isStandardMode ? 'text-gray-500' : 'text-white/35'}`}>
                    Fenster
                </div>
                {panes.map((pane) => {
                    const Icon = MINIMIZED_ICON_MAP[pane.type] || Minus;
                    const isActive = pane.id === activePaneId && !pane.minimized;
                    return (
                        <div
                            key={pane.id}
                            className={`group flex min-w-[150px] max-w-[230px] items-center gap-2 rounded-2xl border px-2 py-1.5 transition-all ${isStandardMode
                                ? isActive
                                    ? 'border-[#0078D4]/40 bg-[#0078D4]/10 text-[#005A9E]'
                                    : pane.minimized
                                        ? 'border-gray-200 bg-gray-50 text-gray-500 hover:border-[#0078D4]/25 hover:text-[#0078D4]'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-[#0078D4]/25 hover:text-[#0078D4]'
                                : isActive
                                    ? 'border-emerald-400/35 bg-emerald-500/14 text-emerald-100 shadow-[0_0_20px_rgba(124,58,237,0.12)]'
                                    : pane.minimized
                                        ? 'border-white/8 bg-white/[0.025] text-white/42 hover:border-emerald-400/20 hover:text-emerald-200'
                                        : 'border-white/10 bg-white/[0.055] text-white/72 hover:border-emerald-400/20 hover:text-emerald-200'
                                }`}
                        >
                            <button
                                type="button"
                                aria-pressed={isActive}
                                title={pane.minimized ? `${pane.title} wiederherstellen` : `${pane.title} fokussieren`}
                                onClick={() => onActivate(pane)}
                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            >
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${isStandardMode
                                    ? 'border-gray-200 bg-white'
                                    : 'border-white/10 bg-black/20'
                                    }`}>
                                    <Icon size={15} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-xs font-medium">{pane.title}</span>
                                    <span className={`mt-0.5 block text-[10px] ${isStandardMode ? 'text-gray-500' : 'text-white/35'}`}>
                                        {pane.minimized ? 'Minimiert' : isActive ? 'Aktiv' : 'Geoeffnet'}
                                    </span>
                                </span>
                            </button>
                            <button
                                type="button"
                                aria-label={`${pane.title} schliessen`}
                                title="Fenster schliessen"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onClose(pane.id);
                                }}
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg opacity-0 transition-all group-hover:opacity-100 ${isStandardMode
                                    ? 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                                    : 'text-white/35 hover:bg-red-500/15 hover:text-red-200'
                                    }`}
                            >
                                <X size={13} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

type DockDerivedSpace = {
    id: string;
    name: string;
    color?: string | null;
    folder_count?: number | null;
};

type DockDerivedFolder = {
    id: string;
    name: string;
    color?: string | null;
    node_count?: number | null;
};

function deriveDockStructure(tree: CoreTreeNode[]) {
    const spacesByDepartment: Record<string, DockDerivedSpace[]> = {};
    const foldersBySpace: Record<string, DockDerivedFolder[]> = {};

    tree.forEach((department) => {
        if (department.type !== 'department') return;
        const spaces = (department.children || []).filter((child) => child.type === 'space');
        spacesByDepartment[department.id] = spaces.map((space) => {
            const folders = (space.children || []).filter((child) => child.type === 'folder');
            foldersBySpace[space.id] = folders.map((folder) => ({
                id: folder.id,
                name: folder.name,
                color: folder.color,
                node_count: (folder.children || []).filter((child) => child.type === 'node').length,
            }));
            return {
                id: space.id,
                name: space.name,
                color: space.color,
                folder_count: folders.length,
            };
        });
    });

    return { spacesByDepartment, foldersBySpace };
}

export const Dock = () => {
    const navigateToCore = useNavStore((s) => s.navigateToCore);
    const navigateToDepartment = useNavStore((s) => s.navigateToDepartment);
    const navigateToSpace = useNavStore((s) => s.navigateToSpace);
    const navigateToFolder = useNavStore((s) => s.navigateToFolder);
    const orbState = useOrbStore((s) => s.orbState);
    const user = useSessionStore((s) => s.user);
    const { data: companies = [] } = useCompanies();
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const activeDepartmentId = useNavStore((s) => s.activeDepartmentId);
    const activeSpaceId = useNavStore((s) => s.activeSpaceId);
    const activeFolderId = useNavStore((s) => s.activeFolderId);
    const { data: departmentsData = [] } = useDepartments(activeCompanyId);
    const { data: treeData = [] } = useTree(activeCompanyId);
    const { data: foldersData = [] } = useFolders(activeSpaceId);
    const departments = departmentsData;
    const setActiveCompany = useNavStore((s) => s.setActiveCompany);
    const viewMode = useNavStore((s) => s.viewMode);
    const viewLevel = useNavStore((s) => s.viewLevel);
    const isStandardMode = useNavStore((s) => s.isStandardMode);
    const updateUserSettings = useSessionStore((s) => s.updateUserSettings);

    const panes = usePaneStore((s) => s.panes);
    const activePaneId = usePaneStore((s) => s.activePaneId);
    const restorePane = usePaneStore((s) => s.restorePane);
    const focusPane = usePaneStore((s) => s.focusPane);
    const minimizePane = usePaneStore((s) => s.minimizePane);
    const removePane = usePaneStore((s) => s.removePane);
    const openPane = usePaneStore((s) => s.openPane);
    const runningPanes = useMemo(() => panes.filter((pane) => pane.type !== 'search'), [panes]);
    const activePlanId = useWorkSessionStore((s) => s.activePlanId);
    const mod = usePlatformModifier();

    const [chatInput, setChatInput] = useState('');
    const [searchPopupOpen, setSearchPopupOpen] = useState(false);
    const [showCompanySwitcher, setShowCompanySwitcher] = useState(false);
    const [isCommandDeckOpen, setIsCommandDeckOpen] = useState(false);
    const [isCommandDeckPinned, setIsCommandDeckPinned] = useState(false);
    const assistantRuntime = useAssistantRuntime();
    const surfaceProfile = useSurfaceProfile();
    useFocusModeShortcut();
    const websiteEntryContext = useWebsiteEntryContext();
    const [ambientTracks, setAmbientTracks] = useState<AmbientAudioTrackMeta[]>([]);
    const safeCompanies = useMemo(() => (Array.isArray(companies) ? companies : []), [companies]);
    const safeDepartments = useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);
    const safeTree = useMemo(() => (Array.isArray(treeData) ? treeData : []), [treeData]);
    const safeFolders = useMemo(() => (Array.isArray(foldersData) ? foldersData : []), [foldersData]);
    const { spacesByDepartment, foldersBySpace } = useMemo(
        () => deriveDockStructure(safeTree),
        [safeTree]
    );
    const ambientAudio = useMemo(() => resolveAmbientAudioSettings(user?.settings), [user?.settings]);
    const ritualSettings = useMemo(() => resolveRitualSettings(user?.settings), [user?.settings]);
    const ritualSceneId = useMemo(() => getEffectiveRitualScene(ritualSettings), [ritualSettings]);
    const ritualScene = RITUAL_SCENES[ritualSceneId];

    const activeCompany = useMemo(
        () => safeCompanies.find(c => c.id === activeCompanyId),
        [safeCompanies, activeCompanyId]
    );
    const displayCompany = useMemo(() => {
        if (!websiteEntryContext?.companyName) return activeCompany;
        if (activeCompany) {
            return {
                ...activeCompany,
                name: websiteEntryContext.companyName,
                tenant_id: user?.tenant_id && user.tenant_id !== 'tenant-demo'
                    ? user.tenant_id
                    : `tenant-preview-${websiteEntryContext.id || 'current'}`,
                is_demo: false,
            };
        }
        return {
            id: `website-entry-${websiteEntryContext.id || 'current'}`,
            tenant_id: user?.tenant_id && user.tenant_id !== 'tenant-demo'
                ? user.tenant_id
                : `tenant-preview-${websiteEntryContext.id || 'current'}`,
            owner_id: 'website-entry',
            name: websiteEntryContext.companyName,
            slug: `website-entry-${websiteEntryContext.id || 'current'}`,
            description: websiteEntryContext.summary || null,
            logo_url: null,
            settings: null,
            is_demo: false,
        };
    }, [activeCompany, user?.tenant_id, websiteEntryContext]);
    const isClaimedWebsiteEntry = useMemo(() => {
        if (!websiteEntryContext) return false;
        const contextEmail = websiteEntryContext.email?.trim().toLowerCase();
        const userEmail = user?.email?.trim().toLowerCase();
        return Boolean(contextEmail && userEmail && contextEmail === userEmail);
    }, [user?.email, websiteEntryContext]);
    const activeTrack = useMemo(
        () => ambientTracks.find((track) => track.id === ambientAudio.trackId) ?? null,
        [ambientTracks, ambientAudio.trackId]
    );
    const switcherCompanies = useMemo(
        () => filterCompaniesForSurface(safeCompanies, {
            surfaceProfile,
            role: user?.role,
            tenantId: user?.tenant_id,
            viewMode,
            websiteEntryActive: Boolean(websiteEntryContext),
            displayCompany,
        }),
        [displayCompany, safeCompanies, surfaceProfile, user?.role, user?.tenant_id, viewMode, websiteEntryContext]
    );
    const operationalCompanyCount = useMemo(
        () => switcherCompanies.length || (displayCompany ? 1 : 0),
        [displayCompany, switcherCompanies.length]
    );
    const companyContextLabel = useMemo(
        () => formatCompanyContextLabel(surfaceProfile, operationalCompanyCount),
        [surfaceProfile, operationalCompanyCount]
    );
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
        () => {
            if (!activeSpaceId) return [];
            if (safeFolders.length > 0) {
                return safeFolders.map((folder) => ({
                    id: folder.id,
                    name: folder.name,
                    color: folder.color,
                    node_count: folder.node_count,
                    updated_at: folder.updated_at,
                    created_at: folder.created_at,
                }));
            }
            return foldersBySpace[activeSpaceId] || [];
        },
        [activeSpaceId, foldersBySpace, safeFolders]
    );
    const activeFolder = useMemo(
        () => activeFolders.find((folder) => folder.id === activeFolderId) ?? null,
        [activeFolders, activeFolderId]
    );

    const accent = useMemo(() => {
        switch (orbState) {
            case 'alert': return '#EF4444';
            case 'thinking': return '#3B82F6';
            case 'insight': return '#F59E0B';
            case 'demo': return '#14B8A6';
            default: return '#7C3AED';
        }
    }, [orbState]);

    const handleDockClick = useCallback((action: string) => {
        switch (action) {
            // ── Core Work surfaces ──────────────────────────────────────
            case 'home':     navigateToCore(); break;
            case 'ambient':  useNavStore.getState().navigateToAmbient(); break;
            case 'chat':     openPane({ id: 'chat-main',     type: 'chat',     title: 'Mora',           size: { width: 860, height: 680 } }); break;
            case 'finder':   openPane({ id: 'finder-main',   type: 'finder',   title: 'Finder',         size: { width: 1280, height: 820 } }); break;
            case 'team':     openPane({ id: 'team-main',     type: 'team',     title: 'Team',           size: { width: 900, height: 640 } }); break;
            case 'notes':    openPane({ id: 'notes-main',    type: 'notes',    title: 'Notizen',        size: { width: 720, height: 560 } }); break;
            case 'settings': openPane({ id: 'settings-main', type: 'settings', title: 'Einstellungen',  size: { width: 720, height: 640 } }); break;
            case 'larry':    window.open('https://dash.saimor.world', '_blank'); break;
            default: break;
        }
    }, [navigateToCore, openPane]);

    const handleTaskbarActivate = useCallback((pane: DockPane) => {
        if (pane.minimized) {
            restorePane(pane.id);
            return;
        }
        if (pane.id === activePaneId) {
            minimizePane(pane.id);
            return;
        }
        focusPane(pane.id);
    }, [activePaneId, focusPane, minimizePane, restorePane]);

    // Icon map: action → lucide icon. Defined here (UI concern) separate from registry (routing concern).
    const DOCK_ICON_MAP: Record<string, React.ComponentType<any>> = useMemo(() => ({
        home:     Home,
        chat:     MessageCircle,
        finder:   FolderOpen,
        team:     Users,
        notes:    FileText,
        settings: Settings,
        ambient:  Mic,
        larry:    Sparkles,
    }), []);

    // Single source of truth — order, labels, shortcuts come from surfaceRegistry.
    const dockItems: DockItem[] = useMemo(() =>
        getCoreDockItems().map(entry => ({
            icon:        DOCK_ICON_MAP[entry.action] ?? Minus,
            label:       entry.label,
            description: entry.description,
            shortcut:    entry.action === 'notes' ? 'Alt+N' : entry.shortcutSuffix ? `${mod}+${entry.shortcutSuffix}` : null,
            action:      entry.action,
        }))
    , [mod, DOCK_ICON_MAP]);

    const orbStateLabel = useMemo(() => {
        switch (orbState) {
            case 'focus': return 'Focus';
            case 'thinking': return 'Thinking';
            case 'alert': return 'Alert';
            case 'insight': return 'Insight';
            case 'demo': return 'Demo';
            default: return 'Ready';
        }
    }, [orbState]);

    const openFinderContext = useCallback((title: string, data: Record<string, unknown>) => {
        openPane({
            id: 'finder-main',
            type: 'finder',
            title,
            size: { width: 1280, height: 820 },
            data,
        });
    }, [openPane]);

    const shellContext = useMemo(() => buildShellContextSnapshot({
        viewLevel,
        activeCompany: displayCompany,
        activeDepartment,
        activeSpace,
        activeFolder,
        activeSpaces,
        activeFolders,
        foldersBySpace,
        companyCount: operationalCompanyCount,
        departmentCount: safeDepartments.length,
        userCompanyName: user?.active_company_name,
        accent,
        isPublicDemoSurface: websiteEntryContext ? false : surfaceProfile.isPublicDemoSurface,
        isLocalTruthSurface: surfaceProfile.isLocalTruthSurface,
    }), [
        viewLevel,
        displayCompany,
        activeDepartment,
        activeSpace,
        activeFolder,
        activeSpaces,
        activeFolders,
        foldersBySpace,
        operationalCompanyCount,
        safeDepartments.length,
        user?.active_company_name,
        accent,
        surfaceProfile.isPublicDemoSurface,
        surfaceProfile.isLocalTruthSurface,
        websiteEntryContext,
    ]);

    const scopeLabel = shellContext.scopeLabel;

    const handleOpenContext = useCallback(() => {
        if (activeFolderId && activeSpace) {
            openFinderContext(activeFolder?.name || 'Aktiver Ordner', {
                folderId: activeFolderId,
                spaceId: activeSpace.id,
                departmentId: activeDepartmentId || undefined,
                companyId: activeCompanyId || activeDepartment?.company_id || undefined,
            });
            return;
        }

        if (activeSpace) {
            openFinderContext(activeSpace.name, {
                spaceId: activeSpace.id,
                departmentId: activeDepartmentId || undefined,
                companyId: activeCompanyId || activeDepartment?.company_id || undefined,
            });
            return;
        }

        if (activeDepartment) {
            openFinderContext(activeDepartment.name, {
                departmentId: activeDepartment.id,
                companyId: activeCompanyId || activeDepartment.company_id || undefined,
            });
            return;
        }

        openFinderContext(displayCompany?.name || surfaceProfile.fallbackCompanyName, {
            companyId: activeCompanyId || undefined,
        });
    }, [
        displayCompany?.name,
        activeCompanyId,
        activeDepartment,
        activeDepartmentId,
        activeFolder,
        activeFolderId,
        activeSpace,
        openFinderContext,
        surfaceProfile.fallbackCompanyName,
    ]);

    const contextDeck = useMemo(() => {
        if (activeFolder && activeSpace) {
            return {
                label: 'Ordner',
                title: activeFolder.name,
                description: 'Du bist in einem konkreten Ordner. Von hier aus solltest du Dokumente öffnen, teilen oder zurück in den Bereich springen.',
                signalA: `${activeFolder.node_count || 0} Dokumente`,
                signalB: `${activeSpace.name} · ${activeFolders.length} Ordner`,
                actionLabel: 'Im Finder öffnen',
                accent: activeFolder.color || activeDepartment?.color || accent,
                onOpen: () => openFinderContext(activeFolder.name, {
                    folderId: activeFolder.id,
                    spaceId: activeSpace.id,
                    departmentId: activeDepartmentId || undefined,
                    companyId: activeCompanyId || activeDepartment?.company_id || undefined,
                }),
            };
        }

        if (activeSpace) {
            const docCount = activeFolders.reduce((sum, folder) => sum + (folder.node_count || 0), 0);
            return {
                label: 'Bereich',
                title: activeSpace.name,
                description: 'Das ist die aktive Bereichsstruktur. Hier sollten die echten Ordner, Dokumente und der naechste Einstieg klar sichtbar sein.',
                signalA: `${activeFolders.length} Ordner`,
                signalB: `${docCount} Dokumente`,
                actionLabel: 'Im Finder öffnen',
                accent: activeSpace.color || activeDepartment?.color || accent,
                onOpen: () => openFinderContext(activeSpace.name, {
                    spaceId: activeSpace.id,
                    departmentId: activeDepartmentId || undefined,
                    companyId: activeCompanyId || activeDepartment?.company_id || undefined,
                }),
            };
        }

        if (activeDepartment) {
            const folderCount = activeSpaces.reduce((sum, space) => sum + Math.max(space.folder_count ?? 0, (foldersBySpace[space.id] || []).length), 0);
            const docCount = activeSpaces.reduce((sum, space) => sum + (foldersBySpace[space.id] || []).reduce((folderSum, folder) => folderSum + (folder.node_count || 0), 0), 0);
            return {
                label: 'Abteilung',
                title: activeDepartment.name,
                description: 'Die Abteilung zeigt ihre Bereiche, Ordner und Dokumente. Von hier aus solltest du in den passenden Bereich hineinzoomen.',
                signalA: `${activeSpaces.length} Bereiche`,
                signalB: `${folderCount} Ordner · ${docCount} Dokumente`,
                actionLabel: 'Im Finder öffnen',
                accent: activeDepartment.color || accent,
                onOpen: () => openFinderContext(activeDepartment.name, {
                    departmentId: activeDepartment.id,
                    companyId: activeCompanyId || activeDepartment.company_id || undefined,
                }),
            };
        }

        return {
            label: 'Universe',
            title: displayCompany?.name || user?.active_company_name || surfaceProfile.fallbackCompanyName,
            description: websiteEntryContext
                ? 'Dieses HQ zeigt das aus dem Website-Check erzeugte Kundendossier. Von hier aus oeffnest du Dossier, Aufgaben und Arbeitsraeume.'
                : surfaceProfile.isPublicDemoSurface
                ? 'Das Universe zeigt die kuratierte Beispielinstanz. Von hier aus springst du direkt in die passende Abteilung.'
                : surfaceProfile.isLocalTruthSurface
                    ? 'Diese Instanz folgt der echten lokalen Arbeitslogik. Von hier aus gehst du direkt in Organisation, Abteilung oder Finder.'
                : 'Das Universe zeigt die Struktur der aktuellen Instanz. Von hier aus waehlst du zuerst die passende Organisation oder Abteilung.',
            signalA: `${safeDepartments.length} Abteilungen`,
            signalB: companyContextLabel,
            actionLabel: websiteEntryContext ? 'Dossier oeffnen' : surfaceProfile.isPublicDemoSurface ? 'Struktur öffnen' : surfaceProfile.isLocalTruthSurface ? 'Instanz öffnen' : 'Organisation öffnen',
            accent,
            onOpen: () => openFinderContext(displayCompany?.name || surfaceProfile.fallbackCompanyName, {
                companyId: activeCompanyId || undefined,
            }),
        };
    }, [
        displayCompany,
        activeCompanyId,
        activeDepartment,
        activeDepartmentId,
        activeFolder,
        activeFolders,
        activeSpace,
        activeSpaces,
        accent,
        foldersBySpace,
        companyContextLabel,
        openFinderContext,
        safeDepartments.length,
        surfaceProfile.fallbackCompanyName,
        surfaceProfile.isPublicDemoSurface,
        surfaceProfile.isLocalTruthSurface,
        user?.active_company_name,
        websiteEntryContext,
    ]);

    const handleShellNextMove = useCallback(() => {
        switch (shellContext.nextTarget.kind) {
            case 'folder':
                if (shellContext.nextTarget.id) {
                    navigateToFolder(shellContext.nextTarget.id);
                }
                return;
            case 'space':
                if (shellContext.nextTarget.id) {
                    navigateToSpace(shellContext.nextTarget.id);
                }
                return;
            case 'department':
                if (shellContext.nextTarget.id) {
                    navigateToDepartment(shellContext.nextTarget.id);
                }
                return;
            case 'settings':
                handleDockClick('settings');
                return;
            case 'company':
            default:
                handleOpenContext();
        }
    }, [
        handleDockClick,
        handleOpenContext,
        navigateToDepartment,
        navigateToFolder,
        navigateToSpace,
        shellContext.nextTarget,
    ]);

    const controlCenterNextMove = useMemo(() => {
        if (shellContext.nextTarget.kind === 'company') {
            return {
                label: 'Organisation öffnen',
                hint: 'Direkt in Dateien und Strukturen dieser Organisation springen.',
            };
        }

        return {
            label: shellContext.nextMoveLabel,
            hint: shellContext.nextMoveHint,
        };
    }, [shellContext.nextMoveHint, shellContext.nextMoveLabel, shellContext.nextTarget.kind]);

    const openCommandDeck = useCallback((pin = false) => {
        setIsCommandDeckOpen(true);
        if (pin) {
            setIsCommandDeckPinned(true);
        }
    }, []);

    const closeCommandDeck = useCallback(() => {
        setIsCommandDeckOpen(false);
        setIsCommandDeckPinned(false);
    }, []);

    const toggleCommandDeck = useCallback(() => {
        if (isCommandDeckOpen) {
            closeCommandDeck();
            return;
        }
        openCommandDeck();
    }, [closeCommandDeck, isCommandDeckOpen, openCommandDeck]);

    const toggleCommandDeckPinned = useCallback(() => {
        setIsCommandDeckOpen(true);
        setIsCommandDeckPinned((current) => !current);
    }, []);

    const commandDeckActions = useMemo<DockCommandDeckAction[]>(() => {
        const closeAfter = (callback: () => void) => () => {
            callback();
            if (!isCommandDeckPinned) {
                closeCommandDeck();
            }
        };

        if (activeFolder && activeSpace) {
            return [
                {
                    id: 'folder-open',
                    label: 'Finder öffnen',
                    description: 'Bleib im aktiven Folder und zieh Dateien direkt weiter.',
                    icon: FolderOpen,
                    onClick: closeAfter(handleOpenContext),
                },
                {
                    id: 'folder-next',
                    label: controlCenterNextMove.label,
                    description: controlCenterNextMove.hint,
                    icon: Sparkles,
                    onClick: closeAfter(handleShellNextMove),
                },
                {
                    id: 'folder-chat',
                    label: 'Mora im Ordner',
                    description: 'Sprich mit Mora direkt aus diesem Ordner heraus.',
                    icon: MessageCircle,
                    onClick: closeAfter(() => handleDockClick('chat')),
                },
                {
                    id: 'folder-mora-center',
                    label: 'Mora Center',
                    description: 'Erinnerungen, Signale und Kontext dieses Fokusbereichs öffnen.',
                    icon: Brain,
                    onClick: closeAfter(() => openMoraCenter(openPane, 'overview')),
                },
                {
                    id: 'folder-notes',
                    label: 'Notiz erfassen',
                    description: 'Lege schnell Review- oder Arbeitsnotizen daneben an.',
                    icon: FileText,
                    onClick: closeAfter(() => handleDockClick('notes')),
                },
            ];
        }

        if (activeSpace) {
            return [
                {
                    id: 'space-open',
                    label: 'Im Finder öffnen',
                    description: 'Gehe direkt in den Finder mit diesem Bereich als Root.',
                    icon: FolderOpen,
                    onClick: closeAfter(handleOpenContext),
                },
                {
                    id: 'space-focus',
                    label: controlCenterNextMove.label,
                    description: controlCenterNextMove.hint,
                    icon: Sparkles,
                    onClick: closeAfter(handleShellNextMove),
                },
                {
                    id: 'space-chat',
                    label: 'Mora im Bereich',
                    description: 'Oeffne Mora und bleib in diesem Bereich als Arbeitskontext.',
                    icon: MessageCircle,
                    onClick: closeAfter(() => handleDockClick('chat')),
                },
                {
                    id: 'space-mora-center',
                    label: 'Mora Center',
                    description: 'Erinnerungen, Signale und Laufzeit dieses Bereichs öffnen.',
                    icon: Brain,
                    onClick: closeAfter(() => openMoraCenter(openPane, 'overview')),
                },
                {
                    id: 'space-settings',
                    label: 'Shell anpassen',
                    description: 'Passe Dock, Audio oder Szene direkt an.',
                    icon: Settings,
                    onClick: closeAfter(() => handleDockClick('settings')),
                },
            ];
        }

        if (activeDepartment) {
            return [
                {
                    id: 'department-open',
                    label: 'Im Finder öffnen',
                    description: 'Oeffne die Abteilungsstruktur direkt im Finder.',
                    icon: FolderOpen,
                    onClick: closeAfter(handleOpenContext),
                },
                {
                    id: 'department-zoom',
                    label: controlCenterNextMove.label,
                    description: controlCenterNextMove.hint,
                    icon: Sparkles,
                    onClick: closeAfter(handleShellNextMove),
                },
                {
                    id: 'department-team',
                    label: 'Teamflaeche',
                    description: 'Wechsle direkt zur Team-Oberfläche für diesen Bereich.',
                    icon: Users,
                    onClick: closeAfter(() => handleDockClick('team')),
                },
                {
                    id: 'department-mora-center',
                    label: 'Mora Center',
                    description: 'Erinnerungen und Live-Signale der Abteilung gebuendelt ansehen.',
                    icon: Brain,
                    onClick: closeAfter(() => openMoraCenter(openPane, 'overview')),
                },
                {
                    id: 'department-chat',
                    label: 'Mora für die Abteilung',
                    description: 'Starte Mora mit Abteilungsfokus statt globalem Kontext.',
                    icon: MessageCircle,
                    onClick: closeAfter(() => handleDockClick('chat')),
                },
            ];
        }

        return [
            {
                id: 'universe-home',
                label: 'Home',
                description: 'Zurück auf die zentrale Core-Oberfläche.',
                icon: Home,
                onClick: closeAfter(() => handleDockClick('home')),
            },
                {
                    id: 'universe-finder',
                    label: 'Finder öffnen',
                    description: 'Direkt in Dateien und Strukturen einsteigen.',
                    icon: FolderOpen,
                    onClick: closeAfter(handleOpenContext),
                },
            {
                id: 'universe-chat',
                label: 'Mora',
                description: 'Direkt in den Dialog springen.',
                icon: MessageCircle,
                onClick: closeAfter(() => handleDockClick('chat')),
            },
            {
                id: 'universe-mora-center',
                label: 'Mora Center',
                description: 'Erinnerungen, Signale und Kontext des Beispielsystems öffnen.',
                icon: Brain,
                onClick: closeAfter(() => openMoraCenter(openPane, 'overview')),
            },
            {
                id: 'universe-settings',
                label: 'Einstellungen',
                description: 'Audio, Scenes und Shell feinjustieren.',
                icon: Settings,
                onClick: closeAfter(() => handleDockClick('settings')),
            },
        ];
    }, [
        activeDepartment,
        activeFolder,
        activeSpace,
        closeCommandDeck,
        controlCenterNextMove.hint,
        controlCenterNextMove.label,
        handleDockClick,
        handleOpenContext,
        handleShellNextMove,
        isCommandDeckPinned,
        openPane,
    ]);

    useEffect(() => {
        let cancelled = false;

        const loadTracks = async () => {
            try {
                const tracks = await listAmbientAudioTracks();
                if (!cancelled) {
                    setAmbientTracks(tracks);
                }
            } catch (error) {
                console.error('[Dock] Failed to load ambient tracks:', error);
            }
        };

        loadTracks();
        window.addEventListener(AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT, loadTracks);
        return () => {
            cancelled = true;
            window.removeEventListener(AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT, loadTracks);
        };
    }, []);

    useEffect(() => {
        if (!isCommandDeckOpen) return undefined;

        const handlePointerDown = (event: MouseEvent) => {
            if (!(event.target instanceof Element)) return;
            if (event.target.closest('[data-dock-command-center="true"]')) return;
            closeCommandDeck();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeCommandDeck();
            }
        };

        window.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isCommandDeckOpen, closeCommandDeck]);

    useEffect(() => {
        const handleCommandDeckRequest = (event: Event) => {
            const detail = (event as CustomEvent<{ pinned?: boolean }>).detail;
            openCommandDeck(!!detail?.pinned);
        };

        window.addEventListener(SAIMOR_COMMAND_DECK_EVENT, handleCommandDeckRequest as EventListener);
        return () => window.removeEventListener(SAIMOR_COMMAND_DECK_EVENT, handleCommandDeckRequest as EventListener);
    }, [openCommandDeck]);

    useEffect(() => {
        publishCommandDeckState({ open: isCommandDeckOpen, pinned: isCommandDeckPinned });
    }, [isCommandDeckOpen, isCommandDeckPinned]);

    const openAudioSettings = useCallback(() => {
        openPane({ id: 'settings-main', type: 'settings', title: 'Einstellungen', size: { width: 720, height: 640 } });
    }, [openPane]);

    const handleAmbientToggle = useCallback(() => {
        if (!ambientAudio.trackId) {
            const firstTrack = ambientTracks[0];
            if (!firstTrack) {
                persistAmbientAudioSettings(updateUserSettings, {
                    ambientAudioEnabled: !ambientAudio.enabled,
                });
                return;
            }

            persistAmbientAudioSettings(updateUserSettings, {
                ambientAudioTrackId: firstTrack.id,
                ambientAudioEnabled: true,
            });
            return;
        }

        persistAmbientAudioSettings(updateUserSettings, {
            ambientAudioEnabled: !ambientAudio.enabled,
        });
    }, [ambientAudio.enabled, ambientAudio.trackId, ambientTracks, updateUserSettings]);

    const handleAmbientNext = useCallback(() => {
        if (ambientTracks.length === 0) {
            openAudioSettings();
            return;
        }

        const currentIndex = ambientTracks.findIndex((track) => track.id === ambientAudio.trackId);
        const nextTrack = ambientTracks[(currentIndex + 1 + ambientTracks.length) % ambientTracks.length];

        persistAmbientAudioSettings(updateUserSettings, {
            ambientAudioTrackId: nextTrack.id,
            ambientAudioEnabled: true,
        });
    }, [ambientAudio.trackId, ambientTracks, openAudioSettings, updateUserSettings]);

    const handleCycleRitualScene = useCallback(() => {
        const currentSceneId = ritualSettings.autoTime ? ritualSceneId : ritualSettings.sceneId;
        const nextSceneId = cycleRitualScene(currentSceneId);

        persistRitualSettings(updateUserSettings, {
            ritualSceneId: nextSceneId,
            ritualAutoTime: false,
        });
    }, [ritualSceneId, ritualSettings.autoTime, ritualSettings.sceneId, updateUserSettings]);

    const handleToggleRitualAuto = useCallback(() => {
        persistRitualSettings(updateUserSettings, {
            ritualAutoTime: !ritualSettings.autoTime,
        });
    }, [ritualSettings.autoTime, updateUserSettings]);

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[740] flex flex-col items-center pointer-events-none">
            <RunningWindowsBar
                panes={runningPanes}
                activePaneId={activePaneId}
                isStandardMode={isStandardMode}
                onActivate={handleTaskbarActivate}
                onClose={removePane}
            />

            {/* MAIN DOCK BAR */}
            <div className="relative w-full max-w-[1480px] mx-auto pointer-events-auto">
                {!isStandardMode && (
                    <>
                        <div className="pointer-events-none absolute inset-x-[7%] bottom-[-14px] h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />
                        <div className="pointer-events-none absolute inset-x-[15%] bottom-[-26px] h-16 rounded-full bg-cyan-300/[0.055] blur-[34px]" />
                    </>
                )}
                <AnimatePresence>
                    {isCommandDeckOpen && (
                        <div
                            data-dock-command-center="true"
                            className="mb-3 flex justify-center px-3 pointer-events-none"
                        >
                            <div className="pointer-events-auto">
                                <DockCommandDeck
                                    isStandardMode={isStandardMode}
                                    isPinned={isCommandDeckPinned}
                                    orbStateLabel={orbStateLabel}
                                    scopeLabel={scopeLabel}
                                    workspaceName={displayCompany?.name || user?.active_company_name || surfaceProfile.fallbackCompanyName}
                                    contextLabel={shellContext.contextLabel}
                                    contextTitle={shellContext.title}
                                    contextSubtitle={shellContext.subtitle}
                                    contextDescription={shellContext.description}
                                    contextSignalA={shellContext.signalA}
                                    contextSignalB={shellContext.signalB}
                                    contextAccent={contextDeck.accent || shellContext.accent}
                                    contextActionLabel={contextDeck.actionLabel}
                                    nextMoveLabel={controlCenterNextMove.label}
                                    nextMoveHint={controlCenterNextMove.hint}
                                    sceneId={ritualSceneId}
                                    sceneLabel={ritualScene.label}
                                    sceneDescription={ritualScene.description}
                                    autoSceneEnabled={ritualSettings.autoTime}
                                    onOpenContext={handleOpenContext}
                                    onNextMove={handleShellNextMove}
                                    onTogglePinned={toggleCommandDeckPinned}
                                    onToggleAutoScene={handleToggleRitualAuto}
                                    onCycleScene={handleCycleRitualScene}
                                    trackName={activeTrack?.name || null}
                                    trackCount={ambientTracks.length}
                                    isPlaying={ambientAudio.enabled}
                                    onToggleAudio={handleAmbientToggle}
                                    onNextTrack={handleAmbientNext}
                                    onOpenAudio={openAudioSettings}
                                    actions={commandDeckActions}
                                />
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                            <div
                                data-testid="dock"
                                className={`relative flex flex-nowrap items-center justify-center gap-3 overflow-visible px-4 py-2 mx-auto w-fit rounded-full transition-all ${
                                    isStandardMode
                                        ? 'bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.06)]'
                                        : 'backdrop-blur-3xl'
                                }`}
                                style={isStandardMode ? {} : {
                                    background: 'linear-gradient(180deg, rgba(12, 26, 34, 0.55) 0%, rgba(10, 13, 28, 0.45) 54%, rgba(2, 7, 10, 0.6) 100%)',
                                    border: '1px solid rgba(125, 224, 255, 0.16)',
                                    boxShadow: `0 24px 80px rgba(0, 0, 0, 0.65), 0 0 60px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(34,211,238,0.08)`,
                                    willChange: 'transform',
                                }}
                            >
                                {!isStandardMode && (
                                    <>
                                        <div
                                            className="pointer-events-none absolute inset-[1px] rounded-full opacity-40 animate-[pulse_6s_infinite]"
                                            style={{
                                                background: 'linear-gradient(90deg, rgba(125,224,255,0.04) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                                                backgroundSize: '32px 32px',
                                            }}
                                        />
                                        <div
                                            className="absolute inset-x-8 top-0 h-[1.5px] rounded-full pointer-events-none"
                                            style={{ background: `linear-gradient(90deg, transparent 10%, rgba(34,211,238,0.7), ${accent}60, transparent 90%)` }}
                                        />
                                    </>
                                )}

                                {/* LEFT: Search, Control Center, Audio */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <CapsuleDockIcon
                                        icon={Search}
                                        label="Suche"
                                        description="Saimôr OS durchsuchen"
                                        shortcut={`${mod}+K`}
                                        active={searchPopupOpen}
                                        onClick={() => setSearchPopupOpen(true)}
                                        isStandardMode={isStandardMode}
                                    />

                                    <CapsuleDockIcon
                                        icon={Sparkles}
                                        label="Control Center"
                                        description={controlCenterNextMove.label}
                                        active={isCommandDeckOpen}
                                        onClick={toggleCommandDeck}
                                        isStandardMode={isStandardMode}
                                    />

                                    <CapsuleDockIcon
                                        icon={Music2}
                                        label={activeTrack?.name || 'Mora Ambient'}
                                        description={`${ambientAudio.enabled ? 'Spielt' : 'Pausiert'} · ${ambientTracks.length} Tracks (Rechtsklick: Nächster | Doppelkick: Settings)`}
                                        active={ambientAudio.enabled}
                                        onClick={handleAmbientToggle}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            handleAmbientNext();
                                        }}
                                        onDoubleClick={openAudioSettings}
                                        isStandardMode={isStandardMode}
                                    >
                                        {ambientAudio.enabled && (
                                            <div className="absolute right-1.5 bottom-1.5 flex items-end gap-[1.5px] pointer-events-none">
                                                {[6, 12, 8].map((h, i) => (
                                                    <motion.span
                                                        key={i}
                                                        className="w-[1.5px] bg-emerald-400 rounded-full"
                                                        animate={{ height: [h * 0.3, h, h * 0.3] }}
                                                        transition={{
                                                            duration: 0.6 + i * 0.15,
                                                            repeat: Infinity,
                                                            ease: 'easeInOut',
                                                        }}
                                                        style={{ height: h }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </CapsuleDockIcon>
                                </div>

                                {/* Divider */}
                                <div className={`h-8 w-px ${isStandardMode ? 'bg-gray-200' : 'bg-gradient-to-b from-transparent via-white/12 to-transparent'}`} />

                                {/* CENTER: App Icons */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {dockItems.map((item) => (
                                        <MagneticDockIconMemo
                                            key={item.action}
                                            item={item}
                                            isStandardMode={isStandardMode}
                                            onAction={handleDockClick}
                                        />
                                    ))}
                                </div>

                                {/* Divider */}
                                <div className={`h-8 w-px ${isStandardMode ? 'bg-gray-200' : 'bg-gradient-to-b from-transparent via-white/12 to-transparent'}`} />

                                {/* RIGHT: Status, Company Badge, Mora Orb */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {!websiteEntryContext && (
                                        <div className="flex items-center gap-1 shrink-0">
                                            <FocusModeWidget />
                                            <NotificationCenter />
                                            {activePlanId && (
                                                <SessionChip
                                                    planId={activePlanId}
                                                    openPane={openPane}
                                                    isStandardMode={isStandardMode}
                                                />
                                            )}
                                        </div>
                                    )}

                                    {!websiteEntryContext && (
                                        <div className="relative shrink-0">
                                            <CapsuleDockIcon
                                                icon={Building2}
                                                label={displayCompany?.name || surfaceProfile.fallbackCompanyName}
                                                description={`${companyContextLabel} · Klicken zum Wechseln`}
                                                active={showCompanySwitcher}
                                                onClick={() => {
                                                    if (surfaceProfile.companySwitcherEnabled) {
                                                        setShowCompanySwitcher(!showCompanySwitcher);
                                                    }
                                                }}
                                                isStandardMode={isStandardMode}
                                            />

                                            <AnimatePresence>
                                                {showCompanySwitcher && switcherCompanies.length > 1 && surfaceProfile.companySwitcherEnabled && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 10 }}
                                                        className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 w-56 bg-black/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-[9999]"
                                                    >
                                                        <div className="p-2.5 border-b border-white/5">
                                                            <span className="text-[10px] text-white/30 uppercase tracking-wider px-2 block">
                                                                Organisation wechseln
                                                            </span>
                                                        </div>
                                                        <div className="p-1">
                                                            {switcherCompanies.map(company => (
                                                                <button
                                                                    key={company.id}
                                                                    onClick={() => {
                                                                        setActiveCompany(company.id);
                                                                        setShowCompanySwitcher(false);
                                                                    }}
                                                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all ${
                                                                        company.id === activeCompanyId
                                                                            ? 'bg-emerald-500/20 text-emerald-300'
                                                                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                                                                    }`}
                                                                >
                                                                    <Building2 size={14} className={company.id === activeCompanyId ? 'text-emerald-400' : 'text-white/40'} />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-xs font-medium truncate">{company.name}</div>
                                                                        {company.is_demo && (
                                                                            <div className="text-[9px] text-amber-400/60">Demo</div>
                                                                        )}
                                                                    </div>
                                                                    {company.id === activeCompanyId && (
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}

                                    <div className="flex items-center shrink-0" data-mora-orb>
                                        <motion.div
                                            animate={{ scale: [1, 1.02, 1] }}
                                            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                                            style={{ transformOrigin: 'center' }}
                                        >
                                            <button
                                                onClick={() => handleDockClick('chat')}
                                                data-mora-home="true"
                                                className={`relative h-12 w-12 rounded-full overflow-visible transition-all duration-300 hover:scale-105 active:scale-95 group ${
                                                    isStandardMode ? 'bg-white shadow-lg' : 'bg-transparent'
                                                }`}
                                                title="Mora öffnen"
                                                style={!isStandardMode ? { filter: `drop-shadow(0 0 25px ${accent}45)` } : {}}
                                            >
                                                {!isStandardMode && (
                                                    <>
                                                        <div
                                                            className="absolute inset-[-8px] rounded-full pointer-events-none"
                                                            style={{
                                                                background: `radial-gradient(circle at 35% 30%, ${accent}40 0%, transparent 64%)`,
                                                                filter: 'blur(16px)',
                                                            }}
                                                        />
                                                        <div className="absolute inset-[-4px] rounded-full border border-emerald-400/30 dock-ring-pulse pointer-events-none" />
                                                        <div className="absolute inset-[2px] rounded-full border border-white/15 pointer-events-none" />
                                                    </>
                                                )}
                                                <div className={`absolute inset-0 rounded-full border-2 ${isStandardMode ? 'border-[#0078D4]/40' : 'border-emerald-400/40'}`} />
                                                {!isStandardMode && (
                                                    <div
                                                        className="absolute inset-[4px] rounded-full pointer-events-none"
                                                        style={{
                                                            background: 'radial-gradient(120% 100% at 30% 20%, rgba(255,255,255,0.2) 0%, transparent 24%), radial-gradient(90% 90% at 70% 78%, rgba(0,0,0,0.3) 0%, transparent 35%)',
                                                        }}
                                                    />
                                                )}
                                                <PlasmaOrb
                                                    color={viewMode === 'demo' ? '#6D28D9' : '#7C3AED'}
                                                    state={orbState as any}
                                                    size={48}
                                                />
                                            </button>
                                        </motion.div>
                                    </div>
                                </div>
                </div>
            </div>

            {/* SEARCH POPUP */}
            <SearchPopup
                isOpen={searchPopupOpen}
                onClose={() => setSearchPopupOpen(false)}
                searchQuery={chatInput}
                onQueryChange={setChatInput}
                onMoraChat={() => { }}
            />
        </div>
    );
};
