"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { motion, useReducedMotion } from 'framer-motion';
import { Star } from '@/components/mora/Star';
import { Folder } from '@/components/mora/Folder';
import { ArrowLeft, Plus, FileText } from 'lucide-react';
import { LoadingState } from '@/components/ui/LoadingState';
import { getDeptStyle } from '@/lib/utils/deptStyle';
import { fetchSingleDepartmentStats } from '@/lib/api/coreClient';

const MOON_COLORS = ['#22D3EE', '#A78BFA', '#F59E0B', '#34D399', '#F43F5E', '#60A5FA', '#FB923C', '#E879F9'];
const ORBIT_STEP_SECONDS = 1 / 30; // Cap visual updates to ~30 FPS to reduce rerender load.

/**
 * DEPARTMENT LAYER (L2)
 * Visual language aligned with L1 while staying distinct from L3.
 * Background nebula derives from the active department's semantic colour
 * (via getDeptStyle) so HR looks pink, Tech looks cyan, Management green, etc.
 */
export const DepartmentLayer: React.FC = () => {
    const {
        activeDepartmentId,
        activeCompanyId,
        departments,
        spacesByDepartment,
        foldersBySpace,
        orbState,
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
    const deptColor = currentDepartment?.color || '#10b981';
    const nebulaIntensity = useMemo(() => {
        if (orbState === 'alert') return 1.1;
        if (orbState === 'insight' || orbState === 'curious' || orbState === 'learning') return 1.0;
        if (orbState === 'thinking' || orbState === 'focus' || orbState === 'watch' || orbState === 'watching') return 0.92;
        return 0.85;
    }, [orbState]);

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

    const prefersReducedMotion = useReducedMotion();
    const [hoveredSpaceId, setHoveredSpaceId] = useState<string | null>(null);
    const [hoveredSpaceAnchor, setHoveredSpaceAnchor] = useState<{ id: string; x: number; y: number } | null>(null);
    const orbitContainerRef = useRef<HTMLDivElement | null>(null);

    // Mobile guard: orbit radii are fixed pixels and overflow narrow viewports.
    const [viewportWidth, setViewportWidth] = useState<number>(
        typeof window !== 'undefined' ? window.innerWidth : 1920
    );
    const [departmentDocsFromApi, setDepartmentDocsFromApi] = useState<number | null>(null);
    useEffect(() => {
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const isMobileViewport = viewportWidth < 600;
    const hoverClearRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (activeDepartmentId && !spacesByDepartment[activeDepartmentId]) {
            loadSpacesForDepartment(activeDepartmentId);
        }
    }, [activeDepartmentId, spacesByDepartment, loadSpacesForDepartment]);

    useEffect(() => {
        let cancelled = false;

        const loadDepartmentStats = async () => {
            if (!activeDepartmentId) {
                setDepartmentDocsFromApi(null);
                return;
            }

            const stats = await fetchSingleDepartmentStats(activeDepartmentId);
            if (cancelled) return;

            if (!stats) {
                setDepartmentDocsFromApi(null);
                return;
            }

            const docs =
                typeof stats.docs === 'number'
                    ? stats.docs
                    : (typeof stats.nodes === 'number' ? stats.nodes : null);
            setDepartmentDocsFromApi(typeof docs === 'number' ? docs : null);
        };

        void loadDepartmentStats();

        return () => {
            cancelled = true;
        };
    }, [activeDepartmentId]);

    const clearHoverTimeout = useCallback(() => {
        if (hoverClearRef.current) {
            clearTimeout(hoverClearRef.current);
            hoverClearRef.current = null;
        }
    }, []);

    const moonPositionsRef = useRef<{ space: { id: string }; x: number; y: number }[]>([]);

    const setHoverSpace = useCallback((spaceId: string | null, anchor?: { id: string; x: number; y: number } | null) => {
        clearHoverTimeout();
        if (!spaceId) {
            setHoveredSpaceId(null);
            setHoveredSpaceAnchor(null);
            return;
        }
        setHoveredSpaceId(spaceId);
        if (anchor && anchor.id === spaceId) {
            setHoveredSpaceAnchor(anchor);
            return;
        }
        const match = moonPositionsRef.current.find((m) => m.space.id === spaceId);
        if (match) {
            setHoveredSpaceAnchor({ id: spaceId, x: match.x, y: match.y });
        }
    }, [clearHoverTimeout]);

    const scheduleHoverClear = useCallback(() => {
        clearHoverTimeout();
        hoverClearRef.current = setTimeout(() => {
            setHoveredSpaceId(null);
            setHoveredSpaceAnchor(null);
        }, 600);
    }, [clearHoverTimeout]);

    useEffect(() => () => clearHoverTimeout(), [clearHoverTimeout]);

    // Animated orbital state.
    const [orbitTime, setOrbitTime] = useState(0);
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const orbitAccumulatorRef = useRef<number>(0);

    useEffect(() => {
        // Respect prefers-reduced-motion: skip the orbit animation loop entirely.
        if (prefersReducedMotion) return;
        const animate = (currentTime: number) => {
            if (lastTimeRef.current === 0) {
                lastTimeRef.current = currentTime;
            }
            const delta = (currentTime - lastTimeRef.current) / 1000;
            lastTimeRef.current = currentTime;

            // Freeze orbital drift while a space/folder hover interaction is active.
            if (!hoveredSpaceId) {
                orbitAccumulatorRef.current += delta;
                if (orbitAccumulatorRef.current >= ORBIT_STEP_SECONDS) {
                    const step = orbitAccumulatorRef.current;
                    orbitAccumulatorRef.current = 0;
                    setOrbitTime((prev) => prev + step);
                }
            } else {
                orbitAccumulatorRef.current = 0;
            }
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [prefersReducedMotion, hoveredSpaceId]);

    const normalized = useCallback((value: string) => value.toLowerCase().trim(), []);

    const displaySpaceName = useCallback((spaceName: string) => {
        const deptName = currentDepartment?.name || '';
        const source = (spaceName || '').trim();
        const sn = normalized(source);
        const dn = normalized(deptName);
        if (!source) return 'Teamraum';
        if (sn === dn) return 'Teamraum';

        let candidate = source;
        if (dn.length > 3 && sn.startsWith(dn)) {
            candidate = source.slice(deptName.length).replace(/^[\s&\-_:]+/, '').trim();
        }

        const cleaned = candidate.replace(/\b(workspace|team space|space)\b/gi, '').trim();
        if (cleaned.length > 2 && !/^\d+$/.test(cleaned)) return cleaned;
        if (/^\d+$/.test(candidate) || /\b(workspace|team space|space)\b/i.test(candidate)) return 'Teamraum';
        return candidate || 'Teamraum';
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
        color: space.color || MOON_COLORS[i % MOON_COLORS.length],
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

    useEffect(() => {
        moonPositionsRef.current = moonPositions.map((m) => ({ space: { id: m.space.id }, x: m.x, y: m.y }));
    }, [moonPositions]);

    const hoveredSpacePosition = useMemo(() => {
        if (!hoveredSpaceId) return null;
        if (hoveredSpaceAnchor && hoveredSpaceAnchor.id === hoveredSpaceId) {
            return hoveredSpaceAnchor;
        }
        return moonPositions.find((m) => m.space.id === hoveredSpaceId) || null;
    }, [hoveredSpaceId, hoveredSpaceAnchor, moonPositions]);

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
        const perRing = 8;
        const baseRadius = 88;
        const ringGap = 34;
        return hoveredFolders.map((folder, i) => {
            const ring = Math.floor(i / perRing);
            const indexInRing = i % perRing;
            const ringCount = Math.min(perRing, count - ring * perRing);
            const angle = (indexInRing / Math.max(1, ringCount)) * Math.PI * 2 - Math.PI / 2;
            const radius = baseRadius + ring * ringGap;
            return {
                folder,
                x: hoveredSpacePosition.x + Math.cos(angle) * radius,
                y: hoveredSpacePosition.y + Math.sin(angle) * radius,
                angle,
                radius
            };
        });
    }, [hoveredSpaceId, hoveredSpacePosition, hoveredFolders]);

    const totalFolders = useMemo(
        () => spaces.reduce((sum, space) => sum + (space.folder_count ?? (foldersBySpace[space.id] || []).length), 0),
        [spaces, foldersBySpace]
    );

    const docsCount = useMemo(() => {
        if (typeof departmentDocsFromApi === 'number') {
            return Math.max(0, departmentDocsFromApi);
        }
        const fromLoadedFolders = spaces.reduce((sum, space) => {
            const spaceFolders = foldersBySpace[space.id] || [];
            return sum + spaceFolders.reduce((folderSum, folder) => folderSum + (folder.node_count || 0), 0);
        }, 0);
        if (fromLoadedFolders > 0) return fromLoadedFolders;
        return departmentDocs.length;
    }, [departmentDocsFromApi, spaces, foldersBySpace, departmentDocs.length]);

    if (!activeDepartmentId) return null;

    if (isMobileViewport) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white/60">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                </svg>
                <p className="text-sm tracking-widest uppercase">Best viewed on desktop</p>
            </div>
        );
    }

    // Dept-specific nebula colours â€” same semantic mapping as Planet.tsx (via getDeptStyle)
    const deptStyle = getDeptStyle(deptTitle, deptColor || undefined);
    const g = deptStyle.glow; // primary accent, e.g. "#EC4899" for HR

    return (
        <div className="relative w-full h-full overflow-hidden bg-transparent">
            {/* Dept-coloured nebula â€” shifts hue per department */}
            <div
                className="absolute inset-0 z-[-1] pointer-events-none"
                style={{
                    opacity: nebulaIntensity,
                    background: `
                        radial-gradient(1400px 720px at 52% 54%, ${g}38 0%, transparent 66%),
                        radial-gradient(1050px 540px at 18% 25%, ${g}22 0%, transparent 62%),
                        radial-gradient(880px 440px at 84% 34%, ${g}1a 0%, transparent 58%),
                        radial-gradient(720px 340px at 62% 82%, ${g}16 0%, transparent 58%),
                        radial-gradient(500px 400px at 88% 72%, ${g}12 0%, transparent 55%)
                    `
                }}
            />
            {/* Edge vignette */}
            <div className="absolute inset-0 z-[-1] pointer-events-none bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.35)_82%,rgba(0,0,0,0.55)_100%)]" />

            <motion.button
                data-testid="nav-back-to-universe"
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

            <motion.div
                className="absolute top-32 left-8 z-40 rounded-2xl border border-emerald-400/20 bg-black/45 backdrop-blur-xl px-4 py-3 min-w-[220px]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300/80 mb-2">
                    Layer 2 / Department Orbit
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                        <div className="text-[9px] text-white/40 uppercase tracking-wide">Spaces</div>
                        <div className="text-lg leading-none text-emerald-200">{spaces.length}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                        <div className="text-[9px] text-white/40 uppercase tracking-wide">Folders</div>
                        <div className="text-lg leading-none text-cyan-200">{totalFolders}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                        <div className="text-[9px] text-white/40 uppercase tracking-wide">Docs</div>
                        <div className="text-lg leading-none text-violet-200">{docsCount}</div>
                    </div>
                </div>
            </motion.div>

            <div className="absolute inset-0 flex items-center justify-center z-10">
                {isLoadingSpaces ? (
                    <LoadingState message="Scanning Sector..." />
                ) : (
                    <div ref={orbitContainerRef} className="relative w-full h-full max-w-6xl max-h-[800px] mx-auto">
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

                        {/* L2 Center Orb â€” Golden Sun (not the same as L1 planet glass spheres) */}
                        <motion.div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.9, ease: 'easeOut' }}
                        >
                            {/* Outer amber aura */}
                            <motion.div
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                                style={{ width: 360, height: 360, background: `radial-gradient(circle, ${deptColor}33 0%, transparent 70%)` }}
                                animate={prefersReducedMotion ? { scale: 1, opacity: 0.35 } : { scale: [1, 1.35, 1], opacity: [0.55, 0.15, 0.55] }}
                                transition={{ duration: 5.5, repeat: prefersReducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
                            />
                            {/* Mid amber aura */}
                            <motion.div
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                                style={{ width: 230, height: 230, background: `radial-gradient(circle, ${deptColor}44 0%, transparent 70%)` }}
                                animate={prefersReducedMotion ? { scale: 1, opacity: 0.28 } : { scale: [1, 1.55, 1], opacity: [0.45, 0.10, 0.45] }}
                                transition={{ duration: 4, repeat: prefersReducedMotion ? 0 : Infinity, ease: 'easeInOut', delay: 0.8 }}
                            />
                            {/* Golden sun core â€” 176px, warm gradient */}
                            <div
                                className="relative w-44 h-44 rounded-full flex items-center justify-center overflow-hidden backdrop-blur-sm"
                                style={{
                                    background: `radial-gradient(140% 140% at 30% 28%, rgba(255,255,255,0.16) 0%, ${deptColor}55 45%, rgba(0,0,0,0.28) 100%)`,
                                    border: `1.5px solid ${deptColor}AA`,
                                    boxShadow: `0 0 100px ${deptColor}66, 0 0 220px ${deptColor}33, inset 2px 2px 8px rgba(255,255,255,0.25)`,
                                }}
                            >
                                {/* Specular */}
                                <div className="absolute top-[16%] left-[18%] w-[20%] h-[10%] rounded-full bg-white/80 blur-[1px]" style={{ transform: 'rotate(-45deg)' }} />
                                {/* Inner corona */}
                                <motion.div
                                    className="absolute inset-[18%] rounded-full mix-blend-overlay blur-md"
                                    style={{ background: `radial-gradient(circle, ${deptColor} 0%, transparent 70%)` }}
                                    animate={prefersReducedMotion ? { opacity: 0.7, scale: 1 } : { opacity: [0.5, 1, 0.5], scale: [0.85, 1.15, 0.85] }}
                                    transition={{ duration: 3.5, repeat: prefersReducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
                                />
                                <span className="relative z-10 text-[11px] text-white/95 uppercase tracking-[0.15em] text-center px-3 leading-tight font-light">
                                    {deptTitle.length > 20 ? deptTitle.substring(0, 18) + 'â€¦' : deptTitle}
                                </span>
                            </div>
                        </motion.div>

                        {moonPositions.map(({ space, displayName, color, x, y, delay }) => {
                            return (
                                <motion.div
                                    key={space.id}
                                    data-testid={`space-${space.id}`}
                                    data-space-name={displayName}
                                    className="absolute cursor-pointer"
                                    style={{
                                        left: `calc(50% + ${x}px)`,
                                        top: `calc(50% + ${y}px)`,
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay, duration: 0.5 }}
                                    onMouseEnter={() => setHoverSpace(space.id, { id: space.id, x, y })}
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
                                            color,
                                            description: space.description || undefined,
                                            folder_count: space.folder_count ?? (foldersBySpace[space.id] || []).length
                                        }}
                                        position={{ x: 0, y: 0 }}
                                        size="xl"
                                        isActive={false}
                                        delay={delay}
                                        onHover={(hovered) => {
                                            if (hovered) {
                                                clearHoverTimeout();
                                            } else {
                                                scheduleHoverClear();
                                            }
                                        }}
                                    />
                                    {/* Clean minimal label below â€” no icon duplication, no 'Layer 3' text */}
                                    <div className="absolute top-[calc(100%+4px)] left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                                        <span className="text-[10px] text-white/50 font-light tracking-wide max-w-[140px] truncate block text-center">
                                            {displayName}
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
                            <div
                                key={`folder-${folder.id}`}
                                className="absolute pointer-events-auto"
                                style={{
                                    left: `calc(50% + ${x}px)`,
                                    top: `calc(50% + ${y}px)`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 35,
                                }}
                            >
                                <Folder
                                    folder={{
                                        id: folder.id,
                                        name: folder.name,
                                        space_id: folder.space_id,
                                        color: folder.color ?? MOON_COLORS[i % MOON_COLORS.length],
                                        node_count: folder.node_count
                                    }}
                                    position={{ x: 0, y: 0 }}
                                    size="sm"
                                    orbitActive
                                    isPromoted={false}
                                    delay={i * 0.05}
                                    onClick={() => {
                                        openPane({
                                            id: 'finder-main',
                                            type: 'finder',
                                            title: folder.name,
                                            data: {
                                                folderId: folder.id,
                                                spaceId: folder.space_id,
                                                departmentId: activeDepartmentId,
                                                companyId: activeCompanyId || currentDepartment?.company_id || undefined
                                            },
                                            size: { width: 900, height: 600 }
                                        });
                                    }}
                                    onHover={(hovered) => {
                                        if (hovered) {
                                            clearHoverTimeout();
                                        } else {
                                            scheduleHoverClear();
                                        }
                                    }}
                                />
                            </div>
                        ))}

                        {spaces.length === 0 && !isLoadingSpaces && (
                            <motion.div
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-5 mt-32 pointer-events-none"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                            >
                                <div className="flex flex-col items-center gap-1.5">
                                    <p className="text-white/60 text-sm font-light tracking-widest uppercase">
                                        Noch keine Bereiche
                                    </p>
                                    <p className="text-white/40 text-xs font-light text-center max-w-[200px] leading-relaxed">
                                        Erstelle einen Bereich,<br />um Ordner zu gruppieren.
                                    </p>
                                </div>
                                <motion.button
                                    onClick={() => addSpace({
                                        department_id: activeDepartmentId,
                                        name: 'Neuer Bereich',
                                        description: 'Via Department Orbit erstellt'
                                    })}
                                    className="pointer-events-auto flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/12 bg-white/[0.03] hover:bg-white/[0.07] text-emerald-300/70 hover:text-emerald-200 hover:border-emerald-500/40 text-xs tracking-widest transition-all cursor-pointer z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60"
                                    whileHover={{ scale: prefersReducedMotion ? 1 : 1.05 }}
                                    whileTap={{ scale: prefersReducedMotion ? 1 : 0.97 }}
                                >
                                    <Plus size={14} />
                                    Bereich erstellen
                                </motion.button>
                            </motion.div>
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
                                        id: 'finder-main',
                                        type: 'finder',
                                        title: currentDepartment?.name || 'Workspace',
                                        data: {
                                            departmentId: activeDepartmentId,
                                            departmentName: currentDepartment?.name,
                                            companyId: activeCompanyId || currentDepartment?.company_id || undefined,
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


