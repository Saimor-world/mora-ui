"use client";

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Minus, Mail, Calendar, Building2, ChevronUp,
    Home, Sparkles, MessageCircle, Brain, FolderOpen, Users, FileText, Terminal, Settings
} from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { useWorkSessionStore } from '@/lib/store/workSessionStore';

// Derived from paneStore — consistent with WorkSessionPane.tsx
type OpenPaneFn = ReturnType<typeof usePaneStore.getState>['openPane'];
import { SearchPopup } from './SearchPopup';
import { useMemoryPendingCount } from '@/lib/hooks/useMemoryPendingCount';
import { usePlatformModifier } from '@/lib/hooks/usePlatformModifier';
import { NotificationCenter } from '@/components/os/NotificationCenter';
import { FocusModeWidget, useFocusModeShortcut } from '@/components/os/FocusMode';
import { ActionTray } from '@/components/os/ActionTray';
import { PlasmaOrb } from './PlasmaOrb';

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
    mail: Mail,
    integrations: Settings,
    calendar: Calendar,
    terminal: Terminal,
    search: Search,
    notes: FileText,
    settings: Settings,
    apps: Sparkles,
    'mora-hub': Brain
};

export const Dock = () => {
    const setViewLevel = useMoraStore((s) => s.setViewLevel);
    const setActiveDepartment = useMoraStore((s) => s.setActiveDepartment);
    const orbState = useMoraStore((s) => s.orbState);
    const user = useMoraStore((s) => s.user);
    const companies = useMoraStore((s) => s.companies);
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const setActiveCompany = useMoraStore((s) => s.setActiveCompany);
    const viewMode = useMoraStore((s) => s.viewMode);
    const isStandardMode = useMoraStore((s) => s.isStandardMode);

    const activePlanId = useWorkSessionStore((s) => s.activePlanId);

    const panes = usePaneStore((s) => s.panes);
    const restorePane = usePaneStore((s) => s.restorePane);
    const openPane = usePaneStore((s) => s.openPane);
    const minimizedPanes = useMemo(() => panes.filter(p => p.minimized), [panes]);
    const pendingCount = useMemoryPendingCount();
    const mod = usePlatformModifier();
    // Register keyboard shortcut for Focus Mode
    useFocusModeShortcut();

    const [chatInput, setChatInput] = useState('');
    const [searchPopupOpen, setSearchPopupOpen] = useState(false);
    const [showCompanySwitcher, setShowCompanySwitcher] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const safeCompanies = useMemo(() => (Array.isArray(companies) ? companies : []), [companies]);

    const activeCompany = useMemo(
        () => safeCompanies.find(c => c.id === activeCompanyId),
        [safeCompanies, activeCompanyId]
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
        const defaultSize = { width: 900, height: 640 };
        switch (action) {
            case 'home': setViewLevel('core'); setActiveDepartment(null); break;
            case 'finder': openPane({ id: 'finder-main', type: 'finder', title: 'Finder', size: { width: 1280, height: 820 } }); break;
            case 'team': openPane({ id: 'team-main', type: 'team', title: 'Team', size: defaultSize }); break;
            case 'mail': openPane({ id: 'mail-main', type: 'mail', title: 'Mail', size: defaultSize }); break;
            case 'integrations': openPane({ id: 'integrations-main', type: 'integrations', title: 'Integrationen', size: { width: 760, height: 620 } }); break;
            case 'calendar': openPane({ id: 'calendar-main', type: 'calendar', title: 'Kalender', size: defaultSize }); break;
            case 'terminal': openPane({ id: 'terminal-main', type: 'terminal', title: 'Terminal', size: defaultSize }); break;
            case 'settings': openPane({ id: 'settings-main', type: 'settings', title: 'Einstellungen', size: { width: 720, height: 640 } }); break;
            case 'mora-hub': openPane({ id: 'mora-hub', type: 'mora-hub', title: 'Mora Nexus', size: { width: 640, height: 540 } }); break;
            case 'memory': openPane({ id: 'mora-hub', type: 'mora-hub', title: 'Mora Nexus', size: { width: 640, height: 540 }, data: { activeSection: 'memory' } }); break;
            case 'notes': openPane({ id: 'notes-main', type: 'notes', title: 'Notizen', size: { width: 720, height: 560 } }); break;
            case 'chat': openPane({ id: 'chat-main', type: 'chat', title: 'Chat mit Mora', size: { width: 860, height: 680 } }); break;
            default: break;
        }
    }, [openPane, setActiveDepartment, setViewLevel]);

    // Core apps - native-style, high-recognition icons
    const dockItems: DockItem[] = useMemo(() => [
        { icon: Home, label: 'Start', shortcut: `${mod}+H`, action: 'home', description: 'Zur Universe-Uebersicht' },
        { icon: Sparkles, label: 'Mora Nexus', shortcut: `${mod}+.`, action: 'mora-hub', description: 'KI-Assistent', badge: pendingCount > 0 ? pendingCount : undefined },
        { icon: MessageCircle, label: 'Chat', shortcut: `${mod}+J`, action: 'chat', description: 'Mit Mora sprechen' },
        { icon: Brain, label: 'Memory', shortcut: `${mod}+Shift+M`, action: 'memory', description: 'Lernspeicher', hidden: pendingCount === 0 },
        { icon: FolderOpen, label: 'Finder', shortcut: `${mod}+F`, action: 'finder', description: 'Dateien & Ordner' },
        { icon: Users, label: 'Team', shortcut: `${mod}+U`, action: 'team', description: 'Teammitglieder' },
        { icon: FileText, label: 'Notizen', shortcut: `${mod}+N`, action: 'notes', description: 'Schnelle Notizen' },
        { icon: Mail, label: 'Mail', shortcut: null, action: 'mail', description: 'Inbox, Commit & Versand' },
        { icon: Calendar, label: 'Kalender', shortcut: null, action: 'calendar', description: 'Termine & Sync-Kontext' },
        { icon: Terminal, label: 'Terminal', shortcut: `${mod}+T`, action: 'terminal', description: 'Entwickler-Konsole' },
        { icon: Settings, label: 'System', shortcut: `${mod}+,`, action: 'settings', description: 'Einstellungen' }
    ], [mod, pendingCount]);

    const visibleDockItems = useMemo(
        () => dockItems.filter(item => !item.hidden),
        [dockItems]
    );

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
                <div
                    className={`relative flex items-center gap-4 px-5 py-4 ${isStandardMode
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

                    {/* LEFT: AVATAR - Premium Design */}
                    <div className={`flex items-center gap-4 pr-4 border-r ${isStandardMode ? 'border-gray-200' : 'border-white/10'}`}>
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
                                {viewMode === 'demo' ? 'Demo Mode' : user?.role === 'system_owner' ? 'System Owner' : user?.role || 'Mitglied'}
                            </span>
                        </div>
                    </div>

                    {/* CENTER: SEARCH - Enhanced */}
                    <div className="relative flex items-center flex-1 max-w-sm mx-4">
                        <Search size={16} className={`absolute left-4 ${isStandardMode ? 'text-gray-400' : 'text-emerald-400/50'}`} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onClick={() => setSearchPopupOpen(true)}
                            onFocus={() => setSearchPopupOpen(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && chatInput.trim()) {
                                    setSearchPopupOpen(false);
                                    openPane({
                                        id: 'search-main',
                                        type: 'search',
                                        title: 'Suche',
                                        size: { width: 720, height: 520 },
                                        data: { query: chatInput.trim() }
                                    });
                                    setChatInput('');
                                    inputRef.current?.blur();
                                }
                                if (e.key === 'Escape') {
                                    setSearchPopupOpen(false);
                                    setChatInput('');
                                    inputRef.current?.blur();
                                }
                            }}
                            placeholder={`Suche im System... ${mod}+K`}
                            className={`w-full pl-11 pr-4 py-3 text-sm transition-all duration-200 focus:outline-none ${isStandardMode
                                ? 'bg-gray-100 border border-gray-300 rounded-lg text-gray-800 placeholder:text-gray-400 focus:border-[#0078D4] focus:bg-white'
                                : 'bg-white/[0.04] border border-white/[0.1] rounded-2xl text-white/90 placeholder:text-white/30 focus:border-emerald-500/50 focus:bg-white/[0.08] focus:shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                                }`}
                        />
                        <kbd className={`pointer-events-none absolute right-3 px-2 py-1 rounded-lg text-[10px] font-mono ${isStandardMode ? 'bg-gray-200 text-gray-500' : 'bg-white/10 text-white/40'
                            }`}>
                            {mod}+K
                        </kbd>
                    </div>

                    {/* DIVIDER - Glowing */}
                    <div className={`w-[1px] h-10 mx-2 ${isStandardMode ? 'bg-gray-200' : 'bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent'
                        }`} />

                    {/* CENTER: DOCK APPS — Magnetic Icons */}
                    <div className="flex items-center gap-2">
                        {visibleDockItems.map((item) => (
                            <MagneticDockIconMemo
                                key={item.action}
                                item={item}
                                isStandardMode={isStandardMode}
                                onAction={handleDockClick}
                            />
                        ))}
                    </div>

                    {/* DIVIDER - Glowing */}
                    <div className={`w-[1px] h-10 mx-2 ${isStandardMode ? 'bg-gray-200' : 'bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent'
                        }`} />

                    {/* RIGHT SECTION: Focus Mode + Notifications + Actions + Company */}
                    <div className="flex items-center gap-2">
                        {/* Focus Mode Widget */}
                        <FocusModeWidget />

                        {/* Action Tray */}
                        <ActionTray />

                        {/* Notification Center */}
                        <NotificationCenter />

                        {/* Session Chip — visible only while a work-session plan is active */}
                        {activePlanId && (
                            <SessionChip
                                planId={activePlanId}
                                openPane={openPane}
                                isStandardMode={isStandardMode}
                            />
                        )}
                    </div>

                    {/* DIVIDER - Glowing */}
                    <div className={`w-[1px] h-10 mx-2 ${isStandardMode ? 'bg-gray-200' : 'bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent'
                        }`} />

                    {/* RIGHT: COMPANY BADGE - Enhanced */}
                    <div className="relative">
                        <button
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all group ${isStandardMode
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
                            <div className="hidden sm:flex flex-col items-start">
                                <span className={`text-xs font-medium max-w-[100px] truncate ${isStandardMode ? 'text-gray-800' : 'text-white/80'
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
                                    <div className="border-t border-white/5 p-2">
                                        <button
                                            onClick={() => {
                                                handleDockClick('integrations');
                                                setShowCompanySwitcher(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-white/70 hover:bg-white/5 hover:text-white"
                                        >
                                            <Settings size={14} className="text-white/40" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium truncate">Integrationen</div>
                                                <div className="text-[9px] text-white/35">Mail, Kalender, externe Verbindungen</div>
                                            </div>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* DIVIDER - Glowing */}
                    <div className={`w-[1px] h-10 mx-2 ${isStandardMode ? 'bg-gray-200' : 'bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent'
                        }`} />

                    {/* RIGHT: MORA ORB - HERO ELEMENT */}
                    <div className="flex items-center gap-4 pl-2">
                        <button
                            onClick={() => handleDockClick('mora-hub')}
                            data-mora-home="true"
                            className={`relative w-16 h-16 rounded-full overflow-visible transition-all duration-300 hover:scale-105 active:scale-95 group ${isStandardMode
                                ? 'bg-white shadow-lg'
                                : 'bg-transparent'
                                }`}
                            title="Mora Nexus oeffnen"
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
                                size={60}
                            />
                        </button>
                        <div className="hidden lg:flex flex-col items-start leading-tight">
                            <span className={`text-sm font-bold tracking-wide ${isStandardMode ? 'text-[#0078D4]' : 'text-emerald-300'
                                }`}>
                                MORA
                            </span>
                            <span className={`text-xs ${isStandardMode ? 'text-gray-500' : 'text-white/60'
                                }`}>
                                {viewMode === 'demo' ? 'Demo aktiv' : 'Bereit'}
                            </span>
                            {/* Status indicator */}
                            <div className="flex items-center gap-1.5 mt-1">
                                <div
                                    className={`w-2 h-2 rounded-full dock-dot-pulse ${orbState === 'thinking' ? 'bg-blue-400' :
                                        orbState === 'alert' ? 'bg-red-400' :
                                            'bg-emerald-400'
                                        }`}
                                />
                                <span className="text-[10px] text-white/40">
                                    {orbState === 'thinking' ? 'Denkt...' :
                                        orbState === 'alert' ? 'Warnung' :
                                            'Online'}
                                </span>
                            </div>
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
