"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { motion, AnimatePresence } from 'framer-motion';
import { SemanticConstellation } from '@/components/visual/SemanticConstellation';
import { Star } from '@/components/mora/Star';
import { Folder } from '@/components/mora/Folder';
import { ArrowLeft, Plus, FileText } from 'lucide-react';
import { LoadingState } from '@/components/ui/LoadingState';

/**
 * DEPARTMENT LAYER - GALAXY VIEW (Working Space)
 * 
 * Visualizes a Department as a sector of the universe.
 * Spaces are rendered as "Moons" orbiting the department center.
 * 
 * PHASE 6: Full Working Space with animated orbits
 */
export const DepartmentLayer: React.FC = () => {
    const {
        activeDepartmentId,
        departments,
        spacesByDepartment,
        foldersBySpace,
        isLoadingSpaces,
        loadSpacesForDepartment,
        loadFoldersForSpace,
        navigateToCore,
        navigateToSpace,
        addSpace,
        setActiveSpace,
        treeData
    } = useMoraStore();
    const { openPane } = usePaneStore();

    const currentDepartment = departments.find(d => d.id === activeDepartmentId);
    const deptTitle = currentDepartment?.name || '';
    const deptTitleStyle = useMemo(() => {
        const length = deptTitle.length;
        const max = length > 22 ? 96 : length > 16 ? 120 : 140;
        const min = length > 22 ? 26 : length > 16 ? 32 : 40;
        const vw = length > 22 ? 6.5 : length > 16 ? 7.2 : 8.2;
        const spacing = length > 22 ? '0.16em' : length > 16 ? '0.2em' : '0.25em';
        return {
            fontSize: `clamp(${min}px, ${vw}vw, ${max}px)`,
            letterSpacing: spacing,
            maxWidth: '90vw'
        } as React.CSSProperties;
    }, [deptTitle]);

    const departmentDocs = useMemo(() => {
        if (!activeDepartmentId || !treeData) return [];
        const root = treeData.find((n) => n.id === activeDepartmentId);
        if (!root) return [];
        const docs: any[] = [];
        const walk = (node: any) => {
            if (!node) return;
            if (node.type === 'node') docs.push(node);
            if (node.children) node.children.forEach(walk);
        };
        walk(root);
        return docs;
    }, [activeDepartmentId, treeData]);
    const spaces = useMemo(() => {
        if (!activeDepartmentId) return [];
        return spacesByDepartment[activeDepartmentId] || [];
    }, [activeDepartmentId, spacesByDepartment]);
    const [hoveredSpaceId, setHoveredSpaceId] = useState<string | null>(null);
    const hoverClearRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (activeDepartmentId && !spacesByDepartment[activeDepartmentId]) {
            loadSpacesForDepartment(activeDepartmentId);
        }
    }, [activeDepartmentId, spacesByDepartment, loadSpacesForDepartment]);

    const clearHoverTimeout = useCallback(() => {
        if (hoverClearRef.current) {
            clearTimeout(hoverClearRef.current);
            hoverClearRef.current = null;
        }
    }, []);

    const setHoverSpace = useCallback((spaceId: string | null) => {
        clearHoverTimeout();
        setHoveredSpaceId(spaceId);
    }, [clearHoverTimeout]);

    const scheduleHoverClear = useCallback(() => {
        clearHoverTimeout();
        hoverClearRef.current = setTimeout(() => setHoveredSpaceId(null), 600);
    }, [clearHoverTimeout]);

    useEffect(() => {
        return () => clearHoverTimeout();
    }, [clearHoverTimeout]);

    // PHASE 6.1: Animated orbital state
    const [orbitTime, setOrbitTime] = useState(0);
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    // Animation loop for orbiting
    useEffect(() => {
        const animate = (currentTime: number) => {
            if (lastTimeRef.current === 0) {
                lastTimeRef.current = currentTime;
            }
            const delta = (currentTime - lastTimeRef.current) / 1000; // seconds
            lastTimeRef.current = currentTime;

            setOrbitTime(prev => prev + delta);
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Calculate Orbital Positions with animation
    const moonPositions = useMemo(() => {
        if (spaces.length === 0) return [];

        const count = spaces.length;
        const baseRadius = 280; // WIDER ORBITS FOR L2

        return spaces.map((space, i) => {
            // Slow planetary drift — inner slightly faster, outer slower
            const orbitSpeed = 0.028 - (i * 0.003); // was 0.15; now ~10x slower
            const startAngle = (i / count) * Math.PI * 2; // Even distribution

            // Current angle based on time
            const currentAngle = startAngle + (orbitTime * orbitSpeed);

            // Slightly elliptical orbit for organic feel
            const radiusX = baseRadius + (i * 45); // was 38
            const radiusY = baseRadius + (i * 32); // was 27

            return {
                space,
                x: Math.cos(currentAngle) * radiusX,
                y: Math.sin(currentAngle) * radiusY,
                angle: currentAngle,
                radiusX,
                radiusY,
                delay: i * 0.08
            };
        });
    }, [spaces, orbitTime]);

    const hoveredSpacePosition = useMemo(() => {
        if (!hoveredSpaceId) return null;
        return moonPositions.find(m => m.space.id === hoveredSpaceId) || null;
    }, [hoveredSpaceId, moonPositions]);

    const hoveredFolders = useMemo(() => (
        hoveredSpaceId ? (foldersBySpace[hoveredSpaceId] || []) : []
    ), [hoveredSpaceId, foldersBySpace]);

    useEffect(() => {
        if (!hoveredSpaceId) return;
        if (!foldersBySpace[hoveredSpaceId]) {
            loadFoldersForSpace(hoveredSpaceId);
        }
    }, [hoveredSpaceId, foldersBySpace, loadFoldersForSpace]);

    const hoveredFolderPositions = useMemo(() => {
        if (!hoveredSpaceId || !hoveredSpacePosition || hoveredFolders.length === 0) return [];
        const count = Math.max(hoveredFolders.length, 1);
        return hoveredFolders.map((folder, i) => {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            const radius = 70 + (i % 3) * 14;
            return {
                folder,
                x: hoveredSpacePosition.x + Math.cos(angle) * radius,
                y: hoveredSpacePosition.y + Math.sin(angle) * radius,
                angle,
                radius
            };
        });
    }, [hoveredSpaceId, hoveredSpacePosition, hoveredFolders]);

    // Background Stars
    const stars = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1
    })), []);

    if (!activeDepartmentId) return null;

    return (
        <div className="relative w-full h-full overflow-hidden bg-transparent">

            {/* Galaxy Overlay — rich nebula matching home universe language */}
            <div
                className="absolute inset-0 z-[-1] pointer-events-none"
                style={{
                    background: `
                        radial-gradient(1100px 500px at 52% 55%, rgba(16,185,129,0.20) 0%, transparent 65%),
                        radial-gradient(800px 380px at 18% 28%, rgba(6,182,212,0.14) 0%, transparent 60%),
                        radial-gradient(700px 320px at 82% 35%, rgba(99,102,241,0.13) 0%, transparent 55%),
                        radial-gradient(500px 240px at 65% 80%, rgba(16,185,129,0.09) 0%, transparent 55%)
                    `
                }}
            />

            {/* Department name watermark, consistent with deeper layers */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
                <motion.h1
                    className="font-thin text-white/[0.07] whitespace-nowrap select-none font-sans"
                    style={deptTitleStyle}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                >
                    {deptTitle.toUpperCase()}
                </motion.h1>
            </div>

            {/* Breadcrumb Back Button */}
            <motion.button
                onClick={navigateToCore}
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
                        <span className="text-emerald-100/90">UNIVERSE</span>
                        <span className="text-white/20">/</span>
                        <span className="text-white/40 group-hover:text-white/60 transition-colors uppercase">
                            {deptTitle.length > 20 ? deptTitle.substring(0, 20) + '...' : deptTitle || 'DEPARTMENT'}
                        </span>
                    </span>
                </div>
            </motion.button>

            {/* Mora Hub is opened via the Orb, not rendered here */}

            {/* Content Area */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                {isLoadingSpaces ? (
                    <LoadingState message="Scanning Sector..." />
                ) : (
                    <div className="relative w-full h-full max-w-6xl max-h-[800px] mx-auto">

                        {/* ORBITAL TRACKS - Visual guides for moon paths */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                            {moonPositions.map(({ space, radiusX, radiusY }, i) => (
                                <ellipse
                                    key={`orbit-${space.id}`}
                                    cx="50%"
                                    cy="50%"
                                    rx={radiusX}
                                    ry={radiusY}
                                    fill="none"
                                    stroke="url(#orbitGradient)"
                                    strokeWidth="1"
                                    strokeDasharray="4 8"
                                />
                            ))}
                            <defs>
                                <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                                    <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.1" />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Center Point (Department Core) - Enhanced Glow */}
                        <motion.div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                        >
                            {/* Outer aura ring 1 */}
                            <motion.div
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                                style={{ width: 180, height: 180, background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)' }}
                                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.15, 0.6] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            />
                            {/* Outer aura ring 2 */}
                            <motion.div
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                                style={{ width: 110, height: 110, background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)' }}
                                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0.1, 0.4] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            />
                            {/* Core Orb — large, labelled */}
                            <div
                                className="w-20 h-20 rounded-full border border-emerald-400/50 flex items-center justify-center"
                                style={{
                                    background: 'radial-gradient(circle at 35% 35%, rgba(16,185,129,0.45) 0%, rgba(6,182,212,0.18) 60%, transparent 100%)',
                                    boxShadow: '0 0 40px rgba(16,185,129,0.4), 0 0 80px rgba(16,185,129,0.12)',
                                }}
                            >
                                <span className="text-[9px] text-emerald-200/90 uppercase tracking-[0.15em] text-center px-2 leading-tight font-light">
                                    {deptTitle.length > 14 ? deptTitle.split(' ')[0] : deptTitle}
                                </span>
                            </div>
                        </motion.div>

                        {/* Moons (Spaces) orbiting Department */}
                        {moonPositions.map(({ space, x, y, delay }) => {
                            // NAMING FIX: If space name matches department name, show "General" to avoid confusion
                            const normalize = (s: string) => s?.toLowerCase().trim();
                            const displayName = normalize(space.name) === normalize(currentDepartment?.name || '')
                                ? "General"
                                : space.name;

                            return (
                                <motion.div
                                    key={space.id}
                                    className="absolute cursor-pointer group"
                                    style={{
                                        left: `calc(50% + ${x}px)`,
                                        top: `calc(50% + ${y}px)`,
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay, duration: 0.5 }}
                                    whileHover={{ scale: 1.15 }}
                                    onMouseEnter={() => setHoverSpace(space.id)}
                                    onMouseLeave={() => scheduleHoverClear()}
                                    onClick={(event) => {
                                        // Primary action: drill down to Layer-3 (Space view).
                                        if (!event.shiftKey) {
                                            navigateToSpace(space.id);
                                            return;
                                        }
                                        // Secondary fallback: Shift+Click opens the pane flow.
                                        openPane({
                                            id: `space-${space.id}`,
                                            type: 'space',
                                            title: displayName,
                                            data: {
                                                spaceId: space.id,
                                                departmentId: activeDepartmentId
                                            },
                                            size: { width: 1000, height: 700 },
                                            position: { x: 100, y: 100 }
                                        });
                                    }}

                                >
                                    <Star
                                        space={{
                                            id: space.id,
                                            name: displayName,
                                            department_id: activeDepartmentId, // Explicitly pass activeDepartmentId
                                            description: space.description || undefined,
                                            folder_count: 0 // Keep as 0 for now as 'space' type might not have it yet, avoiding redundant find()
                                        }}
                                        position={{ x: 0, y: 0 }}
                                        size="xl"
                                        isActive={false}
                                        onHover={(hovered) => {
                                            if (hovered) setHoverSpace(space.id);
                                            else scheduleHoverClear();
                                        }}
                                    />
                                    {/* Label for Space - ALWAYS VISIBLE */}
                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                        <span className="text-[11px] text-white/60 group-hover:text-emerald-300 font-medium tracking-wide transition-colors duration-200">
                                            {displayName}
                                        </span>
                                    </div>
                                    {/* Enhanced Hover Info */}
                                    <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                                        <div className="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-emerald-500/20 shadow-lg">
                                            <span className="text-[10px] text-emerald-300/70 uppercase tracking-wider">WORKSPACE ÖFFNEN</span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}

                        {/* Folder Stars for hovered Space (semantic mini-universe) */}
                        {hoveredSpacePosition && hoveredFolderPositions.length > 0 && (
                            <div className="absolute inset-0 pointer-events-none">
                                {hoveredFolderPositions.map(({ folder, x, y }) => {
                                    const dx = x - hoveredSpacePosition.x;
                                    const dy = y - hoveredSpacePosition.y;
                                    const length = Math.hypot(dx, dy);
                                    const angle = Math.atan2(dy, dx);
                                    return (
                                        <div
                                            key={`link-${folder.id}`}
                                            className="absolute"
                                            style={{
                                                left: '50%',
                                                top: '50%',
                                                width: `${length}px`,
                                                height: '1px',
                                                transform: `translate(-50%, -50%) translate(${hoveredSpacePosition.x}px, ${hoveredSpacePosition.y}px) rotate(${angle}rad)`,
                                                transformOrigin: '0 50%',
                                                background: 'linear-gradient(90deg, rgba(16,185,129,0.35), rgba(16,185,129,0.05))',
                                                boxShadow: '0 0 8px rgba(16,185,129,0.15)',
                                                opacity: 0.8
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {hoveredFolderPositions.map(({ folder, x, y }, i) => (
                            <Folder
                                key={`folder-${folder.id}`}
                                folder={{
                                    id: folder.id,
                                    name: folder.name,
                                    space_id: folder.space_id,
                                    color: folder.color ?? undefined,
                                    node_count: folder.node_count
                                }}
                                position={{
                                    x: `calc(50% + ${x}px)`,
                                    y: `calc(50% + ${y}px)`
                                }}
                                size="sm"
                                orbitActive
                                isPromoted={false}
                                delay={i * 0.05}
                                onClick={() => {
                                    openPane({
                                        id: `finder-folder-${folder.id}`,
                                        type: 'finder',
                                        title: folder.name,
                                        data: { folderId: folder.id },
                                        size: { width: 900, height: 600 }
                                    });
                                }}
                                onHover={(hovered) => {
                                    if (hovered && hoveredSpaceId) setHoverSpace(hoveredSpaceId);
                                    if (!hovered) scheduleHoverClear();
                                }}
                            />
                        ))}

                        {/* Empty State / Create Button */}
                        {spaces.length === 0 && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
                                <div className="text-white/30 font-light tracking-wider">NO SPACES FOUND</div>
                                <button
                                    onClick={() => addSpace({
                                        department_id: activeDepartmentId,
                                        name: "New Space",
                                        description: "Created via Orbit"
                                    })}
                                    className="px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 text-emerald-400 transition-colors flex items-center gap-2 hover:border-emerald-500/50 hover:shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)] cursor-pointer z-50 pointer-events-auto"
                                >
                                    <Plus size={16} />
                                    <span>Create Space</span>
                                </button>
                            </div>
                        )}

                        {/* Document Stack - Quick Overview */}
                        {departmentDocs.length > 0 && (
                            <motion.div
                                className="absolute left-8 bottom-8 z-30 pointer-events-auto"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                                onClick={() => {
                                    if (!activeDepartmentId) return;
                                    openPane({
                                        id: `finder-dept-${activeDepartmentId}`,
                                        type: 'finder',
                                        title: currentDepartment?.name || 'Workspace',
                                        data: {
                                            departmentId: activeDepartmentId,
                                            departmentName: currentDepartment?.name,
                                            showUpload: true
                                        },
                                        size: { width: 1000, height: 700 }
                                    });
                                }}
                            >
                                <div className="text-[10px] text-emerald-300/70 tracking-[0.3em] uppercase mb-3">
                                    Document Stack
                                </div>
                                <div className="relative w-56 h-36">
                                    {departmentDocs.slice(0, 5).map((doc, i) => (
                                        <motion.div
                                            key={doc.id}
                                            className="absolute inset-0 rounded-xl border border-emerald-400/20 bg-black/40 backdrop-blur-xl shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                                            style={{
                                                transform: `translate(${i * 8}px, ${i * 6}px)`,
                                            }}
                                            whileHover={{ scale: 1.02 }}
                                        >
                                            <div className="absolute top-3 left-3 flex items-center gap-2 text-[10px] text-white/80">
                                                <FileText size={12} className="text-emerald-300/80" />
                                                <span className="truncate max-w-[160px]">
                                                    {doc.name || doc.title || 'Document'}
                                                </span>
                                            </div>
                                            <div className="absolute bottom-3 right-3 text-[9px] text-emerald-300/50 uppercase tracking-[0.2em]">
                                                open
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
