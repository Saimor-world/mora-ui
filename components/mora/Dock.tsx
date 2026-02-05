"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, Search, Settings, Folder, LayoutGrid, LogOut, Minus, Users, Mail, Calendar, Terminal, MessageCircle, FileText, Sparkles
} from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { SearchPopup } from './SearchPopup';

/**
 * V10 RESONATING DOCK
 * 
 * Master interaction point updated for the "Breathing Forest" aesthetic.
 * - Steam Deck glassmorphism
 * - Resonance pulse (matches background)
 * - Restored full app ecosystem
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

    const dockItems = [
        { icon: Home, label: 'Core', action: 'home' },
        { icon: Sparkles, label: 'Mora', action: 'mora-hub' },
        { icon: Folder, label: 'Finder', action: 'finder' },
        { icon: LayoutGrid, label: 'Apps', action: 'apps' },
        { icon: Users, label: 'Team', action: 'team' },
        { icon: FileText, label: 'Notes', action: 'notes' },
        { icon: Mail, label: 'Mail', action: 'mail' },
        { icon: Calendar, label: 'Kalender', action: 'calendar' },
        { icon: Terminal, label: 'Terminal', action: 'terminal' },
        { icon: Settings, label: 'Settings', action: 'settings' }
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
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-4">
            <motion.div
                className="px-8 py-4 rounded-[40px] flex items-center gap-2 relative overflow-hidden backdrop-blur-[50px] shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
                style={{
                    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(2, 6, 8, 0.98) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: `0 30px 80px rgba(0, 0, 0, 1.0), 0 0 60px ${accent}20, inset 0 0 20px rgba(255,255,255,0.02)`,
                }}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                layout
                transition={{ type: 'spring', damping: 25, stiffness: 100 }}
            >
                {/* RESONANCE FILAMENT */}
                <motion.div
                    className="absolute inset-x-0 top-0 h-[1.5px] opacity-40"
                    style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
                    animate={{ opacity: [0.2, 0.6, 0.2] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* SEARCH UNIT */}
                <div className="relative flex items-center mr-3 ml-1">
                    <Search size={13} className="absolute left-3.5 text-white/30" />
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
                        placeholder="Search... ⏎"
                        className="w-44 bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-1.5 text-[13px] text-white/90 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30 transition-all"
                    />
                </div>

                <div className="w-[1px] h-6 bg-white/10 mx-2" />

                {/* DOCK APP SYSTEM */}
                {dockItems.map((item, i) => (
                    <motion.button
                        key={i}
                        className="p-3 rounded-2xl hover:bg-white/10 text-white/50 hover:text-white transition-all relative group"
                        whileHover={{ y: -5, scale: 1.15 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDockClick(item.action)}
                    >
                        <item.icon size={19} strokeWidth={1.5} />
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/95 text-[9px] tracking-[0.2em] font-light uppercase px-3 py-2 rounded-lg border border-white/10 backdrop-blur-2xl">
                            {item.label}
                        </div>
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
                                    className="w-11 h-11 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-cyan-300/80 hover:text-cyan-300 backdrop-blur-lg"
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
