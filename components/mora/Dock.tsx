"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, Search, Settings, Folder, LayoutGrid, Minus, Users, Mail, Calendar, Terminal, MessageCircle, FileText, Sparkles, Command, User, Building2, ChevronUp, Brain, Bell
} from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { SearchPopup } from './SearchPopup';
import { useMemory } from '@/lib/hooks/useMemory';
import { NotificationCenter, useNotificationStore } from '@/components/os/NotificationCenter';
import { FocusModeWidget, useFocusModeShortcut } from '@/components/os/FocusMode';

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

export const Dock = () => {
    const {
        setViewLevel, setActiveDepartment, orbState, user, companies, activeCompanyId, setActiveCompany, viewMode, isStandardMode
    } = useMoraStore();

    const { panes, restorePane, openPane } = usePaneStore();
    const minimizedPanes = panes.filter(p => p.minimized);
    const { pendingCount } = useMemory();
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
            case 'mora-hub': openPane({ id: 'mora-hub', type: 'mora-hub', title: 'Mora Nexus', size: { width: 560, height: 720 } }); break;
            case 'memory': openPane({ id: 'mora-hub', type: 'mora-hub', title: 'Mora Nexus', size: { width: 560, height: 720 }, data: { activeSection: 'memory' } }); break;
            case 'notes': openPane({ id: 'notes-main', type: 'notes', title: 'Notizen', size: { width: 720, height: 560 } }); break;
            case 'chat': openPane({ id: 'chat-main', type: 'chat', title: 'Chat mit Mora', size: { width: 480, height: 640 } }); break;
            default: break;
        }
    };

    // Core apps - German labels
    const dockItems: DockItem[] = [
        { icon: Home, label: 'Start', shortcut: '⌘H', action: 'home', description: 'Zurück zur Übersicht' },
        { icon: Sparkles, label: 'Mora', shortcut: '⌘.', action: 'mora-hub', description: 'KI-Assistent', badge: pendingCount > 0 ? pendingCount : undefined },
        { icon: MessageCircle, label: 'Chat', shortcut: '⌘⏎', action: 'chat', description: 'Mit Mora sprechen' },
        { icon: Brain, label: 'Gedächtnis', shortcut: '⌘M', action: 'memory', description: 'Mora lernt', hidden: pendingCount === 0 },
        { icon: Folder, label: 'Dateien', shortcut: '⌘F', action: 'finder', description: 'Dokumente & Ordner' },
        { icon: Users, label: 'Team', shortcut: '⌘T', action: 'team', description: 'Teammitglieder' },
        { icon: FileText, label: 'Notizen', shortcut: '⌘N', action: 'notes', description: 'Schnelle Notizen' },
        { icon: Mail, label: 'Mail', shortcut: null, action: 'mail', description: 'Bald verfügbar', disabled: true },
        { icon: Calendar, label: 'Kalender', shortcut: null, action: 'calendar', description: 'Bald verfügbar', disabled: true },
        { icon: Terminal, label: 'Terminal', shortcut: '⌘`', action: 'terminal', description: 'Entwickler-Konsole' },
        { icon: Settings, label: 'System', shortcut: '⌘,', action: 'settings', description: 'Einstellungen' }
    ];

    const minimizedIconMap: Record<string, React.ComponentType<any>> = {
        finder: Folder,
        chat: MessageCircle,
        team: Users,
        mail: Mail,
        calendar: Calendar,
        terminal: Terminal,
        search: Search,
        notes: FileText,
        settings: Settings,
        apps: LayoutGrid,
        'mora-hub': Sparkles
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
                                    className={`w-12 h-12 flex items-center justify-center transition-all duration-200 shadow-lg ${
                                        isStandardMode
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
                className="w-full max-w-5xl mx-auto mb-4 px-4 pointer-events-auto"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 25, stiffness: 100 }}
            >
                <div
                    className={`relative flex items-center gap-2 px-4 py-2.5 overflow-hidden ${
                        isStandardMode
                            ? 'rounded bg-white border-gray-200'
                            : 'rounded-2xl backdrop-blur-2xl'
                    }`}
                    style={isStandardMode ? {
                        background: '#FFFFFF',
                        border: '1px solid #E1E1E1',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    } : {
                        background: 'linear-gradient(180deg, rgba(10, 20, 15, 0.85) 0%, rgba(5, 10, 8, 0.95) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                        boxShadow: `0 25px 60px rgba(0, 0, 0, 0.8), 0 0 60px ${accent}10, inset 0 1px 0 rgba(255,255,255,0.03)`,
                    }}
                >
                    {/* TOP GLOW LINE - only in transparent mode */}
                    {!isStandardMode && (
                        <motion.div
                            className="absolute inset-x-0 top-0 h-[1px]"
                            style={{ background: `linear-gradient(90deg, transparent, ${accent}60, transparent)` }}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        />
                    )}

                    {/* LEFT: AVATAR */}
                    <div className={`flex items-center gap-3 pr-3 border-r ${isStandardMode ? 'border-gray-200' : 'border-white/10'}`}>
                        <motion.div
                            className={`relative w-10 h-10 flex items-center justify-center cursor-pointer overflow-hidden group ${
                                isStandardMode
                                    ? 'rounded bg-[#0078D4] border border-[#0078D4]'
                                    : 'rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title={user?.name || user?.email || 'Benutzer'}
                        >
                            <span className={`text-sm font-semibold transition-colors ${
                                isStandardMode ? 'text-white' : 'text-emerald-300 group-hover:text-emerald-200'
                            }`}>
                                {userInitials}
                            </span>
                            {/* Online indicator */}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                                isStandardMode ? 'bg-green-500 border-white' : 'bg-emerald-500 border-black/80'
                            }`} />
                        </motion.div>
                        <div className="hidden sm:flex flex-col">
                            <span className={`text-xs font-medium truncate max-w-[100px] ${
                                isStandardMode ? 'text-gray-800' : 'text-white/80'
                            }`}>
                                {user?.name || 'Benutzer'}
                            </span>
                            <span className={`text-[10px] uppercase tracking-wider ${
                                isStandardMode ? 'text-[#0078D4]' : 'text-emerald-400/60'
                            }`}>
                                {viewMode === 'demo' ? 'Demo' : user?.role === 'system_owner' ? 'Owner' : user?.role || 'Mitglied'}
                            </span>
                        </div>
                    </div>

                    {/* CENTER: SEARCH */}
                    <div className="relative flex items-center flex-1 max-w-xs mx-2">
                        <Search size={14} className={`absolute left-3 ${isStandardMode ? 'text-gray-400' : 'text-white/30'}`} />
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
                            placeholder="Suchen... ⌘K"
                            className={`w-full pl-9 pr-3 py-2 text-sm transition-all duration-200 focus:outline-none ${
                                isStandardMode
                                    ? 'bg-gray-100 border border-gray-300 rounded text-gray-800 placeholder:text-gray-400 focus:border-[#0078D4] focus:bg-white'
                                    : 'bg-white/[0.03] border border-white/[0.08] rounded-xl text-white/90 placeholder:text-white/25 focus:border-emerald-500/40 focus:bg-white/[0.06]'
                            }`}
                        />
                    </div>

                    {/* DIVIDER */}
                    <div className="w-[1px] h-8 bg-white/10 mx-1" />

                    {/* CENTER: DOCK APPS */}
                    <div className="flex items-center gap-0.5">
                        {dockItems.filter(item => !item.hidden).map((item, i) => (
                            <motion.button
                                key={i}
                                className={`p-2.5 rounded-xl transition-all duration-200 relative group ${
                                    item.disabled
                                        ? 'text-white/20 cursor-not-allowed'
                                        : item.action === 'memory'
                                        ? 'text-violet-400 hover:text-violet-300 hover:bg-violet-500/10'
                                        : 'text-white/50 hover:text-white hover:bg-white/[0.08]'
                                }`}
                                whileHover={item.disabled ? {} : { y: -4, scale: 1.1 }}
                                whileTap={item.disabled ? {} : { scale: 0.9 }}
                                onClick={() => !item.disabled && handleDockClick(item.action)}
                                disabled={item.disabled}
                            >
                                <item.icon size={20} strokeWidth={1.5} />

                                {/* BADGE for pending items */}
                                {item.badge && item.badge > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-violet-500 text-[9px] text-white font-bold items-center justify-center">
                                            {item.badge > 9 ? '!' : item.badge}
                                        </span>
                                    </span>
                                )}

                                {/* TOOLTIP */}
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50">
                                    <div className="bg-black/95 backdrop-blur-xl rounded-lg border border-white/10 px-3 py-2 min-w-[100px] text-center shadow-2xl">
                                        <div className="text-white text-[11px] font-medium">{item.label}</div>
                                        <div className="text-white/40 text-[9px] mt-0.5">{item.description}</div>
                                        {item.shortcut && (
                                            <kbd className="inline-block mt-1 px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-emerald-400 font-mono">
                                                {item.shortcut}
                                            </kbd>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/95 border-r border-b border-white/10 rotate-45" />
                                </div>

                                {/* ACTIVE DOT */}
                                {!item.disabled && (
                                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400/0 group-hover:bg-emerald-400 transition-colors" />
                                )}
                            </motion.button>
                        ))}
                    </div>

                    {/* DIVIDER */}
                    <div className="w-[1px] h-8 bg-white/10 mx-1" />

                    {/* RIGHT SECTION: Focus Mode + Notifications + Company */}
                    <div className="flex items-center gap-2">
                        {/* Focus Mode Widget */}
                        <FocusModeWidget />

                        {/* Notification Center */}
                        <NotificationCenter />
                    </div>

                    {/* DIVIDER */}
                    <div className="w-[1px] h-8 bg-white/10 mx-1" />

                    {/* RIGHT: COMPANY BADGE */}
                    <div className="relative">
                        <motion.button
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-emerald-500/30 hover:bg-white/[0.06] transition-all group"
                            onClick={() => setShowCompanySwitcher(!showCompanySwitcher)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Building2 size={14} className="text-emerald-400/60" />
                            <span className="text-xs text-white/70 max-w-[120px] truncate hidden sm:block">
                                {activeCompany?.name || 'Workspace'}
                            </span>
                            <ChevronUp
                                size={12}
                                className={`text-white/30 transition-transform ${showCompanySwitcher ? '' : 'rotate-180'}`}
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
                                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
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
                </div>
            </motion.div>

            {/* SEARCH POPUP */}
            <SearchPopup
                isOpen={searchPopupOpen}
                onClose={() => setSearchPopupOpen(false)}
                searchQuery={chatInput}
                onQueryChange={setChatInput}
                onMoraChat={() => {}}
            />
        </div>
    );
};
