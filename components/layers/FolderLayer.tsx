"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { ArrowLeft, LayoutGrid, List, FileText, Image as ImageIcon, Link as LinkIcon, MoreHorizontal, Plus, File, Zap, Network } from 'lucide-react';
import { motion } from 'framer-motion';
import { CreateModal } from '@/components/ui/CreateModal';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
// Sprint Tag 3-5: Intel Client
import { triggerMoraScan } from '@/lib/api/intelClient';
// NEW: 2.5D Mycelium Visualization (Blueprint-konform)
import { Mycelium25D } from '@/components/organic/Mycelium25D';
import { mapNodesToMycelium } from '@/lib/utils/myceliumDataMapper';

const NODE_TYPES = [
    { value: 'note' as const, label: 'Note', icon: FileText },
    { value: 'link' as const, label: 'Link', icon: LinkIcon },
    { value: 'document' as const, label: 'Document', icon: File },
    { value: 'other' as const, label: 'Other', icon: MoreHorizontal },
];

export const FolderLayer: React.FC = () => {
    const {
        activeSpaceId,
        activeFolderId,
        activeDepartmentId,
        activeNode,
        foldersBySpace,
        nodesByFolder,
        isLoadingNodes,
        departments,
        spacesByDepartment,
        navigateToCore,
        navigateToDepartment,
        navigateToSpace,
        loadNodesForFolder,
        addNode,
        setActiveNode,
    } = useMoraStore();

    const [viewMode, setViewMode] = useState<'mycelium' | 'grid' | 'list'>('mycelium');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [formData, setFormData] = useState({
        title: '',
        type: 'note' as 'document' | 'task' | 'note' | 'link' | 'other',
        content: '',
        url: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Sprint Tag 3-5: MÔRA Scan State
    const [isScanning, setIsScanning] = useState(false);

    // Get current folder
    const currentFolder = useMemo(() => {
        if (!activeSpaceId || !activeFolderId) return null;
        const folders = foldersBySpace[activeSpaceId] || [];
        return folders.find(f => f.id === activeFolderId);
    }, [activeSpaceId, activeFolderId, foldersBySpace]);

    // Get current department and space for breadcrumb
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

    // Load nodes when folder becomes active
    useEffect(() => {
        if (activeFolderId && !nodesByFolder[activeFolderId]) {
            loadNodesForFolder(activeFolderId);
        }
    }, [activeFolderId, nodesByFolder, loadNodesForFolder]);

    // Debounced search and filter effect
    useEffect(() => {
        if (!activeFolderId) return;

        const timer = setTimeout(() => {
            const options: { search?: string, type?: string } = {};
            if (searchQuery.trim()) options.search = searchQuery.trim();
            if (typeFilter && typeFilter !== 'all') options.type = typeFilter;

            loadNodesForFolder(activeFolderId, options);
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery, typeFilter, activeFolderId, loadNodesForFolder]);

    const handleBack = () => {
        if (activeSpaceId) {
            navigateToSpace(activeSpaceId);
        }
    };

    const handleCreateNode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeFolderId || !formData.title.trim()) return;

        setIsSubmitting(true);
        try {
            await addNode({
                folder_id: activeFolderId,
                name: formData.title.trim(),
                type: formData.type,
                content: formData.content.trim() || undefined,
                url: formData.url.trim() || undefined,
            });
            setFormData({ title: '', type: 'note', content: '', url: '' });
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('Failed to create node:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getNodeIcon = (type: string) => {
        switch (type) {
            case 'document': return FileText;
            case 'link': return LinkIcon;
            case 'note': return FileText;
            default: return File;
        }
    };

    const getNodeColor = (type: string) => {
        switch (type) {
            case 'document': return 'text-emerald-400';
            case 'link': return 'text-blue-400';
            case 'note': return 'text-purple-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="relative w-full h-full p-10 flex flex-col">

            {/* Header / Nav */}
            <header className="flex flex-col gap-4 mb-8 z-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={handleBack}
                            className="p-3 rounded-full glass-panel border border-white/10 hover:bg-white/5 transition-colors group"
                        >
                            <ArrowLeft className="w-5 h-5 text-emerald-400 group-hover:text-mora-gold transition-colors" />
                        </button>
                        <div>
                            <h2 className="text-2xl font-light text-emerald-50 tracking-widest uppercase">
                                {currentFolder?.name || 'Folder'}
                            </h2>
                            <Breadcrumb items={[
                                { label: 'ROOT', onClick: navigateToCore },
                                { label: currentDepartment?.name || 'Dept', onClick: () => activeDepartmentId && navigateToDepartment(activeDepartmentId) },
                                { label: currentSpace?.name || 'Space', onClick: () => activeSpaceId && navigateToSpace(activeSpaceId) },
                                { label: currentFolder?.name || 'Folder', isActive: true }
                            ]} />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* MÔRA Scan Button - Sprint Tag 3-5 */}
                        <button
                            onClick={async () => {
                                if (!activeFolderId || isScanning) return;
                                setIsScanning(true);
                                try {
                                    const result = await triggerMoraScan(activeFolderId);
                                    // Reload nodes to show new intel_report
                                    await loadNodesForFolder(activeFolderId);
                                    // Trigger Mycelium event (Tag 5-7)
                                    window.dispatchEvent(new CustomEvent('intel-report-created', { detail: result }));
                                    console.log('[MÔRA Scan] Intel report created:', result.title);
                                } catch (error) {
                                    console.error('[MÔRA Scan] Failed:', error);
                                    alert(`MÔRA Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                } finally {
                                    setIsScanning(false);
                                }
                            }}
                            disabled={!activeFolderId || isScanning}
                            className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-mora-gold/30 hover:border-mora-gold/50 hover:bg-white/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Zap className={`w-4 h-4 text-mora-gold transition-all ${isScanning ? 'animate-pulse' : 'group-hover:scale-110'}`} />
                            <span className="text-sm text-mora-gold transition-colors tracking-wider">
                                {isScanning ? 'SCANNING...' : 'MÔRA SCAN'}
                            </span>
                        </button>

                        {/* Add Item Button */}
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-emerald-500/30 hover:border-mora-gold/50 hover:bg-white/5 transition-all group"
                        >
                            <Plus className="w-4 h-4 text-emerald-400 group-hover:text-mora-gold transition-colors" />
                            <span className="text-sm text-emerald-300 group-hover:text-mora-gold transition-colors tracking-wider">
                                ADD ITEM
                            </span>
                        </button>

                        {/* View Toggle - 3 modes: Mycelium (3D), Grid, List */}
                        <div className="flex items-center bg-black/20 rounded-full p-1 border border-white/5">
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

                {/* Search and Filter Bar */}
                <div className="flex items-center gap-3">
                    {/* Search Input */}
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search items..."
                            className="w-full px-4 py-2.5 pl-10 rounded-xl bg-black/30 border border-white/10 text-emerald-100 placeholder-emerald-500/30 focus:border-mora-gold/50 focus:outline-none transition-colors text-sm"
                        />
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/40" />
                    </div>

                    {/* Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-emerald-100 focus:border-mora-gold/50 focus:outline-none transition-colors text-sm cursor-pointer"
                    >
                        <option value="all">All Types</option>
                        <option value="note">Notes</option>
                        <option value="document">Documents</option>
                        <option value="link">Links</option>
                        <option value="other">Other</option>
                    </select>

                    {/* Clear Filters */}
                    {(searchQuery || typeFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setTypeFilter('all');
                            }}
                            className="px-4 py-2.5 rounded-xl border border-white/10 text-emerald-400/70 hover:text-emerald-300 hover:border-white/20 transition-all text-sm"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </header>

            {/* Loading State */}
            {isLoadingNodes && (
                <div className="flex-1 flex items-center justify-center">
                    <LoadingState message="Loading data nodes..." />
                </div>
            )}

            {/* Content Area */}
            {!isLoadingNodes && (
                <div className="flex-1 relative z-10">

                    {/* NEW: 2.5D Mycelium View */}
                    {viewMode === 'mycelium' && (
                        <div className="absolute inset-0">
                            <Mycelium25D
                                nodes={mapNodesToMycelium(nodes, {
                                    useSemanticConnections: true,
                                    activeNodeId: activeNode?.id || null
                                })}
                                onNodeClick={(nodeId) => {
                                    const node = nodes.find(n => n.id === nodeId);
                                    if (node) {
                                        console.log('[FolderLayer] 2.5D Node clicked:', node.title, node.id);
                                        setActiveNode(node);
                                    }
                                }}
                                activeNodeId={activeNode?.id || null}
                                variant="node"
                            />

                            {/* Empty State for Mycelium */}
                            {nodes.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <EmptyState
                                        icon={Network}
                                        title="Empty Network"
                                        description="This folder contains no data nodes. Initialize it by adding your first item."
                                        actionLabel="Add Item"
                                        onAction={() => setIsCreateModalOpen(true)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {viewMode === 'grid' && (
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                            {/* Neural Network Visuals */}
                            <div className="grid grid-cols-3 gap-8">
                                {nodes.map((node, i) => {
                                    const Icon = getNodeIcon(node.type);
                                    const colorClass = getNodeColor(node.type);

                                    return (
                                        <motion.div
                                            key={node.id}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.1 }}
                                            onClick={() => {
                                                console.log('[FolderLayer] Node clicked:', node.title, node.id);
                                                setActiveNode(node);
                                            }}
                                            className="w-32 h-32 rounded-2xl glass-panel border border-white/10 flex flex-col items-center justify-center gap-3 hover:border-mora-gold/50 hover:bg-white/5 transition-all cursor-pointer group"
                                        >
                                            <Icon className={`w-8 h-8 ${colorClass} group-hover:text-mora-gold transition-colors`} />
                                            <span className="text-[10px] text-emerald-100/70 text-center px-2 truncate w-full">
                                                {node.title}
                                            </span>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Empty State */}
                            {nodes.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <EmptyState
                                        icon={FileText}
                                        title="Empty Folder"
                                        description="This folder contains no data nodes. Initialize it by adding your first item."
                                        actionLabel="Add Item"
                                        onAction={() => setIsCreateModalOpen(true)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {viewMode === 'list' && (
                        <div className="p-8 glass-panel border border-white/5 rounded-3xl h-full overflow-y-auto custom-scrollbar">
                            {/* List Header */}
                            <div className="flex items-center gap-4 pb-4 mb-4 border-b border-white/5 text-emerald-400/50 text-xs uppercase tracking-wider">
                                <span className="w-8"></span>
                                <span className="flex-1">Name</span>
                                <span className="w-24">Type</span>
                                <span className="w-32">Updated</span>
                                <span className="w-10"></span>
                            </div>

                            {/* Node List */}
                            {nodes.map((node) => {
                                const Icon = getNodeIcon(node.type);
                                const colorClass = getNodeColor(node.type);

                                return (
                                    <div
                                        key={node.id}
                                        onClick={() => {
                                            console.log('[FolderLayer] Node clicked (list):', node.title, node.id);
                                            setActiveNode(node);
                                        }}
                                        className="flex items-center gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                                    >
                                        <div className="w-8 flex justify-center">
                                            <Icon className={`w-4 h-4 ${colorClass}`} />
                                        </div>
                                        <span className="flex-1 text-emerald-100/80 group-hover:text-white transition-colors text-sm">
                                            {node.title}
                                        </span>
                                        <span className="w-24 text-emerald-500/40 text-xs capitalize">{node.type}</span>
                                        <span className="w-32 text-emerald-500/40 text-xs">
                                            {node.created_at ? new Date(node.created_at).toLocaleDateString() : 'Today'}
                                        </span>
                                        <button className="w-10 flex justify-center text-emerald-500/30 hover:text-emerald-300">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}

                            {/* Empty State */}
                            {nodes.length === 0 && (
                                <EmptyState
                                    icon={FileText}
                                    title="Empty Folder"
                                    description="This folder contains no data nodes. Initialize it by adding your first item."
                                    actionLabel="Add Item"
                                    onAction={() => setIsCreateModalOpen(true)}
                                />
                            )}
                        </div>
                    )}

                </div>
            )}

            {/* Create Node Modal */}
            <CreateModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setFormData({ title: '', type: 'note', content: '', url: '' });
                }}
                title="Add New Item"
            >
                <form onSubmit={handleCreateNode} className="space-y-4">
                    <div>
                        <label className="block text-xs text-emerald-400/70 mb-1.5 tracking-wider">
                            TITLE *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-emerald-100 placeholder-emerald-500/30 focus:border-mora-gold/50 focus:outline-none transition-colors text-sm"
                            placeholder="Enter item title"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-emerald-400/70 mb-1.5 tracking-wider">
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
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${formData.type === type.value
                                            ? 'border-mora-gold/50 bg-emerald-600/20 text-emerald-100'
                                            : 'border-white/10 text-emerald-400/70 hover:border-white/20'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="text-xs">{type.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {formData.type === 'link' && (
                        <div>
                            <label className="block text-xs text-emerald-400/70 mb-1.5 tracking-wider">
                                URL
                            </label>
                            <input
                                type="url"
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-emerald-100 placeholder-emerald-500/30 focus:border-mora-gold/50 focus:outline-none transition-colors text-sm"
                                placeholder="https://example.com"
                            />
                        </div>
                    )}

                    {formData.type === 'note' && (
                        <div>
                            <label className="block text-xs text-emerald-400/70 mb-1.5 tracking-wider">
                                CONTENT
                            </label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-emerald-100 placeholder-emerald-500/30 focus:border-mora-gold/50 focus:outline-none transition-colors resize-none text-sm"
                                placeholder="Note content"
                                rows={3}
                            />
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsCreateModalOpen(false);
                                setFormData({ title: '', type: 'note', content: '', url: '' });
                            }}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-emerald-400 hover:bg-white/5 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.title.trim()}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-600/30 hover:border-mora-gold/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Item'}
                        </button>
                    </div>
                </form>
            </CreateModal>

        </div>
    );
};
