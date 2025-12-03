"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { LayoutGrid, List, Folder, Plus, Network, Search, X } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { IntelligenceContextBar } from '@/components/layers/IntelligenceContextBar';
import { Mycelium25D } from '@/components/organic/Mycelium25D';
import { CreateModal } from '@/components/ui/CreateModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { mapSpaceContentToMycelium } from '@/lib/utils/myceliumDataMapper';
import { getRelationsForSpace, RelationEdge } from '@/lib/api/relationsClient';
import type { CoreNode } from '@/lib/types/core';
import { motion } from 'framer-motion';

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
    const [isGraphLoading, setIsGraphLoading] = useState(false);

    // Context Data
    const currentSpace = useMemo(() => {
        if (!activeDepartmentId || !activeSpaceId) return null;
        return spacesByDepartment[activeDepartmentId]?.find(s => s.id === activeSpaceId);
    }, [activeDepartmentId, activeSpaceId, spacesByDepartment]);

    const currentDepartment = departments.find(d => d.id === activeDepartmentId);

    const folders = activeSpaceId ? (foldersBySpace[activeSpaceId] || []) : [];
    const spaceNodes: CoreNode[] = useMemo(() => {
        if (!activeSpaceId) return [];
        return folders.flatMap(f => nodesByFolder[f.id] || []);
    }, [activeSpaceId, folders, nodesByFolder]);

    // Filter Logic
    const filteredFolders = useMemo(() => {
        if (!searchQuery.trim()) return folders;
        const query = searchQuery.toLowerCase();
        return folders.filter(f => f.name.toLowerCase().includes(query));
    }, [folders, searchQuery]);

    // Load Data
    useEffect(() => {
        if (activeSpaceId && !foldersBySpace[activeSpaceId]) {
            loadFoldersForSpace(activeSpaceId);
        }
    }, [activeSpaceId, foldersBySpace, loadFoldersForSpace]);

    // Load Graph
    useEffect(() => {
        if (activeSpaceId && viewMode === 'mycelium') {
            const loadGraph = async () => {
                setIsGraphLoading(true);
                const mapped = mapSpaceContentToMycelium(
                    folders,
                    spaceNodes,
                    { activeFolderId: activeFolderId, activeNodeId: null }
                );
                setGraphNodes(mapped);
                setIsGraphLoading(false);
            };
            loadGraph();
        }
    }, [activeSpaceId, viewMode, folders, spaceNodes, activeFolderId]);

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

    if (viewLevel !== 'space' || !activeSpaceId) return null;

    const breadcrumb = [
        { label: 'Home', onClick: () => { } },
        { label: currentDepartment?.name || 'Dept', onClick: () => activeDepartmentId && navigateToDepartment(activeDepartmentId) },
        { label: currentSpace?.name || 'Space' }
    ];

    return (
        <div className="relative w-full h-full flex items-center justify-center p-6">

            {/* Context Bar */}
            <IntelligenceContextBar
                breadcrumb={breadcrumb}
                activeCount={folders.length}
                riskLevel="none"
            />

            {/* Glass Panel */}
            <GlassPanel
                title={currentSpace?.name || 'Space'}
                showBackButton
                onBack={() => activeDepartmentId && navigateToDepartment(activeDepartmentId)}
                width="full"
                height="full"
                blurIntensity={15}
                opacity={0.9}
            >
                <div className="flex flex-col h-full">

                    {/* Toolbar */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
                                <button
                                    onClick={() => setViewMode('mycelium')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'mycelium' ? 'bg-mora-gold/20 text-mora-gold' : 'text-white/40 hover:text-white'}`}
                                >
                                    <Network size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/40 hover:text-white'}`}
                                >
                                    <LayoutGrid size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/40 hover:text-white'}`}
                                >
                                    <List size={18} />
                                </button>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search folders..."
                                    className="pl-9 pr-4 py-2 rounded-lg bg-black/20 border border-white/5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30 w-48 transition-all focus:w-64"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 transition-all text-sm tracking-wide"
                        >
                            <Plus size={16} />
                            NEW FOLDER
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 relative overflow-hidden">
                        {isLoadingFolders && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 backdrop-blur-sm">
                                <LoadingState message="Loading space folders..." />
                            </div>
                        )}

                        {viewMode === 'mycelium' && (
                            <div className="absolute inset-0">
                                <Mycelium25D
                                    nodes={graphNodes}
                                    onNodeClick={(nodeId) => {
                                        const node: any = graphNodes.find((n: any) => n.id === nodeId);
                                        if (node?.type === 'folder') setActiveFolder(nodeId);
                                    }}
                                    activeNodeId={activeFolderId}
                                    variant="space"
                                />
                            </div>
                        )}

                        {viewMode === 'grid' && !isLoadingFolders && (
                            <div className="h-full overflow-y-auto p-6 custom-scrollbar">
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {filteredFolders.map((folder) => (
                                        <motion.button
                                            key={folder.id}
                                            onClick={() => setActiveFolder(folder.id)}
                                            whileHover={{ scale: 1.02, y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-white/10 transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-lg bg-black/20 flex items-center justify-center">
                                                <Folder size={24} style={{ color: folder.color || '#10b981' }} />
                                            </div>
                                            <span className="text-sm text-white/70 group-hover:text-white text-center line-clamp-2">
                                                {folder.name}
                                            </span>
                                        </motion.button>
                                    ))}
                                </div>
                                {filteredFolders.length === 0 && <EmptyState icon={Folder} title="No folders found" description="Create a new folder to get started." />}
                            </div>
                        )}

                        {viewMode === 'list' && !isLoadingFolders && (
                            <div className="h-full overflow-y-auto p-6 custom-scrollbar">
                                <div className="flex flex-col gap-2">
                                    {filteredFolders.map((folder) => (
                                        <button
                                            key={folder.id}
                                            onClick={() => setActiveFolder(folder.id)}
                                            className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-white/10 transition-all text-left group"
                                        >
                                            <div className="p-2 rounded bg-black/20">
                                                <Folder size={18} style={{ color: folder.color || '#10b981' }} />
                                            </div>
                                            <span className="text-white/70 group-hover:text-white flex-1">
                                                {folder.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                {filteredFolders.length === 0 && <EmptyState icon={Folder} title="No folders found" description="Create a new folder to get started." />}
                            </div>
                        )}
                    </div>
                </div>
            </GlassPanel>

            {/* Create Modal */}
            <CreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Folder"
            >
                <form onSubmit={handleCreateFolder} className="space-y-6">
                    <div>
                        <label className="block text-sm text-emerald-400/70 mb-2 tracking-wider">NAME</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white focus:border-emerald-500/50 outline-none"
                            autoFocus
                            required
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
                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:bg-white/5">Cancel</button>
                        <button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30">Create</button>
                    </div>
                </form>
            </CreateModal>
        </div>
    );
};
