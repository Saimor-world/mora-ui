"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useReducedMotion } from 'framer-motion';
import {
    Search, Minus, Mail, Calendar, Command, User, Building2, ChevronUp, Bell
} from 'lucide-react';
import {
    HomeOrbitIcon,
    MoraBrainIcon,
    ChatOrbitIcon,
    FolderStarIcon,
    TeamNetworkIcon,
    NotesRuneIcon,
    SettingsRingIcon,
    TerminalGlyphIcon,
    MemoryCrystalIcon,
    GridConstellationIcon,
} from '@/components/icons/MoraIcons';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { SearchPopup } from './SearchPopup';
import { useMemory } from '@/lib/hooks/useMemory';
import { usePlatformModifier } from '@/lib/hooks/usePlatformModifier';
import { NotificationCenter, useNotificationStore } from '@/components/os/NotificationCenter';
import { FocusModeWidget, useFocusModeShortcut } from '@/components/os/FocusMode';
import { ActionTray } from '@/components/os/ActionTray';
import { PlasmaOrb } from './PlasmaOrb';
import { UserAvatar } from './UserAvatar';

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
    const prefersReducedMotion = useReducedMotion();

    return (
        <motion.button
            aria-label={item.label}
            className={`w-[54px] h-[54px] flex items-center justify-center rounded-2xl transition-colors relative group ${
                item.disabled
                    ? isStandardMode
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-white/20 cursor-not-allowed'
                    : item.action === 'memory'
                        ? 'text-violet-400 hover:text-violet-300 hover:bg-violet-500/15'
                        : isStandardMode
                            ? 'text-gray-600 hover:text-[#0078D4] hover:bg-gray-100'
                            : 'text-white/60 hover:text-emerald-300 hover:bg-emerald-500/10'
            }`}
            whileHover={item.disabled || prefersReducedMotion ? {} : { scale: 1.08 }}
            whileTap={item.disabled   || prefersReducedMotion ? {} : { scale: 0.92 }}
            onClick={() => !item.disabled && onAction(item.action)}
            disabled={item.disabled}
        >
            <item.icon size={26} strokeWidth={1.5} />

            {/* Badge */}
            {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-violet-500 text-[10px] text-white font-bold items-center justify-center">
                        {item.badge > 9 ? '!' : item.badge}
                    </span>
                </span>
            )}

            {/* Tooltip */}
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[200]">
                <div className={`rounded-lg px-3 py-2 min-w-[120px] text-center shadow-2xl ${
                    isStandardMode
                        ? 'bg-gray-800 border border-gray-700'
                        : 'bg-black/95 backdrop-blur-xl border border-white/10'
                }`}>
                    <div className="text-white text-xs font-medium">{item.label}</div>
                    <div className="text-white/50 text-[10px] mt-0.5">{item.description}</div>
                    {item.shortcut && (
                        <kbd className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono ${
                            isStandardMode ? 'bg-gray-700 text-blue-300' : 'bg-white/10 text-emerald-400'
                        }`}>
                            {item.shortcut}
                        </kbd>
                    )}
                </div>
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${
                    isStandardMode
                        ? 'bg-gray-800 border-r border-b border-gray-700'
                        : 'bg-black/95 border-r border-b border-white/10'
                }`} />
            </div>

            {/* Active dot */}
            {!item.disabled && (
                <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-colors ${
                    isStandardMode
                        ? 'bg-transparent group-hover:bg-[#0078D4]'
                        : 'bg-emerald-400/0 group-hover:bg-emerald-400'
                }`} />
            )}
        </motion.button>
    );
};
// ─── End MagneticDockIcon ─────────────────────────────────────────────────────

export const Dock = () => {
    const {
        setViewLevel, setActiveDepartment, orbState, user, companies, activeCompanyId, setActiveCompany, viewMode, isStandardMode
    } = useMoraStore();

    const { panes, restorePane, openPane } = usePaneStore();
    const minimizedPanes = panes.filter(p => p.minimized);
    const { pendingCount } = useMemory();
    const mod = usePlatformModifier();
    const unreadNotifications = useNotificationStore((s) => s.notifications.filter(n => !n.read).length);

    // Register keyboard shortcut for Focus Mode
    useFocusModeShortcut();

    const [chatInput, setChatInput] = useState('');
    const [searchPopupOpen, setSearchPopupOpen] = useState(false);
    const [showCompanySwitcher, setShowCompanySwitcher] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const activeCompany = companies.find(c => c.id === activeCompanyId);

    const getAccentColor = () => {
        switch (orbState) {
            case 'alert': return '#EF4444';
            case 'thinking': return '#3B82F6';
            case 'insight': return '#F59E0B';
            case 'demo': return '#14B8A6';
            default: return '#10B981';
        }
    };

    const accent = getAccentColor();

    const handleDockClick = (action: string) => {
        const defaultSize = { width: 850, height: 600 };
        switch (action) {
            case 'home': setViewLevel('core'); setActiveDepartment(null); break;
            case 'finder': openPane({ id: 'finder-main', type: 'finder', title: 'Finder', size: { width: 1200, height: 780 } }); break;
            case 'team': openPane({ id: 'team-main', type: 'team', title: 'Team', size: defaultSize }); break;
            case 'mail': openPane({ id: 'mail-main', type: 'mail', title: 'Mail', size: defaultSize }); break;
            case 'calendar': openPane({ id: 'calendar-main', type: 'calendar', title: 'Kalender', size: defaultSize }); break;
            case 'terminal': openPane({ id: 'terminal-main', type: 'terminal', title: 'Terminal', size: defaultSize }); break;
            case 'settings': openPane({ id: 'settings-main', type: 'settings', title: 'Einstellungen', size: { width: 720, height: 640 } }); break;
            case 'mora-hub': openPane({ id: 'mora-hub', type: 'mora-hub', title: 'Mora Nexus', size: { width: 640, height: 540 } }); break;
            case 'memory': openPane({ id: 'mora-hub', type: 'mora-hub', title: 'Mora Nexus', size: { width: 640, height: 540 }, data: { activeSection: 'memory' } }); break;
            case 'notes': openPane({ id: 'notes-main', type: 'notes', title: 'Notizen', size: { width: 720, height: 560 } }); break;
            case 'chat': openPane({ id: 'chat-main', type: 'chat', title: 'Chat mit Mora', size: { width: 520, height: 620 } }); break;
            default: break;
        }
    };

    // Core apps - German labels
    const dockItems: DockItem[] = [
        { icon: HomeOrbitIcon, label: 'Start', shortcut: `${mod}+H`, action: 'home', description: 'Zurueck zur Uebersicht' },
        { icon: MoraBrainIcon, label: 'Mora', shortcut: `${mod}+.`, action: 'mora-hub', description: 'KI-Assistent', badge: pendingCount > 0 ? pendingCount : undefined },
        { icon: ChatOrbitIcon, label: 'Chat', shortcut: `${mod}+J`, action: 'chat', description: 'Mit Mora sprechen' },
        { icon: MemoryCrystalIcon, label: 'Gedaechtnis', shortcut: `${mod}+Shift+M`, action: 'memory', description: 'Mora lernt', hidden: pendingCount === 0 },
        { icon: FolderStarIcon, label: 'Dateien', shortcut: `${mod}+F`, action: 'finder', description: 'Dokumente & Ordner' },
        { icon: TeamNetworkIcon, label: 'Team', shortcut: `${mod}+U`, action: 'team', description: 'Teammitglieder' },
        { icon: NotesRuneIcon, label: 'Notizen', shortcut: `${mod}+N`, action: 'notes', description: 'Schnelle Notizen' },
        { icon: Mail, label: 'Mail', shortcut: null, action: 'mail', description: 'Bald verfuegbar', disabled: true },
        { icon: Calendar, label: 'Kalender', shortcut: null, action: 'calendar', description: 'Bald verfuegbar', disabled: true },
        { icon: TerminalGlyphIcon, label: 'Terminal', shortcut: `${mod}+T`, action: 'terminal', description: 'Entwickler-Konsole' },
        { icon: SettingsRingIcon, label: 'System', shortcut: `${mod}+,`, action: 'settings', description: 'Einstellungen' }
    ];

    const minimizedIconMap: Record<string, React.ComponentType<any>> = {
        finder: FolderStarIcon,
        chat: ChatOrbitIcon,
        team: TeamNetworkIcon,
        mail: Mail,
        calendar: Calendar,
        terminal: TerminalGlyphIcon,
        search: Search,
        notes: NotesRuneIcon,
        settings: SettingsRingIcon,
        apps: GridConstellationIcon,
        'mora-hub': MoraBrainIcon
    };

    // Get user initials
    const userInitials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : user?.email?.slice(0, 2).toUpperCase() || 'U';

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none">
            {/* MINIMIZED PANES - Floating above dock */}
            <AnimatePresence>
                {minimizedPanes.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex gap-2 mb-3 pointer-events-auto"
                    >
                        {minimizedPanes.map(pane => {
                            const Icon = minimizedIconMap[pane.type] || Minus;
                            return (
                                <motion.button
                                    key={pane.id}
                                    onClick={() => restorePane(pane.id)}
                                    title={pane.title}
                                    className={`w-12 h-12 flex items-center justify-center transition-all duration-200 shadow-lg ${isStandardMode
                                            ? 'rounded bg-white border border-gray-200 text-[#0078D4] hover:bg-gray-50 hover:border-[#0078D4]'
                                            : 'rounded-xl bg-black/60 border border-white/10 text-emerald-400/80 hover:text-emerald-300 hover:bg-black/80 hover:border-emerald-500/30 backdrop-blur-xl'
                                        }`}
                                    whileHover={{ y: -4, scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Icon size={18} />
                                </motion.button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN DOCK BAR */}
            <motion.div
                className="w-[calc(100vw-32px)] max-w-none mx-auto mb-4 px-3 pointer-events-auto"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 25, stiffness: 100 }}
            >
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
                            <motion.div
                                className="absolute inset-x-0 top-0 h-[2px] rounded-full"
                                style={{ background: `linear-gradient(90deg, transparent 10%, ${accent}70, transparent 90%)` }}
                                animate={{ opacity: [0.4, 0.8, 0.4] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            />
                            {/* Corner accents */}
                            <div className="absolute top-0 left-6 w-12 h-[2px] bg-gradient-to-r from-emerald-400/60 to-transparent rounded-full" />
                            <div className="absolute top-0 right-6 w-12 h-[2px] bg-gradient-to-l from-emerald-400/60 to-transparent rounded-full" />
                        </>
                    )}

                    {/* LEFT: AVATAR - Premium Design */}
                    <div className={`flex items-center gap-4 pr-4 border-r ${isStandardMode ? 'border-gray-200' : 'border-white/10'}`}>
                        <UserAvatar
                            size={56}
                            role={user?.role}
                            name={user?.name}
                            showAura={true}
                        />
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
                        <kbd className={`absolute right-3 px-2 py-1 rounded-lg text-[10px] font-mono ${isStandardMode ? 'bg-gray-200 text-gray-500' : 'bg-white/10 text-white/40'
                            }`}>
                            {mod}+K
                        </kbd>
                    </div>

                    {/* DIVIDER - Glowing */}
                    <div className={`w-[1px] h-10 mx-2 ${isStandardMode ? 'bg-gray-200' : 'bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent'
                        }`} />

                    {/* CENTER: DOCK APPS — Magnetic Icons */}
                    <div className="flex items-center gap-2">
                        {dockItems.filter(item => !item.hidden).map((item, i) => (
                            <MagneticDockIcon
                                key={i}
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
                    </div>

                    {/* DIVIDER - Glowing */}
                    <div className={`w-[1px] h-10 mx-2 ${isStandardMode ? 'bg-gray-200' : 'bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent'
                        }`} />

                    {/* RIGHT: COMPANY BADGE - Enhanced */}
                    <div className="relative">
                        <motion.button
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all group ${isStandardMode
                                    ? 'bg-gray-100 border border-gray-200 hover:border-[#0078D4]'
                                    : 'bg-white/[0.05] border border-white/[0.1] hover:border-emerald-500/40 hover:bg-white/[0.08]'
                                }`}
                            onClick={() => setShowCompanySwitcher(!showCompanySwitcher)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
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
                        </motion.button>

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
                                        {companies.map(company => (
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
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* DIVIDER - Glowing */}
                    <div className={`w-[1px] h-10 mx-2 ${isStandardMode ? 'bg-gray-200' : 'bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent'
                        }`} />

                    {/* RIGHT: MORA ORB - HERO ELEMENT */}
                    <motion.div
                        className="flex items-center gap-4 pl-2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <motion.button
                            onClick={() => handleDockClick('mora-hub')}
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            className={`relative w-16 h-16 rounded-full overflow-visible transition-all group ${isStandardMode
                                    ? 'bg-white'
                                    : 'bg-transparent'
                                }`}
                            title="Mora Nexus oeffnen"
                            style={!isStandardMode ? {
                                filter: 'drop-shadow(0 0 30px rgba(16, 185, 129, 0.4))'
                            } : {}}
                        >
                            {/* Outer glow ring */}
                            {!isStandardMode && (
                                <motion.div
                                    className="absolute inset-[-4px] rounded-full border-2 border-emerald-400/30"
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        opacity: [0.3, 0.6, 0.3]
                                    }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                />
                            )}
                            {/* Inner border */}
                            <div className={`absolute inset-0 rounded-full border-2 ${isStandardMode ? 'border-[#0078D4]/40' : 'border-emerald-400/50'
                                }`} />
                            <PlasmaOrb
                                color={viewMode === 'demo' ? '#0D9488' : '#10B981'}
                                state={orbState as any}
                                size={60}
                            />
                        </motion.button>
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
                                <motion.div
                                    className={`w-2 h-2 rounded-full ${orbState === 'thinking' ? 'bg-blue-400' :
                                            orbState === 'alert' ? 'bg-red-400' :
                                                'bg-emerald-400'
                                        }`}
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                                <span className="text-[10px] text-white/40">
                                    {orbState === 'thinking' ? 'Denkt...' :
                                        orbState === 'alert' ? 'Warnung' :
                                            'Online'}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

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
