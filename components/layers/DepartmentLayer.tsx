"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { motion } from 'framer-motion';
import { Star } from '@/components/mora/Star';
import { Folder } from '@/components/mora/Folder';
import { ArrowLeft, Plus, FileText, FolderOpen, Users, Briefcase, Sparkles } from 'lucide-react';
import { LoadingState } from '@/components/ui/LoadingState';

/**
 * DEPARTMENT LAYER (L2)
 * Visual language aligned with L1 while staying distinct from L3.
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

    const currentDepartment = departments.find((d) => d.id === activeDepartmentId);
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

    useEffect(() => () => clearHoverTimeout(), [clearHoverTimeout]);

    // Animated orbital state.
    const [orbitTime, setOrbitTime] = useState(0);
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    useEffect(() => {
        const animate = (currentTime: number) => {
            if (lastTimeRef.current === 0) {
                lastTimeRef.current = currentTime;
            }
            const delta = (currentTime - lastTimeRef.current) / 1000;
            lastTimeRef.current = currentTime;

            setOrbitTime((prev) => prev + delta);
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    const normalized = useCallback((value: string) => value.toLowerCase().trim(), []);

    const displaySpaceName = useCallback((spaceName: string) => {
        const deptName = currentDepartment?.name || '';
        if (normalized(spaceName) === normalized(deptName)) return 'Team Space';
        return spaceName;
    }, [currentDepartment?.name, normalized]);

    const uniqueNames = useMemo(() => {
        const used = new Map<string, number>();
        return spaces.map((space) => {
            const base = displaySpaceName(space.name || 'Space');
            const key = normalized(base);
            const next = (used.get(key) || 0) + 1;
            used.set(key, next);
            return next > 1 ? `${base} ${next}` : base;
        });
    }, [spaces, displaySpaceName, normalized]);

    const spaceMeta = useMemo(() => spaces.map((space, i) => ({
        space,
        displayName: uniqueNames[i] || space.name || 'Space',
    })), [spaces, uniqueNames]);

    const moonPositions = useMemo(() => {
        if (spaceMeta.length === 0) return [];

        const ringRadiiX = [230, 320, 405];
        const ringRadiiY = [165, 238, 298];
        const ringSpeed = [0.032, 0.022, 0.015];

        return spaceMeta.map((entry, i) => {
            const ring = Math.min(2, Math.floor(i / 6));
            const posInRing = i % 6;
            const ringCount = Math.min(6, spaceMeta.length - (ring * 6));
            const startAngle = (posInRing / Math.max(1, ringCount)) * Math.PI * 2 - Math.PI / 2 + (ring * 0.26);
            const currentAngle = startAngle + (orbitTime * ringSpeed[ring]);

            return {
                ...entry,
                ring,
                x: Math.cos(currentAngle) * ringRadiiX[ring],
                y: Math.sin(currentAngle) * ringRadiiY[ring],
                angle: currentAngle,
                radiusX: ringRadiiX[ring],
                radiusY: ringRadiiY[ring],
                delay: i * 0.08
            };
        });
    }, [spaceMeta, orbitTime]);

    const hoveredSpacePosition = useMemo(() => {
        if (!hoveredSpaceId) return null;
        return moonPositions.find((m) => m.space.id === hoveredSpaceId) || null;
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

    const departmentStats = useMemo(() => {
        const spaceCount = spaces.length;
        const activeSpaceCount = spaces.filter((space) => (foldersBySpace[space.id] || []).length > 0).length;
        return {
            spaceCount,
            activeSpaceCount,
            docsCount: departmentDocs.length,
            foldersPreview: hoveredFolders.length
        };
    }, [spaces, foldersBySpace, departmentDocs.length, hoveredFolders.length]);

    const spaceRoleIcon = useCallback((name: string) => {
        const label = normalized(name);
        if (label.includes('team') || label.includes('hr') || label.includes('people')) return Users;
        if (label.includes('ops') || label.includes('manage') || label.includes('admin')) return Briefcase;
        return FolderOpen;
    }, [normalized]);

    if (!activeDepartmentId) return null;

    return (
        <div className="relative w-full h-full overflow-hidden bg-transparent">
            <div
                className="absolute inset-0 z-[-1] pointer-events-none"
                style={{
                    background: `
                        radial-gradient(1200px 620px at 54% 56%, rgba(15,125,183,0.30) 0%, transparent 66%),
                        radial-gradient(880px 420px at 18% 25%, rgba(16,185,129,0.22) 0%, transparent 62%),
                        radial-gradient(760px 360px at 84% 34%, rgba(99,102,241,0.19) 0%, transparent 58%),
                        radial-gradient(620px 280px at 62% 82%, rgba(20,184,166,0.14) 0%, transparent 58%)
                    `
                }}
            />
            <div className="absolute inset-0 z-[-1] pointer-events-none bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.38)_84%,rgba(0,0,0,0.6)_100%)]" />

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
                <motion.h1
                    className="font-thin text-white/[0.07] whitespace-nowrap select-none font-sans"
                    style={deptTitleStyle}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                >
                    {deptTitle.toUpperCase()}
                </motion.h1>
            </div>

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
                        Zurueck
                    </span>
                    <span className="text-sm tracking-widest font-light flex items-center gap-2">
                        <span className="text-emerald-100/90">UNIVERSE</span>
                        <span className="text-white/20">/</span>
                        <span className="text-white/40 group-hover:text-white/60 transition-colors uppercase">
                            {deptTitle.length > 20 ? `${deptTitle.substring(0, 20)}...` : deptTitle || 'DEPARTMENT'}
                        </span>
                    </span>
                </div>
            </motion.button>

            <motion.div
                className="absolute top-24 left-8 z-40 rounded-2xl border border-white/10 bg-black/35 backdrop-blur-xl px-4 py-3 min-w-[260px]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-cyan-300" />
                    <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/80">Layer 2 / Department Orbit</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-lg bg-white/5 border border-white/10 p-2">
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Spaces</div>
                        <div className="text-lg text-white/90 font-semibold">{departmentStats.spaceCount}</div>
                    </div>
                    <div className="rounded-lg bg-white/5 border border-white/10 p-2">
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Aktiv</div>
                        <div className="text-lg text-emerald-300 font-semibold">{departmentStats.activeSpaceCount}</div>
                    </div>
                    <div className="rounded-lg bg-white/5 border border-white/10 p-2">
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Docs</div>
                        <div className="text-lg text-cyan-300 font-semibold">{departmentStats.docsCount}</div>
                    </div>
                    <div className="rounded-lg bg-white/5 border border-white/10 p-2">
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Preview</div>
                        <div className="text-lg text-purple-300 font-semibold">{departmentStats.foldersPreview}</div>
                    </div>
                </div>
            </motion.div>

            <motion.button
                onClick={() => {
                    if (!activeDepartmentId) return;
                    addSpace({
                        department_id: activeDepartmentId,
                        name: 'New Space',
                        description: 'Created from Department Layer'
                    });
                }}
                className="absolute top-8 right-8 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 transition-all text-sm tracking-widest font-light"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
            >
                <Plus size={15} />
                NEW SPACE
            </motion.button>

            <div className="absolute inset-0 flex items-center justify-center z-10">
                {isLoadingSpaces ? (
                    <LoadingState message="Scanning Sector..." />
                ) : (
                    <div className="relative w-full h-full max-w-6xl max-h-[800px] mx-auto">
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25">
                            {moonPositions.map(({ space, radiusX, radiusY }) => (
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
                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                                    <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.16" />
                                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.28" />
                                </linearGradient>
                            </defs>
                        </svg>

                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                            {moonPositions.map(({ space, x, y }) => (
                                <line
                                    key={`beam-${space.id}`}
                                    x1="50%"
                                    y1="50%"
                                    x2={`calc(50% + ${x}px)`}
                                    y2={`calc(50% + ${y}px)`}
                                    stroke="url(#deptBeamGradient)"
                                    strokeWidth="1.1"
                                    strokeDasharray="4 10"
                                />
                            ))}
                            <defs>
                                <linearGradient id="deptBeamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="rgba(6,182,212,0.55)" />
                                    <stop offset="100%" stopColor="rgba(16,185,129,0.12)" />
                                </linearGradient>
                            </defs>
                        </svg>

                        <motion.div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.9, ease: 'easeOut' }}
                        >
                            <motion.div
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                                style={{ width: 180, height: 180, background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)' }}
                                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.15, 0.6] }}
                                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <motion.div
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                                style={{ width: 110, height: 110, background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)' }}
                                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0.1, 0.4] }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                            />
                            <div
                                className="w-28 h-28 rounded-full border border-emerald-400/50 flex items-center justify-center"
                                style={{
                                    background: 'radial-gradient(circle at 35% 35%, rgba(16,185,129,0.45) 0%, rgba(6,182,212,0.18) 60%, transparent 100%)',
                                    boxShadow: '0 0 56px rgba(16,185,129,0.4), 0 0 110px rgba(16,185,129,0.16)'
                                }}
                            >
                                <span className="text-[9px] text-emerald-200/90 uppercase tracking-[0.15em] text-center px-2 leading-tight font-light">
                                    {deptTitle.length > 14 ? deptTitle.split(' ')[0] : deptTitle}
                                </span>
                            </div>
                            <div className="absolute top-[100%] left-1/2 -translate-x-1/2 mt-3 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] tracking-[0.16em] text-white/70 uppercase whitespace-nowrap">
                                Department Core
                            </div>
                        </motion.div>

                        {moonPositions.map(({ space, displayName, x, y, delay }) => {
                            const SpaceIcon = spaceRoleIcon(displayName);

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
                                        setActiveSpace(space.id);
                                        if (!event.shiftKey) {
                                            navigateToSpace(space.id);
                                            return;
                                        }
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
                                            department_id: activeDepartmentId,
                                            description: space.description || undefined,
                                            folder_count: 0
                                        }}
                                        position={{ x: 0, y: 0 }}
                                        size="xl"
                                        isActive={false}
                                        onHover={(hovered) => {
                                            if (hovered) setHoverSpace(space.id);
                                            else scheduleHoverClear();
                                        }}
                                    />
                                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                        <div className="px-2.5 py-1 rounded-lg border border-white/10 bg-black/35 backdrop-blur-md flex items-center gap-1.5">
                                            <SpaceIcon size={10} className="text-cyan-300/80" />
                                            <span className="text-[11px] text-white/75 group-hover:text-emerald-300 font-medium tracking-wide transition-colors duration-200 max-w-[170px] truncate">
                                                {displayName}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-[72px] left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                                        <span className="text-[10px] text-emerald-300/75 uppercase tracking-[0.16em]">
                                            Layer 3: Open Space
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}

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
                                                background: 'linear-gradient(90deg, rgba(16,185,129,0.40), rgba(6,182,212,0.10))',
                                                boxShadow: '0 0 10px rgba(16,185,129,0.2)',
                                                opacity: 0.85
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

                        {spaces.length === 0 && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
                                <div className="text-white/30 font-light tracking-wider">NO SPACES FOUND</div>
                                <button
                                    onClick={() => addSpace({
                                        department_id: activeDepartmentId,
                                        name: 'New Space',
                                        description: 'Created via orbit'
                                    })}
                                    className="px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 text-emerald-400 transition-colors flex items-center gap-2 hover:border-emerald-500/50 hover:shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)] cursor-pointer z-50 pointer-events-auto"
                                >
                                    <Plus size={16} />
                                    <span>Create Space</span>
                                </button>
                            </div>
                        )}

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
                                            className="absolute inset-0 rounded-xl border border-emerald-400/20 bg-black/45 backdrop-blur-xl shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                                            style={{
                                                transform: `translate(${i * 8}px, ${i * 6}px)`
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
