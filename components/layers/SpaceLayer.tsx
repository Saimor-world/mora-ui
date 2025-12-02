"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { ArrowLeft, LayoutGrid, List, Folder, Plus, Network, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { CreateModal } from '@/components/ui/CreateModal';
import { Mycelium25D } from '@/components/organic/Mycelium25D';
import { mapSpaceContentToMycelium } from '@/lib/utils/myceliumDataMapper';
import type { CoreFolder, CoreNode } from '@/lib/types/core';
import { getRelationsForSpace, RelationEdge } from '@/lib/api/relationsClient';

const FOLDER_COLORS = [
    { name: 'Emerald', value: '#10b981' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Cyan', value: '#06b6d4' },
];

export const SpaceLayer: React.FC = () => {
    const {
        activeSpaceId,
        activeDepartmentId,
        setActiveFolder,
        departments,
        spacesByDepartment,
        foldersBySpace,
        nodesByFolder,
        isLoadingFolders,
        navigateToDepartment,
        loadFoldersForSpace,
        addFolder,
        viewLevel,
        activeFolderId,
    } = useMoraStore();

    const [viewMode, setViewMode] = useState<'mycelium' | 'grid' | 'list'>('mycelium');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({ name: '', color: FOLDER_COLORS[0].value });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [graphNodes, setGraphNodes] = useState<any[]>([]);
    const [graphRelations, setGraphRelations] = useState<RelationEdge[]>([]);
    const [isGraphLoading, setIsGraphLoading] = useState(false);

    // Get current space data
    const currentSpace = useMemo(() => {
        if (!activeDepartmentId || !activeSpaceId) return null;
        const spaces = spacesByDepartment[activeDepartmentId] || [];
        return spaces.find(s => s.id === activeSpaceId);
    }, [activeDepartmentId, activeSpaceId, spacesByDepartment]);

    // Get current department data for breadcrumb
    const currentDepartment = useMemo(() => {
        if (!activeDepartmentId) return null;
        return departments.find(d => d.id === activeDepartmentId);
    }, [activeDepartmentId, departments]);

    // Get folders and nodes for current space
    const folders = activeSpaceId ? (foldersBySpace[activeSpaceId] || []) : [];
    const spaceNodes: CoreNode[] = useMemo(() => {
        if (!activeSpaceId) return [];
        return folders.flatMap(f => nodesByFolder[f.id] || []);
    }, [activeSpaceId, folders, nodesByFolder]);

    // Filtered & sorted folders
    const filteredFolders = useMemo(() => {
        let result = [...folders];

        // Filter by search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(f => f.name.toLowerCase().includes(query));
        }

        // Sort by order then name
        result.sort((a, b) => {
            const orderA = a.order ?? 0;
            const orderB = b.order ?? 0;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
        });

        return result;
    }, [folders, searchQuery]);

    // Load folders when space becomes active
    useEffect(() => {
        if (activeSpaceId && !foldersBySpace[activeSpaceId]) {
            loadFoldersForSpace(activeSpaceId);
        }
    }, [activeSpaceId, foldersBySpace, loadFoldersForSpace]);

    // Build Mycelium data for current space (folders + nodes)
    useEffect(() => {
        if (activeSpaceId && viewMode === 'mycelium') {
            const loadGraph = async () => {
                setIsGraphLoading(true);
                // Mapper nodes
                const mapped = mapSpaceContentToMycelium(
                    folders,
                    spaceNodes,
                    { activeFolderId: activeFolderId, activeNodeId: null }
                );

                // Load real relations (optional)
                let relations: RelationEdge[] = [];
                try {
                    const res = await getRelationsForSpace(activeSpaceId);
                    relations = res.relations || [];
                } catch (err) {
                    console.warn("Relations for space unavailable", err);
                }

                // Merge relations into node connections (undirected)
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
    }, [activeSpaceId, viewMode, folders, spaceNodes, activeFolderId]);

    const handleBack = () => {
        if (activeDepartmentId) {
            navigateToDepartment(activeDepartmentId);
        }
    };

    const handleFolderClick = (folderId: string) => {
        setActiveFolder(folderId);
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSpaceId || !formData.name.trim()) return;

        setIsSubmitting(true);
        try {
            await addFolder({
                space_id: activeSpaceId,
                name: formData.name.trim(),
                color: formData.color,
            });
            setFormData({ name: '', color: FOLDER_COLORS[0].value });
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('Failed to create folder:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Only render if viewLevel is 'space'
    if (viewLevel !== 'space') return null;

    return (
        <div className="absolute inset-0 z-10 flex flex-col bg-gradient-to-br from-[#050505] to-[#0A0A0A]">
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
                                {currentSpace?.name || 'Space'}
                            </h2>
                            <div className="flex items-center gap-2 mt-1 text-xs text-emerald-500/50">
                                <span className="hover:text-emerald-400 cursor-pointer transition-colors">
                                    {currentDepartment?.name || 'Dept'}
                                </span>
                                <span>/</span>
                                <span className="text-emerald-400">
                                    {currentSpace?.name || 'Space'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Create Folder Button */}
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all group"
                        >
                            <Plus className="w-4 h-4 text-emerald-400 group-hover:rotate-90 transition-transform" />
                            <span className="text-sm text-emerald-300 transition-colors tracking-wider">
                                NEW FOLDER
                            </span>
                        </button>

                        {/* View Toggle */}
                        <div className="flex items-center bg-black/30 rounded-full p-1 border border-white/5">
                            <button
                                onClick={() => setViewMode('mycelium')}
                                className={`p-2 rounded-full transition-all ${viewMode === 'mycelium' ? 'bg-mora-gold/20 text-mora-gold' : 'text-emerald-500/40 hover:text-emerald-400'}`}
                                title="2.5D Mycelium Network"
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
                        placeholder="Search folders..."
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
                {isLoadingFolders && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                            <span className="text-sm text-emerald-500/70 font-mono tracking-widest">LOADING FOLDERS...</span>
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
                                    const node: any = graphNodes.find((n: any) => n.id === nodeId);
                                    if (node?.type === 'folder') {
                                        handleFolderClick(nodeId);
                                    }
                                }}
                            />
                        )}
                    </div>
                )}

                {/* Grid View */}
                {viewMode === 'grid' && !isLoadingFolders && (
                    <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                        {filteredFolders.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center">
                                <Folder className="w-16 h-16 text-emerald-500/20 mb-4" />
                                <p className="text-emerald-500/30 font-mono text-sm uppercase tracking-wider">
                                    {searchQuery ? 'No matching folders' : 'Empty Space'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-6 gap-5">
                                {filteredFolders.map((folder) => (
                                    <motion.button
                                        key={folder.id}
                                        className="group flex flex-col items-center gap-3 p-5 rounded-2xl hover:bg-gradient-to-br hover:from-emerald-500/10 hover:to-emerald-600/5 border border-transparent hover:border-emerald-500/20 transition-all duration-200"
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleFolderClick(folder.id)}
                                    >
                                        <div
                                            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 group-hover:border-emerald-500/30 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] flex items-center justify-center transition-all duration-200"
                                        >
                                            <Folder size={28} style={{ color: folder.color || '#10b981' }} />
                                        </div>
                                        <span className="text-xs text-white/60 group-hover:text-emerald-100 text-center font-medium leading-tight line-clamp-2 transition-colors duration-200 max-w-[90px]">
                                            {folder.name}
                                        </span>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* List View */}
                {viewMode === 'list' && !isLoadingFolders && (
                    <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                        {filteredFolders.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center">
                                <Folder className="w-16 h-16 text-emerald-500/20 mb-4" />
                                <p className="text-emerald-500/30 font-mono text-sm uppercase tracking-wider">
                                    {searchQuery ? 'No matching folders' : 'Empty Space'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredFolders.map((folder) => (
                                    <motion.button
                                        key={folder.id}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-emerald-600/5 border border-transparent hover:border-emerald-500/20 transition-all duration-200 text-left group"
                                        whileHover={{ x: 4 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => handleFolderClick(folder.id)}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 group-hover:border-emerald-500/30 flex items-center justify-center flex-shrink-0 transition-all">
                                            <Folder size={20} style={{ color: folder.color || '#10b981' }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-emerald-100 group-hover:text-emerald-50 truncate transition-colors">
                                                {folder.name}
                                            </div>
                                            <div className="text-xs text-emerald-500/40 group-hover:text-emerald-500/60 uppercase tracking-wider mt-0.5 transition-colors">
                                                Folder
                                            </div>
                                        </div>
                                        {folder.updated_at && (
                                            <div className="text-xs text-emerald-500/30 font-mono">
                                                {new Date(folder.updated_at).toLocaleDateString()}
                                            </div>
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Folder Modal */}
            <CreateModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setFormData({ name: '', color: FOLDER_COLORS[0].value });
                }}
                title="Create New Folder"
            >
                <form onSubmit={handleCreateFolder} className="space-y-6">
                    <div>
                        <label className="block text-sm text-emerald-400/70 mb-2 tracking-wider">
                            NAME *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-emerald-100 placeholder-emerald-500/30 focus:border-mora-gold/50 focus:outline-none transition-colors"
                            placeholder="Enter folder name"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-emerald-400/70 mb-2 tracking-wider">
                            COLOR
                        </label>
                        <div className="grid grid-cols-6 gap-2">
                            {FOLDER_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color: color.value })}
                                    className={`w-full aspect-square rounded-lg border-2 transition-all ${formData.color === color.value
                                        ? 'border-white scale-110'
                                        : 'border-white/20 hover:border-white/40'
                                        }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setIsCreateModalOpen(false);
                                setFormData({ name: '', color: FOLDER_COLORS[0].value });
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
                            {isSubmitting ? 'Creating...' : 'Create Folder'}
                        </button>
                    </div>
                </form>
            </CreateModal>
        </div>
    );
};
