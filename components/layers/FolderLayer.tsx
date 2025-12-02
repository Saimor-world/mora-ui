"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { ArrowLeft, LayoutGrid, List, FileText, CheckSquare, Link as LinkIcon, Plus, Zap, Network, Search, X, Folder as FolderIcon, Box } from 'lucide-react';
import { motion } from 'framer-motion';
import { CreateModal } from '@/components/ui/CreateModal';
import { triggerFolderScan } from '@/lib/api/scanClient';
import { Mycelium25D } from '@/components/organic/Mycelium25D';
import type { CoreNode } from '@/lib/types/core';
import { mapNodesToMycelium } from '@/lib/utils/myceliumDataMapper';
import { getRelationsForSpace, RelationEdge } from '@/lib/api/relationsClient';

const NODE_TYPES = [
    { value: 'note' as const, label: 'Note', icon: FileText },
    { value: 'link' as const, label: 'Link', icon: LinkIcon },
    { value: 'document' as const, label: 'Document', icon: FileText },
    { value: 'task' as const, label: 'Task', icon: CheckSquare },
];

const TYPE_ICONS: Record<string, any> = {
    document: FileText,
    link: LinkIcon,
    task: CheckSquare,
    folder: FolderIcon,
    other: Box,
    note: FileText,
    intel_report: Zap,
};

const TYPE_COLORS: Record<string, string> = {
    document: "text-emerald-400",
    link: "text-blue-400",
    task: "text-amber-400",
    folder: "text-white",
    other: "text-gray-400",
    note: "text-yellow-200",
    intel_report: "text-mora-gold",
};

export const FolderLayer: React.FC = () => {
    const {
        activeSpaceId,
        activeFolderId,
        activeDepartmentId,
        foldersBySpace,
        nodesByFolder,
        isLoadingNodes,
        departments,
        spacesByDepartment,
        navigateToSpace,
        loadNodesForFolder,
        addNode,
        setActiveNode,
        loadNodeDetails,
        viewLevel,
    } = useMoraStore();

    const [viewMode, setViewMode] = useState<'mycelium' | 'grid' | 'list'>('grid');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [formData, setFormData] = useState({
        name: '',
        type: 'note' as 'document' | 'task' | 'note' | 'link' | 'other',
        content: '',
        url: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [graphNodes, setGraphNodes] = useState<any[]>([]);
    const [graphRelations, setGraphRelations] = useState<RelationEdge[]>([]);
    const [isGraphLoading, setIsGraphLoading] = useState(false);

    // Get current folder
    const currentFolder = useMemo(() => {
        if (!activeSpaceId || !activeFolderId) return null;
        const folders = foldersBySpace[activeSpaceId] || [];
        return folders.find(f => f.id === activeFolderId);
    }, [activeSpaceId, activeFolderId, foldersBySpace]);

    // Get current department and space
    const currentDepartment = useMemo(() => {
        if (!activeDepartmentId) return null;
        return departments.find(d => d.id === activeDepartmentId);
    }, [activeDepartmentId, departments]);

    const currentSpace = useMemo(() => {
        if (!activeDepartmentId || !activeSpaceId) return null;
        const spaces = spacesByDepartment[activeDepartmentId] || [];
        return spaces.find(s => s.id === activeSpaceId);
    }, [activeDepartmentId, activeSpaceId, spacesByDepartment]);

    // Get nodes for current folder
    const nodes = activeFolderId ? (nodesByFolder[activeFolderId] || []) : [];

    // Filtered nodes
    const filteredNodes = useMemo(() => {
        let result = [...nodes];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(n =>
                ((n as any).name?.toLowerCase().includes(query)) ||
                ((n as any).content?.toLowerCase().includes(query))
            );
        }

        if (typeFilter && typeFilter !== 'all') {
            result = result.filter(n => (n as any).type === typeFilter);
        }

        return result;
    }, [nodes, searchQuery, typeFilter]);

    // Load nodes when folder becomes active
    useEffect(() => {
        if (activeFolderId && !nodesByFolder[activeFolderId]) {
            loadNodesForFolder(activeFolderId);
        }
    }, [activeFolderId, nodesByFolder, loadNodesForFolder]);

    // Load Graph Data for Mycelium
    useEffect(() => {
        if (activeFolderId && viewMode === 'mycelium') {
            const loadGraph = async () => {
                setIsGraphLoading(true);
                const mapped = mapNodesToMycelium(nodes, { activeNodeId: null });

                let relations: RelationEdge[] = [];
                try {
                    if (activeSpaceId) {
                        const res = await getRelationsForSpace(activeSpaceId);
                        const nodeIds = new Set(mapped.map(n => n.id));
                        relations = (res.relations || []).filter(r => nodeIds.has(r.source_id) && nodeIds.has(r.target_id));
                    }
                } catch (err) {
                    console.warn("Relations for folder unavailable", err);
                }

                // merge edges
                const connMap = new Map<string, Set<string>>();
                mapped.forEach(n => connMap.set(n.id, new Set(n.connections || [])));
                relations.forEach(rel => {
                    if (connMap.has(rel.source_id) && connMap.has(rel.target_id)) {
                        connMap.get(rel.source_id)!.add(rel.target_id);
                        connMap.get(rel.target_id)!.add(rel.source_id);
                    }
                });
                const mergedNodes = mapped.map(n => ({
                    ...n,
                    connections: Array.from(connMap.get(n.id) || [])
                }));

                setGraphNodes(mergedNodes);
                setGraphRelations(relations);
                setIsGraphLoading(false);
            };
            loadGraph();
        }
    }, [activeFolderId, activeSpaceId, viewMode, nodes]);

    const handleBack = () => {
        if (activeSpaceId) {
            navigateToSpace(activeSpaceId);
        }
    };

    const handleCreateNode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeFolderId || !formData.name.trim()) return;

        setIsSubmitting(true);
        try {
            await addNode({
                folder_id: activeFolderId,
                name: formData.name.trim(),
                type: formData.type,
                content: formData.content.trim() || undefined,
                url: formData.url.trim() || undefined,
            });
            setFormData({ name: '', type: 'note', content: '', url: '' });
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('Failed to create node:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMoraScan = async () => {
        if (!activeFolderId || isScanning) return;
        setIsScanning(true);
        try {
            const result = await triggerFolderScan(activeFolderId);
            await loadNodesForFolder(activeFolderId);
            console.log('[MÔRA Scan] Report created:', result.report_id);
            // Auto-open the report
            const reportNode = nodes.find(n => (n as any).id === result.report_id);
            if (reportNode) {
                handleNodeClick(reportNode);
            }
        } catch (error) {
            console.error('[MÔRA Scan] Failed:', error);
            alert(`MÔRA Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsScanning(false);
        }
    };

    const handleNodeClick = (node: CoreNode) => {
        loadNodeDetails((node as any).id);
        setActiveNode(node);
    };

    // Only render if we're in folder view
    if (!activeFolderId || viewLevel !== 'folder') return null;

    return (
        <div className="absolute inset-0 z-20 flex flex-col bg-gradient-to-br from-[#050505] to-[#0A0A0A]">
            {/* Header */}
            <header className="relative p-6 pb-4 border-b border-emerald-500/10 bg-gradient-to-b from-black/40 to-transparent backdrop-blur-sm">
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

                {/* Top Bar */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="p-3 rounded-full bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-emerald-500/30 hover:bg-white/10 transition-all group"
                        >
                            <ArrowLeft className="w-5 h-5 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div>
                            <h2 className="text-2xl font-light text-emerald-50 tracking-tight">
                                {currentFolder?.name || 'Folder'}
                            </h2>
                            <div className="flex items-center gap-2 mt-1 text-xs text-emerald-500/50">
                                <span>{currentDepartment?.name || 'Dept'}</span>
                                <span>/</span>
                                <span>{currentSpace?.name || 'Space'}</span>
                                <span>/</span>
                                <span className="text-emerald-400">{currentFolder?.name || 'Folder'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Môra Scan Button */}
                        <button
                            onClick={handleMoraScan}
                            disabled={isScanning}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-mora-gold/10 border border-mora-gold/30 hover:bg-mora-gold/20 hover:border-mora-gold/50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Zap className={`w-4 h-4 text-mora-gold ${isScanning ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}`} />
                            <span className="text-sm text-mora-gold transition-colors tracking-wider">
                                {isScanning ? 'SCANNING...' : 'MÔRA SCAN'}
                            </span>
                        </button>

                        {/* Create Node Button */}
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all group"
                        >
                            <Plus className="w-4 h-4 text-emerald-400 group-hover:rotate-90 transition-transform" />
                            <span className="text-sm text-emerald-300 transition-colors tracking-wider">
                                NEW NODE
                            </span>
                        </button>

                        {/* View Toggle */}
                        <div className="flex items-center bg-black/30 rounded-full p-1 border border-white/5">
                            <button
                                onClick={() => setViewMode('mycelium')}
                                className={`p-2 rounded-full transition-all ${viewMode === 'mycelium' ? 'bg-mora-gold/20 text-mora-gold' : 'text-emerald-500/40 hover:text-emerald-400'}`}
                                title="Mycelium Network"
                            >
                                <Network className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-emerald-500/20 text-emerald-300' : 'text-emerald-500/40 hover:text-emerald-400'}`}
                                title="Grid View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-emerald-500/20 text-emerald-300' : 'text-emerald-500/40 hover:text-emerald-400'}`}
                                title="List View"
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search nodes..."
                        className="w-full px-4 py-2.5 pl-10 rounded-xl bg-black/30 border border-white/10 text-emerald-100 placeholder-emerald-500/30 focus:border-emerald-500/50 focus:outline-none transition-colors text-sm"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/40" />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/40 hover:text-emerald-400"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 relative overflow-hidden">
                {isLoadingNodes && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                            <span className="text-sm text-emerald-500/70 font-mono tracking-widest">LOADING NODES...</span>
                        </div>
                    </div>
                )}

                {/* Mycelium View */}
                {viewMode === 'mycelium' && (
                    <div className="absolute inset-0">
                        {isGraphLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                    <span className="text-sm text-emerald-500/70 font-mono tracking-widest">GROWING MYCELIUM...</span>
                                </div>
                            </div>
                        ) : (
                            <Mycelium25D
                                nodes={graphNodes}
                                onNodeClick={(nodeId) => {
                                    const node = graphNodes.find((n: any) => n.id === nodeId);
                                    if (node) {
                                        handleNodeClick(node as CoreNode);
                                    }
                                }}
                            />
                        )}
                    </div>
                )}

                {/* Grid View */}
                {viewMode === 'grid' && !isLoadingNodes && (
                    <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                        {filteredNodes.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center">
                                <FileText className="w-16 h-16 text-emerald-500/20 mb-4" />
                                <p className="text-emerald-500/30 font-mono text-sm uppercase tracking-wider">
                                    {searchQuery ? 'No matching nodes' : 'Empty Folder'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-6 gap-5">
                                {filteredNodes.map((node: any) => {
                                    const Icon = TYPE_ICONS[node.type] || Box;
                                    const colorClass = TYPE_COLORS[node.type] || 'text-gray-400';

                                    return (
                                        <motion.button
                                            key={node.id}
                                            className="group flex flex-col items-center gap-3 p-5 rounded-2xl hover:bg-gradient-to-br hover:from-emerald-500/10 hover:to-emerald-600/5 border border-transparent hover:border-emerald-500/20 transition-all duration-200"
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleNodeClick(node)}
                                        >
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 group-hover:border-emerald-500/30 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] flex items-center justify-center transition-all duration-200">
                                                <Icon size={28} className={colorClass} />
                                            </div>
                                            <span className="text-xs text-white/60 group-hover:text-emerald-100 text-center font-medium leading-tight line-clamp-2 transition-colors duration-200 max-w-[90px]">
                                                {node.name}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* List View */}
                {viewMode === 'list' && !isLoadingNodes && (
                    <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                        {filteredNodes.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center">
                                <FileText className="w-16 h-16 text-emerald-500/20 mb-4" />
                                <p className="text-emerald-500/30 font-mono text-sm uppercase tracking-wider">
                                    {searchQuery ? 'No matching nodes' : 'Empty Folder'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredNodes.map((node: any) => {
                                    const Icon = TYPE_ICONS[node.type] || Box;
                                    const colorClass = TYPE_COLORS[node.type] || 'text-gray-400';

                                    return (
                                        <motion.button
                                            key={node.id}
                                            className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-emerald-600/5 border border-transparent hover:border-emerald-500/20 transition-all duration-200 text-left group"
                                            whileHover={{ x: 4 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={() => handleNodeClick(node)}
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 group-hover:border-emerald-500/30 flex items-center justify-center flex-shrink-0 transition-all">
                                                <Icon size={20} className={colorClass} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-emerald-100 group-hover:text-emerald-50 truncate transition-colors">
                                                    {node.name}
                                                </div>
                                                <div className="text-xs text-emerald-500/40 group-hover:text-emerald-500/60 uppercase tracking-wider mt-0.5 transition-colors">
                                                    {node.type}
                                                </div>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Node Modal */}
            <CreateModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setFormData({ name: '', type: 'note', content: '', url: '' });
                }}
                title="Create New Node"
            >
                <form onSubmit={handleCreateNode} className="space-y-6">
                    <div>
                        <label className="block text-sm text-emerald-400/70 mb-2 tracking-wider">
                            NAME *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-emerald-100 placeholder-emerald-500/30 focus:border-mora-gold/50 focus:outline-none transition-colors"
                            placeholder="Enter node name"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-emerald-400/70 mb-2 tracking-wider">
                            TYPE
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {NODE_TYPES.map((type) => {
                                const Icon = type.icon;
                                return (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: type.value })}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${formData.type === type.value
                                                ? 'border-mora-gold bg-mora-gold/10 text-mora-gold'
                                                : 'border-white/10 hover:border-white/20 text-emerald-400/70'
                                            }`}
                                    >
                                        <Icon size={16} />
                                        <span className="text-sm">{type.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {formData.type === 'note' && (
                        <div>
                            <label className="block text-sm text-emerald-400/70 mb-2 tracking-wider">
                                CONTENT
                            </label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-emerald-100 placeholder-emerald-500/30 focus:border-mora-gold/50 focus:outline-none transition-colors resize-none"
                                placeholder="Enter note content..."
                                rows={4}
                            />
                        </div>
                    )}

                    {formData.type === 'link' && (
                        <div>
                            <label className="block text-sm text-emerald-400/70 mb-2 tracking-wider">
                                URL *
                            </label>
                            <input
                                type="url"
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-emerald-100 placeholder-emerald-500/30 focus:border-mora-gold/50 focus:outline-none transition-colors"
                                placeholder="https://..."
                                required={formData.type === 'link'}
                            />
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setIsCreateModalOpen(false);
                                setFormData({ name: '', type: 'note', content: '', url: '' });
                            }}
                            className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-emerald-400 hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.name.trim()}
                            className="flex-1 px-4 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-600/30 hover:border-mora-gold/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Node'}
                        </button>
                    </div>
                </form>
            </CreateModal>
        </div>
    );
};
