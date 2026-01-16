"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { Zap, Network, LayoutGrid, List, Plus, Search, X, FileText, Box, Link as LinkIcon, CheckSquare, Folder as FolderIcon, RotateCcw } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { IntelligenceContextBar } from '@/components/layers/IntelligenceContextBar';
import { CreateModal } from '@/components/ui/CreateModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { triggerFolderScan } from '@/lib/api/scanClient';
import { mapNodesToMycelium } from '@/lib/utils/myceliumDataMapper';
import { getRelationsForSpace, RelationEdge } from '@/lib/api/relationsClient';
import type { CoreNode } from '@/lib/types/core';
import { motion } from 'framer-motion';
import { toast } from '@/lib/toast';

// --- CONFIG ---
const NODE_TYPES = [
    { value: 'note' as const, label: 'Note', icon: FileText },
    { value: 'link' as const, label: 'Link', icon: LinkIcon },
    { value: 'document' as const, label: 'Document', icon: FileText },
    { value: 'task' as const, label: 'Task', icon: CheckSquare },
];

const TYPE_ICONS: Record<string, any> = {
    document: FileText,
    link: LinkIcon,
    task: CheckSquare,
    folder: FolderIcon,
    other: Box,
    note: FileText,
    intel_report: Zap,
};

const TYPE_COLORS: Record<string, string> = {
    document: "text-emerald-400",
    link: "text-blue-400",
    task: "text-amber-400",
    folder: "text-white",
    other: "text-gray-400",
    note: "text-yellow-200",
    intel_report: "text-mora-gold",
};

import { SemanticConstellation } from '@/components/visual/SemanticConstellation';

export const FolderLayer: React.FC = () => {
    // ... (Keep existing hooks) ...
    const {
        activeSpaceId,
        activeFolderId,
        activeDepartmentId,
        foldersBySpace,
        nodesByFolder,
        isLoadingNodes,
        departments,
        spacesByDepartment,
        navigateToSpace,
        loadFoldersForSpace,
        loadNodesForFolder,
        addNode,
        setActiveNode,
        loadNodeDetails,
        viewLevel,
        addFolder,
        deleteFolder,
    } = useMoraStore();

    // ... (Keep state) ...
    const [viewMode, setViewMode] = useState<'mycelium' | 'grid' | 'list'>('mycelium');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        type: 'note' as 'document' | 'task' | 'note' | 'link' | 'other',
        content: '',
        url: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [graphNodes, setGraphNodes] = useState<any[]>([]);
    const [isGraphLoading, setIsGraphLoading] = useState(false);

    // ... (Keep helpers) ...
    const handleAddFolder = async () => {
        if (!activeSpaceId) return toast.error("No space selected");
        const fallbackName = `Folder ${Math.floor(Date.now() / 1000)}`;
        try {
            await addFolder({ space_id: activeSpaceId, name: fallbackName });
            toast.success(`Folder "${fallbackName}" created`);
            await loadFoldersForSpace(activeSpaceId);
        } catch (e: any) {
            toast.error(e?.message || "Failed to create folder");
        }
    };

    const handleDeleteFolder = async () => {
        if (!activeFolderId) return toast.error("No folder selected");
        try {
            await deleteFolder(activeFolderId);
            toast.success("Folder deleted");
            if (activeSpaceId) {
                await loadFoldersForSpace(activeSpaceId);
            }
        } catch (e: any) {
            toast.error(e?.message || "Failed to delete folder");
        }
    };

    // ... (Keep context data) ...
    const currentFolder = useMemo(() => {
        if (!activeSpaceId || !activeFolderId) return null;
        return foldersBySpace[activeSpaceId]?.find(f => f.id === activeFolderId);
    }, [activeSpaceId, activeFolderId, foldersBySpace]);

    const currentDepartment = departments.find(d => d.id === activeDepartmentId);
    const currentSpace = spacesByDepartment[activeDepartmentId || '']?.find(s => s.id === activeSpaceId);

    const nodes = activeFolderId ? (nodesByFolder[activeFolderId] || []) : [];

    // Phase 7.2: Semantic Evaluation Pipeline (Relevance Scoring)
    const nodeStarPositions = useMemo(() => {
        if (nodes.length === 0) return [];

        // Helper: Calculate weight based on Type and Recency
        const getWeight = (node: CoreNode) => {
            // 1. Recency Factor (0.0 - 1.0)
            const dateStr = node.updated_at || node.created_at;
            let recencyScore = 0.5;
            if (dateStr) {
                const date = new Date(dateStr).getTime();
                const now = Date.now();
                const daysDiff = (now - date) / (1000 * 60 * 60 * 24);
                recencyScore = Math.max(0.2, Math.min(1.0, 1.0 - (daysDiff / 30)));
            }

            // 2. Type Factor (Importance)
            const typeWeights: Record<string, number> = {
                document: 1.0,
                note: 0.8,
                task: 0.7,
                link: 0.5,
                other: 0.4
            };
            const typeScore = typeWeights[node.type] || 0.5;

            // Combined Score (70% Type, 30% Recency)
            return (typeScore * 0.7) + (recencyScore * 0.3);
        };

        // Phase 8.2: Semantic Gravity (Sort by weight)
        const weightedNodes = nodes.map(node => ({
            ...node,
            weight: getWeight(node)
        })).sort((a, b) => b.weight - a.weight);

        const count = Math.min(weightedNodes.length, 25); // Increased max count

        // Spiral Distribution with Semantic Gravity
        return weightedNodes.slice(0, count).map((node, i) => {
            // Golden Angle for cleaner organic distribution
            const phi = 137.5 * (Math.PI / 180);
            const angle = i * phi;

            // Radius grows with index (so high weight items at i=0 are closer to center)
            const r = 180 + (i * 15);

            return {
                id: node.id,
                x: Math.cos(angle) * r,
                y: Math.sin(angle) * r,
                weight: node.weight
            };
        });
    }, [nodes]);

    // ... (Keep filter logic) ...
    const filteredNodes = useMemo(() => {
        if (!searchQuery.trim()) return nodes;
        const query = searchQuery.toLowerCase();
        return nodes.filter(n =>
            n.name?.toLowerCase().includes(query) ||
            (n as any).content?.toLowerCase().includes(query)
        );
    }, [nodes, searchQuery]);

    // ... (Keep load logic) ...
    useEffect(() => {
        if (activeFolderId) {
            loadNodesForFolder(activeFolderId);
        }
    }, [activeFolderId, loadNodesForFolder]);

    useEffect(() => {
        if (activeFolderId && viewMode === 'mycelium') {
            const loadGraph = async () => {
                setIsGraphLoading(true);
                const mapped = mapNodesToMycelium(nodes, { activeNodeId: null });
                setGraphNodes(mapped);
                setIsGraphLoading(false);
            };
            loadGraph();
        }
    }, [activeFolderId, viewMode, nodes]);

    useEffect(() => {
        setViewMode('mycelium');
    }, [activeFolderId]);

    const handleCreateNode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeFolderId || !formData.name.trim()) return;

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

    const handleMoraScan = async () => {
        if (!activeFolderId || isScanning) return;
        setIsScanning(true);
        try {
            const result = await triggerFolderScan(activeFolderId);
            await loadNodesForFolder(activeFolderId);
            const reportNode = nodes.find(n => (n as any).id === result.report_id);
            if (reportNode) handleNodeClick(reportNode);
        } catch (error) {
            console.error('Scan failed:', error);
        } finally {
            setIsScanning(false);
        }
    };

    const handleNodeClick = (node: CoreNode) => {
        loadNodeDetails((node as any).id);
        setActiveNode(node);
    };

    const stars = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1
    })), []);

    const breadcrumb = [
        { label: 'Home', onClick: () => { } },
        { label: currentDepartment?.name || 'Dept' },
        { label: currentSpace?.name || 'Space', onClick: () => activeSpaceId && navigateToSpace(activeSpaceId) },
        { label: currentFolder?.name || 'Folder' }
    ];

    if (!activeFolderId) return null;

    return (
        <div className="relative w-full h-full overflow-hidden bg-transparent">

            {/* Background Title */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
                <motion.h1
                    className="text-[140px] font-thin text-white/[0.12] tracking-[0.25em] whitespace-nowrap select-none font-sans"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                >
                    {currentFolder?.name.toUpperCase()}
                </motion.h1>
            </div>

            {/* SEMANTIC LAYER ANCHOR (Phase 5.2) */}
            {/* Phase 6.1: Active Constellation Renderer for Nodes */}
            <div
                id="semantic-layer-anchor"
                className="absolute inset-0 z-5 pointer-events-none overflow-visible"
                aria-hidden="true"
            >
                <div className="absolute top-1/2 left-1/2 w-0 h-0 overflow-visible">
                    <SemanticConstellation
                        center={{ x: 0, y: 0 }}
                        satellites={nodeStarPositions}
                    />
                </div>
            </div>

            <div className="absolute inset-0 flex items-start justify-center overflow-y-auto pt-8 pb-12 px-6 z-10">
                <div className="w-full max-w-7xl flex flex-col gap-6">
                    {/* Context Bar */}
                    <IntelligenceContextBar
                        breadcrumb={breadcrumb}
                        activeCount={nodes.length}
                        riskLevel="none"
                    />

                    {/* Main Glass Panel - Professional layout */}
                    <div className="w-full min-h-[65vh]">
                        <GlassPanel
                            title={currentFolder?.name || 'Folder'}
                            showBackButton
                            onBack={() => activeSpaceId && navigateToSpace(activeSpaceId)}
                            width="full"
                            height="auto"
                            blurIntensity={15}
                            opacity={0.9}
                            isActive={false} // Disable active glow for full-screen view
                            disableAnimations={true} // Allow ViewPort transitions to handle screen
                        >
                            <div className="flex flex-col h-full">

                                {/* Toolbar */}
                                <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
                                    <div className="flex items-center gap-2">
                                        {/* View Toggles */}
                                        <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
                                            <button
                                                onClick={() => setViewMode('mycelium')}
                                                className={`p-2 rounded-md transition-all ${viewMode === 'mycelium' ? 'bg-mora-gold/20 text-mora-gold' : 'text-white/40 hover:text-white'}`}
                                                title="Mycelium Network"
                                            >
                                                <Network size={18} />
                                            </button>
                                            <button
                                                onClick={() => setViewMode('grid')}
                                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/40 hover:text-white'}`}
                                                title="Grid View"
                                            >
                                                <LayoutGrid size={18} />
                                            </button>
                                            <button
                                                onClick={() => setViewMode('list')}
                                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/40 hover:text-white'}`}
                                                title="List View"
                                            >
                                                <List size={18} />
                                            </button>
                                        </div>

                                        {/* Search */}
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search nodes..."
                                                className="pl-9 pr-4 py-2 rounded-lg bg-black/20 border border-white/5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30 w-48 transition-all focus:w-64"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={handleAddFolder}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-100 text-xs uppercase tracking-wide hover:bg-emerald-500/20 hover:border-emerald-400/50"
                                        >
                                            <Plus size={16} />
                                            Add Folder
                                        </button>
                                        <button
                                            onClick={handleDeleteFolder}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-100 text-xs uppercase tracking-wide hover:bg-red-500/20 hover:border-red-400/50"
                                        >
                                            <X size={16} />
                                            Delete Folder
                                        </button>
                                        <button
                                            onClick={() => activeFolderId && loadNodesForFolder(activeFolderId)}
                                            className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                            title="Refresh Folder"
                                        >
                                            <RotateCcw size={18} />
                                        </button>
                                        <button
                                            onClick={handleMoraScan}
                                            disabled={isScanning}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mora-gold/5 border border-mora-gold/20 hover:bg-mora-gold/10 text-mora-gold/80 hover:text-mora-gold transition-all text-sm tracking-wide disabled:opacity-50"
                                        >
                                            <Zap size={14} className={isScanning ? 'animate-pulse' : ''} />
                                            {isScanning ? 'SCANNING...' : 'MÔRA SCAN'}
                                        </button>

                                        <button
                                            onClick={() => setIsCreateModalOpen(true)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 transition-all text-sm tracking-wide"
                                        >
                                            <Plus size={16} />
                                            NEW NODE
                                        </button>
                                    </div>
                                </div>

                                {/* Content Area */}
                                <div className="flex-1 relative overflow-hidden min-h-[320px]">
                                    {isLoadingNodes && (
                                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 backdrop-blur-sm">
                                            <LoadingState message="Loading neural nodes..." />
                                        </div>
                                    )}

                                    {/* Semantic Constellation View */}
                                    {viewMode === 'mycelium' && (
                                        <div className="absolute inset-0">
                                            {/* UPGRADE E1: Semantic SVG Constellations */}
                                            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                                {graphNodes.map((node: any) => {
                                                    // Safety check
                                                    if (!node.id) return null;
                                                    const seed1 = node.id.charCodeAt(0) || 0;
                                                    const seed2 = node.id.charCodeAt(1) || 0;
                                                    return (
                                                        <motion.circle
                                                            key={node.id}
                                                            cx={`${20 + Math.sin(seed1) * 60}%`}
                                                            cy={`${30 + Math.cos(seed2) * 40}%`}
                                                            r={2}
                                                            fill={TYPE_COLORS[node.type]?.replace('text-', '') || '#6B7280'}
                                                            opacity={0.6}
                                                            animate={{
                                                                scale: [1, 1.1, 1],
                                                            }}
                                                        />
                                                    );
                                                })}

                                                {/* Semantic connections */}
                                                {graphNodes.slice(0, -1).map((node: any, i: number) => {
                                                    const nextNode = graphNodes[i + 1];
                                                    if (!nextNode) return null;
                                                    return (
                                                        <motion.line
                                                            key={`connection-${node.id}-${nextNode.id}`}
                                                            x1={`${20 + Math.sin(node.id.charCodeAt(0)) * 60}%`}
                                                            y1={`${30 + Math.cos(node.id.charCodeAt(1)) * 40}%`}
                                                            x2={`${20 + Math.sin(nextNode.id.charCodeAt(0)) * 60}%`}
                                                            y2={`${30 + Math.cos(nextNode.id.charCodeAt(1)) * 40}%`}
                                                            stroke="#10B981"
                                                            strokeWidth="0.5"
                                                            opacity={0.2}
                                                            animate={{
                                                                opacity: [0.1, 0.3, 0.1],
                                                                strokeWidth: ["0.5", "1", "0.5"]
                                                            }}
                                                            transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
                                                        />
                                                    );
                                                })}
                                            </svg>
                                            {!isGraphLoading && graphNodes.length === 0 && (
                                                <div className="absolute inset-0 flex items-center justify-center text-emerald-200/60 text-sm">
                                                    No nodes yet. Create one to see the semantic network.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Grid View */}
                                    {viewMode === 'grid' && !isLoadingNodes && (
                                        <div className="h-full overflow-y-auto p-6 custom-scrollbar">
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                {filteredNodes.map((node) => {
                                                    const Icon = TYPE_ICONS[node.type] || Box;
                                                    const color = TYPE_COLORS[node.type] || 'text-gray-400';
                                                    return (
                                                        <motion.button
                                                            key={node.id}
                                                            onClick={() => handleNodeClick(node)}
                                                            whileHover={{ scale: 1.02, y: -2 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-white/10 transition-all group"
                                                        >
                                                            <div className={`w-12 h-12 rounded-lg bg-black/20 flex items-center justify-center ${color}`}>
                                                                <Icon size={24} />
                                                            </div>
                                                            <span className="text-sm text-white/70 group-hover:text-white text-center line-clamp-2">
                                                                {node.name}
                                                            </span>
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                            {filteredNodes.length === 0 && <EmptyState icon={Box} title="No nodes found" description="Create a new node to populate this folder." />}
                                        </div>
                                    )}

                                    {/* List View */}
                                    {viewMode === 'list' && !isLoadingNodes && (
                                        <div className="h-full overflow-y-auto p-6 custom-scrollbar">
                                            <div className="flex flex-col gap-2">
                                                {filteredNodes.map((node) => {
                                                    const Icon = TYPE_ICONS[node.type] || Box;
                                                    const color = TYPE_COLORS[node.type] || 'text-gray-400';
                                                    return (
                                                        <button
                                                            key={node.id}
                                                            onClick={() => handleNodeClick(node)}
                                                            className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-white/10 transition-all text-left group"
                                                        >
                                                            <div className={`p-2 rounded bg-black/20 ${color}`}>
                                                                <Icon size={18} />
                                                            </div>
                                                            <span className="text-white/70 group-hover:text-white flex-1">
                                                                {node.name}
                                                            </span>
                                                            <span className="text-xs text-white/30 uppercase tracking-wider">
                                                                {node.type}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {filteredNodes.length === 0 && <EmptyState icon={Box} title="No nodes found" description="Create a new node to populate this folder." />}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </GlassPanel>
                    </div>
                </div>

                {/* Create Modal */}
                <CreateModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    title="Create New Node"
                >
                    <form onSubmit={handleCreateNode} className="space-y-6">
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
                                            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${formData.type === type.value
                                                ? 'border-mora-gold bg-mora-gold/10 text-mora-gold'
                                                : 'border-white/10 hover:border-white/20 text-emerald-400/70'
                                                }`}
                                        >
                                            <Icon size={16} />
                                            <span className="text-sm">{type.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {formData.type === 'note' && (
                            <div>
                                <label className="block text-sm text-emerald-400/70 mb-2 tracking-wider">
                                    CONTENT
                                </label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-emerald-100 placeholder-emerald-500/30 focus:border-mora-gold/50 focus:outline-none transition-colors resize-none"
                                    placeholder="Enter note content..."
                                    rows={4}
                                />
                            </div>
                        )}

                        {formData.type === 'link' && (
                            <div>
                                <label className="block text-sm text-emerald-400/70 mb-2 tracking-wider">
                                    URL *
                                </label>
                                <input
                                    type="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-emerald-100 placeholder-emerald-500/30 focus:border-mora-gold/50 focus:outline-none transition-colors"
                                    placeholder="https://..."
                                    required={formData.type === 'link'}
                                />
                            </div>
                        )}
                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:bg-white/5">Cancel</button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30">Create</button>
                        </div>
                    </form>
                </CreateModal>
            </div>
        </div>
    );
};
