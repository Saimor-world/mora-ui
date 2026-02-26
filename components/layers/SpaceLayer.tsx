"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { Plus, RefreshCw, ArrowLeft } from 'lucide-react';
import { CreateModal } from '@/components/ui/CreateModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { motion } from 'framer-motion';
import { Folder as FolderStar } from '@/components/mora/Folder';

const FOLDER_COLORS = [
    { name: 'Emerald', value: '#10b981' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Cyan', value: '#06b6d4' },
];

// Orbit speeds per ring: inner faster, outer slower — slow planetary drift.
const RING_SPEEDS = [0.032, 0.020, 0.013]; // was [0.18, 0.12, 0.08] — ~6x slower
const RING_RADII_X = [140, 220, 300];      // Tighter orbits for L3 intimacy
const RING_RADII_Y = [115, 180, 245];

export const SpaceLayer: React.FC = () => {
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
        viewLevel,
        navigateToFolder,
    } = useMoraStore();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', color: FOLDER_COLORS[0].value });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Orbit animation pattern shared with DepartmentLayer.
    const [orbitTime, setOrbitTime] = useState(0);
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    useEffect(() => {
        const animate = (currentTime: number) => {
            if (lastTimeRef.current === 0) lastTimeRef.current = currentTime;
            const delta = (currentTime - lastTimeRef.current) / 1000;
            lastTimeRef.current = currentTime;
            setOrbitTime(prev => prev + delta);
            animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    const currentDepartment = useMemo(() => {
        return departments.find(d => d.id === activeDepartmentId);
    }, [departments, activeDepartmentId]);

    const currentSpace = useMemo(() => {
        if (!activeDepartmentId || !activeSpaceId) return null;
        return spacesByDepartment[activeDepartmentId]?.find(s => s.id === activeSpaceId);
    }, [activeDepartmentId, activeSpaceId, spacesByDepartment]);

    const folders = useMemo(() => {
        if (!activeSpaceId) return [];
        return foldersBySpace[activeSpaceId] || [];
    }, [activeSpaceId, foldersBySpace]);

    // Recency weight used to bias folder prominence.
    const getWeight = useCallback((dateStr?: string | null) => {
        if (!dateStr) return 0.5;
        const daysDiff = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
        return Math.max(0.3, Math.min(1.0, 1.0 - daysDiff / 30));
    }, []);

    // Animated orbit positions in 3 rings.
    const folderOrbitPositions = useMemo(() => {
        if (folders.length === 0) return [];

        const sorted = [...folders]
            .map(f => ({ ...f, weight: getWeight(f.updated_at || f.created_at) }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 18);

        return sorted.map((folder, index) => {
            const ring = Math.floor(index / 6);
            const inRing = index % 6;
            const ringCount = Math.min(6, sorted.length - ring * 6);
            const baseAngle = (inRing / Math.max(1, ringCount)) * Math.PI * 2 - Math.PI / 2;
            // Animate angle over time for this ring.
            const animAngle = baseAngle + orbitTime * RING_SPEEDS[ring];
            const rx = RING_RADII_X[ring];
            const ry = RING_RADII_Y[ring];
            return {
                folder,
                x: Math.cos(animAngle) * rx,
                y: Math.sin(animAngle) * ry,
                isPromoted: folder.weight >= 0.8,
                delay: index * 0.04,
            };
        });
    }, [folders, orbitTime, getWeight]);

    useEffect(() => {
        if (activeSpaceId && !foldersBySpace[activeSpaceId]) {
            loadFoldersForSpace(activeSpaceId);
        }
    }, [activeSpaceId, foldersBySpace, loadFoldersForSpace]);

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSpaceId || !formData.name.trim()) return;
        setIsSubmitting(true);
        try {
            await addFolder({ space_id: activeSpaceId, name: formData.name.trim(), color: formData.color });
            setFormData({ name: '', color: FOLDER_COLORS[0].value });
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('Failed to create folder:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (viewLevel !== 'space' || !activeSpaceId) return null;

    const spaceName = currentSpace?.name || 'Space';
    const spaceTitle = spaceName.toUpperCase();

    return (
        <div className="relative w-full h-full overflow-hidden bg-transparent">

            {/* Depth Overlay: Darken and blur the galaxy background to create a sense of being 'inside' a Space */}
            <div className="absolute inset-0 z-[-1] bg-black/40 backdrop-blur-[60px] pointer-events-none" />

            {/* Galaxy overlay reused from DepartmentLayer visual language, but subdued. */}
            <div
                className="absolute inset-0 z-[-1] pointer-events-none"
                style={{
                    background: `
                        radial-gradient(900px 420px at 55% 58%, rgba(16, 185, 129, 0.12) 0%, transparent 65%),
                        radial-gradient(700px 320px at 25% 35%, rgba(6, 182, 212, 0.08) 0%, transparent 60%),
                        radial-gradient(600px 280px at 80% 40%, rgba(99, 102, 241, 0.05) 0%, transparent 55%)
                    `
                }}
            />

            {/* Background Space Name Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
                <motion.h1
                    className="font-thin text-white/[0.07] whitespace-nowrap select-none font-sans tracking-[0.2em]"
                    style={{
                        fontSize: `clamp(28px, ${spaceTitle.length > 20 ? 5.5 : spaceTitle.length > 14 ? 7 : 9}vw, ${spaceTitle.length > 20 ? 88 : spaceTitle.length > 14 ? 110 : 140}px)`,
                        maxWidth: '95vw',
                    }}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                >
                    {spaceTitle}
                </motion.h1>
            </div>

            {/* Breadcrumb Back Button style */}
            <motion.button
                onClick={() => activeDepartmentId && navigateToDepartment(activeDepartmentId)}
                className="absolute top-8 left-8 z-50 flex items-center gap-3 text-white/50 hover:text-white transition-colors group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: -2 }}
            >
                <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 border border-white/5 transition-colors">
                    <ArrowLeft size={16} />
                </div>
                <div className="flex flex-col items-start gap-0.5 pointer-events-none">
                    <span className="text-[9px] text-emerald-500/70 tracking-[0.2em] font-medium uppercase">
                        Zurück
                    </span>
                    <span className="text-sm tracking-widest font-light flex items-center gap-2">
                        <span>UNIVERSE</span>
                        <span className="text-white/20">/</span>
                        <span className="text-emerald-100/90">{currentDepartment?.name.toUpperCase() || 'DEPARTMENT'}</span>
                    </span>
                </div>
            </motion.button>

            {/* Top-right actions: minimal floating controls */}
            <motion.div
                className="absolute top-8 right-8 z-50 flex items-center gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <button
                    onClick={() => activeSpaceId && loadFoldersForSpace(activeSpaceId)}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white/40 hover:text-white transition-colors"
                    title="Refresh"
                >
                    <RefreshCw size={16} />
                </button>
                <motion.button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 transition-all text-sm tracking-widest font-light"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                >
                    <Plus size={15} />
                    NEW FOLDER
                </motion.button>
            </motion.div>

            {/* Universe content rendered full screen, no panel shell. */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                {isLoadingFolders ? (
                    <LoadingState message="Scanning Space..." />
                ) : (
                    <div className="relative w-full h-full max-w-6xl max-h-[800px] mx-auto">

                        {/* Orbit track rings */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25">
                            {RING_RADII_X.slice(0, Math.min(3, Math.ceil(folders.length / 6) + 1)).map((rx, i) => (
                                <ellipse
                                    key={`orbit-ring-${i}`}
                                    cx="50%"
                                    cy="50%"
                                    rx={rx}
                                    ry={RING_RADII_Y[i]}
                                    fill="none"
                                    stroke="url(#spaceRingGradient)"
                                    strokeWidth="1"
                                    strokeDasharray="5 9"
                                    opacity={0.3 - i * 0.07}
                                />
                            ))}
                            <defs>
                                <linearGradient id="spaceRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="rgba(16,185,129,0.6)" />
                                    <stop offset="50%" stopColor="rgba(6,182,212,0.25)" />
                                    <stop offset="100%" stopColor="rgba(16,185,129,0.6)" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Central space orb acts as system center. */}
                        <motion.div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                        >
                            {/* Outer aura — large slow pulse */}
                            <motion.div
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                                style={{ width: 180, height: 180, background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)' }}
                                animate={{ scale: [1, 1.45, 1], opacity: [0.55, 0.12, 0.55] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            />
                            {/* Mid aura */}
                            <motion.div
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                                style={{ width: 110, height: 110, background: 'radial-gradient(circle, rgba(6,182,212,0.22) 0%, transparent 70%)' }}
                                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0.08, 0.4] }}
                                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                            />
                            {/* Core orb — larger, with radial sheen */}
                            <div
                                className="w-28 h-28 rounded-full border border-emerald-400/50 flex items-center justify-center"
                                style={{
                                    background: 'radial-gradient(circle at 35% 35%, rgba(16,185,129,0.45) 0%, rgba(6,182,212,0.18) 60%, transparent 100%)',
                                    boxShadow: '0 0 50px rgba(16,185,129,0.45), 0 0 100px rgba(16,185,129,0.15)',
                                }}
                            >
                                <span className="text-[9px] text-emerald-100/90 uppercase tracking-[0.16em] text-center px-3 leading-tight font-light">
                                    {spaceName.length > 20 ? spaceName.split(' ').slice(0, 2).join(' ') : spaceName}
                                </span>
                            </div>
                        </motion.div>

                        {/* Folder stars orbit around the central space orb. */}
                        {folderOrbitPositions.map(({ folder, x, y, isPromoted, delay }) => (
                            <div
                                key={`folder-${folder.id}`}
                                className="absolute pointer-events-auto"
                                style={{
                                    left: `calc(50% + ${x}px)`,
                                    top: `calc(50% + ${y}px)`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 30,
                                }}
                            >
                                <FolderStar
                                    folder={{
                                        id: folder.id,
                                        name: folder.name,
                                        space_id: folder.space_id,
                                        color: folder.color || undefined,
                                        node_count: folder.node_count
                                    }}
                                    position={{ x: '50%', y: '50%' }}
                                    size="lg"
                                    orbitActive
                                    isPromoted={isPromoted}
                                    delay={delay}
                                    onClick={() => navigateToFolder(folder.id)}
                                />
                                {/* Always-visible label */}
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                                    <span className="text-[11px] text-white/65 font-medium tracking-widest">
                                        {folder.name}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Empty State */}
                        {!isLoadingFolders && folders.length === 0 && (
                            <motion.div
                                className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                <p className="text-emerald-200/40 text-sm tracking-widest">
                                    NO FOLDERS YET
                                </p>
                                <motion.button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="pointer-events-auto px-5 py-2 rounded-full border border-emerald-500/25 text-emerald-300/70 hover:text-emerald-200 hover:border-emerald-400/40 text-xs tracking-widest transition-all"
                                    whileHover={{ scale: 1.04 }}
                                >
                                    + CREATE FIRST FOLDER
                                </motion.button>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Folder Modal */}
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
                        <label className="block text-sm text-emerald-400/70 mb-2 tracking-wider">COLOR</label>
                        <div className="grid grid-cols-6 gap-2">
                            {FOLDER_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color: color.value })}
                                    className={`w-full aspect-square rounded-lg border-2 transition-all ${formData.color === color.value ? 'border-white scale-110' : 'border-white/20 hover:border-white/40'}`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:bg-white/5">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50">
                            {isSubmitting ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </CreateModal>
        </div>
    );
};
