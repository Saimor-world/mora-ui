"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Minus, Building2, ChevronUp,
    Home, MessageCircle, FolderOpen, Users, FileText, Settings, FolderHeart,
    Music2, Pause, Play, SkipForward, Sparkles
} from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { getCoreDockItems } from '@/lib/surface/surfaceRegistry';

// Derived from paneStore — consistent with other pane-opening components
type OpenPaneFn = ReturnType<typeof usePaneStore.getState>['openPane'];
import { SearchPopup } from './SearchPopup';
import { usePlatformModifier } from '@/lib/hooks/usePlatformModifier';
import { NotificationCenter } from '@/components/os/NotificationCenter';
// 1.0 gated — see docs/plans/2026-03-27-surface-hierarchy-1.0.md
// import { FocusModeWidget, useFocusModeShortcut } from '@/components/os/FocusMode';
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

interface DockItem {
    icon: React.ComponentType<any>;
    label: string;
    shortcut: string | null;
    action: string;
    description: string;
    disabled?: boolean;
    badge?: number;
    hidden?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getFreshnessWeight = (value?: string | null) => {
    if (!value) return 0.32;
    const days = (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24);
    return clamp(1 - days / 28, 0.18, 1);
};

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
            className={`w-[54px] h-[54px] flex items-center justify-center rounded-2xl transition-all relative group duration-75 ease-out will-change-transform ${item.disabled
                ? isStandardMode
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-white/20 cursor-not-allowed'
                : item.action === 'memory'
                    ? 'text-violet-400 hover:text-violet-300 hover:bg-violet-500/15 hover:scale-110 active:scale-95'
                    : isStandardMode
                        ? 'text-gray-600 hover:text-[#0078D4] hover:bg-gray-100 hover:scale-110 active:scale-95'
                        : 'text-white/60 hover:text-emerald-300 hover:bg-emerald-500/10 hover:scale-110 active:scale-95'
                }`}
            onClick={() => !item.disabled && onAction(item.action)}
            disabled={item.disabled}
        >
            <item.icon size={26} strokeWidth={1.5} />

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
            title="Aktiven Arbeitsplan oeffnen"
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

const MINIMIZED_ICON_MAP: Record<string, React.ComponentType<any>> = {
    finder: FolderOpen,
    chat: MessageCircle,
    team: Users,
    search: Search,
    notes: FileText,
    settings: Settings,
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
    if (isDeckOpen || trackCount === 0) {
        return null;
    }

    return (
        <div className={`hidden xl:flex max-w-[276px] items-center gap-3 rounded-2xl border px-3 py-2 ${isStandardMode
            ? 'border-gray-200 bg-gray-100'
            : 'border-white/10 bg-white/[0.04]'
            }`}>
            <button
                onClick={onOpen}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${isStandardMode
                    ? 'border-[#0078D4]/15 bg-white text-[#0078D4] hover:border-[#0078D4]/40'
                    : 'border-emerald-400/20 bg-emerald-500/12 text-emerald-200 hover:bg-emerald-500/18'
                    }`}
                title="Audio-Einstellungen oeffnen"
            >
                <Music2 size={16} />
            </button>

            <button onClick={onOpen} className="min-w-0 text-left">
                <div className={`text-[10px] uppercase tracking-[0.2em] ${isStandardMode ? 'text-gray-500' : 'text-white/35'}`}>
                    Audio
                </div>
                <div className={`mt-1 max-w-[118px] truncate text-sm ${isStandardMode ? 'text-gray-800' : 'text-white/82'}`}>
                    {trackName || 'Track auswaehlen'}
                </div>
                <div className={`mt-1 text-[11px] ${isStandardMode ? 'text-gray-500' : 'text-white/40'}`}>
                    {trackCount} lokale Tracks
                </div>
            </button>

            <div className="flex items-end gap-1 px-1">
                {[10, 18, 12, 20, 14].map((height, index) => (
                    <span
                        key={`${height}-${index}`}
                        className={`w-1 rounded-full ${isStandardMode ? 'bg-[#0078D4]/50' : 'bg-gradient-to-t from-emerald-400/35 to-cyan-300/70'} ${isPlaying ? 'animate-pulse' : 'opacity-30'}`}
                        style={{
                            height,
                            animationDelay: `${index * 0.1}s`,
                            animationDuration: `${1 + index * 0.08}s`,
                        }}
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
        className={`hidden xl:flex min-w-[156px] max-w-[176px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${isStandardMode
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
                Search
            </div>
            <div className={`mt-1 truncate text-sm ${isStandardMode ? 'text-gray-800' : 'text-white/84'}`}>
                System suchen
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
            : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.18))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl'
            } ${className}`}
    >
        {children}
    </div>
);

export const Dock = () => {
    const navigateToCore = useMoraStore((s) => s.navigateToCore);
    const navigateToSpace = useMoraStore((s) => s.navigateToSpace);
    const navigateToFolder = useMoraStore((s) => s.navigateToFolder);
    const orbState = useMoraStore((s) => s.orbState);
    const user = useMoraStore((s) => s.user);
    const companies = useMoraStore((s) => s.companies);
    const departments = useMoraStore((s) => s.departments);
    const spacesByDepartment = useMoraStore((s) => s.spacesByDepartment);
    const foldersBySpace = useMoraStore((s) => s.foldersBySpace);
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const activeDepartmentId = useMoraStore((s) => s.activeDepartmentId);
    const activeSpaceId = useMoraStore((s) => s.activeSpaceId);
    const activeFolderId = useMoraStore((s) => s.activeFolderId);
    const setActiveCompany = useMoraStore((s) => s.setActiveCompany);
    const viewMode = useMoraStore((s) => s.viewMode);
    const viewLevel = useMoraStore((s) => s.viewLevel);
    const isStandardMode = useMoraStore((s) => s.isStandardMode);
    const updateUserSettings = useMoraStore((s) => s.updateUserSettings);

    const panes = usePaneStore((s) => s.panes);
    const restorePane = usePaneStore((s) => s.restorePane);
    const openPane = usePaneStore((s) => s.openPane);
    const minimizedPanes = useMemo(() => panes.filter(p => p.minimized), [panes]);
    const mod = usePlatformModifier();

    const [chatInput, setChatInput] = useState('');
    const [searchPopupOpen, setSearchPopupOpen] = useState(false);
    const [showCompanySwitcher, setShowCompanySwitcher] = useState(false);
    const [isCommandDeckOpen, setIsCommandDeckOpen] = useState(false);
    const [isCommandDeckPinned, setIsCommandDeckPinned] = useState(false);
    const [ambientTracks, setAmbientTracks] = useState<AmbientAudioTrackMeta[]>([]);
    const safeCompanies = useMemo(() => (Array.isArray(companies) ? companies : []), [companies]);
    const safeDepartments = useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);
    const ambientAudio = useMemo(() => resolveAmbientAudioSettings(user?.settings), [user?.settings]);
    const ritualSettings = useMemo(() => resolveRitualSettings(user?.settings), [user?.settings]);
    const ritualSceneId = useMemo(() => getEffectiveRitualScene(ritualSettings), [ritualSettings]);
    const ritualScene = RITUAL_SCENES[ritualSceneId];

    const activeCompany = useMemo(
        () => safeCompanies.find(c => c.id === activeCompanyId),
        [safeCompanies, activeCompanyId]
    );
    const activeTrack = useMemo(
        () => ambientTracks.find((track) => track.id === ambientAudio.trackId) ?? null,
        [ambientTracks, ambientAudio.trackId]
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
        () => activeSpaceId ? (foldersBySpace[activeSpaceId] || []) : [],
        [activeSpaceId, foldersBySpace]
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
            default: return '#10B981';
        }
    }, [orbState]);

    const userAccent = useMemo(() => {
        switch (user?.role) {
            case 'owner':
            case 'system_owner':
                return '#D4AF37';
            case 'admin':
                return '#10B981';
            case 'member':
                return '#06B6D4';
            default:
                return '#10B981';
        }
    }, [user?.role]);

    const userInitials = useMemo(() => {
        const raw = (user?.name || 'D').trim();
        const parts = raw.split(/\s+/).filter(Boolean);
        if (parts.length === 0) return 'D';
        return parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'D';
    }, [user?.name]);

    const handleDockClick = useCallback((action: string) => {
        switch (action) {
            // ── Core Work surfaces ──────────────────────────────────────
            case 'home':     navigateToCore(); break;
            case 'chat':     openPane({ id: 'chat-main',     type: 'chat',     title: 'Mora',           size: { width: 860, height: 680 } }); break;
            case 'finder':   openPane({ id: 'finder-main',   type: 'finder',   title: 'Finder',         size: { width: 1280, height: 820 } }); break;
            case 'team':     openPane({ id: 'team-main',     type: 'team',     title: 'Team',           size: { width: 900, height: 640 } }); break;
            case 'notes':    openPane({ id: 'notes-main',    type: 'notes',    title: 'Notizen',        size: { width: 720, height: 560 } }); break;
            case 'settings': openPane({ id: 'settings-main', type: 'settings', title: 'Einstellungen',  size: { width: 720, height: 640 } }); break;
            default: break;
        }
    }, [navigateToCore, openPane]);

    // Icon map: action → lucide icon. Defined here (UI concern) separate from registry (routing concern).
    const DOCK_ICON_MAP: Record<string, React.ComponentType<any>> = useMemo(() => ({
        home:     Home,
        chat:     MessageCircle,
        finder:   FolderOpen,
        team:     Users,
        notes:    FileText,
        settings: Settings,
    }), []);

    // Single source of truth — order, labels, shortcuts come from surfaceRegistry.
    const dockItems: DockItem[] = useMemo(() =>
        getCoreDockItems().map(entry => ({
            icon:        DOCK_ICON_MAP[entry.action] ?? Minus,
            label:       entry.label,
            description: entry.description,
            shortcut:    entry.shortcutSuffix ? `${mod}+${entry.shortcutSuffix}` : null,
            action:      entry.action,
        }))
    , [mod, DOCK_ICON_MAP]);

    const scopeLabel = useMemo(() => {
        if (viewLevel === 'company') return 'Portfolio';
        if (viewLevel === 'department') return 'Department';
        if (viewLevel === 'space') return 'Space';
        if (viewLevel === 'folder') return 'Folder';
        return 'Universe';
    }, [viewLevel]);

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

    const leadingSpace = useMemo(() => {
        if (activeSpaces.length === 0) return null;

        return [...activeSpaces].sort((left, right) => {
            const leftFolders = foldersBySpace[left.id] || [];
            const rightFolders = foldersBySpace[right.id] || [];
            const leftSignal = Math.max(left.folder_count ?? 0, leftFolders.length) + leftFolders.reduce((sum, folder) => sum + (folder.node_count || 0), 0) * 0.35;
            const rightSignal = Math.max(right.folder_count ?? 0, rightFolders.length) + rightFolders.reduce((sum, folder) => sum + (folder.node_count || 0), 0) * 0.35;
            return rightSignal - leftSignal;
        })[0] ?? null;
    }, [activeSpaces, foldersBySpace]);

    const leadingFolder = useMemo(() => {
        if (activeFolders.length === 0) return null;

        return [...activeFolders].sort((left, right) => {
            const leftSignal = (left.node_count || 0) * 0.82 + getFreshnessWeight(left.updated_at || left.created_at) * 5.2;
            const rightSignal = (right.node_count || 0) * 0.82 + getFreshnessWeight(right.updated_at || right.created_at) * 5.2;
            return rightSignal - leftSignal;
        })[0] ?? null;
    }, [activeFolders]);

    const contextDeck = useMemo(() => {
        if (activeFolder && activeSpace) {
            return {
                label: 'Folder focus',
                title: activeFolder.name,
                description: 'Der Dock kennt jetzt deinen aktiven Arbeitsknoten und bietet direkte naechste Schritte fuer Review, Chat und Ruecksprung an.',
                signalA: `${activeFolder.node_count || 0} docs`,
                signalB: `${activeSpace.name} · ${activeFolders.length} folders`,
                actionLabel: 'Open folder',
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
                label: 'Space focus',
                title: activeSpace.name,
                description: 'Das Control Center schlaegt dir jetzt den staerksten Folder und die passendsten naechsten Oberflaechen fuer diesen Space vor.',
                signalA: `${activeFolders.length} folders`,
                signalB: `${docCount} docs`,
                actionLabel: 'Open space',
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
                label: 'Department focus',
                title: activeDepartment.name,
                description: 'Der Dock wird hier zur Leitstelle und zeigt, welcher Space als naechster Zoom Sinn ergibt, statt nur universelle Buttons zu duplizieren.',
                signalA: `${activeSpaces.length} spaces`,
                signalB: `${folderCount} folders · ${docCount} docs`,
                actionLabel: 'Open department',
                accent: activeDepartment.color || accent,
                onOpen: () => openFinderContext(activeDepartment.name, {
                    departmentId: activeDepartment.id,
                    companyId: activeCompanyId || activeDepartment.company_id || undefined,
                }),
            };
        }

        return {
            label: 'Universe',
            title: activeCompany?.name || user?.active_company_name || 'Workspace',
            description: 'Im Universe-Modus bleibt das Control Center breit und ruhig, aber bietet dir jetzt klar den naechsten Einstieg statt statischer App-Kacheln.',
            signalA: `${safeDepartments.length} departments`,
            signalB: `${safeCompanies.length} workspaces`,
            actionLabel: 'Open workspace',
            accent,
            onOpen: () => openFinderContext(activeCompany?.name || 'Workspace', {
                companyId: activeCompanyId || undefined,
            }),
        };
    }, [
        activeCompany,
        activeCompanyId,
        activeDepartment,
        activeDepartmentId,
        activeFolder,
        activeFolders,
        activeSpace,
        activeSpaces,
        accent,
        foldersBySpace,
        openFinderContext,
        safeCompanies.length,
        safeDepartments.length,
        user?.active_company_name,
    ]);

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
                    label: 'Open Finder',
                    description: 'Bleib im aktiven Folder und zieh Dateien direkt weiter.',
                    icon: FolderOpen,
                    onClick: closeAfter(contextDeck.onOpen),
                },
                {
                    id: 'folder-chat',
                    label: 'Chat In Context',
                    description: 'Sprich mit Mora aus genau diesem Folder-Kontext.',
                    icon: MessageCircle,
                    onClick: closeAfter(() => handleDockClick('chat')),
                },
                {
                    id: 'folder-space',
                    label: 'Back To Space',
                    description: 'Spring zur Space-Ebene zurueck, ohne den Fokus zu verlieren.',
                    icon: Home,
                    onClick: closeAfter(() => activeSpaceId && navigateToSpace(activeSpaceId)),
                },
                {
                    id: 'folder-notes',
                    label: 'Capture Note',
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
                    label: 'Open Space',
                    description: 'Gehe direkt in den Finder mit diesem Space als Root.',
                    icon: FolderOpen,
                    onClick: closeAfter(contextDeck.onOpen),
                },
                {
                    id: 'space-focus',
                    label: 'Focus Top Folder',
                    description: 'Nimm den staerksten Folder als naechsten Arbeitsknoten.',
                    icon: Sparkles,
                    onClick: closeAfter(() => leadingFolder && navigateToFolder(leadingFolder.id)),
                },
                {
                    id: 'space-chat',
                    label: 'Space Chat',
                    description: 'Oeffne Mora und bleib in diesem Raum-Kontext.',
                    icon: MessageCircle,
                    onClick: closeAfter(() => handleDockClick('chat')),
                },
                {
                    id: 'space-settings',
                    label: 'Shell Tuning',
                    description: 'Passe Dock, Audio oder Atmosphaere direkt an.',
                    icon: Settings,
                    onClick: closeAfter(() => handleDockClick('settings')),
                },
            ];
        }

        if (activeDepartment) {
            return [
                {
                    id: 'department-open',
                    label: 'Open Department',
                    description: 'Oeffne die Department-Struktur im Finder.',
                    icon: FolderOpen,
                    onClick: closeAfter(contextDeck.onOpen),
                },
                {
                    id: 'department-zoom',
                    label: 'Enter Lead Space',
                    description: 'Zoome in den semantisch staerksten Space dieses Departments.',
                    icon: Sparkles,
                    onClick: closeAfter(() => leadingSpace && navigateToSpace(leadingSpace.id)),
                },
                {
                    id: 'department-team',
                    label: 'Team Surface',
                    description: 'Wechsle direkt zur Team-Oberflaeche fuer diesen Arbeitsbereich.',
                    icon: Users,
                    onClick: closeAfter(() => handleDockClick('team')),
                },
                {
                    id: 'department-chat',
                    label: 'Strategy Chat',
                    description: 'Starte Mora mit Department-Fokus statt globalem Kontext.',
                    icon: MessageCircle,
                    onClick: closeAfter(() => handleDockClick('chat')),
                },
            ];
        }

        return [
            {
                id: 'universe-home',
                label: 'Return Home',
                description: 'Zurueck auf die zentrale Core-Oberflaeche.',
                icon: Home,
                onClick: closeAfter(() => handleDockClick('home')),
            },
            {
                id: 'universe-finder',
                label: 'Open Finder',
                description: 'Direkt in Dateien und Strukturen einsteigen.',
                icon: FolderOpen,
                onClick: closeAfter(contextDeck.onOpen),
            },
            {
                id: 'universe-chat',
                label: 'Mora',
                description: 'Direkt in den Dialog springen.',
                icon: MessageCircle,
                onClick: closeAfter(() => handleDockClick('chat')),
            },
            {
                id: 'universe-settings',
                label: 'Settings',
                description: 'Audio, Scenes und Shell feinjustieren.',
                icon: Settings,
                onClick: closeAfter(() => handleDockClick('settings')),
            },
        ];
    }, [
        activeDepartment,
        activeFolder,
        activeSpace,
        activeSpaceId,
        closeCommandDeck,
        contextDeck,
        handleDockClick,
        isCommandDeckPinned,
        leadingFolder,
        leadingSpace,
        navigateToFolder,
        navigateToSpace,
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
                openAudioSettings();
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
    }, [ambientAudio.enabled, ambientAudio.trackId, ambientTracks, openAudioSettings, updateUserSettings]);

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
        <div className="fixed bottom-0 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none">
            {/* MINIMIZED PANES - Floating above dock */}
            {minimizedPanes.length > 0 && (
                <div className="flex gap-2 mb-3 pointer-events-auto transition-all duration-100 ease-out">
                    {minimizedPanes.map(pane => {
                        const Icon = MINIMIZED_ICON_MAP[pane.type] || Minus;
                        return (
                            <button
                                key={pane.id}
                                onClick={() => restorePane(pane.id)}
                                title={pane.title}
                                className={`w-12 h-12 flex items-center justify-center transition-all duration-75 ease-out active:scale-[0.98] shadow-lg ${isStandardMode
                                    ? 'rounded bg-white border border-gray-200 text-[#0078D4] hover:bg-gray-50 hover:border-[#0078D4]'
                                    : 'rounded-xl bg-black/60 border border-white/10 text-emerald-400/80 hover:text-emerald-300 hover:bg-black/80 hover:border-emerald-500/30 backdrop-blur-xl'
                                    }`}
                            >
                                <Icon size={18} />
                            </button>
                        );
                    })}
                </div>
            )}

            {/* MAIN DOCK BAR */}
            <div className="w-[calc(100vw-32px)] max-w-none mx-auto mb-4 px-3 pointer-events-auto">
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
                                    workspaceName={activeCompany?.name || user?.active_company_name || 'Workspace'}
                                    contextLabel={contextDeck.label}
                                    contextTitle={contextDeck.title}
                                    contextDescription={contextDeck.description}
                                    contextSignalA={contextDeck.signalA}
                                    contextSignalB={contextDeck.signalB}
                                    contextActionLabel={contextDeck.actionLabel}
                                    contextAccent={contextDeck.accent}
                                    sceneLabel={ritualScene.label}
                                    sceneDescription={ritualScene.description}
                                    autoSceneEnabled={ritualSettings.autoTime}
                                    onOpenContext={contextDeck.onOpen}
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
                    className={`relative flex items-center gap-3 overflow-hidden px-4 py-3.5 ${isStandardMode
                        ? 'rounded-xl bg-white border-gray-200'
                        : 'rounded-3xl backdrop-blur-2xl'
                        }`}
                    style={isStandardMode ? {
                        background: '#FFFFFF',
                        border: '1px solid #E1E1E1',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    } : {
                        background: 'linear-gradient(180deg, rgba(10, 25, 18, 0.92) 0%, rgba(5, 12, 10, 0.98) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        boxShadow: `0 -10px 60px rgba(16, 185, 129, 0.15), 0 25px 80px rgba(0, 0, 0, 0.9), 0 0 100px ${accent}15, inset 0 1px 0 rgba(255,255,255,0.05)`,
                    }}
                >
                    {/* TOP GLOW LINE - Premium animated */}
                    {!isStandardMode && (
                        <>
                            <div
                                className="dock-glow-line absolute inset-x-0 top-0 h-[2px] rounded-full"
                                style={{ background: `linear-gradient(90deg, transparent 10%, ${accent}70, transparent 90%)` }}
                            />
                            {/* Corner accents */}
                            <div className="absolute top-0 left-6 w-12 h-[2px] bg-gradient-to-r from-emerald-400/60 to-transparent rounded-full" />
                            <div className="absolute top-0 right-6 w-12 h-[2px] bg-gradient-to-l from-emerald-400/60 to-transparent rounded-full" />
                        </>
                    )}

                    {/* LEFT: IDENTITY POD */}
                    <DockPod className="flex shrink-0 items-center gap-4 px-4 py-3" isStandardMode={isStandardMode}>
                        <div
                            className="relative w-14 h-14 rounded-full shrink-0"
                            title={user?.name || 'Benutzer'}
                            style={!isStandardMode ? { filter: `drop-shadow(0 0 18px ${userAccent}35)` } : {}}
                        >
                            {!isStandardMode && (
                                <div
                                    className="absolute inset-[-3px] rounded-full border"
                                    style={{ borderColor: `${userAccent}55` }}
                                />
                            )}
                            <div
                                className={`absolute inset-0 rounded-full ${isStandardMode ? 'border border-[#0078D4]/30 bg-white' : 'border border-white/10 bg-black/20'}`}
                            />
                            {!isStandardMode && (
                                <>
                                    <div
                                        className="absolute inset-[-6px] rounded-full pointer-events-none"
                                        style={{
                                            background: `radial-gradient(circle at 32% 28%, ${userAccent}35 0%, transparent 58%)`,
                                            filter: 'blur(14px)',
                                        }}
                                    />
                                    <div
                                        className="absolute inset-[1px] rounded-full pointer-events-none"
                                        style={{
                                            border: `1px solid ${userAccent}33`,
                                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -8px 16px rgba(0,0,0,0.22)`,
                                        }}
                                    />
                                </>
                            )}
                            <div className="absolute inset-[3px] rounded-full overflow-hidden">
                                <PlasmaOrb
                                    color={userAccent}
                                    state={orbState as any}
                                    size={50}
                                />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-white/90 text-sm font-semibold tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]">
                                    {userInitials}
                                </span>
                            </div>
                            <div
                                className="absolute right-0 bottom-0 w-3 h-3 rounded-full border border-black/70"
                                style={{
                                    backgroundColor: orbState === 'alert'
                                        ? '#F87171'
                                        : orbState === 'thinking'
                                            ? '#60A5FA'
                                            : '#34D399',
                                    boxShadow: `0 0 8px ${orbState === 'alert'
                                        ? '#F87171'
                                        : orbState === 'thinking'
                                            ? '#60A5FA'
                                            : '#34D399'}`
                                }}
                            />
                        </div>
                        <div className="hidden sm:flex flex-col">
                            <span className={`text-sm font-semibold truncate max-w-[120px] ${isStandardMode ? 'text-gray-800' : 'text-white/90'
                                }`}>
                                {user?.name || 'Benutzer'}
                            </span>
                            <span className={`text-xs uppercase tracking-wider font-medium ${isStandardMode ? 'text-[#0078D4]' : 'text-emerald-400/70'
                                }`}>
                                {viewMode === 'demo' ? 'Demo Mode' : roleLabel(user?.role)}
                            </span>
                        </div>
                        <AdminModeSwitcher />
                        <button
                            onClick={() => openPane({
                                id: 'meine-dateien',
                                type: 'meine-dateien',
                                title: 'Meine Dateien',
                                size: { width: 380, height: 560 },
                            })}
                            title="Meine Dateien"
                            aria-label="Meine Dateien öffnen"
                            className="w-[42px] h-[42px] flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 transition-all duration-200"
                        >
                            <FolderHeart size={18} />
                        </button>
                    </DockPod>

                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <DockPod className="hidden shrink-0 items-center gap-3 px-3 py-2.5 xl:flex" isStandardMode={isStandardMode}>
                            <DockSearchLauncher
                                isStandardMode={isStandardMode}
                                shortcutLabel={`${mod}+K`}
                                isActive={searchPopupOpen}
                                onOpen={() => setSearchPopupOpen(true)}
                            />

                            <div
                                data-dock-command-center="true"
                                className="relative shrink-0"
                            >
                                <button
                                    type="button"
                                    aria-expanded={isCommandDeckOpen}
                                    aria-pressed={isCommandDeckOpen}
                                    title={isCommandDeckOpen ? 'Control Center schliessen' : 'Control Center oeffnen'}
                                    onClick={toggleCommandDeck}
                                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${isStandardMode
                                        ? isCommandDeckOpen
                                            ? 'border-[#0078D4]/35 bg-white text-[#0078D4]'
                                            : 'border-gray-200 bg-gray-100 text-gray-700 hover:border-[#0078D4]/35 hover:text-[#0078D4]'
                                        : isCommandDeckOpen
                                            ? 'border-emerald-400/28 bg-emerald-500/[0.12] text-emerald-200'
                                            : 'border-white/10 bg-white/[0.04] text-white/72 hover:border-emerald-400/22 hover:bg-emerald-500/[0.08] hover:text-emerald-200'
                                        }`}
                                >
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${isStandardMode
                                        ? isCommandDeckOpen
                                            ? 'border-[#0078D4]/22 bg-[#0078D4]/10 text-[#0078D4]'
                                            : 'border-[#0078D4]/15 bg-white text-[#0078D4]'
                                        : isCommandDeckOpen
                                            ? 'border-emerald-400/28 bg-emerald-500/16 text-emerald-100'
                                            : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                                        }`}>
                                        <Sparkles size={15} />
                                    </div>
                                    <div className="min-w-0 text-left">
                                        <div className={`text-[10px] uppercase tracking-[0.2em] ${isStandardMode ? 'text-gray-500' : 'text-white/35'}`}>
                                            Center
                                        </div>
                                        <div className={`mt-1 truncate text-sm ${isStandardMode ? 'text-gray-800' : 'text-white/84'}`}>
                                            {scopeLabel} / {contextDeck.label}
                                        </div>
                                        <div className={`mt-1 text-[11px] ${isStandardMode ? 'text-gray-500' : 'text-white/40'}`}>
                                            {isCommandDeckOpen ? 'Im Dock geoeffnet' : 'Kontext, Szene und Aktionen'}
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </DockPod>

                        <DockPod className="flex min-w-0 flex-1 items-center justify-center gap-3 px-3 py-2.5" isStandardMode={isStandardMode}>
                            <div className="flex min-w-0 items-center gap-1 xl:gap-2">
                                {dockItems.map((item) => (
                                    <MagneticDockIconMemo
                                        key={item.action}
                                        item={item}
                                        isStandardMode={isStandardMode}
                                        onAction={handleDockClick}
                                    />
                                ))}
                            </div>

                            {ambientTracks.length > 0 && !isCommandDeckOpen && (
                                <>
                                    <div className={`hidden xl:block h-10 w-[1px] ${isStandardMode ? 'bg-gray-200' : 'bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent'}`} />
                                    <DockNowPlaying
                                        isStandardMode={isStandardMode}
                                        isDeckOpen={isCommandDeckOpen}
                                        trackName={activeTrack?.name || null}
                                        trackCount={ambientTracks.length}
                                        isPlaying={ambientAudio.enabled}
                                        onToggle={handleAmbientToggle}
                                        onNext={handleAmbientNext}
                                        onOpen={openAudioSettings}
                                    />
                                </>
                            )}
                        </DockPod>

                        <DockPod className="flex shrink-0 items-center gap-3 px-3 py-2.5" isStandardMode={isStandardMode}>
                    {/* RIGHT SECTION: Notifications + Company */}
                    <div className="flex items-center gap-2">
                        {/* Notification Center */}
                        <NotificationCenter />
                    </div>

                    {/* RIGHT: COMPANY BADGE - Enhanced */}
                    <div className="relative">
                        <button
                            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all group ${isStandardMode
                                ? 'bg-gray-100 border border-gray-200 hover:border-[#0078D4]'
                                : 'bg-white/[0.05] border border-white/[0.1] hover:border-emerald-500/40 hover:bg-white/[0.08]'
                                }`}
                            onClick={() => setShowCompanySwitcher(!showCompanySwitcher)}
                            type="button"
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isStandardMode ? 'bg-[#0078D4]/10' : 'bg-emerald-500/20'
                                }`}>
                                <Building2 size={16} className={isStandardMode ? 'text-[#0078D4]' : 'text-emerald-400'} />
                            </div>
                            <div className="hidden xl:flex flex-col items-start">
                                <span className={`text-xs font-medium max-w-[96px] truncate ${isStandardMode ? 'text-gray-800' : 'text-white/80'
                                    }`}>
                                    {activeCompany?.name || 'Workspace'}
                                </span>
                                <span className={`text-[10px] ${isStandardMode ? 'text-gray-500' : 'text-white/40'
                                    }`}>
                                    {companies.length > 1 ? `${companies.length} Workspaces` : 'Workspace'}
                                </span>
                            </div>
                            <ChevronUp
                                size={14}
                                className={`text-white/40 transition-transform ${showCompanySwitcher ? '' : 'rotate-180'}`}
                            />
                        </button>

                        {/* COMPANY SWITCHER POPUP */}
                        <AnimatePresence>
                            {showCompanySwitcher && companies.length > 1 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full mb-2 right-0 w-56 bg-black/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden"
                                >
                                    <div className="p-2 border-b border-white/5">
                                        <span className="text-[10px] text-white/30 uppercase tracking-wider px-2">
                                            Workspace wechseln
                                        </span>
                                    </div>
                                    <div className="p-1">
                                        {safeCompanies.map(company => (
                                            <button
                                                key={company.id}
                                                onClick={() => {
                                                    setActiveCompany(company.id);
                                                    setShowCompanySwitcher(false);
                                                }}
                                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${company.id === activeCompanyId
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
                                    {/* Integrationen — 1.0 gated (future-tier: no backend) */}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* DIVIDER - Glowing */}
                    <div className={`h-10 w-[1px] ${isStandardMode ? 'bg-gray-200' : 'bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent'
                        }`} />

                    {/* RIGHT: MORA ORB - HERO ELEMENT */}
                    <div className="flex items-center gap-3 pl-1">
                        <button
                            onClick={() => handleDockClick('chat')}
                            data-mora-home="true"
                            className={`relative w-14 h-14 rounded-full overflow-visible transition-all duration-300 hover:scale-105 active:scale-95 group ${isStandardMode
                                ? 'bg-white shadow-lg'
                                : 'bg-transparent'
                                }`}
                            title="Mora oeffnen"
                            style={!isStandardMode ? {
                                filter: `drop-shadow(0 0 30px ${accent}40)`
                            } : {}}
                        >
                            {/* Outer glow ring */}
                            {!isStandardMode && (
                                <>
                                    <div className="absolute inset-[-8px] rounded-full pointer-events-none" style={{
                                        background: `radial-gradient(circle at 35% 30%, ${accent}35 0%, transparent 64%)`,
                                        filter: 'blur(20px)'
                                    }} />
                                    <div className="absolute inset-[-4px] rounded-full border-2 border-emerald-400/26 dock-ring-pulse" />
                                    <div className="absolute inset-[2px] rounded-full border border-white/12 pointer-events-none" />
                                </>
                            )}
                            {/* Inner border */}
                            <div className={`absolute inset-0 rounded-full border-2 ${isStandardMode ? 'border-[#0078D4]/40' : 'border-emerald-400/50'
                                }`} />
                            {!isStandardMode && (
                                <div
                                    className="absolute inset-[4px] rounded-full pointer-events-none"
                                    style={{
                                        background: 'radial-gradient(120% 100% at 30% 20%, rgba(255,255,255,0.18) 0%, transparent 24%), radial-gradient(90% 90% at 70% 78%, rgba(0,0,0,0.24) 0%, transparent 35%)'
                                    }}
                                />
                            )}
                            <PlasmaOrb
                                color={viewMode === 'demo' ? '#0D9488' : '#10B981'}
                                state={orbState as any}
                                size={54}
                            />
                        </button>
                        <div className="hidden xl:flex flex-col items-start leading-tight">
                            <span className={`text-sm font-bold tracking-wide ${isStandardMode ? 'text-[#0078D4]' : 'text-emerald-300'
                                }`}>
                                MORA
                            </span>
                            <span className={`text-xs ${isStandardMode ? 'text-gray-500' : 'text-white/60'
                                }`}>
                                {orbState === 'thinking'
                                    ? 'Kontext lesen'
                                    : orbState === 'alert'
                                        ? 'Rueckfrage offen'
                                        : viewMode === 'demo'
                                            ? 'Demo aktiv'
                                            : 'Bereit'}
                            </span>
                            <div className="hidden">
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] ${isStandardMode ? 'border-gray-200 text-gray-500 bg-gray-100' : 'border-white/10 text-white/55 bg-white/[0.04]'}`}>
                                    {orbState === 'thinking'
                                        ? 'Mora liest Kontext'
                                        : orbState === 'alert'
                                            ? 'Mora wartet auf Klaerung'
                                            : 'Mora ist bereit'}
                                </span>
                                {/* activePlanId chip — 1.0 gated with work-session surface */}
                                {/* pendingCount chip — 1.0 gated with MemorySidebar */}
                            </div>
                        </div>
                    </div>
                </DockPod>
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
        </div>
    );
};
