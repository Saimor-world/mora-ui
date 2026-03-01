"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { Plus, RefreshCw, ArrowLeft, FolderOpen } from 'lucide-react';
import { CreateModal } from '@/components/ui/CreateModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { motion, useReducedMotion } from 'framer-motion';
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
const RING_SPEEDS = [0.032, 0.020, 0.013];
// Single source of truth — used by BOTH SVG orbit rings AND folder positions.
// Bug fix: previously shadowed by a local const inside folderOrbitPositions useMemo,
// causing the visual orbit rings and actual folder orbs to orbit at different radii.
const RING_RADII_X = [200, 310, 410];
const RING_RADII_Y = [140, 215, 285];

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
    const prefersReducedMotion = useReducedMotion();
    const [isAnyHovered, setIsAnyHovered] = useState(false);
    const isAnyHoveredRef = useRef(false);

    // Orbit animation pattern shared with DepartmentLayer.
    const [orbitTime, setOrbitTime] = useState(0);
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    useEffect(() => {
        // Respect prefers-reduced-motion: skip the animation loop entirely.
        if (prefersReducedMotion) return;
        const animate = (currentTime: number) => {
            if (lastTimeRef.current === 0) lastTimeRef.current = currentTime;
            const delta = (currentTime - lastTimeRef.current) / 1000;
            lastTimeRef.current = currentTime;
            // Pause orbit when hovering — folders freeze in place
            if (!isAnyHoveredRef.current) {
                setOrbitTime(prev => prev + delta);
            }
            animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [prefersReducedMotion]);

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

    const displaySpaceName = useCallback((name: string) => {
        const deptName = currentDepartment?.name || '';
        let value = name || 'Space';
        // Strip department name prefix
        if (deptName && value.toLowerCase().startsWith(deptName.toLowerCase())) {
            value = value.slice(deptName.length).replace(/^[\s&–\-_:]+/, '').trim();
        }
        // Strip generic words — but only if the result is meaningful (> 2 chars, not just a number)
        const stripped = value.replace(/\b(workspace|team space|space)\b/gi, '').trim();
        if (stripped.length > 2 && !/^\d+$/.test(stripped)) {
            value = stripped;
        }
        return value || 'Teamraum';
    }, [currentDepartment?.name]);

    // Recency weight used to bias folder prominence.
    const getWeight = useCallback((dateStr?: string | null) => {
        if (!dateStr) return 0.5;
        const daysDiff = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
        return Math.max(0.3, Math.min(1.0, 1.0 - daysDiff / 30));
    }, []);

    // Fallback color palette — assigned by folder index so each orb has a distinct colour
    const FALLBACK_COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#f43f5e', '#3b82f6'];

    // Animated orbit positions in 3 rings.
    // Uses module-level RING_RADII_X/Y/SPEEDS — no local shadowing.
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
            // Assign a distinct fallback color when the folder has no color set
            const resolvedColor = folder.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
            return {
                folder: { ...folder, color: resolvedColor },
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

    const spaceName = displaySpaceName(currentSpace?.name || 'Space');

    return (
        <div className="relative w-full h-full overflow-hidden bg-transparent">

            {/* Depth Overlay: subtle blur to separate L3 from galaxy — was bg-black/40 blur-[60px], far too dark */}
            <div className="absolute inset-0 z-[-1] bg-black/18 backdrop-blur-[20px] pointer-events-none" />

            {/* Vignette — softer than before */}
            <div
                className="absolute inset-0 z-[-1] pointer-events-none"
                style={{ background: 'radial-gradient(circle at 50% 50%, transparent 48%, rgba(0,0,0,0.32) 100%)' }}
            />

            {/* Galaxy overlay reused from DepartmentLayer visual language, but subdued. */}
            <div
                className="absolute inset-0 z-[-1] pointer-events-none"
                style={{
                    background: `
                        radial-gradient(1100px 520px at 55% 58%, rgba(16, 185, 129, 0.22) 0%, transparent 65%),
                        radial-gradient(850px 400px at 25% 35%, rgba(6, 182, 212, 0.16) 0%, transparent 60%),
                        radial-gradient(700px 340px at 80% 40%, rgba(99, 102, 241, 0.14) 0%, transparent 55%),
                        radial-gradient(580px 300px at 72% 80%, rgba(245, 158, 11, 0.12) 0%, transparent 50%),
                        radial-gradient(500px 360px at 8% 60%, rgba(139, 92, 246, 0.10) 0%, transparent 50%)
                    `
                }}
            />

            {/* Breadcrumb Back Button style */}
            <motion.button
                data-testid="nav-back-to-department"
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
                        <span className="text-white/40">UNIVERSE</span>
                        <span className="text-white/20">/</span>
                        <span className="text-emerald-100/90">{currentDepartment?.name.toUpperCase() || 'DEPARTMENT'}</span>
                        <span className="text-white/20">/</span>
                        <span className="text-white/50">{spaceName.toUpperCase()}</span>
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
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white/40 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60"
                    title="Refresh"
                    aria-label="Ordner aktualisieren"
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

            <motion.div
                className="absolute top-32 left-8 z-40 rounded-2xl border border-cyan-400/20 bg-black/45 backdrop-blur-xl px-4 py-3 min-w-[220px]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/80 mb-2">
                    Layer 3 / Folder Cluster
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                        <div className="text-[9px] text-white/40 uppercase tracking-wide">Folders</div>
                        <div className="text-lg leading-none text-cyan-200">{folders.length}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                        <div className="text-[9px] text-white/40 uppercase tracking-wide">Aktiv</div>
                        <div className="text-lg leading-none text-emerald-200">{isAnyHovered ? 1 : 0}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                        <div className="text-[9px] text-white/40 uppercase tracking-wide">Files</div>
                        <div className="text-lg leading-none text-violet-200">
                            {folders.reduce((sum, folder) => sum + (folder.node_count || 0), 0)}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Universe content rendered full screen, no panel shell. */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                {isLoadingFolders ? (
                    <LoadingState message="Scanning Space..." />
                ) : (
                    /* pb-16 offsets the fixed dock (~64px) so top-1/2 centres within the visible area */
                    <div className="relative w-full h-full pb-16">

                        {/* Connection lines center -> folder nodes for constellation clarity */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                            {folderOrbitPositions.map(({ folder, x, y }) => (
                                <line
                                    key={`link-${folder.id}`}
                                    x1="50%"
                                    y1="50%"
                                    x2={`calc(50% + ${x}px)`}
                                    y2={`calc(50% + ${y}px)`}
                                    stroke="rgba(16,185,129,0.14)"
                                    strokeWidth="1"
                                    strokeDasharray="3 8"
                                />
                            ))}
                        </svg>

                        {/* Orbit track rings */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25 z-0">
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

                        {/* Central space orb — L3 character: dept-colored intimate sphere */}
                        <motion.div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                        >
                            {/* Outer aura — boosted from 28/55% → 55/70% */}
                            <motion.div
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                                style={{ width: 300, height: 300, background: `radial-gradient(circle, ${currentDepartment?.color || '#10b981'}55 0%, transparent 68%)` }}
                                animate={{ scale: [1, 1.40, 1], opacity: [0.70, 0.20, 0.70] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            />
                            {/* Mid aura */}
                            <motion.div
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                                style={{ width: 200, height: 200, background: `radial-gradient(circle, ${currentDepartment?.color || '#10b981'}66 0%, transparent 68%)` }}
                                animate={{ scale: [1, 1.50, 1], opacity: [0.55, 0.14, 0.55] }}
                                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            />
                            {/* Core orb — 144px — fixed: was ${color}25 (9% alpha) → now ${color}AA (67%) */}
                            <div
                                className="relative w-36 h-36 rounded-full flex items-center justify-center overflow-hidden backdrop-blur-sm"
                                style={{
                                    background: `radial-gradient(145% 145% at 28% 26%, rgba(255,255,255,0.22) 0%, ${currentDepartment?.color || '#10b981'}AA 45%, rgba(0,0,0,0.30) 100%)`,
                                    border: `1.5px solid ${currentDepartment?.color || '#10b981'}99`,
                                    boxShadow: `0 0 80px ${currentDepartment?.color || '#10b981'}60, 0 0 160px ${currentDepartment?.color || '#10b981'}28, inset 2px 2px 8px rgba(255,255,255,0.30)`,
                                }}
                            >
                                {/* Specular */}
                                <div className="absolute top-[16%] left-[16%] w-[18%] h-[10%] rounded-full bg-white/70 blur-[1px]" style={{ transform: 'rotate(-45deg)' }} />
                                {/* Inner glow */}
                                <motion.div
                                    className="absolute inset-[20%] rounded-full mix-blend-overlay blur-md"
                                    style={{ background: `radial-gradient(circle, ${currentDepartment?.color || '#10B981'} 0%, transparent 70%)` }}
                                    animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.9, 1.1, 0.9] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                />
                                <span className="relative z-10 text-[11px] text-white/90 uppercase tracking-[0.14em] text-center px-4 leading-tight font-light">
                                    {spaceName.length > 20 ? spaceName.substring(0, 18) + '…' : spaceName}
                                </span>
                            </div>
                            <div className="absolute top-[100%] left-1/2 -translate-x-1/2 mt-4 rounded-full border bg-black/40 px-4 py-1 text-[9px] tracking-[0.18em] uppercase whitespace-nowrap"
                                style={{ borderColor: `${currentDepartment?.color || 'rgba(6,182,212,1)'}55`, color: `${currentDepartment?.color || 'rgba(6,182,212,1)'}CC` }}>
                                Folder Cluster
                            </div>
                        </motion.div>

                        {/* Folder orbs orbit the space core */}
                        {folderOrbitPositions.map(({ folder, x, y, isPromoted, delay }) => (
                            <div
                                key={`folder-${folder.id}`}
                                data-testid={`folder-${folder.id}`}
                                data-folder-name={folder.name}
                                className="absolute pointer-events-auto flex flex-col items-center"
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
                                    position={{ x: 0, y: 0 }}
                                    size="lg"
                                    orbitActive
                                    isPromoted={isPromoted}
                                    delay={delay}
                                    onHover={(hovered) => {
                                        isAnyHoveredRef.current = hovered;
                                        setIsAnyHovered(hovered);
                                    }}
                                    onClick={() => navigateToFolder(folder.id)}
                                />
                                {/* Persistent label below orb */}
                                <div className="mt-1.5 whitespace-nowrap pointer-events-none">
                                    <span className="text-[11px] text-white/60 font-light tracking-wide max-w-[110px] truncate block text-center">
                                        {folder.name}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Empty State — L3 with 0 folders */}
                        {!isLoadingFolders && folders.length === 0 && (
                            <motion.div
                                className="absolute inset-0 flex flex-col items-center justify-center gap-5 pointer-events-none"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.6 }}
                            >
                                {/* Icon */}
                                <motion.div
                                    className="relative"
                                    animate={prefersReducedMotion ? {} : { scale: [1, 1.06, 1], opacity: [0.5, 0.8, 0.5] }}
                                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                    <div className="w-16 h-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center">
                                        <FolderOpen size={28} className="text-emerald-400/50" />
                                    </div>
                                    {/* Subtle glow ring */}
                                    <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: '0 0 30px rgba(16,185,129,0.12)' }} />
                                </motion.div>

                                {/* Label */}
                                <div className="flex flex-col items-center gap-1.5">
                                    <p className="text-white/55 text-sm font-light tracking-widest uppercase">
                                        Noch keine Ordner
                                    </p>
                                    <p className="text-white/45 text-xs font-light text-center max-w-[220px] leading-relaxed">
                                        Erstelle deinen ersten Ordner,<br />um Dokumente zu organisieren.
                                    </p>
                                </div>

                                {/* CTA */}
                                <motion.button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="pointer-events-auto flex items-center gap-2 px-6 py-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/8 text-emerald-300/80 hover:text-emerald-200 hover:border-emerald-400/50 hover:bg-emerald-500/15 text-xs tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60"
                                    whileHover={{ scale: prefersReducedMotion ? 1 : 1.05 }}
                                    whileTap={{ scale: prefersReducedMotion ? 1 : 0.97 }}
                                >
                                    <Plus size={14} />
                                    Ordner erstellen
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
