"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Calendar, Tag, User, ExternalLink, Download, ChevronRight, Link2, Sparkles, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import ReactMarkdown from 'react-markdown';
import { getFilePreview, getDownloadUrl, FilePreview } from '@/lib/api/filesClient';
import { getRelationsForNode, createRelation, deleteRelation, RelationEdge as Relation } from '@/lib/api/relationsClient';

/**
 * DOCUMENT VIEWER - Enhanced Premium Design
 * Full-screen document view with metadata, relations, and AI insights
 */
export default function DocumentViewer() {
    const { activeNode, setActiveNode, loadNodeDetails } = useMoraStore();
    const [isLoading, setIsLoading] = useState(false);
    const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
    const [relations, setRelations] = useState<Relation[]>([]);
    const [isRelationsLoading, setIsRelationsLoading] = useState(false);
    const [showAddRelation, setShowAddRelation] = useState(false);

    // Simple state for adding relation
    const [targetNodeId, setTargetNodeId] = useState('');
    const [relationKind, setRelationKind] = useState('reference');

    // Only show for actual document/note/link nodes (not structural items)
    const isOpen = !!activeNode && !['folder', 'space', 'department'].includes((activeNode as any).type);

    useEffect(() => {
        if (isOpen && activeNode?.id) {
            const load = async () => {
                setIsLoading(true);
                setIsRelationsLoading(true);
                try {
                    await loadNodeDetails(activeNode.id);

                    // Load File Preview
                    const preview = await getFilePreview(activeNode.id);
                    setFilePreview(preview);

                    // Load Relations
                    const rels = await getRelationsForNode(activeNode.id);
                    setRelations(rels);
                } catch (e) {
                    console.error("Failed to load document details", e);
                } finally {
                    setIsLoading(false);
                    setIsRelationsLoading(false);
                }
            };
            load();
        }
    }, [isOpen, activeNode?.id, loadNodeDetails]);

    const handleClose = () => {
        setActiveNode(null);
        setFilePreview(null);
        setRelations([]);
        setShowAddRelation(false);
    };

    const handleDownload = () => {
        if (!activeNode?.id) return;
        const url = getDownloadUrl(activeNode.id);
        // Create temporary link to trigger download
        const link = document.createElement('a');
        link.href = url;
        // We rely on Content-Disposition header from backend for filename
        link.setAttribute('download', '');
        // Add auth token if needed? Browser handles cookies, but for JWT in header we might need fetch-blob approach.
        // For now, assuming dev/demo environment where simple link works or we accept it might open in tab.
        // To be robust with JWT, we should use fetch(url, { headers: ... }) -> blob -> URL.createObjectURL

        // Quick implementation for JWT auth download:
        const cookieToken = typeof document !== 'undefined'
            ? document.cookie.split('; ').find(row => row.startsWith('mora_auth_token='))
            : null;
        const token = cookieToken ? decodeURIComponent(cookieToken.split('=')[1]) : null;
        if (token) {
            fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(resp => resp.blob())
                .then(blob => {
                    const blobUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = activeNode.name || 'download'; // Fallback name
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(blobUrl);
                })
                .catch(err => console.error("Download failed", err));
        } else {
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
    };

    const handleAddRelation = async () => {
        if (!activeNode?.id || !targetNodeId) return;
        try {
            await createRelation({
                source_id: activeNode.id,
                target_id: targetNodeId,
                kind: relationKind,
                weight: 0.5
            });
            // Refresh relations
            const rels = await getRelationsForNode(activeNode.id);
            setRelations(rels);
            setShowAddRelation(false);
            setTargetNodeId('');
        } catch (e) {
            console.error("Failed to create relation", e);
        }
    };

    const handleDeleteRelation = async (id: string) => {
        try {
            await deleteRelation(id);
            setRelations(prev => prev.filter(r => r.id !== id));
        } catch (e) {
            console.error("Failed to delete relation", e);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 z-modal flex items-center justify-center pointer-events-auto"
                >
                    {/* BACKDROP with enhanced blur */}
                    <div
                        className="absolute inset-0 bg-[#050505]/85 backdrop-blur-2xl"
                        onClick={handleClose}
                    />

                    {/* DOCUMENT CARD with gradient borders */}
                    <motion.div
                        data-saimor="document-viewer"
                        data-node-id={activeNode?.id}
                        data-node-type={activeNode?.type}
                        initial={{ scale: 0.94, y: 30, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.94, y: 30, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 280, damping: 26 }}
                        className="relative w-[1100px] max-w-[96vw] h-[88vh] bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-emerald-500/10 rounded-[28px] shadow-[0_25px_100px_-25px_rgba(16,185,129,0.2)] overflow-hidden flex"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* LEFT: CONTENT AREA */}
                        <div className="flex-1 flex flex-col border-r border-emerald-500/10 bg-gradient-to-b from-black/20 to-transparent">
                            {/* HEADER with gradient underline */}
                            <div className="relative h-24 flex items-center justify-between px-8 border-b border-emerald-500/10">
                                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                        <FileText className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl text-emerald-50 font-light tracking-tight">
                                            {activeNode?.title || activeNode?.name || 'Untitled Document'}
                                        </h1>
                                        <div className="flex items-center gap-2 text-xs text-emerald-500/40 font-mono uppercase tracking-wider mt-1">
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                                {activeNode?.type}
                                            </span>
                                            <span>•</span>
                                            <span>{(activeNode?.size || 0) / 1024 < 1 ? '< 1 KB' : `${Math.round((activeNode?.size || 0) / 1024)} KB`}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {activeNode?.url && (
                                        <a
                                            href={activeNode.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-3 rounded-full hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 text-emerald-500/50 hover:text-emerald-400 transition-all"
                                            title="Open Original URL"
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    )}
                                    <button
                                        onClick={handleClose}
                                        data-saimor="close-button"
                                        className="w-10 h-10 rounded-full hover:bg-white/10 border border-white/10 hover:border-white/20 flex items-center justify-center text-white/40 hover:text-white transition-all group"
                                    >
                                        <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            {/* SCROLLABLE CONTENT with enhanced typography */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-12">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-4">
                                        <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                        <span className="text-sm font-mono tracking-widest text-emerald-500/70 uppercase">Loading Content...</span>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex flex-col">
                                        {/* REAL CONTENT RENDERING */}
                                        {/* CASE 1: PDF */}
                                        {(filePreview?.contentType === 'application/pdf' || activeNode?.name?.toLowerCase().endsWith('.pdf')) ? (
                                            <iframe
                                                src={getDownloadUrl(activeNode!.id)}
                                                className="w-full h-full rounded-xl bg-white/5"
                                                title="PDF Viewer"
                                            />
                                        ) :
                                            /* CASE 2: IMAGE */
                                            (filePreview?.contentType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(activeNode?.name || '')) ? (
                                                <div className="flex items-center justify-center h-full">
                                                    <img
                                                        src={getDownloadUrl(activeNode!.id)}
                                                        alt={activeNode!.name}
                                                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                                                    />
                                                </div>
                                            ) :
                                                /* CASE 3: TEXT / MARKDOWN / SIMULATED */
                                                (
                                                    <div className="prose prose-invert prose-emerald max-w-none prose-headings:font-light prose-headings:tracking-tight prose-headings:text-emerald-50 prose-p:text-emerald-100/90 prose-p:leading-relaxed prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300 prose-code:text-mora-gold prose-code:bg-black/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                                                        {filePreview?.content ? (
                                                            filePreview.contentType === 'text/markdown' || filePreview.contentType === 'text/plain' ? (
                                                                <ReactMarkdown>{filePreview.content}</ReactMarkdown>
                                                            ) : (
                                                                <pre className="whitespace-pre-wrap font-mono text-xs">{filePreview.content}</pre>
                                                            )
                                                        ) : activeNode?.content ? (
                                                            <ReactMarkdown>{activeNode.content}</ReactMarkdown>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center h-64 text-white/20 border-2 border-dashed border-emerald-500/10 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent">
                                                                <FileText className="w-12 h-12 text-emerald-500/20 mb-3" />
                                                                <span className="text-sm font-mono uppercase tracking-wider">
                                                                    {filePreview?.reason === 'binary_file' ? 'Binary File - Please Download' : 'No Content Available'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: INTELLIGENCE SIDEBAR */}
                        <div className="w-96 bg-gradient-to-b from-[#050505] to-[#0A0A0A] flex flex-col">
                            {/* METADATA SECTION */}
                            <div className="p-6 border-b border-emerald-500/10">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles className="w-4 h-4 text-mora-gold" />
                                    <h3 className="text-xs font-mono text-emerald-500/70 uppercase tracking-widest">
                                        Metadata
                                    </h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-colors">
                                        <Calendar className="w-4 h-4 text-emerald-400/60 mt-0.5" />
                                        <div className="flex-1">
                                            <span className="block text-xs text-white/40 mb-1">Created</span>
                                            <span className="text-sm text-emerald-100/90">
                                                {activeNode?.created_at ? new Date(activeNode.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                }) : 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-colors">
                                        <User className="w-4 h-4 text-emerald-400/60 mt-0.5" />
                                        <div className="flex-1">
                                            <span className="block text-xs text-white/40 mb-1">Author</span>
                                            <span className="text-sm text-emerald-100/90">
                                                {activeNode?.metadata?.author || 'System'}
                                            </span>
                                        </div>
                                    </div>
                                    {activeNode?.metadata?.tags && (
                                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Tag className="w-4 h-4 text-emerald-400/60" />
                                                <span className="text-xs text-white/40">Tags</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {(activeNode.metadata.tags as string[]).map(tag => (
                                                    <span key={tag} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 hover:bg-emerald-500/15 transition-colors cursor-pointer">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* RELATIONS SECTION */}
                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar border-b border-emerald-500/10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Link2 className="w-4 h-4 text-emerald-400" />
                                        <h3 className="text-xs font-mono text-emerald-500/70 uppercase tracking-widest">
                                            Relations
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setShowAddRelation(!showAddRelation)}
                                        className="p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>

                                {showAddRelation && (
                                    <div className="mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                                        <input
                                            type="text"
                                            placeholder="Target Node ID"
                                            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white"
                                            value={targetNodeId}
                                            onChange={(e) => setTargetNodeId(e.target.value)}
                                        />
                                        <select
                                            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white"
                                            value={relationKind}
                                            onChange={(e) => setRelationKind(e.target.value)}
                                        >
                                            <option value="reference">Reference</option>
                                            <option value="dependency">Dependency</option>
                                            <option value="related">Related</option>
                                        </select>
                                        <button
                                            onClick={handleAddRelation}
                                            className="w-full py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30"
                                        >
                                            Add Relation
                                        </button>
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    {isRelationsLoading ? (
                                        <div className="text-center py-4 text-xs text-white/20">Loading relations...</div>
                                    ) : relations.length > 0 ? (
                                        relations.map(rel => (
                                            <div key={rel.id} className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-colors">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${rel.source_id === activeNode?.id ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs text-emerald-100/90 truncate">
                                                            {rel.source_id === activeNode?.id ? `→ ${rel.target_id.substring(0, 8)}...` : `← ${rel.source_id.substring(0, 8)}...`}
                                                        </span>
                                                        <span className="text-[10px] text-white/30 uppercase tracking-wider">{rel.kind}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteRelation(rel.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-white/20 transition-all"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/10 text-center">
                                            <Link2 className="w-8 h-8 text-emerald-500/20 mx-auto mb-2" />
                                            <span className="text-xs text-emerald-500/30 italic">No relations detected</span>
                                            <p className="text-[10px] text-white/20 mt-1">Connections will appear here</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* AI INSIGHTS SECTION */}
                            <div className="p-6 border-b border-emerald-500/10 bg-gradient-to-t from-black/20 to-transparent">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-4 h-4 text-mora-gold" />
                                    <h3 className="text-xs font-mono text-mora-gold/70 uppercase tracking-widest">
                                        AI Insights
                                    </h3>
                                </div>
                                <div className="p-4 rounded-xl bg-gradient-to-br from-mora-gold/5 to-transparent border border-mora-gold/10">
                                    <p className="text-xs text-emerald-500/40 italic">
                                        Intelligence analysis pending...
                                    </p>
                                </div>
                            </div>

                            {/* ACTIONS FOOTER */}
                            <div className="p-6">
                                <button
                                    onClick={handleDownload}
                                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500/15 to-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium uppercase tracking-widest hover:from-emerald-500/25 hover:to-emerald-600/20 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all flex items-center justify-center gap-2 group"
                                >
                                    <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                    Download Asset
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
