import React, { useState, useRef, useEffect } from 'react';
import { X, ExternalLink, Maximize2, Minimize2, FileText, Hash, Activity, ArrowRight, FolderOpen, Eye, Share2, MessageSquare, BarChart3, Layers } from 'lucide-react';
import type { MoraObject, Snapshot } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface NodeDetailsPanelProps {
    node: MoraObject;
    snapshot: Snapshot;
    onClose: () => void;
    onFocusNode: (nodeId: string) => void;
    onEnterNode: (nodeId: string) => void;
}

type Tab = 'overview' | 'files' | 'chat';

export function NodeDetailsPanel({ node, snapshot, onClose, onFocusNode, onEnterNode }: NodeDetailsPanelProps) {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 3D Tilt Logic
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [5, -5]), { stiffness: 150, damping: 20 });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-5, 5]), { stiffness: 150, damping: 20 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    // Find related nodes
    const relatedEdges = snapshot.edges.filter(e => e.sourceId === node.id || e.targetId === node.id);
    const relatedNodes = relatedEdges.map(e => {
        const otherId = e.sourceId === node.id ? e.targetId : e.sourceId;
        const otherNode = snapshot.nodes.find(n => n.id === otherId);
        return { node: otherNode, edge: e };
    }).filter(item => item.node !== undefined);

    // Mock content preview based on type
    const renderPreview = () => {
        if (node.type === 'image') {
            return (
                <div className="w-full h-48 bg-black/40 rounded-xl flex items-center justify-center border border-white/10 mb-6 overflow-hidden relative group shadow-inner">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <span className="relative z-10 text-sm text-emerald-200/70 flex items-center gap-2 group-hover:text-mora-gold transition-colors">
                        <Eye className="w-5 h-5" /> Preview Image
                    </span>
                </div>
            );
        }
        if (node.type === 'note' || node.type === 'document') {
            return (
                <div className="w-full p-5 bg-black/20 rounded-xl border border-white/5 mb-6 font-mono text-xs text-emerald-200/70 leading-relaxed relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-20">
                        <FileText className="w-12 h-12" />
                    </div>
                    <div className="flex items-center gap-2 mb-3 opacity-50 border-b border-white/5 pb-2">
                        <FileText className="w-3 h-3" />
                        <span className="uppercase tracking-widest text-[10px]">Content Analysis</span>
                    </div>
                    <p className="mb-4">
                        Analysis of <span className="text-emerald-100 font-semibold">{node.title}</span> indicates a strong correlation with recent market trends.
                        Key performance indicators suggest a positive trajectory in the upcoming quarter.
                    </p>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] text-emerald-500/50 uppercase">
                            <span>Relevance</span>
                            <span>87%</span>
                        </div>
                        <div className="h-1 w-full bg-emerald-900/30 rounded-full overflow-hidden">
                            <div className="h-full w-[87%] bg-gradient-to-r from-emerald-500 to-mora-gold" />
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.aside
            ref={containerRef}
            style={{
                rotateX: isExpanded ? 0 : rotateX,
                rotateY: isExpanded ? 0 : rotateY,
                perspective: 1000,
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
                "absolute top-4 right-4 bottom-4 glass-panel bg-mora-forest/80 backdrop-blur-2xl border border-white/10 flex flex-col shadow-2xl z-40 rounded-3xl overflow-hidden transition-all duration-500",
                isExpanded ? "w-[800px]" : "w-[400px]"
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border shadow-[0_0_15px_rgba(0,0,0,0.3)]",
                        node.type === 'project' ? "bg-mora-gold/10 border-mora-gold/30 text-mora-gold" :
                            node.type === 'insight' ? "bg-purple-500/10 border-purple-500/30 text-purple-300" :
                                "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    )}>
                        {node.type === 'project' ? <FolderOpen className="w-5 h-5" /> :
                            node.type === 'insight' ? <Activity className="w-5 h-5" /> :
                                <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-emerald-50 line-clamp-1 tracking-wide">{node.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] uppercase tracking-wider text-emerald-400/60 px-1.5 py-0.5 rounded border border-white/5 bg-white/5">{node.type}</span>
                            <span className="text-[10px] text-emerald-500/40">•</span>
                            <span className="text-[10px] text-emerald-500/40 font-mono">{node.id.slice(0, 8)}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-emerald-400/50 hover:text-emerald-100 transition-colors"
                        title={isExpanded ? "Collapse" : "Expand"}
                    >
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/20 text-emerald-400/50 hover:text-red-200 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center px-6 border-b border-white/5 bg-black/20">
                {(['overview', 'files', 'chat'] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-4 py-3 text-xs font-medium uppercase tracking-widest transition-all relative",
                            activeTab === tab ? "text-mora-gold" : "text-emerald-400/40 hover:text-emerald-200"
                        )}
                    >
                        {tab}
                        {activeTab === tab && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-mora-gold shadow-[0_0_10px_rgba(206,182,118,0.5)]"
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            {renderPreview()}

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors group">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Layers className="w-3 h-3 text-mora-gold/50 group-hover:text-mora-gold transition-colors" />
                                        <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider">Space</div>
                                    </div>
                                    <div className="text-sm text-emerald-100 truncate font-medium">{node.spaceId}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors group">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Activity className="w-3 h-3 text-purple-400/50 group-hover:text-purple-400 transition-colors" />
                                        <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider">Activity</div>
                                    </div>
                                    <div className="text-sm text-emerald-100 font-medium">High</div>
                                </div>
                            </div>

                            {/* Tags */}
                            {node.tags && node.tags.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 text-xs text-emerald-500/50 uppercase tracking-wider mb-3">
                                        <Hash className="w-3 h-3" /> Tags
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {node.tags.map(tag => (
                                            <span key={tag} className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs hover:bg-emerald-500/20 transition-colors cursor-default">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-3 pt-4">
                                <button className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-mora-gold/10 border border-mora-gold/20 text-mora-gold text-xs font-medium hover:bg-mora-gold/20 transition-all">
                                    <Share2 className="w-3.5 h-3.5" /> Share Node
                                </button>
                                <button
                                    onClick={() => onEnterNode(node.id)}
                                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium hover:bg-emerald-500/20 transition-all"
                                >
                                    <ArrowRight className="w-3.5 h-3.5" /> Focus View
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'files' && (
                        <motion.div
                            key="files"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <div className="text-xs text-emerald-500/50 uppercase tracking-wider mb-2">Connected Files</div>
                            {relatedNodes.length > 0 ? (
                                relatedNodes.map(({ node: rNode, edge }, i) => (
                                    <div key={rNode?.id || i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors group cursor-pointer" onClick={() => rNode && onFocusNode(rNode.id)}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-emerald-900/30 flex items-center justify-center text-emerald-400/50 group-hover:text-emerald-300 transition-colors">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-sm text-emerald-100 group-hover:text-white transition-colors">{rNode?.title || 'Unknown Node'}</div>
                                                <div className="text-[10px] text-emerald-500/40">{edge.kind} • {rNode?.type}</div>
                                            </div>
                                        </div>
                                        <ExternalLink className="w-3 h-3 text-emerald-500/30 group-hover:text-emerald-400 transition-colors" />
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-emerald-500/30 text-sm italic">
                                    No files directly connected.
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'chat' && (
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="h-full flex flex-col"
                        >
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                                <div className="w-16 h-16 rounded-full bg-mora-gold/10 flex items-center justify-center">
                                    <MessageSquare className="w-8 h-8 text-mora-gold/50" />
                                </div>
                                <p className="text-sm text-emerald-200/60 max-w-[200px]">
                                    Start a conversation about <span className="text-emerald-100">{node.title}</span>
                                </p>
                            </div>
                            <div className="mt-auto pt-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Ask Mora about this node..."
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-emerald-100 placeholder:text-emerald-500/30 focus:outline-none focus:border-mora-gold/50 focus:ring-1 focus:ring-mora-gold/20 transition-all"
                                    />
                                    <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-mora-gold/20 text-mora-gold hover:bg-mora-gold hover:text-black transition-all">
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.aside>
    );
}
