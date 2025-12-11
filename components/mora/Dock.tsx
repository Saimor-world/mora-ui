"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, MessageSquare, Settings, LayoutGrid, FileText, Database, Zap, ChevronUp, X, ToggleLeft, Minus, Moon } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';

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
}

export const Dock = ({ onSleep }: DockProps) => {
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

    // Get minimized panes from store
    const minimizedPanes = panes.filter(p => p.minimized);

    const [showRecent, setShowRecent] = useState(false);
    const [recentItems] = useState([
        { id: '1', type: 'space', name: 'Research Space', icon: Database },
        { id: '2', type: 'folder', name: 'AI Notes', icon: FileText },
        { id: '3', type: 'node', name: 'Semantic Map', icon: Zap }
    ]);

    const dockItems = [
        { icon: Home, label: 'Universe', action: 'home' },
        { icon: Search, label: 'Search', action: 'search' },
        { icon: LayoutGrid, label: 'Apps', action: 'apps' },
        { icon: MessageSquare, label: 'Môra', action: 'chat' },
        { icon: Settings, label: 'Settings', action: 'settings' },
        { icon: Moon, label: 'Sleep', action: 'sleep' }
    ];

    const handleDockClick = (action: string) => {
        console.log('Dock action:', action);

        switch (action) {
            case 'settings': {
                const existing = getPane('settings-pane');
                if (existing) {
                    if (existing.minimized) restorePane('settings-pane');
                    else focusPane('settings-pane');
                } else {
                    addPane({
                        id: 'settings-pane',
                        type: 'settings',
                        title: 'Settings',
                        position: { x: 0, y: 0 }, // Position handled by GlassPanel centering
                        size: { width: 700, height: 500 },
                        minimized: false
                    });
                }
                break;
            }
            case 'apps': {
                const existing = getPane('apps-library');
                if (existing) {
                    if (existing.minimized) restorePane('apps-library');
                    else focusPane('apps-library');
                } else {
                    addPane({
                        id: 'apps-library',
                        type: 'document', // Using document type as generic for now
                        title: 'App Library',
                        position: { x: 0, y: 0 },
                        size: { width: 800, height: 600 },
                        minimized: false
                    });
                }
                break;
            }
            case 'home':
            case 'search':
            case 'chat':
                // Preserve legacy/placeholder behavior for now
                break;
            case 'sleep':
                // Trigger lockscreen via callback
                if (onSleep) {
                    onSleep();
                }
                break;
        }

        setShowRecent(false);
    };

    const toggleDemo = () => {
        if (viewMode === 'demo') {
            // Exit demo → workspace core
            setViewMode('workspace');
            setViewLevel('core');
            setActiveCompany(null);
            setActiveDepartment(null);
            setActiveSpace(null);
            setActiveFolder(null);
        } else {
            // Enter demo → demo core
            setViewMode('demo');
            setViewLevel('core');
            setActiveCompany(null);
            setActiveDepartment(null);
            setActiveSpace(null);
            setActiveFolder(null);
        }
    };

    const isActionActive = (action: string) => {
        if (action === 'settings' && getPane('settings-pane') && !getPane('settings-pane')?.minimized) return true;
        if (action === 'apps' && getPane('apps-library') && !getPane('apps-library')?.minimized) return true;
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
                                    <span className="text-white/80 text-sm font-medium">Recent</span>
                                    <button
                                        onClick={() => setShowRecent(false)}
                                        className="text-white/50 hover:text-white/80 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {recentItems.map((item, i) => (
                                        <motion.button
                                            key={item.id}
                                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-left transition-colors"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <item.icon size={16} className="text-emerald-400" />
                                            <span className="text-white/80 text-sm">{item.name}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Dock */}
                <motion.div
                    className="glass-panel px-6 py-3 rounded-2xl flex items-center gap-1 backdrop-blur-xl border border-white/10 bg-black/40 shadow-2xl"
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1, type: 'spring', stiffness: 200, damping: 20 }}
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

                    {/* Demo Mode Toggle */}
                    <motion.button
                        layout
                        className={`p-3 rounded-xl hover:bg-white/10 transition-colors relative group mr-1 ${viewMode === 'demo' ? 'text-blue-400' : 'text-emerald-400'}`}
                        whileHover={{ scale: 1.15, y: -4, transition: { type: "spring", stiffness: 400, damping: 10 } }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleDemo}
                    >
                        <ToggleLeft
                            size={20}
                            strokeWidth={1.5}
                            className={`transition-transform ${viewMode === 'demo' ? 'rotate-180' : ''}`}
                        />
                        {/* Tooltip */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap border border-white/10 backdrop-blur-md">
                            {viewMode === 'demo' ? 'Exit Demo' : 'Enter Demo'}
                        </div>
                    </motion.button>

                    {/* Separator */}
                    <div className="w-px h-6 bg-white/20 mx-1" />

                    {/* App Icons */}
                    {dockItems.map((item, i) => {
                        const active = isActionActive(item.action);

                        return (
                            <motion.button
                                layout
                                key={i}
                                className={`p-3 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors relative group ${active ? 'bg-white/10 text-white' : ''}`}
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
