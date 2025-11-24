import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useMoraStore } from '@/lib/store/moraState';
import { X, FileText, Link as LinkIcon, File, Calendar, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NodeDetailPanel: React.FC = () => {
    const { activeNode, setActiveNode } = useMoraStore();

    // Close on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveNode(null);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [setActiveNode]);

    if (!activeNode) return null;

    const Icon = activeNode.type === 'link' ? LinkIcon : (activeNode.type === 'note' ? FileText : File);

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
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-black/90 border-l border-white/10 backdrop-blur-xl z-50 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-start justify-between bg-emerald-900/20">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <Icon className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-light text-emerald-50 leading-tight">
                                        {activeNode.title}
                                    </h2>
                                    <span className="text-xs text-emerald-400/50 uppercase tracking-wider">
                                        {activeNode.type}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveNode(null)}
                                className="p-2 rounded-full hover:bg-white/5 text-emerald-400/50 hover:text-emerald-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">

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
                            {(activeNode.type === 'note' || activeNode.type === 'document') && activeNode.content && (
                                <div className="prose prose-invert prose-emerald max-w-none">
                                    <h3 className="text-xs uppercase tracking-widest text-emerald-400/50 mb-4 border-b border-white/5 pb-2">Content</h3>
                                    <div className="text-emerald-100/80 font-light leading-relaxed markdown-content">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {activeNode.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}

                            {activeNode.type === 'link' && activeNode.url && (
                                <div>
                                    <h3 className="text-xs uppercase tracking-widest text-emerald-400/50 mb-4 border-b border-white/5 pb-2">Target URL</h3>
                                    <a
                                        href={activeNode.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition-colors group"
                                    >
                                        <LinkIcon className="w-4 h-4" />
                                        <span className="truncate flex-1">{activeNode.url}</span>
                                        <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">OPEN</span>
                                    </a>
                                </div>
                            )}

                            {/* Fallback for other types or empty content */}
                            {(!activeNode.content && !activeNode.url) && (
                                <div className="text-center py-12 text-emerald-500/30 italic">
                                    No preview available
                                </div>
                            )}

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
