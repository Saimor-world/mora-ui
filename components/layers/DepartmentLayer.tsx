"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { motion, useReducedMotion } from 'framer-motion';
import { Star } from '@/components/mora/Star';
import { Folder } from '@/components/mora/Folder';
import { ArrowLeft, Plus, FileText } from 'lucide-react';
import { LoadingState } from '@/components/ui/LoadingState';
import { LayerInsightRail } from '@/components/layers/LayerInsightRail';
import { getDeptStyle } from '@/lib/utils/deptStyle';
import { fetchSingleDepartmentStats } from '@/lib/api/coreClient';

const MOON_COLORS = ['#22D3EE', '#A78BFA', '#F59E0B', '#34D399', '#F43F5E', '#60A5FA', '#FB923C', '#E879F9'];
const ORBIT_STEP_SECONDS = 1 / 18; // Cap visual updates to ~18 FPS to reduce rerender load without killing motion.

type PreviewLane = 'focus' | 'flow' | 'archive';

const PREVIEW_LANE_META: Record<PreviewLane, { label: string; accent: string; distance: number; spread: number }> = {
    focus: { label: 'Focus', accent: '#34D399', distance: 126, spread: 72 },
    flow: { label: 'Flow', accent: '#22D3EE', distance: 188, spread: 64 },
    archive: { label: 'Archive', accent: '#A78BFA', distance: 250, spread: 58 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const resolvePreviewLane = (index: number): PreviewLane => {
    if (index < 2) return 'focus';
    if (index < 6) return 'flow';
    return 'archive';
};

const getFreshnessWeight = (value?: string | null) => {
    if (!value) return 0.32;
    const days = (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24);
    return clamp(1 - days / 28, 0.18, 1);
};

/**
 * DEPARTMENT LAYER (L2)
 * Visual language aligned with L1 while staying distinct from L3.
 * Background nebula derives from the active department's semantic colour
 * (via getDeptStyle) so HR looks pink, Tech looks cyan, Management green, etc.
 */
export const DepartmentLayer: React.FC = () => {
    // Granular store selectors — prevents rerender on unrelated store mutations
    const activeDepartmentId = useMoraStore(s => s.activeDepartmentId);
    const activeCompanyId = useMoraStore(s => s.activeCompanyId);
    const departments = useMoraStore(s => s.departments);
    const spacesByDepartment = useMoraStore(s => s.spacesByDepartment);
    const foldersBySpace = useMoraStore(s => s.foldersBySpace);
    const isLoadingSpaces = useMoraStore(s => s.isLoadingSpaces);
    const treeData = useMoraStore(s => s.treeData);
    const loadSpacesForDepartment = useMoraStore(s => s.loadSpacesForDepartment);
    const loadFoldersForSpace = useMoraStore(s => s.loadFoldersForSpace);
    const navigateToExplore = useMoraStore(s => s.navigateToExplore);
    const navigateToSpace = useMoraStore(s => s.navigateToSpace);
    const navigateToFolder = useMoraStore(s => s.navigateToFolder);
    const addSpace = useMoraStore(s => s.addSpace);
    const setActiveSpace = useMoraStore(s => s.setActiveSpace);
    const { openPane } = usePaneStore();
    const safeDepartments = useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);
    const safeTreeData = useMemo(() => (Array.isArray(treeData) ? treeData : []), [treeData]);

    // Memoized — was running raw find() on every RAF tick (30fps)
    const currentDepartment = useMemo(
        () => safeDepartments.find((d) => d.id === activeDepartmentId),
        [safeDepartments, activeDepartmentId]
    );
    const deptTitle = currentDepartment?.name || '';
    const deptColor = currentDepartment?.color || '#10b981';

    const departmentDocs = useMemo(() => {
        if (!activeDepartmentId || safeTreeData.length === 0) return [];
        const root = safeTreeData.find((n) => n.id === activeDepartmentId);
        if (!root) return [];

        const docs: any[] = [];
        const walk = (node: any) => {
            if (!node) return;
            if (node.type === 'node') docs.push(node);
            if (node.children) node.children.forEach(walk);
        };
        walk(root);
        return docs;
    }, [activeDepartmentId, safeTreeData]);

    const spaces = useMemo(() => {
        if (!activeDepartmentId) return [];
        const value = spacesByDepartment[activeDepartmentId];
        return Array.isArray(value) ? value : [];
    }, [activeDepartmentId, spacesByDepartment]);

    const prefersReducedMotion = useReducedMotion();
    const [hoveredSpaceId, setHoveredSpaceId] = useState<string | null>(null);
    const [hoveredSpaceAnchor, setHoveredSpaceAnchor] = useState<{ id: string; x: number; y: number } | null>(null);
    const orbitContainerRef = useRef<HTMLDivElement | null>(null);

    // Mobile guard: orbit radii are fixed pixels and overflow narrow viewports.
    const [viewportWidth, setViewportWidth] = useState<number>(
        typeof window !== 'undefined' ? window.innerWidth : 1920
    );
    const [orbitFrame, setOrbitFrame] = useState({ width: 1120, height: 780 });
    const [departmentDocsFromApi, setDepartmentDocsFromApi] = useState<number | null>(null);
    useEffect(() => {
        const updateFrame = () => {
            setViewportWidth(window.innerWidth);
            const rect = orbitContainerRef.current?.getBoundingClientRect();
            if (rect?.width && rect?.height) {
                setOrbitFrame({ width: rect.width, height: rect.height });
            }
        };

        updateFrame();
        window.addEventListener('resize', updateFrame);
        return () => window.removeEventListener('resize', updateFrame);
    }, []);
    const isMobileViewport = viewportWidth < 600;
    const hoverClearRef = useRef<NodeJS.Timeout | null>(null);
    /**
     * Ref mirror of hoveredSpaceId — read by the rAF animation loop to freeze the orbit.
     * Must be updated synchronously (before any React setState) so the loop sees it on the
     * very next frame without waiting for an effect restart.
     * Pattern mirrors SpaceLayer's isAnyHoveredRef — do not change to state.
     */
    const hoveredSpaceIdRef = useRef<string | null>(null);

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
        // Update ref FIRST — rAF loop reads this synchronously, before React re-renders.
        hoveredSpaceIdRef.current = spaceId ?? null;
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
            // Clear ref before state so rAF loop resumes on the very next frame.
            hoveredSpaceIdRef.current = null;
            setHoveredSpaceId(null);
            setHoveredSpaceAnchor(null);
        }, 80); // Debounce exit to prevent flicker
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
            // IMPORTANT: read from ref, NOT from closure-captured state.
            // State-based check would lag 1-2 frames behind (effect restarts after paint),
            // causing drift to accumulate across repeated hover/unhover cycles.
            // Mirrors SpaceLayer's isAnyHoveredRef.current pattern exactly.
            if (!hoveredSpaceIdRef.current) {
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
    }, [prefersReducedMotion]); // hoveredSpaceId intentionally omitted — ref handles it

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
        // Minimum radii increased to clear the large center department aura (radius ~180px)
        const ringRadiiX = [Math.max(300, 280), Math.max(420, 400), Math.max(540, 520)];
        const ringRadiiY = [Math.max(220, 200), Math.max(310, 290), Math.max(400, 380)];
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

    const previewSafeBounds = useMemo(() => {
        const halfWidth = orbitFrame.width / 2;
        const halfHeight = orbitFrame.height / 2;

        return {
            minX: -halfWidth + 184,
            maxX: halfWidth - 184,
            minY: -halfHeight + 210,
            maxY: halfHeight - 184,
        };
    }, [orbitFrame.height, orbitFrame.width]);

    const hoveredFolders = useMemo(() => (
        hoveredSpaceId ? (foldersBySpace[hoveredSpaceId] || []) : []
    ), [hoveredSpaceId, foldersBySpace]);

    useEffect(() => {
        if (!hoveredSpaceId) return;
        if (!foldersBySpace[hoveredSpaceId]) {
            loadFoldersForSpace(hoveredSpaceId);
        }
    }, [hoveredSpaceId, foldersBySpace, loadFoldersForSpace]);

    const hoveredPreviewFolders = useMemo(() => {
        if (!hoveredSpaceId || !hoveredSpacePosition || hoveredFolders.length === 0) return [];

        const distance = Math.hypot(hoveredSpacePosition.x, hoveredSpacePosition.y) || 1;
        let outward = {
            x: hoveredSpacePosition.x / distance,
            y: hoveredSpacePosition.y / distance,
        };
        const topPressure = hoveredSpacePosition.y < previewSafeBounds.minY + 188;
        const bottomPressure = hoveredSpacePosition.y > previewSafeBounds.maxY - 168;
        const leftPressure = hoveredSpacePosition.x < previewSafeBounds.minX + 172;
        const rightPressure = hoveredSpacePosition.x > previewSafeBounds.maxX - 172;

        if (topPressure) {
            outward.y = Math.abs(outward.y) + 0.82;
        } else if (bottomPressure) {
            outward.y = -Math.abs(outward.y) - 0.78;
        }

        if (leftPressure) {
            outward.x = Math.abs(outward.x) + 0.36;
        } else if (rightPressure) {
            outward.x = -Math.abs(outward.x) - 0.36;
        }

        const outwardLength = Math.hypot(outward.x, outward.y) || 1;
        outward = {
            x: outward.x / outwardLength,
            y: outward.y / outwardLength,
        };
        const perpendicular = { x: -outward.y, y: outward.x };

        const ranked = [...hoveredFolders]
            .map((folder, index) => {
                const nodeCount = folder.node_count || 0;
                const freshness = getFreshnessWeight(folder.updated_at || folder.created_at);
                const signal = nodeCount * 0.82 + freshness * 4.8;
                return {
                    folder,
                    nodeCount,
                    freshness,
                    signal,
                    color: folder.color || MOON_COLORS[index % MOON_COLORS.length],
                };
            })
            .sort((left, right) => {
                if (right.signal !== left.signal) return right.signal - left.signal;
                return (left.folder.name || '').localeCompare(right.folder.name || '');
            })
            .slice(0, 10);

        const laneCounts = ranked.reduce<Record<PreviewLane, number>>((accumulator, _, index) => {
            accumulator[resolvePreviewLane(index)] += 1;
            return accumulator;
        }, { focus: 0, flow: 0, archive: 0 });
        const laneOffsets: Record<PreviewLane, number> = { focus: 0, flow: 0, archive: 0 };
        const strongestSignal = Math.max(1, ...ranked.map((entry) => entry.signal));

        return ranked.map((entry, index) => {
            const lane = resolvePreviewLane(index);
            const laneMeta = PREVIEW_LANE_META[lane];
            const laneIndex = laneOffsets[lane];
            const laneCount = Math.max(laneCounts[lane], 1);
            laneOffsets[lane] += 1;

            const centeredIndex = laneCount === 1 ? 0 : laneIndex - (laneCount - 1) / 2;
            const lateralDistance = centeredIndex * laneMeta.spread;
            const rawX = hoveredSpacePosition.x + outward.x * laneMeta.distance + perpendicular.x * lateralDistance;
            const rawY = hoveredSpacePosition.y + outward.y * laneMeta.distance + perpendicular.y * lateralDistance;
            const x = clamp(rawX, previewSafeBounds.minX, previewSafeBounds.maxX);
            const y = clamp(rawY, previewSafeBounds.minY, previewSafeBounds.maxY);

            return {
                ...entry,
                lane,
                x,
                y,
                distance: Math.hypot(x - hoveredSpacePosition.x, y - hoveredSpacePosition.y),
                lineStrength: Math.max(0.28, Math.min(1, 0.24 + entry.signal / strongestSignal * 0.76)),
            };
        });
    }, [hoveredSpaceId, hoveredSpacePosition, hoveredFolders, previewSafeBounds]);

    useEffect(() => {
        const preloadableSpaces = spaces
            .filter((space) => !foldersBySpace[space.id] && (space.folder_count ?? 0) > 0)
            .slice(0, 8);

        preloadableSpaces.forEach((space) => {
            void loadFoldersForSpace(space.id);
        });
    }, [spaces, foldersBySpace, loadFoldersForSpace]);

    const spaceSignals = useMemo(() => {
        const entries = spaces.map((space) => {
            const loadedFolders = foldersBySpace[space.id] || [];
            const folderTotal = Math.max(space.folder_count ?? 0, loadedFolders.length);
            const docTotal = loadedFolders.reduce((sum, folder) => sum + (folder.node_count || 0), 0);
            const signal = folderTotal * 1.25 + docTotal * 0.32;

            return [space.id, {
                folderTotal,
                docTotal,
                signal,
            }] as const;
        });

        const strongestSignal = Math.max(1, ...entries.map(([, value]) => value.signal));

        return Object.fromEntries(entries.map(([spaceId, value]) => [
            spaceId,
            {
                ...value,
                intensity: Math.max(0.18, Math.min(1, value.signal / strongestSignal)),
            },
        ]));
    }, [spaces, foldersBySpace]);

    const hoveredLaneSummary = useMemo(
        () => hoveredPreviewFolders.reduce<Record<PreviewLane, { count: number; docs: number }>>((accumulator, entry) => {
            accumulator[entry.lane].count += 1;
            accumulator[entry.lane].docs += entry.nodeCount;
            return accumulator;
        }, {
            focus: { count: 0, docs: 0 },
            flow: { count: 0, docs: 0 },
            archive: { count: 0, docs: 0 },
        }),
        [hoveredPreviewFolders]
    );

    const hoveredSpaceDetails = useMemo(() => {
        if (!hoveredSpaceId) return null;
        const meta = spaceMeta.find((entry) => entry.space.id === hoveredSpaceId);
        if (!meta) return null;

        const signal = spaceSignals[hoveredSpaceId] ?? {
            folderTotal: meta.space.folder_count ?? 0,
            docTotal: 0,
            signal: 0,
            intensity: 0.18,
        };

        return {
            id: meta.space.id,
            displayName: meta.displayName,
            description: meta.space.description || null,
            color: meta.color,
            folderTotal: signal.folderTotal,
            docTotal: signal.docTotal,
            intensity: signal.intensity,
            leadFolders: hoveredPreviewFolders.slice(0, 3).map((entry) => entry.folder.name),
        };
    }, [hoveredSpaceId, spaceMeta, spaceSignals, hoveredPreviewFolders]);

    const hoveredClusterRadius = useMemo(() => {
        if (hoveredPreviewFolders.length === 0) {
            return 134;
        }

        return Math.max(
            230,
            ...hoveredPreviewFolders.map((entry) => entry.distance + 92)
        );
    }, [hoveredPreviewFolders]);

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

    const handleNavigateToExplore = useCallback(() => {
        navigateToExplore();
    }, [navigateToExplore]);

    const handlePreviewFolderOpen = useCallback((spaceId: string, folderId: string) => {
        setActiveSpace(spaceId);
        navigateToFolder(folderId);
    }, [setActiveSpace, navigateToFolder]);

    if (!activeDepartmentId) return null;

    if (isMobileViewport) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white/60">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
                </svg>
                <p className="text-sm tracking-widest uppercase">Best viewed on desktop</p>
            </div>
        );
    }

    // Dept-specific nebula colours — same semantic mapping as Planet.tsx (via getDeptStyle)
    const deptStyle = getDeptStyle(deptTitle, deptColor || undefined);
    const g = deptStyle.glow; // primary accent, e.g. "#EC4899" for HR

    return (
        <div className="relative w-full h-full overflow-hidden bg-transparent">
            {/* Dept-coloured nebula — shifts hue per department */}
            <div
                className="absolute inset-0 z-[-1] pointer-events-none"
                style={{
                    opacity: 0.85,
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
                onClick={handleNavigateToExplore}
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

            <LayerInsightRail
                className="left-8 top-32 z-40"
                eyebrow={deptTitle || 'Department'}
                title={hoveredSpaceDetails?.displayName || deptTitle || 'Department'}
                badge={hoveredSpaceDetails ? 'Space focus' : 'Layer 2'}
                accent={hoveredSpaceDetails?.color || deptColor}
                collapsedHint={hoveredSpaceDetails ? 'Space bleibt gehalten.' : 'Space fokussieren fuer Blueprint.'}
                summary={hoveredSpaceDetails
                    ? `${hoveredSpaceDetails.folderTotal} folders und ${hoveredSpaceDetails.docTotal} docs bleiben fokussierbar, aber die tieferen Lane-Signale klappen erst bei echtem Hover auf.`
                    : 'Der Department-Layer bleibt jetzt ruhig. Hover ueber einen Space, um sein Blueprint gezielt aufzuziehen.'}
                forceExpanded={Boolean(hoveredSpaceDetails)}
                onPointerEnter={() => {
                    if (hoveredSpaceId) {
                        clearHoverTimeout();
                    }
                }}
                onPointerLeave={() => {
                    if (hoveredSpaceId) {
                        scheduleHoverClear();
                    }
                }}
                metrics={[
                    { label: 'Spaces', value: spaces.length, toneClassName: 'text-emerald-200' },
                    { label: 'Folders', value: totalFolders, toneClassName: 'text-cyan-200' },
                    { label: 'Docs', value: docsCount, toneClassName: 'text-violet-200' },
                ]}
            >
                {hoveredSpaceDetails ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-[9px] uppercase tracking-[0.22em] text-white/35">Focused Space</div>
                                <div className="mt-1 truncate text-sm text-white/85">{hoveredSpaceDetails.displayName}</div>
                            </div>
                            <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                    background: hoveredSpaceDetails.color,
                                    boxShadow: `0 0 12px ${hoveredSpaceDetails.color}`,
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {(['focus', 'flow', 'archive'] as PreviewLane[]).map((lane) => (
                                <div key={lane} className="rounded-xl border border-white/10 bg-black/20 px-2.5 py-2">
                                    <div className="text-[8px] uppercase tracking-[0.18em] text-white/35">
                                        {PREVIEW_LANE_META[lane].label}
                                    </div>
                                    <div className="mt-1 text-sm leading-none" style={{ color: PREVIEW_LANE_META[lane].accent }}>
                                        {hoveredLaneSummary[lane].count}
                                    </div>
                                    <div className="mt-1 text-[10px] text-white/40">
                                        {hoveredLaneSummary[lane].docs} docs
                                    </div>
                                </div>
                            ))}
                        </div>

                        {hoveredSpaceDetails.leadFolders.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {hoveredSpaceDetails.leadFolders.map((folderName) => (
                                    <span
                                        key={folderName}
                                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/55"
                                    >
                                        {folderName}
                                    </span>
                                ))}
                            </div>
                        )}

                        <p className="text-[11px] leading-relaxed text-white/45">
                            {hoveredSpaceDetails.description || 'Das Blueprint klappt jetzt als semantischer Arbeitsfokus auf, bevor du in Layer 3 springst.'}
                        </p>
                    </div>
                ) : (
                    <p className="text-[11px] leading-relaxed text-white/40">
                        Hover ueber einen Space, um seine Folder-Konstellation zu arretieren und direkt in die Struktur zu springen.
                    </p>
                )}
            </LayerInsightRail>

            <div className="absolute inset-0 flex items-center justify-center z-10">
                {isLoadingSpaces ? (
                    <LoadingState message="Scanning Sector..." />
                ) : (
                    <div ref={orbitContainerRef} className="relative w-full h-full max-w-6xl max-h-[800px] mx-auto">
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25 z-0">
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
                            {moonPositions.map(({ space, x, y }) => {
                                const signal = spaceSignals[space.id] ?? { intensity: 0.18 };
                                const isFocused = hoveredSpaceId === space.id;

                                return (
                                    <line
                                        key={`beam-${space.id}`}
                                        x1="50%"
                                        y1="50%"
                                        x2={`calc(50% + ${x}px)`}
                                        y2={`calc(50% + ${y}px)`}
                                        stroke="url(#deptBeamGradient)"
                                        strokeWidth={1 + signal.intensity * 1.8}
                                        strokeDasharray={isFocused ? undefined : '4 10'}
                                        opacity={isFocused ? 0.95 : 0.24 + signal.intensity * 0.48}
                                    />
                                );
                            })}
                            <defs>
                                <linearGradient id="deptBeamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="rgba(6,182,212,0.55)" />
                                    <stop offset="100%" stopColor="rgba(16,185,129,0.12)" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* L2 Center Orb — Golden Sun (not the same as L1 planet glass spheres) */}
                        <motion.div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.9, ease: 'easeOut' }}
                        >
                            {/* Outer amber aura */}
                            <div
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                style={{ width: 360, height: 360, background: `radial-gradient(circle, ${deptColor}30 0%, transparent 70%)`, opacity: 0.28 }}
                            />
                            {/* Mid amber aura */}
                            <div
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                style={{ width: 230, height: 230, background: `radial-gradient(circle, ${deptColor}38 0%, transparent 70%)`, opacity: 0.24 }}
                            />
                            {/* Golden sun core — 176px, warm gradient */}
                            <div
                                className="relative w-44 h-44 rounded-full flex items-center justify-center orb-glass pointer-events-auto shadow-2xl"
                                style={{
                                    background: `radial-gradient(140% 140% at 30% 28%, rgba(255,255,255,0.16) 0%, ${deptColor}55 45%, rgba(0,0,0,0.28) 100%)`,
                                    border: `1.5px solid ${deptColor}AA`,
                                    boxShadow: `0 0 100px ${deptColor}66, 0 0 220px ${deptColor}33, inset 2px 2px 8px rgba(255,255,255,0.25)`,
                                }}
                            >
                                {/* Specular */}
                                <div className="absolute top-[16%] left-[18%] w-[20%] h-[10%] rounded-full bg-white/80 blur-[1px]" style={{ transform: 'rotate(-45deg)' }} />
                                {/* Inner corona */}
                                <div
                                    className="absolute inset-[18%] rounded-full mix-blend-overlay blur-md pointer-events-none"
                                    style={{ background: `radial-gradient(circle, ${deptColor} 0%, transparent 70%)`, opacity: 0.62 }}
                                />
                                <span className="relative z-10 text-[11px] text-white/95 uppercase tracking-[0.15em] text-center px-3 leading-tight font-light">
                                    {deptTitle.length > 20 ? deptTitle.substring(0, 18) + '…' : deptTitle}
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
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: hoveredSpaceId === space.id ? 30 : (y > 0 ? 25 : 10)
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
                                            size: { width: 1280, height: 820 },
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
                                    {/* Clean minimal label below — no icon duplication, no 'Layer 3' text */}
                                    {/* Side-adaptive label: right-half moons show label left, left-half show right */}
                                    {(() => {
                                        const isRightHalf = x > 0;
                                        return (
                                            <div className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none ${isRightHalf ? 'right-full mr-2 text-right' : 'left-full ml-2 text-left'}`}>
                                                <span className="text-[10px] text-white/50 font-light tracking-wide max-w-[120px] truncate block">
                                                    {displayName}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </motion.div>
                            );
                        })}

                        {hoveredSpacePosition && hoveredSpaceId && (
                            <div
                                className="absolute rounded-full pointer-events-auto"
                                style={{
                                    left: `calc(50% + ${hoveredSpacePosition.x}px)`,
                                    top: `calc(50% + ${hoveredSpacePosition.y}px)`,
                                    width: hoveredClusterRadius * 2,
                                    height: hoveredClusterRadius * 2,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 29,
                                }}
                                onMouseEnter={() => {
                                    setHoverSpace(hoveredSpaceId, {
                                        id: hoveredSpaceId,
                                        x: hoveredSpacePosition.x,
                                        y: hoveredSpacePosition.y,
                                    });
                                }}
                                onMouseLeave={() => scheduleHoverClear()}
                            />
                        )}

                        {hoveredSpacePosition && hoveredPreviewFolders.length > 0 && (
                            <div className="absolute inset-0 pointer-events-none">
                                {hoveredPreviewFolders.map(({ folder, x, y, lineStrength, lane }) => {
                                    const dx = x - hoveredSpacePosition.x;
                                    const dy = y - hoveredSpacePosition.y;
                                    const length = Math.hypot(dx, dy);
                                    const angle = Math.atan2(dy, dx);
                                    const laneAccent = PREVIEW_LANE_META[lane].accent;

                                    return (
                                        <div
                                            key={`link-${folder.id}`}
                                            className="absolute"
                                            style={{
                                                left: '50%',
                                                top: '50%',
                                                width: `${length}px`,
                                                height: `${1 + lineStrength}px`,
                                                transform: `translate(-50%, -50%) translate(${hoveredSpacePosition.x}px, ${hoveredSpacePosition.y}px) rotate(${angle}rad)`,
                                                transformOrigin: '0 50%',
                                                background: `linear-gradient(90deg, ${laneAccent}${Math.round((0.42 + lineStrength * 0.22) * 255).toString(16).padStart(2, '0')}, rgba(255,255,255,0.02))`,
                                                boxShadow: `0 0 14px ${laneAccent}${Math.round((0.14 + lineStrength * 0.16) * 255).toString(16).padStart(2, '0')}`,
                                                opacity: 0.58 + lineStrength * 0.32,
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {hoveredPreviewFolders.map(({ folder, x, y, lane, nodeCount, color }, i) => (
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
                                <div className="flex flex-col items-center">
                                    <Folder
                                        folder={{
                                            id: folder.id,
                                            name: folder.name,
                                            space_id: folder.space_id,
                                            color,
                                            node_count: nodeCount
                                        }}
                                        position={{ x: 0, y: 0 }}
                                        size={lane === 'focus' ? 'md' : 'sm'}
                                        orbitActive
                                        isPromoted={lane === 'focus'}
                                        delay={i * 0.05}
                                        onClick={() => handlePreviewFolderOpen(folder.space_id, folder.id)}
                                        onHover={(hovered) => {
                                            if (hovered) {
                                                clearHoverTimeout();
                                            } else {
                                                scheduleHoverClear();
                                            }
                                        }}
                                    />
                                    <div className="mt-1 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-white/52">
                                        {PREVIEW_LANE_META[lane].label} · {nodeCount}
                                    </div>
                                </div>
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
                                        size: { width: 1280, height: 820 }
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



