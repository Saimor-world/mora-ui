"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Home,
    Search,
    Settings,
    FileText,
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
        setActiveCompany,
        setActiveDepartment,
        setActiveSpace,
        setActiveFolder,
        minimizedNodes,
        restoreNode
    } = useMoraStore();

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
        { icon: FileText, label: 'Files', action: 'files' },
        { icon: Users, label: 'Team', action: 'team' },
        { icon: Mail, label: 'Mail', action: 'mail' },
        { icon: Calendar, label: 'Calendar', action: 'calendar' },
        { icon: Terminal, label: 'Terminal', action: 'terminal' },
        { icon: Search, label: 'Search', action: 'search' },
        { icon: Settings, label: 'Settings', action: 'settings' },
        { icon: LogOut, label: 'Logout', action: 'logout' }
    ];

    const handleLogout = () => {
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

        setViewLevel('core');
        setActiveCompany(null);
        setActiveDepartment(null);
        setActiveSpace(null);
        setActiveFolder(null);

        router.push('/');
    };

    const handleDockClick = (action: string) => {
        console.log('Dock action:', action);

        switch (action) {
            case 'home':
                panes.forEach(p => !p.minimized && minimizePane(p.id));
                setViewLevel('core');
                setActiveCompany(null);
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
            case 'files': {
                const size = { width: 700, height: 500 };
                openPane({
                    id: 'files-main',
                    type: 'files',
                    title: 'Files',
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
        if (action === 'files' && getPane('files-main') && !getPane('files-main')?.minimized) return true;
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
                            <item.icon size={20} strokeWidth={1.5} />

                            {active && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />
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
