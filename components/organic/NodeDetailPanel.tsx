import React, { useEffect, useMemo } from 'react';
import { NodeViewer } from '@/components/content/NodeViewer';
import { useMoraStore } from '@/lib/store/moraState';
import { X, FileText, Link as LinkIcon, File, Calendar, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NodeDetailPanel: React.FC = () => {
    const { activeNode, setActiveNode, updateNode, deleteNode } = useMoraStore();
    const [isEditing, setIsEditing] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [formData, setFormData] = React.useState({
        title: '',
        type: 'note' as 'document' | 'task' | 'note' | 'link' | 'other',
        content: '',
        url: ''
    });

    // Helper: Clear error and optionally exit editing mode
    const clearError = (exitEdit = false) => {
        setError(null);
        if (exitEdit) setIsEditing(false);
    };

    // Initialize form data when entering edit mode
    useEffect(() => {
        if (activeNode && isEditing) {
            setFormData({
                title: activeNode.title,
                type: activeNode.type,
                content: activeNode.content || '',
                url: activeNode.url || ''
            });
            clearError();
        }
    }, [isEditing, activeNode]);

    // Close on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isEditing) {
                    clearError(true);
                } else {
                    setActiveNode(null);
                }
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [setActiveNode, isEditing]);

    // Debug: Log when panel mounts/updates
    useEffect(() => {
        if (activeNode) {
            console.log('[NodeDetailPanel] Rendering panel for node:', activeNode.title, activeNode.id);
        } else {
            console.log('[NodeDetailPanel] Panel closed (no activeNode)');
        }
    }, [activeNode]);

    const nodeTitle = activeNode ? ((activeNode as any).title || (activeNode as any).name || 'Untitled') : 'Untitled';
    const coreBase = process.env.NEXT_PUBLIC_SAIMOR_CORE_URL || 'http://localhost:8083';
    const filePath = (activeNode as any)?.metadata?.file_path as string | undefined;
    const fileDownloadUrl = useMemo(() => {
        if (!filePath) return null;
        // file_path shape: "uploads/<tenant>/<filename>"
        const parts = filePath.split('/');
        const tenant = parts.length >= 2 ? parts[1] : null;
        const filename = parts.length >= 3 ? parts[2] : parts.at(-1);
        if (!tenant || !filename) return null;
        return `${coreBase}/v1/upload/file/${tenant}/${filename}`;
    }, [filePath, coreBase]);

    if (!activeNode) return null;
    const Icon = activeNode.type === 'link' ? LinkIcon : (activeNode.type === 'note' ? FileText : File);

    const handleSave = async () => {
        if (!formData.title.trim()) {
            setError("Title cannot be empty");
            return;
        }

        setIsSaving(true);
        clearError();

        try {
            await updateNode(activeNode.id, {
                title: formData.title,
                type: formData.type,
                content: formData.content || undefined,
                url: formData.url || undefined
            });
            clearError(true);
        } catch (error: any) {
            setError(error?.message || "Failed to save changes. Please try again.");
            console.error("Failed to update node", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        clearError();

        try {
            await deleteNode(activeNode.id);
            setActiveNode(null);
        } catch (error: any) {
            setError(error?.message || "Failed to delete item. Please try again.");
            setIsDeleting(false);
            console.error("Failed to delete node", error);
        }
    };

    return (
        <AnimatePresence>
            {activeNode && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setActiveNode(null)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-black/90 border-l border-white/10 backdrop-blur-xl z-[60] shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-start justify-between bg-emerald-900/20">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <Icon className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="bg-black/50 border border-emerald-500/30 rounded px-2 py-1 text-lg font-light text-emerald-50 w-full focus:outline-none focus:border-mora-gold/50"
                                        />
                                    ) : (
                                        <h2 className="text-lg font-light text-emerald-50 leading-tight">
                                            {nodeTitle}
                                        </h2>
                                    )}
                                    <span className="text-xs text-emerald-400/50 uppercase tracking-wider">
                                        {activeNode.type}
                                    </span>
                                </div>
                            </div>
                        <div className="flex items-center gap-2">
                            {!isEditing && !isDeleting && (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-emerald-400 hover:bg-white/5 transition-colors"
                                    >
                                        EDIT
                                    </button>
                                    <button
                                        onClick={() => setIsDeleting(true)}
                                        className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                        DELETE
                                    </button>
                                    {fileDownloadUrl && (
                                        <button
                                            onClick={() => window.open(fileDownloadUrl, "_blank")}
                                            className="px-3 py-1.5 rounded-lg border border-emerald-500/30 text-xs text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                                        >
                                            DOWNLOAD
                                        </button>
                                    )}
                                </>
                            )}
                            <button
                                onClick={() => setActiveNode(null)}
                                className="p-2 rounded-full hover:bg-white/5 text-emerald-400/50 hover:text-emerald-400 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Delete Confirmation Overlay */}
                        {isDeleting && (
                            <div className="p-4 bg-red-500/10 border-b border-red-500/20 flex flex-col gap-3">
                                <p className="text-sm text-red-200">Are you sure you want to delete this item? This action cannot be undone.</p>

                                {/* Error Message */}
                                {error && (
                                    <div className="p-2 rounded bg-red-500/20 border border-red-500/40 text-red-100 text-xs">
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleDelete}
                                        className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 hover:bg-red-500/30 transition-colors text-xs"
                                    >
                                        CONFIRM DELETE
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsDeleting(false);
                                            setError(null);
                                        }}
                                        className="px-4 py-2 rounded-lg border border-white/10 text-emerald-400 hover:bg-white/5 transition-colors text-xs"
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">

                            {isEditing ? (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs text-emerald-400/70 mb-1.5 tracking-wider">TYPE</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                            className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-emerald-100 focus:border-mora-gold/50 focus:outline-none"
                                        >
                                            <option value="note">Note</option>
                                            <option value="document">Document</option>
                                            <option value="link">Link</option>
                                            <option value="task">Task</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    {formData.type === 'link' ? (
                                        <div>
                                            <label className="block text-xs text-emerald-400/70 mb-1.5 tracking-wider">URL</label>
                                            <input
                                                type="url"
                                                value={formData.url}
                                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-emerald-100 focus:border-mora-gold/50 focus:outline-none"
                                                placeholder="https://example.com"
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-xs text-emerald-400/70 mb-1.5 tracking-wider">CONTENT</label>
                                            <textarea
                                                value={formData.content}
                                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-emerald-100 focus:border-mora-gold/50 focus:outline-none min-h-[200px] font-mono text-sm"
                                                placeholder="Markdown content..."
                                            />
                                        </div>
                                    )}

                                    {/* Error Message */}
                                    {error && (
                                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
                                            {error}
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-4 border-t border-white/5">
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving || !formData?.title?.trim()}
                                            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-600/30 hover:border-mora-gold/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSaving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                setError(null);
                                            }}
                                            disabled={isSaving}
                                            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-emerald-400 hover:bg-white/5 transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                                            <div className="flex items-center gap-2 text-emerald-400/50 text-xs mb-1">
                                                <Calendar className="w-3 h-3" />
                                                CREATED
                                            </div>
                                            <div className="text-sm text-emerald-100/80">
                                                {activeNode.created_at ? new Date(activeNode.created_at).toLocaleDateString() : '-'}
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                                            <div className="flex items-center gap-2 text-emerald-400/50 text-xs mb-1">
                                                <Tag className="w-3 h-3" />
                                                SIZE
                                            </div>
                                            <div className="text-sm text-emerald-100/80">
                                                {activeNode.size ? `${(activeNode.size / 1024).toFixed(1)} KB` : '-'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Main Content Area */}
                                    <div className="mt-6">
                                        <h3 className="text-xs uppercase tracking-widest text-emerald-400/50 mb-4 border-b border-white/5 pb-2">Content</h3>
                                        <NodeViewer
                                            content={activeNode.content || activeNode.url || undefined}
                                            type={activeNode.type as any}
                                        />
                                    </div>



                                    {/* Fallback for other types or empty content */}

                                </>
                            )}

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
