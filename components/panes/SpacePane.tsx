"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { LayoutGrid, List, Folder, Plus, Network, Search, Trash2, RefreshCw, ChevronRight, FileText, Image as ImageIcon, Link as LinkIcon, CheckSquare, Box } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { CreateModal } from '@/components/ui/CreateModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { mapFoldersToMycelium, mapNodesToMycelium } from '@/lib/utils/myceliumDataMapper';
import { Mycelium25D } from '@/components/organic/Mycelium25D';
import type { CoreNode, CoreFolder } from '@/lib/types/core';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/lib/toast';

// Type Icons Mapping
const TYPE_ICONS: Record<string, any> = {
    document: FileText,
    image: ImageIcon,
    link: LinkIcon,
    task: CheckSquare,
    folder: Folder,
    other: Box,
    note: FileText,
    intel_report: FileText,
};

const FOLDER_COLORS = [
    { name: 'Emerald', value: '#10b981' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Cyan', value: '#06b6d4' },
];

const getDeterministicPosition = (id: string, index: number, total: number) => {
    // Use ID to seed random-like but deterministic position
    const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const angle = (index / total) * Math.PI * 2 + (seed % 10);
    const radius = 30 + (seed % 40); // 30-70% from center

    // Convert to percentage coordinates (0-100)
    const x = 50 + Math.cos(angle) * (radius / 2); // Divide by 2 to keep roughly in view (0-100 scale is slightly off for aspect ratio but ok for stars)
    const y = 50 + Math.sin(angle) * (radius / 2);

    return { x, y };
};

export const SpacePane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, openPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(id);

    const {
        activeSpaceId,
        activeDepartmentId,
        spacesByDepartment,
        foldersBySpace,
        isLoadingFolders,
        loadFoldersForSpace,
        addFolder,
        deleteSpace,
        loadSpacesForDepartment,
        loadNodesForFolder,
    } = useMoraStore();

    // Local state
    const [activeFolder, setActiveFolderLocal] = useState<string | null>(null);
    const [folderNodes, setFolderNodes] = useState<any[]>([]);

    // Explorer State
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

    // Local state for the pane
    const [viewMode, setViewMode] = useState<'mycelium' | 'grid' | 'list'>('grid');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({ name: '', color: FOLDER_COLORS[0].value });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [graphNodes, setGraphNodes] = useState<any[]>([]);

    const targetSpaceId = pane?.data?.spaceId || activeSpaceId;
    const targetDepartmentId = pane?.data?.departmentId || activeDepartmentId;

    // FIX: Search for space across ALL departments, not just activeDepartmentId
    // This fixes the bug where SpacePane opened via Pane couldn't find its data
    const currentSpace = useMemo(() => {
        if (!targetSpaceId) return null;

        // First try the pane-provided department (best path)
        if (targetDepartmentId && spacesByDepartment[targetDepartmentId]) {
            const found = spacesByDepartment[targetDepartmentId].find(s => s.id === targetSpaceId);
            if (found) return found;
        }

        // Fallback: Search across all departments
        for (const deptId of Object.keys(spacesByDepartment)) {
            const found = spacesByDepartment[deptId]?.find(s => s.id === targetSpaceId);
            if (found) return found;
        }

        return null;
    }, [targetDepartmentId, targetSpaceId, spacesByDepartment]);



    const items = activeFolder ? folderNodes : (targetSpaceId ? (foldersBySpace[targetSpaceId] || []) : []);

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items;
        const query = searchQuery.toLowerCase();
        return items.filter(f => (f.name || f.title || '').toLowerCase().includes(query));
    }, [items, searchQuery]);

    // Prepare Graph Data
    useEffect(() => {
        if (viewMode === 'mycelium') {
            let nodes: any[] = [];

            if (activeFolder) {
                // Folder View: Show Nodes inside
                // Cast items to CoreNode[] because we know context
                nodes = mapNodesToMycelium(filteredItems as unknown as CoreNode[], {
                    activeNodeId: selectedNodeId || hoveredNodeId
                });
            } else {
                // Space View: Show Folders (and potentially loose nodes if we had mixed view)
                // Cast items to CoreFolder[]
                nodes = mapFoldersToMycelium(filteredItems as unknown as CoreFolder[], selectedNodeId);
            }

            setGraphNodes(nodes);
        }
    }, [filteredItems, viewMode, activeFolder, selectedNodeId, hoveredNodeId]);

    // Load folders if needed
    useEffect(() => {
        if (targetSpaceId && !foldersBySpace[targetSpaceId]) {
            loadFoldersForSpace(targetSpaceId);
        }
    }, [targetSpaceId, foldersBySpace, loadFoldersForSpace]);

    // Load folder contents when drill down
    useEffect(() => {
        if (activeFolder) {
            const loadNodes = async () => {
                await loadNodesForFolder(activeFolder);
                const nodes = useMoraStore.getState().nodesByFolder[activeFolder] || [];
                setFolderNodes(nodes);
            };
            loadNodes();
        }
    }, [activeFolder, loadNodesForFolder]);



    // ... (rest of local state) ...

    const handleOpenNode = (node: any) => {
        if (!node) return;
        if (node.type === 'folder' || (!node.type && node.children === undefined)) {
            setActiveFolderLocal(node.id);
            return;
        }

        openPane({
            id: `document-${node.id}`,
            type: 'document',
            title: node.title || 'Document',
            data: { nodeId: node.id },
            size: { width: 800, height: 600 }
        });
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetSpaceId || !formData.name.trim()) return;

        setIsSubmitting(true);
        try {
            // Check if this is a demo space
            if (String(targetSpaceId).startsWith('space-') && !String(targetSpaceId).match(/^[0-9a-fA-F-]{36}$/)) {
                throw new Error("Cannot modify demo spaces. Create a real space to add folders.");
            }

            await addFolder({
                space_id: targetSpaceId,
                name: formData.name.trim(),
                color: formData.color,
            });
            setFormData({ name: '', color: FOLDER_COLORS[0].value });
            setIsCreateModalOpen(false);
            toast.success("Folder created successfully");
        } catch (error: any) {
            console.error('Failed to create folder:', error);
            if (error.message.includes("Cannot modify demo") || error.message.includes("not found")) {
                toast.error("Demo Mode: Cannot modify example spaces.");
            } else {
                toast.error("Failed to create folder");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handlers

    const handleDeleteSpace = async () => {
        if (!targetSpaceId) return toast.error("No space selected");
        try {
            await deleteSpace(targetSpaceId);
            toast.success("Space deleted");
            removePane(id); // Close window on delete
            if (activeDepartmentId) {
                await loadSpacesForDepartment(activeDepartmentId);
            }
        } catch (e: any) {
            toast.error(e?.message || "Failed to delete space");
        }
    };


    if (!pane) return null;

    return (
        <GlassPanel
            title={
                <div className="flex items-center gap-2 text-sm">
                    <span className="opacity-50 hover:opacity-100 cursor-pointer transition-opacity" onClick={() => setActiveFolderLocal(null)}>
                        {currentSpace?.name || 'Space'}
                    </span>
                    {activeFolder && (
                        <>
                            <ChevronRight size={14} className="opacity-30" />
                            <span className="text-emerald-400 font-medium">
                                {folderNodes.find(n => n.id === activeFolder)?.title || 'Folder'}
                            </span>
                        </>
                    )}
                </div>
            }
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            onResize={(w, h) => updatePaneSize(id, w, h)}
            showBackButton={!!activeFolder}
            onBack={() => setActiveFolderLocal(null)}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={true}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="flex flex-col h-full">
                {/* Toolbar */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0 bg-black/20">
                    <div className="flex items-center gap-2">
                        {/* Only show view toggles in Space root view */}
                        {!activeFolder && (
                            <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
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
                                <button
                                    onClick={() => setViewMode('mycelium')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'mycelium' ? 'bg-purple-500/20 text-purple-400' : 'text-white/40 hover:text-white'}`}
                                    title="Constellation View"
                                >
                                    <Network size={18} />
                                </button>
                            </div>
                        )}

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="pl-9 pr-4 py-2 rounded-lg bg-black/20 border border-white/5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30 w-48 transition-all focus:w-64"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!activeFolder && (
                            <>
                                <button
                                    onClick={handleDeleteSpace}
                                    className="p-2 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                                    title="Delete Space"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button
                                    onClick={() => targetSpaceId && loadFoldersForSpace(targetSpaceId)}
                                    className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                    title="Refresh"
                                >
                                    <RefreshCw size={18} />
                                </button>
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 transition-all text-sm tracking-wide"
                                >
                                    <Plus size={16} />
                                    NEW FOLDER
                                </button>

                            </>
                        )}
                        {activeFolder && (
                            <div className="text-xs text-white/40 uppercase tracking-widest px-4">
                                Viewing Folder
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Browser Area */}
                    <div className="flex-1 relative overflow-hidden bg-black/40">
                        {/* Loading Overlay - outside AnimatePresence to avoid 'wait' mode issues */}
                        {isLoadingFolders && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 backdrop-blur-sm">
                                <LoadingState message="Loading contents..." />
                            </div>
                        )}

                        <AnimatePresence mode="wait">

                            {/* FOLDER CONTENTS VIEW */}
                            {activeFolder ? (
                                <motion.div
                                    key="folder-view"
                                    initial={{ x: 50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 50, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="h-full overflow-y-auto p-6 custom-scrollbar"
                                    onClick={() => setSelectedNodeId(null)}
                                >
                                    <div className="grid grid-cols-4 gap-4">
                                        {folderNodes.map((node) => {
                                            const Icon = TYPE_ICONS[node.type] || Box;
                                            const isSelected = selectedNodeId === node.id;
                                            return (
                                                <div
                                                    key={node.id}
                                                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-white/5 border-white/5 hover:border-emerald-500/30 hover:bg-white/10'}`}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
                                                    onDoubleClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenNode(node);
                                                    }}
                                                    onMouseEnter={() => setHoveredNodeId(node.id)}
                                                    onMouseLeave={() => setHoveredNodeId(null)}
                                                >
                                                    <div className={`w-12 h-12 flex items-center justify-center rounded-xl bg-black/20 ${isSelected ? 'text-emerald-400' : 'text-white/60'}`}>
                                                        <Icon size={24} />
                                                    </div>
                                                    <span className={`text-xs text-center line-clamp-2 ${isSelected ? 'text-white font-medium' : 'text-white/70'}`}>{node.title || node.name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {folderNodes.length === 0 && <EmptyState icon={Folder} title="Empty Folder" description="No items found." />}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="space-view"
                                    initial={{ x: -50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -50, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute inset-0"
                                    onClick={() => setSelectedNodeId(null)}
                                >
                                    {viewMode === 'mycelium' && (
                                        <div className="absolute inset-0 z-0">
                                            <Mycelium25D
                                                nodes={graphNodes}
                                                onNodeClick={(id) => {
                                                    const item = items.find(n => n.id === id);
                                                    if (item) handleOpenNode(item);
                                                }}
                                                activeNodeId={selectedNodeId || hoveredNodeId}
                                                variant={activeFolder ? 'folder' : 'space'}
                                            />
                                        </div>
                                    )}

                                    {viewMode === 'grid' && !isLoadingFolders && (
                                        <div className="h-full overflow-y-auto p-6 custom-scrollbar">
                                            <div className="grid grid-cols-4 gap-4">
                                                {filteredItems.map((folder) => {
                                                    const isSelected = selectedNodeId === folder.id;
                                                    return (
                                                        <motion.div
                                                            key={folder.id}
                                                            onClick={(e) => { e.stopPropagation(); setSelectedNodeId(folder.id); }}
                                                            onDoubleClick={(e) => { e.stopPropagation(); setActiveFolderLocal(folder.id); }}
                                                            onMouseEnter={() => setHoveredNodeId(folder.id)}
                                                            onMouseLeave={() => setHoveredNodeId(null)}
                                                            whileHover={{ scale: 1.02, y: -2 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-white/5 border-white/5 hover:border-emerald-500/30 hover:bg-white/10'}`}
                                                        >
                                                            <div className={`w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center ${isSelected ? 'text-emerald-400' : 'text-white/60'}`}>
                                                                <Folder size={24} style={{ color: folder.color || '#10b981' }} />
                                                            </div>
                                                            <span className={`text-xs text-center line-clamp-2 ${isSelected ? 'text-white font-medium' : 'text-white/70'}`}>
                                                                {folder.name}
                                                            </span>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                            {filteredItems.length === 0 && <EmptyState icon={Folder} title="Empty Space" description="No folders yet." />}
                                        </div>
                                    )}

                                    {viewMode === 'list' && !isLoadingFolders && (
                                        <div className="h-full overflow-y-auto p-4 custom-scrollbar">
                                            <div className="flex flex-col gap-1">
                                                {filteredItems.map((folder) => {
                                                    const isSelected = selectedNodeId === folder.id;
                                                    return (
                                                        <div
                                                            key={folder.id}
                                                            onClick={(e) => { e.stopPropagation(); setSelectedNodeId(folder.id); }}
                                                            onDoubleClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenNode({ ...folder, type: 'folder' });
                                                            }}
                                                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${isSelected ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-white/5 border-white/5 hover:border-emerald-500/30 hover:bg-white/10'}`}
                                                        >
                                                            <Folder size={18} style={{ color: folder.color || '#10b981' }} />
                                                            <span className={`text-sm flex-1 ${isSelected ? 'text-white font-medium' : 'text-white/70'}`}>{folder.name}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>

                <CreateModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    title="New Folder"
                >
                    <form onSubmit={handleCreateFolder} className="space-y-4">
                        <div>
                            <label className="block text-xs text-emerald-400/70 mb-1.5 tracking-wider">NAME</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-white focus:border-emerald-500/50 outline-none text-sm"
                                autoFocus
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-emerald-400/70 mb-1.5 tracking-wider">COLOR</label>
                            <div className="flex gap-2">
                                {FOLDER_COLORS.map((color) => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, color: color.value })}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${formData.color === color.value ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                        style={{ backgroundColor: color.value }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 hover:bg-white/5 text-sm">Cancel</button>
                            <button type="submit" className="flex-1 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 text-sm">Create</button>
                        </div>
                    </form>
                </CreateModal>
            </div>
        </GlassPanel >
    );
};
