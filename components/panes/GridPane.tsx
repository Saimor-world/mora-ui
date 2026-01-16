import React, { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { Grid, FileText, Image, Video, File, Folder, Search, Filter, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchNodesByCompany } from '@/lib/api/coreClient';
import type { CoreNode } from '@/lib/types/core';

const getNodeIcon = (type: string) => {
    switch (type) {
        case 'document': return FileText;
        case 'image': return Image;
        case 'video': return Video;
        case 'folder': return Folder;
        default: return File;
    }
};

const getNodeColor = (type: string) => {
    switch (type) {
        case 'document': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        case 'image': return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
        case 'video': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
        case 'folder': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
};

export const GridPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const { activeCompanyId, nodesByCompany } = useMoraStore();
    const pane = getPane(id);

    const [nodes, setNodes] = useState<CoreNode[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string | null>(null);

    const loadNodes = async () => {
        if (!activeCompanyId) return;
        setIsLoading(true);
        try {
            const data = await fetchNodesByCompany(activeCompanyId);
            setNodes(data || []);
        } catch (e) {
            console.warn('Failed to load nodes', e);
            // Fallback to store data
            const storeNodes = nodesByCompany[activeCompanyId] || [];
            setNodes(storeNodes as any);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadNodes();
    }, [activeCompanyId]);

    const filteredNodes = nodes.filter(n => {
        const matchesSearch = n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.content?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = !filterType || n.type === filterType;
        return matchesSearch && matchesType;
    });

    const nodeTypes = [...new Set(nodes.map(n => n.type))];

    // Hook must be called before any returns
    const isActive = usePaneStore(state => state.activePaneId === id);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Grid View"
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            onResize={(w, h) => updatePaneSize(id, w, h)}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="flex flex-col h-full">
                {/* Toolbar */}
                <div className="p-4 border-b border-white/5 flex items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text"
                            placeholder="Search nodes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/20 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/30"
                        />
                    </div>

                    {/* Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-white/30" />
                        <select
                            value={filterType || ''}
                            onChange={(e) => setFilterType(e.target.value || null)}
                            className="bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/30"
                        >
                            <option value="">All Types</option>
                            {nodeTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={loadNodes}
                        disabled={isLoading}
                        className="p-2 rounded-lg bg-black/20 border border-white/5 text-white/50 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>

                    {/* Count */}
                    <div className="text-xs text-white/40">
                        {filteredNodes.length} of {nodes.length} nodes
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 size={32} className="text-emerald-400 animate-spin" />
                        </div>
                    ) : filteredNodes.length > 0 ? (
                        <div className="grid grid-cols-4 gap-4">
                            <AnimatePresence>
                                {filteredNodes.map((node, i) => {
                                    const Icon = getNodeIcon(node.type);
                                    const colorClass = getNodeColor(node.type);

                                    return (
                                        <motion.div
                                            key={node.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ delay: i * 0.02 }}
                                            className={`p-4 rounded-xl border ${colorClass} hover:scale-105 transition-transform cursor-pointer`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-lg ${colorClass}`}>
                                                    <Icon size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm text-white/80 font-medium truncate">
                                                        {node.title || 'Untitled'}
                                                    </div>
                                                    <div className="text-xs text-white/30 mt-1 uppercase tracking-wider">
                                                        {node.type}
                                                    </div>
                                                </div>
                                            </div>
                                            {node.content && (
                                                <div className="mt-3 text-xs text-white/40 line-clamp-2">
                                                    {node.content.slice(0, 100)}
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                <Grid size={48} className="text-emerald-400" />
                            </div>
                            <p className="text-sm text-white/40 text-center">
                                {nodes.length === 0 ? 'No nodes found in this workspace' : 'No matching nodes'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </GlassPanel>
    );
};
