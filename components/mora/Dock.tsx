"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, MessageSquare, Settings, LayoutGrid, FileText, Database, Zap, ChevronUp, X, ToggleLeft, Minus, Moon, LogOut, User, Mail } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { writeCookie } from '@/lib/auth/cookies';
import { useUser } from '@/lib/hooks/useUser';

/**
 * OS-STYLE DOCK - Universe Edition
 *
 * Central navigation hub with OS-like functionality:
 * - App icons with hover effects
 * - Recent items tray
 * - Quick access to key features
 * - Semantic awareness integration
 * - Pane System Integration (Step 1)
 */

interface DockProps {
    onSleep?: () => void;
    onOpenResonance?: () => void;
}

export const Dock = ({ onSleep, onOpenResonance }: DockProps) => {

    const router = useRouter();
    const {
        activeSpaceId,
        activeFolderId,
        orbState,
        viewMode,
        setViewMode,
        setViewLevel,
        setActiveCompany,
        setActiveDepartment,
        setActiveSpace,
        setActiveFolder,
        minimizedNodes,
        restoreNode
    } = useMoraStore();

    // UPGRADE: Pane System Integration
    const {
        panes,
        restorePane,
        addPane,
        focusPane,
        getPane,
        minimizePane
    } = usePaneStore();

    const { user } = useUser();

    // Get minimized panes from store
    const minimizedPanes = panes.filter(p => p.minimized);

    const [showRecent, setShowRecent] = useState(false);
    const [recentItems] = useState([
        { id: '1', type: 'space', name: 'Research Space', icon: Database },
        { id: '2', type: 'folder', name: 'AI Notes', icon: FileText },
        { id: '3', type: 'node', name: 'Semantic Map', icon: Zap }
    ]);

    const dockItems = [
        { icon: Mail, label: 'Inbox', action: 'inbox' },  // PRIMARY: Always get back to mail
        { icon: MessageSquare, label: 'Môra', action: 'chat' },
        { icon: Search, label: 'Search', action: 'search' },
        { icon: LayoutGrid, label: 'Apps', action: 'apps' },
        { icon: Settings, label: 'Settings', action: 'settings' },
        { icon: User, label: 'Switch User', action: 'switch-user' },
        { icon: LogOut, label: 'Logout', action: 'logout' }
    ];

    // Dropdown menu items (in the ChevronUp menu)
    const menuItems = [
        { icon: Moon, label: 'Sleep Mode', action: 'sleep', description: 'Sperrt den Bildschirm' },
        { icon: User, label: 'Switch User', action: 'switch-user', description: 'Benutzer wechseln' },
        { icon: LogOut, label: 'Logout', action: 'logout', description: 'Abmelden' }
    ];

    const handleLogout = () => {
        // Clear all auth tokens and session data
        localStorage.removeItem('saimor_dev_token');
        localStorage.removeItem('saimor_mode');
        localStorage.removeItem('saimor_role');
        localStorage.removeItem('saimor_tenant');
        localStorage.removeItem('last_workspace');
        localStorage.removeItem('last_activity');
        localStorage.removeItem('user_name');
        localStorage.removeItem('mora_session');
        localStorage.removeItem('last_user_name');
        writeCookie('saimor_auth', '', -1);

        // Reset store state
        setViewMode('demo');
        setViewLevel('core');
        setActiveCompany(null);
        setActiveDepartment(null);
        setActiveSpace(null);
        setActiveFolder(null);

        // Navigate to welcome screen
        router.push('/');
    };

    const handleSwitchUser = () => {
        // Clear session but keep some preferences
        localStorage.removeItem('saimor_dev_token');
        writeCookie('saimor_auth', '', -1);

        // Navigate to welcome with fresh state
        router.push('/');
    };

    const handleDockClick = (action: string) => {
        console.log('Dock action:', action);

        // Helper to calculate centered position with viewport clamping
        const getCenteredPosition = (width: number, height: number) => {
            const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
            const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

            // Calculate true center
            let x = Math.floor((windowWidth - width) / 2);
            let y = Math.floor((windowHeight - height) / 2);

            // Apply slight upward bias (account for dock at bottom)
            y = Math.max(40, y - 40); // Shift up by 40px but ensure min 40px from top

            // Clamp to ensure pane stays within viewport
            x = Math.max(20, Math.min(x, windowWidth - width - 20));
            y = Math.max(40, Math.min(y, windowHeight - height - 100)); // 100px buffer for dock

            return { x, y };
        };

        switch (action) {
            case 'inbox':
            case 'mail': {
                // PRIMARY ACTION: Open or focus Mail pane
                const existing = getPane('mail-main');
                if (existing) {
                    if (existing.minimized) restorePane('mail-main');
                    else focusPane('mail-main');
                } else {
                    const size = { width: 500, height: 600 };
                    addPane({
                        id: 'mail-main',
                        type: 'mail',
                        title: 'Gmail',
                        position: getCenteredPosition(size.width, size.height),
                        size,
                        minimized: false
                    });
                }
                break;
            }
            case 'home':
                // Universe Button: Minimize all windows to show the stars
                panes.forEach(p => !p.minimized && minimizePane(p.id));
                break;
            case 'settings': {
                const existing = getPane('settings-main');
                if (existing) {
                    if (existing.minimized) restorePane('settings-main');
                    else focusPane('settings-main');
                } else {
                    const size = { width: 700, height: 500 };
                    addPane({
                        id: 'settings-main',
                        type: 'settings',
                        title: 'Settings',
                        position: getCenteredPosition(size.width, size.height),
                        size,
                        minimized: false
                    });
                }
                break;
            }
            case 'apps': {
                const existing = getPane('apps-main');
                if (existing) {
                    if (existing.minimized) restorePane('apps-main');
                    else focusPane('apps-main');
                } else {
                    const size = { width: 800, height: 600 };
                    addPane({
                        id: 'apps-main',
                        type: 'apps',
                        title: 'App Library',
                        position: getCenteredPosition(size.width, size.height),
                        size,
                        minimized: false
                    });
                }
                break;
            }
            case 'mail': {
                // Guided Agency: Open Gmail pane
                const existing = getPane('mail-main');
                if (existing) {
                    if (existing.minimized) restorePane('mail-main');
                    else focusPane('mail-main');
                } else {
                    const size = { width: 500, height: 600 };
                    addPane({
                        id: 'mail-main',
                        type: 'mail',
                        title: 'Gmail',
                        position: getCenteredPosition(size.width, size.height),
                        size,
                        minimized: false
                    });
                }
                break;
            }
            // Note: 'search' and 'chat' are handled in dedicated case blocks below

            case 'logout':
                handleLogout();
                break;
            case 'switch-user':
                handleSwitchUser();
                break;
            case 'sleep':
                // Trigger lockscreen via callback
                if (onSleep) {
                    onSleep();
                }
                break;
            case 'search': {
                const existing = getPane('search-main');
                if (existing) {
                    if (existing.minimized) restorePane('search-main');
                    else focusPane('search-main');
                } else {
                    const size = { width: 600, height: 400 };
                    addPane({
                        id: 'search-main',
                        type: 'search',
                        title: 'Search',
                        position: getCenteredPosition(size.width, size.height),
                        size,
                        minimized: false
                    });
                }
                break;
            }
            case 'files': {
                const existing = getPane('finder-main');
                if (existing) {
                    if (existing.minimized) restorePane('finder-main');
                    else focusPane('finder-main');
                } else {
                    const size = { width: 800, height: 550 };
                    addPane({
                        id: 'finder-main',
                        type: 'finder',
                        title: 'Finder',
                        position: getCenteredPosition(size.width, size.height),
                        size,
                        minimized: false
                    });
                }
                break;
            }
            case 'users': {
                const existing = getPane('users-main');
                if (existing) {
                    if (existing.minimized) restorePane('users-main');
                    else focusPane('users-main');
                } else {
                    const size = { width: 700, height: 500 };
                    addPane({
                        id: 'users-main',
                        type: 'users',
                        title: 'Team & Users',
                        position: getCenteredPosition(size.width, size.height),
                        size,
                        minimized: false
                    });
                }
                break;
            }
            case 'chat':
                // Open the Resonance Room - MÔRA's unified dialogue space
                if (onOpenResonance) {
                    onOpenResonance();
                }
                break;

        }

        setShowRecent(false);
    };

    // toggleDemo function removed - demo mode no longer available via toggle

    const isActionActive = (action: string) => {
        if (action === 'inbox' && getPane('mail-main') && !getPane('mail-main')?.minimized) return true;
        if (action === 'mail' && getPane('mail-main') && !getPane('mail-main')?.minimized) return true;
        if (action === 'settings' && getPane('settings-main') && !getPane('settings-main')?.minimized) return true;
        if (action === 'apps' && getPane('apps-main') && !getPane('apps-main')?.minimized) return true;
        if (action === 'search' && getPane('search-main') && !getPane('search-main')?.minimized) return true;
        if (action === 'files' && getPane('finder-main') && !getPane('finder-main')?.minimized) return true;
        if (action === 'users' && getPane('users-main') && !getPane('users-main')?.minimized) return true;
        if (action === 'home' && !activeSpaceId && !activeFolderId) return true;
        if (action === 'chat' && orbState === 'thinking') return true;
        return false;
    };

    return (
        <>
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]">
                {/* Recent Items Tray */}
                <AnimatePresence>
                    {showRecent && (
                        <motion.div
                            className="absolute bottom-20 left-1/2 -translate-x-1/2 mb-4"
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        >
                            <div className="glass-panel p-4 rounded-xl min-w-[280px] backdrop-blur-xl border border-white/10 bg-black/60 shadow-2xl">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-white/80 text-sm font-medium">System</span>
                                    <button
                                        onClick={() => setShowRecent(false)}
                                        className="text-white/50 hover:text-white/80 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                {/* System Menu Items */}
                                <div className="space-y-1 mb-4">
                                    {menuItems.map((item) => (
                                        <motion.button
                                            key={item.action}
                                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 text-left transition-colors group"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setShowRecent(false);
                                                handleDockClick(item.action);
                                            }}
                                        >
                                            <div className={`p-2 rounded-lg ${item.action === 'sleep' ? 'bg-blue-500/20' : item.action === 'logout' ? 'bg-red-500/20' : 'bg-white/5'}`}>
                                                <item.icon size={16} className={item.action === 'sleep' ? 'text-blue-400' : item.action === 'logout' ? 'text-red-400' : 'text-emerald-400'} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-white/90 text-sm font-medium">{item.label}</div>
                                                <div className="text-white/40 text-xs">{item.description}</div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>

                                {/* Recent Items Section */}
                                <div className="pt-3 border-t border-white/10">
                                    <span className="text-white/40 text-xs uppercase tracking-wider">Zuletzt verwendet</span>
                                    <div className="mt-2 space-y-1">
                                        {recentItems.slice(0, 3).map((item) => (
                                            <motion.button
                                                key={item.id}
                                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-left transition-colors"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <item.icon size={14} className="text-white/40" />
                                                <span className="text-white/60 text-sm">{item.name}</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Dock - PHASE 9 PREMIUM UPGRADE */}
                <motion.div
                    className="glass-card glow-pulse px-6 py-3 rounded-2xl flex items-center gap-1"
                    style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(0, 0, 0, 0.7) 50%, rgba(16, 185, 129, 0.04) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        boxShadow: `
                            0 8px 32px rgba(0, 0, 0, 0.5),
                            0 0 40px rgba(16, 185, 129, 0.1),
                            inset 0 1px 0 rgba(255, 255, 255, 0.1)
                        `
                    }}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
                >
                    {/* Recent Items Toggle */}
                    <motion.button
                        layout
                        className="p-3 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors relative group mr-2"
                        whileHover={{ scale: 1.15, y: -4, transition: { type: "spring", stiffness: 400, damping: 10 } }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowRecent(!showRecent)}
                    >
                        <ChevronUp
                            size={20}
                            strokeWidth={1.5}
                            className={`transition-transform ${showRecent ? 'rotate-180' : ''}`}
                        />

                        {/* Tooltip */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap border border-white/10 backdrop-blur-md">
                            Recent Items
                        </div>

                        {/* Indicator */}
                        {recentItems.length > 0 && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
                        )}
                    </motion.button>

                    {/* Demo Mode Toggle removed - demo access requires real login */}

                    {/* Separator */}
                    <div className="w-px h-6 bg-white/20 mx-1" />

                    {/* App Icons */}
                    {dockItems.map((item, i) => {
                        const active = isActionActive(item.action);

                        return (
                            <motion.button
                                layout
                                key={i}
                                className={`dock-item-${item.action} p-3 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors relative group ${active ? 'bg-white/10 text-white' : ''}`}
                                whileHover={{ scale: 1.15, y: -4, transition: { type: "spring", stiffness: 400, damping: 10 } }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDockClick(item.action)}
                            >
                                <item.icon size={20} strokeWidth={1.5} />

                                {/* Active Indicator */}
                                {active && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />
                                )}

                                {/* Orb State Indicator */}
                                {item.action === 'chat' && orbState !== 'idle' && (
                                    <motion.div
                                        className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                                        style={{
                                            backgroundColor: orbState === 'thinking' ? '#3B82F6' :
                                                orbState === 'alert' ? '#EF4444' :
                                                    '#D4AF37'
                                        }}
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            opacity: [0.8, 1, 0.8]
                                        }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    />
                                )}

                                {/* Tooltip */}
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap border border-white/10 backdrop-blur-md">
                                    {item.label}
                                </div>
                            </motion.button>
                        );
                    })}

                    {/* Legacy Minimized Nodes Separator */}
                    {(minimizedNodes.length > 0 || minimizedPanes.length > 0) && (
                        <div className="w-px h-6 bg-white/20 mx-1" />
                    )}

                    {/* Legacy Minimized Nodes (moraStore) */}
                    {minimizedNodes.map((node) => (
                        <motion.button
                            layout
                            key={`min-${node.id}`}
                            className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-emerald-400/70 hover:text-emerald-400 transition-colors relative group"
                            whileHover={{ scale: 1.15, y: -4, transition: { type: "spring", stiffness: 400, damping: 10 } }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => restoreNode(node.id)}
                        >
                            <FileText size={20} strokeWidth={1.5} />

                            {/* Minimized Indicator */}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />

                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap border border-white/10 backdrop-blur-md max-w-[150px] truncate">
                                {node.title || node.name}
                            </div>
                        </motion.button>
                    ))}

                    {/* New Minimized Panes (paneStore) */}
                    {minimizedPanes.map((pane) => (
                        <motion.button
                            layout
                            key={`pane-min-${pane.id}`}
                            className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-blue-400/70 hover:text-blue-400 transition-colors relative group"
                            whileHover={{ scale: 1.15, y: -4, transition: { type: "spring", stiffness: 400, damping: 10 } }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => restorePane(pane.id)}
                        >
                            {/* Icon based on pane type */}
                            {pane.type === 'settings' ? <Settings size={20} strokeWidth={1.5} /> :
                                pane.type === 'document' ? <LayoutGrid size={20} strokeWidth={1.5} /> :
                                    <Minus size={20} strokeWidth={1.5} />}

                            {/* Minimized Indicator */}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />

                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap border border-white/10 backdrop-blur-md max-w-[150px] truncate">
                                {pane.title}
                            </div>
                        </motion.button>
                    ))}

                </motion.div>
            </div>
        </>
    );
};
