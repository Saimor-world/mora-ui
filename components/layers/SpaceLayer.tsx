"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { LayoutGrid, List, Folder as FolderIcon, Plus, Network, Search, Trash2, RefreshCw } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { IntelligenceContextBar } from '@/components/layers/IntelligenceContextBar';
import { CreateModal } from '@/components/ui/CreateModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { motion } from 'framer-motion';
import { toast } from '@/lib/toast';
import { Folder as FolderStar } from '@/components/mora/Folder';

import { SemanticConstellation } from '@/components/visual/SemanticConstellation';

const FOLDER_COLORS = [
    { name: 'Emerald', value: '#10b981' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Cyan', value: '#06b6d4' },
];

export const SpaceLayer: React.FC = () => {
    // ... (Keep existing hooks) ...
    const {
        activeSpaceId,
        activeDepartmentId,
        departments,
        spacesByDepartment,
        foldersBySpace,
        isLoadingFolders,
        navigateToDepartment,
        loadFoldersForSpace,
        addFolder,
        addSpace,
        deleteSpace,
        viewLevel,
        loadSpacesForDepartment,
        navigateToFolder,
    } = useMoraStore();

    // ... (Keep state) ...
    const [viewMode, setViewMode] = useState<'mycelium' | 'grid' | 'list'>('mycelium');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({ name: '', color: FOLDER_COLORS[0].value });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ... (Keep handlers) ...
    const handleAddSpace = async () => {
        if (!activeDepartmentId) return toast.error("No department selected");
        const fallbackName = `Space ${Math.floor(Date.now() / 1000)}`;
        try {
            await addSpace({ department_id: activeDepartmentId, name: fallbackName });
            toast.success(`Space "${fallbackName}" created`);
            await loadSpacesForDepartment(activeDepartmentId);
        } catch (e: any) {
            toast.error(e?.message || "Failed to create space");
        }
    };

    const handleDeleteSpace = async () => {
        if (!activeSpaceId) return toast.error("No space selected");
        try {
            await deleteSpace(activeSpaceId);
            toast.success("Space deleted");
            if (activeDepartmentId) {
                await loadSpacesForDepartment(activeDepartmentId);
            }
        } catch (e: any) {
            toast.error(e?.message || "Failed to delete space");
        }
    };

    // ... (Keep data logic) ...
    const currentSpace = useMemo(() => {
        if (!activeDepartmentId || !activeSpaceId) return null;
        return spacesByDepartment[activeDepartmentId]?.find(s => s.id === activeSpaceId);
    }, [activeDepartmentId, activeSpaceId, spacesByDepartment]);

    const currentDepartment = departments.find(d => d.id === activeDepartmentId);
    const folders = activeSpaceId ? (foldersBySpace[activeSpaceId] || []) : [];

    // Filter Logic
    const filteredFolders = useMemo(() => {
        if (!searchQuery.trim()) return folders;
        const query = searchQuery.toLowerCase();
        return folders.filter(f => f.name.toLowerCase().includes(query));
    }, [folders, searchQuery]);

    // Phase 7.2: Semantic Evaluation Pipeline (Relevance Scoring)
    const folderStarPositions = useMemo(() => {
        if (folders.length === 0) return [];

        // Helper: Calculate weight based on recency (max 30 days decay)
        const getWeight = (dateStr?: string | null) => {
            if (!dateStr) return 0.5; // Default weight
            const date = new Date(dateStr).getTime();
            const now = Date.now();
            const daysDiff = (now - date) / (1000 * 60 * 60 * 24);
            return Math.max(0.3, Math.min(1.0, 1.0 - (daysDiff / 30)));
        };

        // Phase 8.2: Semantic Gravity
        const weightedFolders = folders.map(f => ({
            ...f,
            weight: getWeight(f.updated_at || f.created_at)
        })).sort((a, b) => b.weight - a.weight);

        const count = Math.min(weightedFolders.length, 16);

        return weightedFolders.slice(0, count).map((folder, i) => {
            // Ring distribution but closer for heavy items?
            // Actually, for folders, maybe "Solar System" rings?
            // i=0 (Sun-like) to i=N (Pluto)
            const angle = (i / count) * Math.PI * 2;
            const r = 220 + (i * 20); // Spiral-ish

            return {
                id: folder.id,
                x: Math.cos(angle) * r,
                y: Math.sin(angle) * r,
                weight: folder.weight
            };
        });
    }, [folders]);

    const folderWeightMap = useMemo(
        () => new Map(folderStarPositions.map((entry) => [entry.id, entry.weight])),
        [folderStarPositions]
    );

    const folderOrbitPositions = useMemo(() => {
        if (filteredFolders.length === 0) return [];

        const sorted = [...filteredFolders].sort((a, b) => {
            const aw = folderWeightMap.get(a.id) || 0;
            const bw = folderWeightMap.get(b.id) || 0;
            return bw - aw;
        });

        const count = Math.min(sorted.length, 18);
        return sorted.slice(0, count).map((folder, index) => {
            const ring = Math.floor(index / 6); // 0..2
            const inRing = index % 6;
            const ringCount = Math.min(6, count - ring * 6);
            const angle = (inRing / Math.max(1, ringCount)) * Math.PI * 2 - Math.PI / 2;
            const radius = 145 + ring * 80;

            return {
                folder,
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * (radius * 0.82),
                isPromoted: (folderWeightMap.get(folder.id) || 0) >= 0.8,
                orbitRing: ring
            };
        });
    }, [filteredFolders, folderWeightMap]);

    // ... (Keep load effects) ...
    useEffect(() => {
        if (activeSpaceId && !foldersBySpace[activeSpaceId]) {
            loadFoldersForSpace(activeSpaceId);
        }
    }, [activeSpaceId, foldersBySpace, loadFoldersForSpace]);

    useEffect(() => {
        setViewMode('mycelium');
    }, [activeSpaceId]);

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

    const breadcrumb = [
        { label: 'Home', onClick: () => { } },
        { label: currentDepartment?.name || 'Dept', onClick: () => activeDepartmentId && navigateToDepartment(activeDepartmentId) },
        { label: currentSpace?.name || 'Space' }
    ];

    if (viewLevel !== 'space' || !activeSpaceId) return null;

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
                    {currentSpace?.name.toUpperCase()}
                </motion.h1>
            </div>

            {/* SEMANTIC LAYER ANCHOR (Phase 5.2) */}
            {/* Phase 6.1: Active Constellation Renderer for Folders */}
            <div
                id="semantic-layer-anchor"
                className="absolute inset-0 z-5 pointer-events-none overflow-visible"
                aria-hidden="true"
            >
                <div className="absolute top-1/2 left-1/2 w-0 h-0 overflow-visible">
                    <SemanticConstellation
                        center={{ x: 0, y: 0 }}
                        satellites={folderStarPositions}
                    />
                </div>
            </div>

            <div className="absolute inset-0 flex items-start justify-center overflow-y-auto pt-8 pb-12 px-6 z-10">
                <div className="w-full max-w-7xl flex flex-col gap-6">
                    {/* Context Bar */}
                    <IntelligenceContextBar
                        breadcrumb={breadcrumb}
                        activeCount={folders.length}
                        riskLevel="none"
                    />

                    {/* Glass Panel - Professional layout */}
                    <div className="w-full min-h-[65vh]">
                        <GlassPanel
                            title={currentSpace?.name || 'Space'}
                            showBackButton
                            onBack={() => activeDepartmentId && navigateToDepartment(activeDepartmentId)}
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

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleAddSpace}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-300 transition-all text-sm tracking-wide"
                                        >
                                            <Plus size={16} />
                                            ADD SPACE
                                        </button>
                                        <button
                                            onClick={handleDeleteSpace}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-200 transition-all text-sm tracking-wide"
                                        >
                                            <Trash2 size={16} />
                                            DELETE SPACE
                                        </button>
                                        <button
                                            onClick={() => activeSpaceId && loadFoldersForSpace(activeSpaceId)}
                                            className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                            title="Refresh Space"
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
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 relative overflow-hidden min-h-[320px]">
                                    {isLoadingFolders && (
                                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 backdrop-blur-sm">
                                            <LoadingState message="Loading space folders..." />
                                        </div>
                                    )}

                                    {viewMode === 'mycelium' && (
                                        <div className="absolute inset-0">
                                            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-35">
                                                {[145, 225, 305].map((radius, i) => (
                                                    <ellipse
                                                        key={`orbit-${radius}`}
                                                        cx="50%"
                                                        cy="50%"
                                                        rx={radius}
                                                        ry={Math.round(radius * 0.82)}
                                                        fill="none"
                                                        stroke="url(#spaceOrbitGradient)"
                                                        strokeWidth="1"
                                                        strokeDasharray="6 10"
                                                        opacity={0.25 - i * 0.05}
                                                    />
                                                ))}
                                                <defs>
                                                    <linearGradient id="spaceOrbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="rgba(16,185,129,0.55)" />
                                                        <stop offset="50%" stopColor="rgba(6,182,212,0.20)" />
                                                        <stop offset="100%" stopColor="rgba(16,185,129,0.55)" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>

                                            <motion.div
                                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ duration: 0.6 }}
                                            >
                                                <div className="w-20 h-20 rounded-full border border-emerald-400/35 bg-emerald-400/10 shadow-[0_0_40px_rgba(16,185,129,0.25)] flex items-center justify-center">
                                                    <span className="text-[10px] text-emerald-200/90 uppercase tracking-[0.2em] text-center px-2">
                                                        {currentSpace?.name || 'Space'}
                                                    </span>
                                                </div>
                                            </motion.div>

                                            {folderOrbitPositions.map(({ folder, x, y, isPromoted }, index) => (
                                                <FolderStar
                                                    key={`orbit-folder-${folder.id}`}
                                                    folder={{
                                                        id: folder.id,
                                                        name: folder.name,
                                                        space_id: folder.space_id,
                                                        color: folder.color || undefined,
                                                        node_count: folder.node_count
                                                    }}
                                                    position={{
                                                        x: `calc(50% + ${x}px)`,
                                                        y: `calc(50% + ${y}px)`
                                                    }}
                                                    size="md"
                                                    orbitActive
                                                    isPromoted={isPromoted}
                                                    delay={index * 0.04}
                                                    onClick={() => navigateToFolder(folder.id)}
                                                />
                                            ))}

                                            {folderOrbitPositions.length === 0 && (
                                                <div className="absolute inset-0 flex items-center justify-center text-emerald-200/60 text-sm">
                                                    No folders yet. Create one to open this layer.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {viewMode === 'grid' && !isLoadingFolders && (
                                        <div className="h-full overflow-y-auto p-6 custom-scrollbar">
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                {filteredFolders.map((folder) => {
                                                    // Phase 7.4: Intelligence UI Highlighting
                                                    const weight = folderStarPositions.find(p => p.id === folder.id)?.weight || 0.5;
                                                    const isInsight = weight > 0.8;
                                                    const isFocus = weight > 0.6;

                                                    return (
                                                        <motion.button
                                                            key={folder.id}
                                                            onClick={() => navigateToFolder(folder.id)}
                                                            whileHover={{ scale: 1.02, y: -2 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            className={`flex flex-col items-center gap-3 p-6 rounded-xl transition-all group ${isInsight ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' :
                                                                isFocus ? 'bg-emerald-500/10 border-emerald-500/30' :
                                                                    'bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-white/10'
                                                                }`}
                                                        >
                                                            <div className="relative w-12 h-12 rounded-lg bg-black/20 flex items-center justify-center">
                                                                <FolderIcon size={24} style={{ color: folder.color || (isInsight ? '#F59E0B' : '#10b981') }} />
                                                                {isInsight && (
                                                                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#F59E0B]" />
                                                                )}
                                                            </div>
                                                            <span className={`text-sm text-center line-clamp-2 ${isInsight ? 'text-amber-100' : 'text-white/70 group-hover:text-white'}`}>
                                                                {folder.name}
                                                            </span>
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                            {filteredFolders.length === 0 && <EmptyState icon={FolderIcon} title="No folders found" description="Create a new folder to get started." />}
                                        </div>
                                    )}

                                    {viewMode === 'list' && !isLoadingFolders && (
                                        <div className="h-full overflow-y-auto p-6 custom-scrollbar">
                                            <div className="flex flex-col gap-2">
                                                {filteredFolders.map((folder) => (
                                                    <button
                                                        key={folder.id}
                                                        onClick={() => navigateToFolder(folder.id)}
                                                        className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-white/10 transition-all text-left group"
                                                    >
                                                            <div className="p-2 rounded bg-black/20">
                                                            <FolderIcon size={18} style={{ color: folder.color || '#10b981' }} />
                                                        </div>
                                                        <span className="text-white/70 group-hover:text-white flex-1">
                                                            {folder.name}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                            {filteredFolders.length === 0 && <EmptyState icon={FolderIcon} title="No folders found" description="Create a new folder to get started." />}
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
        </div>
    );
};
