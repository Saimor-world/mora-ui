"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { signOut } from 'next-auth/react';
import {
    Home,
    Search,
    Settings,
    FileText,
    Folder,
    LayoutGrid,
    LogOut,
    Minus,
    Users,
    Mail,
    Calendar,
    Terminal
} from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { useAccountStore } from '@/lib/auth/useAccount';
import { writeCookie } from '@/lib/auth/cookies';

/**
 * OS-STYLE DOCK (Demo-safe)
 * Only exposes actions that are real and stable in the current demo.
 */
export const Dock = () => {
    const router = useRouter();
    const {
        activeSpaceId,
        activeFolderId,
        setViewLevel,
        setActiveDepartment,
        setActiveSpace,
        setActiveFolder,
        resetStore,
        setHasBooted,
        setIsLoggingOut,
        setOrbState,
        minimizedNodes,
        restoreNode
    } = useMoraStore();
    const { logout } = useAccountStore();

    const {
        panes,
        restorePane,
        getPane,
        minimizePane,
        openPane
    } = usePaneStore();

    const minimizedPanes = panes.filter(p => p.minimized);

    const dockItems = [
        { icon: Home, label: 'Home', action: 'home' },
        { icon: LayoutGrid, label: 'Apps', action: 'apps' },
        { icon: Folder, label: 'Finder', action: 'finder' },
        { icon: Users, label: 'Team', action: 'team' },
        { icon: Mail, label: 'Mail', action: 'mail' },
        { icon: Calendar, label: 'Calendar', action: 'calendar' },
        { icon: Terminal, label: 'Terminal', action: 'terminal' },
        { icon: Search, label: 'Search', action: 'search' },
        { icon: Settings, label: 'Settings', action: 'settings' },
        { icon: LogOut, label: 'Logout', action: 'logout' }
    ];

    const handleLogout = async () => {
        // Enter logout transition (hide cursors / show overlay)
        setIsLoggingOut(true);
        setOrbState('idle');

        // Clear all local storage
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

        // Reset UI state (keep activeCompany to avoid flicker)
        setViewLevel('core');
        setActiveDepartment(null);
        setActiveSpace(null);
        setActiveFolder(null);

        // Clear stores
        logout();
        resetStore();
        // Prevent boot flash during logout transition
        setHasBooted(true);
        setIsLoggingOut(true);

        // Sign out from NextAuth (this handles the redirect)
        await signOut({ callbackUrl: '/' });
    };

    const handleDockClick = (action: string) => {
        console.log('Dock action:', action);

        switch (action) {
            case 'home':
                panes.forEach(p => !p.minimized && minimizePane(p.id));
                setViewLevel('core');
                setActiveDepartment(null);
                setActiveSpace(null);
                setActiveFolder(null);
                break;
            case 'settings': {
                const size = { width: 700, height: 500 };
                openPane({
                    id: 'settings-main',
                    type: 'settings',
                    title: 'Settings',
                    size
                });
                break;
            }
            case 'apps': {
                const size = { width: 800, height: 600 };
                openPane({
                    id: 'apps-main',
                    type: 'apps',
                    title: 'App Library',
                    size
                });
                break;
            }
            case 'search': {
                const size = { width: 600, height: 400 };
                openPane({
                    id: 'search-main',
                    type: 'search',
                    title: 'Search',
                    size
                });
                break;
            }
            case 'finder': {
                const size = { width: 900, height: 600 };
                openPane({
                    id: 'finder-main',
                    type: 'finder',
                    title: 'Finder',
                    size
                });
                break;
            }
            case 'team': {
                const size = { width: 780, height: 620 };
                openPane({
                    id: 'team-main',
                    type: 'team',
                    title: 'Team',
                    size
                });
                break;
            }
            case 'mail': {
                const size = { width: 860, height: 640 };
                openPane({
                    id: 'mail-main',
                    type: 'mail',
                    title: 'Secure Mail',
                    size
                });
                break;
            }
            case 'calendar': {
                const size = { width: 840, height: 620 };
                openPane({
                    id: 'calendar-main',
                    type: 'calendar',
                    title: 'Calendar',
                    size
                });
                break;
            }
            case 'terminal': {
                const size = { width: 860, height: 560 };
                openPane({
                    id: 'terminal-main',
                    type: 'terminal',
                    title: 'Terminal',
                    size
                });
                break;
            }
            case 'logout':
                handleLogout();
                break;
            default:
                break;
        }
    };

    const isActionActive = (action: string) => {
        if (action === 'settings' && getPane('settings-main') && !getPane('settings-main')?.minimized) return true;
        if (action === 'apps' && getPane('apps-main') && !getPane('apps-main')?.minimized) return true;
        if (action === 'search' && getPane('search-main') && !getPane('search-main')?.minimized) return true;
        if (action === 'finder' && getPane('finder-main') && !getPane('finder-main')?.minimized) return true;
        if (action === 'team' && getPane('team-main') && !getPane('team-main')?.minimized) return true;
        if (action === 'mail' && getPane('mail-main') && !getPane('mail-main')?.minimized) return true;
        if (action === 'calendar' && getPane('calendar-main') && !getPane('calendar-main')?.minimized) return true;
        if (action === 'terminal' && getPane('terminal-main') && !getPane('terminal-main')?.minimized) return true;
        if (action === 'home' && !activeSpaceId && !activeFolderId) return true;
        return false;
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]">
            <motion.div
                className="glass-card px-6 py-3 rounded-2xl flex items-center gap-1 relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 10, 8, 0.85) 50%, rgba(16, 185, 129, 0.06) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    boxShadow: `
                        0 12px 40px rgba(0, 0, 0, 0.6),
                        0 0 60px rgba(16, 185, 129, 0.15),
                        inset 0 1px 0 rgba(255, 255, 255, 0.15),
                        inset 0 -1px 0 rgba(0, 0, 0, 0.3)
                    `
                }}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
            >
                {/* Animated gradient overlay */}
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.1), transparent)',
                        backgroundSize: '200% 100%'
                    }}
                    animate={{
                        backgroundPosition: ['200% 0', '-200% 0']
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'linear'
                    }}
                />
                <div className="w-px h-6 bg-white/20 mx-1" />

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
                            <item.icon size={20} strokeWidth={1.5} className={active ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : ''} />

                            {active && (
                                <motion.div
                                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full"
                                    layoutId={`dock-indicator-${item.action}`}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    style={{ boxShadow: '0 0 8px rgba(16, 185, 129, 0.8)' }}
                                />
                            )}

                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap border border-white/10 backdrop-blur-md">
                                {item.label}
                            </div>
                        </motion.button>
                    );
                })}

                {(minimizedNodes.length > 0 || minimizedPanes.length > 0) && (
                    <div className="w-px h-6 bg-white/20 mx-1" />
                )}

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
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap border border-white/10 backdrop-blur-md max-w-[150px] truncate">
                            {node.title || node.name}
                        </div>
                    </motion.button>
                ))}

                {minimizedPanes.map((pane) => (
                    <motion.button
                        layout
                        key={`pane-min-${pane.id}`}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-blue-400/70 hover:text-blue-400 transition-colors relative group"
                        whileHover={{ scale: 1.15, y: -4, transition: { type: "spring", stiffness: 400, damping: 10 } }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => restorePane(pane.id)}
                    >
                        {pane.type === 'settings' ? <Settings size={20} strokeWidth={1.5} /> :
                            pane.type === 'document' ? <LayoutGrid size={20} strokeWidth={1.5} /> :
                                <Minus size={20} strokeWidth={1.5} />}

                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />

                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap border border-white/10 backdrop-blur-md max-w-[150px] truncate">
                            {pane.title}
                        </div>
                    </motion.button>
                ))}
            </motion.div>
        </div>
    );
};
