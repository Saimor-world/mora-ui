"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Image as ImageIcon, Link as LinkIcon, CheckSquare, Box, Folder, Plus, ArrowRight, X, Settings } from "lucide-react";
import { useMoraStore } from "@/lib/store/moraState";
import { CreateModal } from "@/components/ui/CreateModal";
import type { CoreNode } from "@/lib/types/core";
import { toast } from "@/lib/toast";

export interface RoomItem {
    id: string;
    title: string;
    type: "document" | "image" | "link" | "task" | "folder" | "other" | "note" | "intel_report";
    color?: string;
}

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

const TYPE_COLORS: Record<string, string> = {
    document: "text-emerald-400",
    image: "text-purple-400",
    link: "text-blue-400",
    task: "text-amber-400",
    folder: "text-white",
    other: "text-gray-400",
    note: "text-yellow-200",
    intel_report: "text-mora-gold",
};

/**
 * Folder Quick View - Modal for quick folder overview
 * Close → back to space, Open Folder → enter folder view
 */
export default function FolderRoom() {
    const {
        activeFolderId,
        activeSpaceId,
        setActiveFolder,
        loadNodesForFolder,
        loadNodeDetails,
        setActiveNode,
        foldersBySpace,
        addNode,
        updateNode,
        deleteNode,
        viewLevel,
        setViewLevel
    } = useMoraStore();

    const [items, setItems] = useState<RoomItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'note' as 'document' | 'task' | 'note' | 'link' | 'other',
        content: '',
        url: ''
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const NODE_TYPES = [
        { value: 'note' as const, label: 'Note', icon: FileText },
        { value: 'link' as const, label: 'Link', icon: LinkIcon },
        { value: 'document' as const, label: 'Document', icon: FileText },
        { value: 'task' as const, label: 'Task', icon: CheckSquare },
    ];

    const currentFolderName = useMemo(() => {
        if (!activeFolderId || !activeSpaceId) return "Folder";
        const folders = foldersBySpace[activeSpaceId] || [];
        return folders.find((f) => f.id === activeFolderId)?.name || "Folder";
    }, [activeFolderId, activeSpaceId, foldersBySpace]);

    useEffect(() => {
        if (!activeFolderId) {
            setItems([]);
            return;
        }

        const loadData = async () => {
            setIsLoading(true);
            try {
                await loadNodesForFolder(activeFolderId);
                const nodes = useMoraStore.getState().nodesByFolder[activeFolderId] || [];
                if (nodes.length > 0) {
                    const mapped: RoomItem[] = nodes.map((n: CoreNode) => ({
                        id: (n as any).id,
                        title: (n as any).title || (n as any).name || "Untitled",
                        type: ((n as any).type as RoomItem["type"]) || "other",
                    }));
                    setItems(mapped);
                } else {
                    setItems([]);
                }
            } catch (err) {
                console.error("Failed to load folder nodes", err);
                setItems([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [activeFolderId, loadNodesForFolder]);

    // Close modal - back to space view (Mycelium)
    const handleClose = () => {
        setActiveFolder(null);
        setViewLevel('space');
    };

    // Open full folder view
    const handleOpenFolder = () => {
        if (activeFolderId) {
            setViewLevel('folder');
            setActiveFolder(activeFolderId);
        }
    };

    const handleRenameNode = async (item: RoomItem) => {
        const newName = window.prompt("Rename item", item.title);
        if (!newName || !newName.trim()) return;
        try {
            await updateNode(item.id, { title: newName.trim() });
            toast.success("Item renamed");
            if (activeFolderId) {
                await loadNodesForFolder(activeFolderId);
            }
        } catch (e: any) {
            toast.error(e?.message || "Rename failed");
        }
    };

    const handleDeleteNode = async (nodeId: string) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        try {
            await deleteNode(nodeId);
            toast.success("Item deleted");
            if (activeFolderId) {
                await loadNodesForFolder(activeFolderId);
            }
        } catch (e: any) {
            toast.error(e?.message || "Delete failed");
        }
    };

    const handleCreateNode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeFolderId) return;

        // File upload path
        if (formData.type === 'document' && !selectedFile) {
            alert('Please select a file for document uploads.');
            return;
        }

        if (selectedFile) {
            setIsSubmitting(true);
            setUploadProgress(0);

            try {
                const token = await import('@/lib/api/devToken').then(m => m.getDevToken());
                const formDataObj = new FormData();
                formDataObj.append('file', selectedFile, selectedFile.name);
                formDataObj.append('folder_id', activeFolderId);
                formDataObj.append('name', formData.name.trim() || selectedFile.name);
                formDataObj.append('title', formData.name.trim() || selectedFile.name);

                const baseUrl = process.env.NEXT_PUBLIC_SAIMOR_CORE_URL || 'http://localhost:8081';

                // Simulate upload progress
                const progressInterval = setInterval(() => {
                    setUploadProgress(prev => Math.min(prev + 10, 90));
                }, 100);

                const response = await fetch(`${baseUrl}/v1/upload/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formDataObj
                });

                clearInterval(progressInterval);
                setUploadProgress(100);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || 'Upload failed');
                }

                const uploadedNode = await response.json();

                // Optimistic update
                await loadNodesForFolder(activeFolderId);

                // Reset form
                setFormData({ name: '', type: 'note', content: '', url: '' });
                setSelectedFile(null);
                setIsCreateModalOpen(false);
                setUploadProgress(0);

                // Auto-open DocumentViewer
                if (uploadedNode && uploadedNode.id) {
                    loadNodeDetails(uploadedNode.id);
                    setActiveNode(uploadedNode);
                }
            } catch (error) {
                console.error('Failed to upload file:', error);
                alert(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                setIsSubmitting(false);
                setUploadProgress(0);
            }
            return;
        }

        if (!formData.name.trim()) return;
        setIsSubmitting(true);
        try {
            await addNode({
                folder_id: activeFolderId,
                title: formData.name.trim(),
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

    // Only show if activeFolderId is set AND viewLevel is NOT 'folder'
    const isVisible = activeFolderId && viewLevel !== 'folder';

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 z-critical flex items-center justify-center pointer-events-auto"
                >
                    {/* Backdrop with glassmorphism */}
                    <div
                        className="absolute inset-0 bg-[#050505]/70 backdrop-blur-xl"
                        onClick={handleClose}
                    />

                    <motion.div
                        data-saimor="folder-quick-view"
                        data-folder-id={activeFolderId}
                        initial={{ scale: 0.92, y: 30, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.92, y: 30, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 280, damping: 26 }}
                        className="relative w-[900px] max-w-[95vw] h-[650px] max-h-[85vh] mx-auto bg-gradient-to-br from-[#0A0A0A]/95 to-[#050505]/95 border border-emerald-500/10 rounded-[28px] shadow-[0_20px_80px_-20px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header with gradient underline */}
                        <div className="relative p-8 pb-6 border-b border-emerald-500/10">
                            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-center">
                                        <Folder className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-light text-emerald-50 tracking-tight flex items-center gap-3">
                                            {currentFolderName}
                                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-mono uppercase tracking-wider">
                                                Quick View
                                            </span>
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-white/40 text-xs font-mono uppercase tracking-widest">
                                                {isLoading ? "LOADING..." : `${items.length} Items`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        data-saimor="add-button"
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-200 group"
                                    >
                                        <Plus className="w-4 h-4 text-emerald-400 group-hover:rotate-90 transition-transform duration-200" />
                                        <span className="text-xs font-medium text-emerald-300 uppercase tracking-wider">Add Item</span>
                                    </button>
                                    <button
                                        data-saimor="close-button"
                                        onClick={handleClose}
                                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 flex items-center justify-center text-white/50 hover:text-white transition-all duration-200 group"
                                    >
                                        <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content with enhanced grid */}
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                            {items.length === 0 && !isLoading ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-emerald-500/10 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-center mb-4">
                                        <Folder className="w-10 h-10 text-emerald-500/30" />
                                    </div>
                                    <span className="font-mono text-sm tracking-widest text-emerald-500/30 uppercase">Empty Folder</span>
                                    <span className="text-xs text-white/20 mt-2">Add items to get started</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-5 gap-5">
                                    {items.map((item) => {
                                        const Icon = TYPE_ICONS[item.type] || Box;
                                        const colorClass = TYPE_COLORS[item.type] || "text-gray-400";

                                        return (
                                            <motion.div
                                                key={item.id}
                                                layoutId={`item-${item.id}`}
                                                className="group flex flex-col items-center gap-3 p-5 rounded-2xl hover:bg-gradient-to-br hover:from-emerald-500/10 hover:to-emerald-600/5 border border-transparent hover:border-emerald-500/20 transition-all duration-200"
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <button
                                                    onClick={() => {
                                                        setActiveFolder(null);
                                                        loadNodeDetails(item.id);
                                                        setActiveNode({
                                                            id: item.id,
                                                            type: item.type as any,
                                                            title: item.title,
                                                            name: item.title,
                                                            space_id: activeSpaceId || '',
                                                            folder_id: activeFolderId || '',
                                                        } as any);
                                                    }}
                                                    className="flex flex-col items-center gap-3"
                                                >
                                                    <div
                                                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 group-hover:border-emerald-500/30 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] flex items-center justify-center transition-all duration-200 ${colorClass}`}
                                                    >
                                                        <Icon size={28} strokeWidth={1.5} />
                                                    </div>
                                                    <span className="text-xs text-white/60 group-hover:text-emerald-100 text-center font-medium leading-tight line-clamp-2 transition-colors duration-200 max-w-[90px]">
                                                        {item.title}
                                                    </span>
                                                </button>

                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleRenameNode(item)}
                                                        className="p-2 rounded-lg hover:bg-white/10 text-blue-300"
                                                        title="Rename"
                                                    >
                                                        <Settings size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteNode(item.id)}
                                                        className="p-2 rounded-lg hover:bg-white/10 text-red-300"
                                                        title="Delete"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer with prominent action buttons */}
                        <div className="relative p-6 border-t border-emerald-500/10 bg-gradient-to-t from-black/40 to-transparent flex items-center justify-between">
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                            <div className="text-[10px] text-emerald-500/30 font-mono uppercase tracking-[0.2em] flex items-center gap-2">
                                <Settings className="w-3 h-3" />
                                Quick Preview
                            </div>
                            <button
                                onClick={handleOpenFolder}
                                className="flex items-center gap-3 px-7 py-3.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/40 hover:border-mora-gold/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all duration-200 group"
                            >
                                <span className="text-sm font-medium text-emerald-100 uppercase tracking-wider">Open Folder</span>
                                <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:text-mora-gold group-hover:translate-x-1 transition-all duration-200" />
                            </button>
                        </div>

                        {/* Create Modal */}
                        <CreateModal
                            isOpen={isCreateModalOpen}
                            onClose={() => {
                                setIsCreateModalOpen(false);
                                setFormData({ name: '', type: 'note', content: '', url: '' });
                                setSelectedFile(null);
                                setUploadProgress(0);
                            }}
                            title="Add New Item"
                        >
                            <form onSubmit={handleCreateNode} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-emerald-400/70 mb-1.5 tracking-wider">TITLE *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-emerald-100 focus:border-mora-gold/50 focus:outline-none transition-colors text-sm"
                                        placeholder="Enter item title"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-emerald-400/70 mb-1.5 tracking-wider">TYPE</label>
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
                                        <label className="block text-xs text-emerald-400/70 mb-1.5 tracking-wider">URL</label>
                                        <input
                                            type="url"
                                            value={formData.url}
                                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-emerald-100 focus:border-mora-gold/50 focus:outline-none transition-colors text-sm"
                                            placeholder="https://example.com"
                                        />
                                    </div>
                                )}

                                {formData.type === 'note' && (
                                    <div>
                                        <label className="block text-xs text-emerald-400/70 mb-1.5 tracking-wider">CONTENT</label>
                                        <textarea
                                            value={formData.content}
                                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-emerald-100 focus:border-mora-gold/50 focus:outline-none transition-colors resize-none text-sm"
                                            placeholder="Note content"
                                            rows={3}
                                        />
                                    </div>
                                )}

                                {formData.type === 'document' && (
                                    <div>
                                        <label className="block text-xs text-emerald-400/70 mb-1.5 tracking-wider">FILE UPLOAD</label>
                                        <input
                                            type="file"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-emerald-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-emerald-600/20 file:text-emerald-100 hover:file:bg-emerald-600/30 file:cursor-pointer transition-colors text-sm"
                                        />
                                        {selectedFile && (
                                            <p className="mt-2 text-xs text-emerald-400/70">
                                                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                                            </p>
                                        )}
                                        {uploadProgress > 0 && uploadProgress < 100 && (
                                            <div className="mt-2">
                                                <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="bg-emerald-500 h-full transition-all duration-300"
                                                        style={{ width: `${uploadProgress}%` }}
                                                    />
                                                </div>
                                                <p className="mt-1 text-xs text-emerald-400/70 text-center">{uploadProgress}%</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreateModalOpen(false);
                                            setFormData({ name: '', type: 'note', content: '', url: '' });
                                        }}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-emerald-400 hover:bg-white/5 transition-colors text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || (!formData.name.trim() && !selectedFile)}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-600/30 hover:border-mora-gold/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    >
                                        {isSubmitting ? 'Adding...' : 'Add Item'}
                                    </button>
                                </div>
                            </form>
                        </CreateModal>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
