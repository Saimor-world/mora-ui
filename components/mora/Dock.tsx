"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, Search, Settings, Folder, LayoutGrid, Minus, Users, Mail, Calendar, Terminal, MessageCircle, FileText, Sparkles, Command
} from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { SearchPopup } from './SearchPopup';

/**
 * V11 PREMIUM DOCK
 *
 * Upgraded dock with:
 * - Larger icons (24px)
 * - Better hover tooltips with keyboard shortcuts
 * - Cleaner app list (removed unused apps)
 * - macOS-style magnification effect
 */
export const Dock = () => {
    const {
        setViewLevel, setActiveDepartment, orbState
    } = useMoraStore();

    const { panes, restorePane, openPane } = usePaneStore();
    const minimizedPanes = panes.filter(p => p.minimized);

    const [chatInput, setChatInput] = useState('');
    const [searchPopupOpen, setSearchPopupOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const getAccentColor = () => {
        switch (orbState) {
            case 'alert': return '#EF4444';
            case 'thinking': return '#3B82F6';
            case 'insight': return '#F59E0B';
            default: return '#06B6D4';
        }
    };

    const accent = getAccentColor();

    const handleDockClick = (action: string) => {
        const defaultSize = { width: 850, height: 600 };
        switch (action) {
            case 'home': setViewLevel('core'); setActiveDepartment(null); break;
            case 'finder': openPane({ id: 'finder-main', type: 'finder', title: 'Finder', size: { width: 1200, height: 780 } }); break;
            case 'apps': openPane({ id: 'apps-main', type: 'apps', title: 'App Library', size: defaultSize }); break;
            case 'team': openPane({ id: 'team-main', type: 'team', title: 'Team', size: defaultSize }); break;
            case 'mail': openPane({ id: 'mail-main', type: 'mail', title: 'Mail', size: defaultSize }); break;
            case 'calendar': openPane({ id: 'calendar-main', type: 'calendar', title: 'Calendar', size: defaultSize }); break;
            case 'terminal': openPane({ id: 'terminal-main', type: 'terminal', title: 'Terminal', size: defaultSize }); break;
            case 'settings': openPane({ id: 'settings-main', type: 'settings', title: 'Settings', size: { width: 720, height: 640 } }); break;
            case 'mora-hub': openPane({ id: 'mora-hub', type: 'mora-hub', title: 'Mora Nexus', size: { width: 680, height: 560 } }); break;
            case 'notes': openPane({ id: 'notes-main', type: 'notes', title: 'Notes', size: { width: 720, height: 560 } }); break;
            default: break;
        }
    };

    // Core apps with keyboard shortcuts
    const dockItems = [
        { icon: Home, label: 'Home', shortcut: '⌘H', action: 'home', description: 'Zur Übersicht' },
        { icon: Sparkles, label: 'Mora Nexus', shortcut: '⌘.', action: 'mora-hub', description: 'AI Hub' },
        { icon: Folder, label: 'Finder', shortcut: '⌘F', action: 'finder', description: 'Dateien & Dokumente' },
        { icon: Users, label: 'Team', shortcut: '⌘T', action: 'team', description: 'Teammitglieder' },
        { icon: FileText, label: 'Notizen', shortcut: '⌘N', action: 'notes', description: 'Notizen & Docs' },
        { icon: Mail, label: 'Mail', shortcut: null, action: 'mail', description: 'E-Mails (Coming Soon)' },
        { icon: Calendar, label: 'Kalender', shortcut: null, action: 'calendar', description: 'Termine (Coming Soon)' },
        { icon: Terminal, label: 'Terminal', shortcut: null, action: 'terminal', description: 'Kommandozeile' },
        { icon: Settings, label: 'Einstellungen', shortcut: '⌘,', action: 'settings', description: 'Systemeinstellungen' }
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

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-4">
            <motion.div
                className="px-6 py-3 rounded-2xl flex items-center gap-1 relative overflow-hidden backdrop-blur-2xl"
                style={{
                    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.7) 0%, rgba(0, 0, 0, 0.8) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: `0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px ${accent}15, inset 0 1px 0 rgba(255,255,255,0.05)`,
                }}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                layout
                transition={{ type: 'spring', damping: 25, stiffness: 100 }}
            >
                {/* TOP GLOW LINE */}
                <motion.div
                    className="absolute inset-x-0 top-0 h-[1px] opacity-60"
                    style={{ background: `linear-gradient(90deg, transparent, ${accent}80, transparent)` }}
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* SEARCH INPUT */}
                <div className="relative flex items-center mr-2">
                    <Search size={14} className="absolute left-3 text-white/40" />
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
                                    title: 'Search',
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
                        placeholder="Search... ⌘K"
                        className="w-36 bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-cyan-500/40 focus:bg-white/10 transition-all duration-200"
                    />
                </div>

                {/* DIVIDER */}
                <div className="w-[1px] h-8 bg-white/10 mx-2" />

                {/* DOCK APPS */}
                {dockItems.map((item, i) => (
                    <motion.button
                        key={i}
                        className="p-3 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all duration-200 relative group"
                        whileHover={{ y: -6, scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDockClick(item.action)}
                    >
                        <item.icon size={22} strokeWidth={1.5} />

                        {/* PREMIUM TOOLTIP */}
                        <div className="absolute -top-20 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                            <div className="bg-black/95 backdrop-blur-xl rounded-xl border border-white/10 px-4 py-2.5 min-w-[120px] text-center shadow-2xl">
                                <div className="text-white text-xs font-medium mb-0.5">{item.label}</div>
                                <div className="text-white/40 text-[10px]">{item.description}</div>
                                {item.shortcut && (
                                    <div className="flex items-center justify-center gap-1 mt-1.5">
                                        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-cyan-400 font-mono">
                                            {item.shortcut}
                                        </kbd>
                                    </div>
                                )}
                            </div>
                            {/* TOOLTIP ARROW */}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/95 border-r border-b border-white/10 rotate-45" />
                        </div>

                        {/* ACTIVE DOT */}
                        <motion.div
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 opacity-0 group-hover:opacity-100"
                            layoutId={`dot-${i}`}
                        />
                    </motion.button>
                ))}
            </motion.div>

            {/* MINIMIZED GRID */}
            <AnimatePresence>
                {(minimizedPanes.length > 0) && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
                        {minimizedPanes.map(pane => {
                            const Icon = minimizedIconMap[pane.type] || Minus;
                            return (
                                <button
                                    key={pane.id}
                                    onClick={() => restorePane(pane.id)}
                                    title={pane.title}
                                    className="w-11 h-11 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-cyan-300/80 hover:text-cyan-300 transition-colors duration-200 backdrop-blur-lg"
                                >
                                    <Icon size={16} />
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            <SearchPopup isOpen={searchPopupOpen} onClose={() => setSearchPopupOpen(false)} searchQuery={chatInput} onQueryChange={setChatInput} onMoraChat={() => { }} />
        </div>
    );
};
