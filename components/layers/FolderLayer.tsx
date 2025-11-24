"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { ArrowLeft, LayoutGrid, List, FileText, Image as ImageIcon, Link as LinkIcon, MoreHorizontal, Plus, File } from 'lucide-react';
import { motion } from 'framer-motion';
import { CreateModal } from '@/components/ui/CreateModal';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

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

    const [viewMode, setViewMode] = useState<'visual' | 'list'>('visual');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        type: 'note' as 'document' | 'task' | 'note' | 'link' | 'other',
        content: '',
        url: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                title: formData.title.trim(),
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
            <header className="flex items-center justify-between mb-8 z-20">
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

                    {/* View Toggle */}
                    <div className="flex items-center bg-black/20 rounded-full p-1 border border-white/5">
                        <button
                            onClick={() => setViewMode('visual')}
                            className={`p-2 rounded-full transition-all ${viewMode === 'visual' ? 'bg-emerald-500/20 text-emerald-300' : 'text-emerald-500/40 hover:text-emerald-400'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-emerald-500/20 text-emerald-300' : 'text-emerald-500/40 hover:text-emerald-400'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Loading State */}
            {isLoadingNodes && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-mora-gold/30 border-t-mora-gold rounded-full animate-spin" />
                </div>
            )}

            {/* Content Area */}
            {!isLoadingNodes && (
                <div className="flex-1 relative z-10">

                    {viewMode === 'visual' && (
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
                                            onClick={() => setActiveNode(node)}
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
                                <div className="flex flex-col items-center justify-center text-emerald-500/30 gap-4">
                                    <FileText size={48} className="opacity-50" />
                                    <p className="tracking-widest text-sm uppercase">No items in this folder</p>
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="mt-4 px-6 py-2 rounded-full glass-panel border border-emerald-500/30 hover:border-mora-gold/50 text-sm text-emerald-300 hover:text-mora-gold transition-all"
                                    >
                                        Add your first item
                                    </button>
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
                                        onClick={() => setActiveNode(node)}
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
                                <div className="flex flex-col items-center justify-center py-20 text-emerald-500/30">
                                    <FileText size={48} className="opacity-50 mb-4" />
                                    <p className="tracking-widest text-sm uppercase mb-4">No items yet</p>
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="px-6 py-2 rounded-full glass-panel border border-emerald-500/30 hover:border-mora-gold/50 text-sm text-emerald-300 hover:text-mora-gold transition-all"
                                    >
                                        Add your first item
                                    </button>
                                </div>
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
