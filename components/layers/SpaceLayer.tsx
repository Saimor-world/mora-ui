"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { ArrowLeft, LayoutGrid, List, Folder, FileText, AlertCircle, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { CreateModal } from '@/components/ui/CreateModal';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

// Preset colors for folders
const FOLDER_COLORS = [
    { name: 'Emerald', value: '#10b981' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Cyan', value: '#06b6d4' },
];

export const SpaceLayer: React.FC = () => {
    const {
        activeSpaceId,
        activeDepartmentId,
        departments,
        spacesByDepartment,
        foldersBySpace,
        isLoadingFolders,
        navigateToCore,
        navigateToDepartment,
        navigateToFolder,
        loadFoldersForSpace,
        addFolder,
    } = useMoraStore();

    const [viewMode, setViewMode] = useState<'visual' | 'list'>('visual');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', color: FOLDER_COLORS[0].value });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get current space data
    const currentSpace = useMemo(() => {
        if (!activeDepartmentId || !activeSpaceId) return null;
        const spaces = spacesByDepartment[activeDepartmentId] || [];
        return spaces.find(s => s.id === activeSpaceId);
    }, [activeDepartmentId, activeSpaceId, spacesByDepartment]);

    // Get current department data for breadcrumb
    const currentDepartment = useMemo(() => {
        if (!activeDepartmentId) return null;
        return departments.find(d => d.id === activeDepartmentId);
    }, [activeDepartmentId, departments]);

    // Get folders for current space
    const folders = activeSpaceId ? (foldersBySpace[activeSpaceId] || []) : [];

    // Load folders when space becomes active
    useEffect(() => {
        if (activeSpaceId && !foldersBySpace[activeSpaceId]) {
            loadFoldersForSpace(activeSpaceId);
        }
    }, [activeSpaceId, foldersBySpace, loadFoldersForSpace]);

    const handleBack = () => {
        if (activeDepartmentId) {
            navigateToDepartment(activeDepartmentId);
        }
    };

    const handleFolderClick = (folderId: string) => {
        navigateToFolder(folderId);
    };

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

    // Sort folders by order then name for stable display
    const sortedFolders = useMemo(() => {
        return [...folders].sort((a, b) => {
            //Default order to 0 if undefined
            const orderA = a.order ?? 0;
            const orderB = b.order ?? 0;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
        });
    }, [folders]);

    // Generate orbital positions for folder bubbles
    const folderPositions = useMemo(() => {
        return sortedFolders.map((folder, index) => {
            const angle = (index / Math.max(sortedFolders.length, 1)) * Math.PI * 2;
            const radius = 200 + (index % 2) * 80;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const delay = index * 0.15;

            return { ...folder, x, y, delay };
        });
    }, [sortedFolders]);

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
                            {currentSpace?.name || 'Space'}
                        </h2>
                        <Breadcrumb items={[
                            { label: 'ROOT', onClick: navigateToCore },
                            { label: currentDepartment?.name || 'Dept', onClick: () => activeDepartmentId && navigateToDepartment(activeDepartmentId) },
                            { label: currentSpace?.name || 'Space', isActive: true }
                        ]} />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Create Folder Button */}
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-emerald-500/30 hover:border-mora-gold/50 hover:bg-white/5 transition-all group"
                    >
                        <Plus className="w-4 h-4 text-emerald-400 group-hover:text-mora-gold transition-colors" />
                        <span className="text-sm text-emerald-300 group-hover:text-mora-gold transition-colors tracking-wider">
                            NEW FOLDER
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
            {isLoadingFolders && (
                <div className="flex-1 flex items-center justify-center">
                    <LoadingState message="Loading knowledge clusters..." />
                </div>
            )}

            {/* Content Area */}
            {!isLoadingFolders && (
                <div className="flex-1 relative z-10">

                    {viewMode === 'visual' && (
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">

                            {/* Central Nebula Glow */}
                            <motion.div
                                className="absolute w-96 h-96 rounded-full bg-gradient-radial from-emerald-500/10 via-emerald-500/5 to-transparent blur-3xl"
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.3, 0.5, 0.3],
                                }}
                                transition={{
                                    duration: 8,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />

                            {/* Orbiting Folder Bubbles */}
                            {folderPositions.map((folder) => (
                                <motion.button
                                    key={folder.id}
                                    onClick={() => handleFolderClick(folder.id)}
                                    title={folder.name}
                                    className="absolute group flex flex-col items-center justify-center gap-3"
                                    style={{
                                        left: '50%',
                                        top: '50%',
                                        // Center the element on its coordinate
                                        marginLeft: -60, // half of approx width
                                        marginTop: -60,
                                        width: 120,
                                        height: 120,
                                    }}
                                    initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                                    animate={{
                                        x: folder.x,
                                        y: folder.y,
                                        opacity: 1,
                                        scale: 1,
                                    }}
                                    transition={{
                                        delay: folder.delay,
                                        duration: 0.8,
                                        type: "spring",
                                        stiffness: 100,
                                    }}
                                    whileHover={{ scale: 1.1, zIndex: 50 }}
                                >
                                    {/* Folder Bubble */}
                                    <div className="relative w-20 h-20 flex items-center justify-center">
                                        {/* Glow Effect - breathing on hover only */}
                                        <motion.div
                                            className="absolute inset-0 rounded-full blur-xl opacity-20 transition-opacity duration-500"
                                            style={{ backgroundColor: folder.color || '#10b981' }}
                                        />

                                        {/* Main Bubble */}
                                        <motion.div
                                            className="relative w-full h-full rounded-full glass-panel border border-white/10 transition-all duration-500 flex items-center justify-center backdrop-blur-md bg-black/40"
                                            whileHover={{
                                                scale: 1.05,
                                                borderColor: 'rgba(255, 255, 255, 0.4)',
                                            }}
                                        >
                                            <Folder
                                                className="w-8 h-8 transition-colors duration-500"
                                                style={{ color: folder.color || '#10b981' }}
                                            />
                                        </motion.div>
                                    </div>

                                    {/* Label - Stably visible, brightens on hover */}
                                    <div className="relative">
                                        <span className="text-[10px] uppercase tracking-wider text-emerald-100/70 bg-black/60 px-3 py-1 rounded-full border border-white/5 group-hover:text-white group-hover:border-white/20 group-hover:bg-black/80 transition-all whitespace-nowrap">
                                            {folder.name}
                                        </span>
                                    </div>
                                </motion.button>
                            ))}

                            {/* Empty State */}
                            {folders.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <EmptyState
                                        icon={Folder}
                                        title="Empty Space"
                                        description="This space is waiting for matter. Create a folder to begin."
                                        actionLabel="Create Folder"
                                        onAction={() => setIsCreateModalOpen(true)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {viewMode === 'list' && (
                        <div className="p-8 glass-panel border border-white/5 rounded-3xl h-full overflow-y-auto custom-scrollbar">
                            {/* List Header */}
                            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-white/5 text-emerald-400/50 text-xs uppercase tracking-wider">
                                <span className="w-10">Type</span>
                                <span className="flex-1">Name</span>
                                <span className="w-32">Modified</span>
                            </div>

                            {/* Folder List */}
                            {sortedFolders.map((folder) => (
                                <button
                                    key={folder.id}
                                    onClick={() => handleFolderClick(folder.id)}
                                    className="w-full flex items-center gap-3 p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group text-left"
                                >
                                    <Folder
                                        className="w-5 h-5 transition-colors"
                                        style={{ color: folder.color || '#10b981' }}
                                    />
                                    <span className="flex-1 text-emerald-100/80 group-hover:text-white transition-colors">
                                        {folder.name}
                                    </span>
                                    <span className="w-32 text-emerald-500/40 text-xs">
                                        {folder.updated_at ? new Date(folder.updated_at).toLocaleDateString() : 'Today'}
                                    </span>
                                </button>
                            ))}

                            {/* Empty State */}
                            {folders.length === 0 && (
                                <EmptyState
                                    icon={Folder}
                                    title="Empty Space"
                                    description="This space is waiting for matter. Create a folder to begin."
                                    actionLabel="Create Folder"
                                    onAction={() => setIsCreateModalOpen(true)}
                                />
                            )}
                        </div>
                    )}

                </div>
            )}

            {/* Create Folder Modal */}
            <CreateModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setFormData({ name: '', color: FOLDER_COLORS[0].value });
                }}
                title="Create New Folder"
            >
                <form onSubmit={handleCreateFolder} className="space-y-6">
                    <div>
                        <label className="block text-sm text-emerald-400/70 mb-2 tracking-wider">
                            NAME *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-emerald-100 placeholder-emerald-500/30 focus:border-mora-gold/50 focus:outline-none transition-colors"
                            placeholder="Enter folder name"
                            required
                            autoFocus
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
                        <button
                            type="button"
                            onClick={() => {
                                setIsCreateModalOpen(false);
                                setFormData({ name: '', color: FOLDER_COLORS[0].value });
                            }}
                            className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-emerald-400 hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.name.trim()}
                            className="flex-1 px-4 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-600/30 hover:border-mora-gold/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Folder'}
                        </button>
                    </div>
                </form>
            </CreateModal>

        </div>
    );
};
