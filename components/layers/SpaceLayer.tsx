"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CoreFolder } from '@/lib/types/core';
import { useNavStore } from '@/lib/store/navStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { useQueryClient } from '@tanstack/react-query';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useSpaces } from '@/lib/queries/useSpaces';
import { useFolders } from '@/lib/queries/useFolders';
import { usePaneStore } from '@/lib/store/paneStore';
import { createFolder } from '@/lib/api/orgClient';
import { queryKeys } from '@/lib/queries/queryKeys';
import { ArrowLeft, FolderOpen, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { CreateModal } from '@/components/ui/CreateModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { LayerInsightRail } from '@/components/layers/LayerInsightRail';
import { Folder as FolderOrb } from '@/components/mora/Folder';
import { ORBIT_PALETTE } from '@/lib/utils/deptStyle';

const FOLDER_COLORS = [
    { name: 'Emerald', value: '#10b981' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Cyan', value: '#06b6d4' },
];

const ORBIT_STEP_SECONDS = 1 / 18;
const MAX_RENDERED_FOLDERS = 18;

type LaneKey = 'focus' | 'flow' | 'archive';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const LANE_CONFIG: Record<LaneKey, {
    label: string;
    accent: string;
    radiusX: number;
    radiusY: number;
    angleStart: number;
    angleEnd: number;
    drift: number;
    offsetY: number;
    size: 'sm' | 'md' | 'lg';
}> = {
    focus: {
        label: 'Im Fokus',
        accent: '#34d399',
        radiusX: 280,
        radiusY: 168,
        angleStart: -0.38 * Math.PI,
        angleEnd: 0.20 * Math.PI,
        drift: 24,
        offsetY: 8,
        size: 'lg',
    },
    flow: {
        label: 'Aktiv',
        accent: '#22d3ee',
        radiusX: 412,
        radiusY: 248,
        angleStart: -0.98 * Math.PI,
        angleEnd: -0.18 * Math.PI,
        drift: 28,
        offsetY: -24,
        size: 'md',
    },
    archive: {
        label: 'Ablage',
        accent: '#a78bfa',
        radiusX: 482,
        radiusY: 296,
        angleStart: 0.55 * Math.PI,
        angleEnd: 1.08 * Math.PI,
        drift: 26,
        offsetY: -8,
        size: 'sm',
    },
};

const resolveLaneKey = (index: number): LaneKey => {
    if (index < 3) return 'focus';
    if (index < 10) return 'flow';
    return 'archive';
};

const polarPoint = (rx: number, ry: number, angle: number) => ({
    x: Math.cos(angle) * rx,
    y: Math.sin(angle) * ry,
});

const describeLaneArc = (lane: LaneKey) => {
    const config = LANE_CONFIG[lane];
    const start = polarPoint(config.radiusX, config.radiusY, config.angleStart);
    const end = polarPoint(config.radiusX, config.radiusY, config.angleEnd);
    const largeArc = Math.abs(config.angleEnd - config.angleStart) > Math.PI ? 1 : 0;
    const sweep = config.angleEnd > config.angleStart ? 1 : 0;
    return `M ${start.x} ${start.y + config.offsetY} A ${config.radiusX} ${config.radiusY} 0 ${largeArc} ${sweep} ${end.x} ${end.y + config.offsetY}`;
};

const formatActivityLabel = (value?: string | null) => {
    if (!value) return 'ohne Datum';
    const days = Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'heute';
    if (days === 1) return 'vor 1 Tag';
    if (days < 7) return `vor ${days} Tagen`;
    if (days < 30) return `vor ${Math.ceil(days / 7)} Wochen`;
    return `vor ${Math.ceil(days / 30)} Monaten`;
};

const getFreshnessWeight = (value?: string | null) => {
    if (!value) return 0.32;
    const days = (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24);
    return clamp(1 - days / 28, 0.18, 1);
};

const formatDocCount = (count: number) => `${count} ${count === 1 ? 'Dokument' : 'Dokumente'}`;

type RankedFolder = {
    folder: CoreFolder;
    docCount: number;
    freshness: number;
    signal: number;
    resolvedColor: string;
    activityLabel: string;
};

type PositionedFolder = RankedFolder & {
    lane: LaneKey;
    x: number;
    y: number;
    intensity: number;
    isActive: boolean;
    size: 'sm' | 'md' | 'lg';
    delay: number;
};

export const SpaceLayer: React.FC = () => {
    const { activeSpaceId, activeDepartmentId, activeCompanyId, activeFolderId, viewLevel, navigateToDepartment, navigateToExplore, navigateToFolder } = useNavStore();
    const orbState = useOrbStore((state) => state.orbState);

    const queryClient = useQueryClient();
    const { data: departments = [] } = useDepartments(activeCompanyId);
    const { data: safeSpaces = [] } = useSpaces(activeDepartmentId);
    const { data: folders = [], isLoading: isLoadingFolders } = useFolders(activeSpaceId);
    const openPane = usePaneStore((state) => state.openPane);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', color: FOLDER_COLORS[0].value });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
    const prefersReducedMotion = useReducedMotion();

    const [viewportWidth, setViewportWidth] = useState<number>(
        typeof window !== 'undefined' ? window.innerWidth : 1920
    );

    useEffect(() => {
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobileViewport = viewportWidth < 600;
    const safeDepartments = useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);

    const currentDepartment = useMemo(
        () => safeDepartments.find((department) => department.id === activeDepartmentId) ?? null,
        [safeDepartments, activeDepartmentId]
    );

    const currentSpace = useMemo(
        () => safeSpaces.find((space) => space.id === activeSpaceId) ?? null,
        [safeSpaces, activeSpaceId]
    );

    const displaySpaceName = useCallback((name: string) => {
        const departmentName = currentDepartment?.name || '';
        let next = (name || '').trim();
        if (!next) return 'Bereich';
        if (departmentName && next.toLowerCase().startsWith(departmentName.toLowerCase())) {
            next = next.slice(departmentName.length).replace(/^[\s&\-_:]+/, '').trim();
        }
        const cleaned = next.replace(/\b(workspace|team space|space)\b/gi, '').trim();
        if (cleaned.length > 2 && !/^\d+$/.test(cleaned)) return cleaned;
        if (/^\d+$/.test(next) || /\b(workspace|team space|space)\b/i.test(next)) return 'Bereich';
        return next || 'Bereich';
    }, [currentDepartment?.name]);

    const orbitVelocity = useMemo(() => {
        if (orbState === 'alert') return 0.82;
        if (orbState === 'insight' || orbState === 'curious' || orbState === 'learning') return 1.12;
        if (orbState === 'thinking') return 1.18;
        if (orbState === 'focus' || orbState === 'watch' || orbState === 'watching') return 1.05;
        return 0.96;
    }, [orbState]);

    const atmosphereIntensity = useMemo(() => {
        if (orbState === 'alert') return 0.95;
        if (orbState === 'insight' || orbState === 'curious' || orbState === 'learning') return 0.9;
        if (orbState === 'thinking' || orbState === 'focus' || orbState === 'watch' || orbState === 'watching') return 0.86;
        return 0.74;
    }, [orbState]);

    const [orbitTime, setOrbitTime] = useState(0);
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const orbitAccumulatorRef = useRef<number>(0);
    const isInteractionLockedRef = useRef(false);
    const hoverClearRef = useRef<NodeJS.Timeout | null>(null);

    const clearHoverTimeout = useCallback(() => {
        if (hoverClearRef.current) {
            clearTimeout(hoverClearRef.current);
            hoverClearRef.current = null;
        }
    }, []);

    const setInteractionFolder = useCallback((folderId: string | null) => {
        clearHoverTimeout();
        setHoveredFolderId(folderId);
        isInteractionLockedRef.current = Boolean(folderId);
    }, [clearHoverTimeout]);

    const scheduleHoverClear = useCallback(() => {
        clearHoverTimeout();
        hoverClearRef.current = setTimeout(() => {
            setHoveredFolderId(null);
            isInteractionLockedRef.current = false;
        }, 90);
    }, [clearHoverTimeout]);

    useEffect(() => () => clearHoverTimeout(), [clearHoverTimeout]);

    useEffect(() => {
        if (prefersReducedMotion) return;
        const animate = (currentTime: number) => {
            if (lastTimeRef.current === 0) lastTimeRef.current = currentTime;
            const delta = (currentTime - lastTimeRef.current) / 1000;
            lastTimeRef.current = currentTime;

            if (!isInteractionLockedRef.current) {
                orbitAccumulatorRef.current += delta;
                if (orbitAccumulatorRef.current >= ORBIT_STEP_SECONDS) {
                    const step = orbitAccumulatorRef.current;
                    orbitAccumulatorRef.current = 0;
                    setOrbitTime((previous) => previous + step);
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
    }, [prefersReducedMotion]);

    // useFolders(activeSpaceId) auto-fetches when activeSpaceId changes

    const rankedFolders = useMemo(() => {
        const nodesByFolder: Record<string, unknown[]> = {};
        const ranked = folders.map((folder, index) => {
            const liveNodes = nodesByFolder[folder.id] || [];
            const docCount = liveNodes.length > 0 ? liveNodes.length : (folder.node_count || 0);
            const freshness = getFreshnessWeight(folder.updated_at || folder.created_at);
            const activeBoost = folder.id === activeFolderId ? 4.4 : 0;
            const signal = docCount * 0.82 + freshness * 5.2 + activeBoost;

            return {
                folder,
                docCount,
                freshness,
                signal,
                resolvedColor: folder.color || ORBIT_PALETTE[index % ORBIT_PALETTE.length],
                activityLabel: formatActivityLabel(folder.updated_at || folder.created_at),
            } satisfies RankedFolder;
        });

        ranked.sort((left, right) => {
            if (right.signal !== left.signal) return right.signal - left.signal;
            return (left.folder.name || '').localeCompare(right.folder.name || '');
        });

        const limited = ranked.slice(0, MAX_RENDERED_FOLDERS);
        if (!activeFolderId || limited.some((entry) => entry.folder.id === activeFolderId)) {
            return limited;
        }

        const activeEntry = ranked.find((entry) => entry.folder.id === activeFolderId);
        if (!activeEntry) return limited;
        return [...limited.slice(0, Math.max(0, MAX_RENDERED_FOLDERS - 1)), activeEntry];
    }, [folders, activeFolderId]);

    const laneCounts = useMemo(
        () => rankedFolders.reduce<Record<LaneKey, number>>((accumulator, _, index) => {
            accumulator[resolveLaneKey(index)] += 1;
            return accumulator;
        }, { focus: 0, flow: 0, archive: 0 }),
        [rankedFolders]
    );

    const strongestSignal = rankedFolders[0]?.signal || 1;

    const positionedFolders = useMemo(() => {
        const laneIndexMap: Record<LaneKey, number> = { focus: 0, flow: 0, archive: 0 };

        return rankedFolders.map((entry, index) => {
            const lane = resolveLaneKey(index);
            const laneConfig = LANE_CONFIG[lane];
            const laneIndex = laneIndexMap[lane];
            const laneCount = Math.max(laneCounts[lane], 1);
            laneIndexMap[lane] += 1;

            const progress = laneCount === 1 ? 0.5 : laneIndex / (laneCount - 1);
            const baseAngle = laneConfig.angleStart + (laneConfig.angleEnd - laneConfig.angleStart) * progress;
            const angularPulse = prefersReducedMotion ? 0 : Math.sin((orbitTime * orbitVelocity * 0.65) + index * 0.86) * 0.045;
            const driftX = prefersReducedMotion ? 0 : Math.cos((orbitTime * orbitVelocity * 0.92) + index * 1.13) * laneConfig.drift;
            const driftY = prefersReducedMotion ? 0 : Math.sin((orbitTime * orbitVelocity * 0.58) + index * 1.41) * laneConfig.drift * 0.46;
            const point = polarPoint(laneConfig.radiusX, laneConfig.radiusY, baseAngle + angularPulse);
            const isActive = entry.folder.id === activeFolderId;
            const intensity = clamp(entry.signal / strongestSignal, 0.2, 1);

            return {
                ...entry,
                lane,
                x: point.x + driftX + (isActive ? 12 : 0),
                y: point.y + driftY + laneConfig.offsetY + (isActive ? -10 : 0),
                intensity,
                isActive,
                size: isActive ? 'lg' : laneConfig.size,
                delay: index * 0.04,
            } satisfies PositionedFolder;
        });
    }, [rankedFolders, laneCounts, prefersReducedMotion, orbitTime, orbitVelocity, strongestSignal, activeFolderId]);

    const totalDocs = useMemo(
        () => rankedFolders.reduce((sum, entry) => sum + entry.docCount, 0),
        [rankedFolders]
    );

    const foldersWithDocs = useMemo(
        () => rankedFolders.filter((entry) => entry.docCount > 0).length,
        [rankedFolders]
    );

    const laneSummaries = useMemo(
        () => positionedFolders.reduce<Record<LaneKey, { count: number; docs: number }>>((accumulator, entry) => {
            accumulator[entry.lane].count += 1;
            accumulator[entry.lane].docs += entry.docCount;
            return accumulator;
        }, {
            focus: { count: 0, docs: 0 },
            flow: { count: 0, docs: 0 },
            archive: { count: 0, docs: 0 },
        }),
        [positionedFolders]
    );

    const inspectedFolder = useMemo(() => {
        if (hoveredFolderId) {
            return positionedFolders.find((entry) => entry.folder.id === hoveredFolderId) ?? null;
        }
        if (activeFolderId) {
            return positionedFolders.find((entry) => entry.folder.id === activeFolderId) ?? null;
        }
        return positionedFolders[0] ?? null;
    }, [hoveredFolderId, activeFolderId, positionedFolders]);

    const handleCreateFolder = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!activeSpaceId || !formData.name.trim()) return;

        setIsSubmitting(true);
        try {
            await createFolder({
                space_id: activeSpaceId,
                name: formData.name.trim(),
                color: formData.color,
            });
            await queryClient.invalidateQueries({ queryKey: queryKeys.folders(activeSpaceId) });
            setFormData({ name: '', color: FOLDER_COLORS[0].value });
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('Failed to create folder:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNavigateToExplore = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        navigateToExplore();
    }, [navigateToExplore]);

    const openSpaceFinder = useCallback(() => {
        openPane({
            id: 'finder-main',
            type: 'finder',
            title: displaySpaceName(currentSpace?.name || 'Bereich'),
            size: { width: 1280, height: 820 },
            data: {
                spaceId: activeSpaceId,
                departmentId: activeDepartmentId,
                companyId: activeCompanyId || currentDepartment?.company_id || undefined,
            },
        });
    }, [
        openPane,
        displaySpaceName,
        currentSpace?.name,
        activeSpaceId,
        activeDepartmentId,
        activeCompanyId,
        currentDepartment?.company_id,
    ]);

    const openFocusedFolder = useCallback((folderId: string) => {
        setInteractionFolder(folderId);
        navigateToFolder(folderId);
    }, [navigateToFolder, setInteractionFolder]);

    if (viewLevel !== 'space' || !activeSpaceId) return null;

    if (isMobileViewport) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-white/60">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                </svg>
                <p className="text-sm uppercase tracking-widest">Best viewed on desktop</p>
            </div>
        );
    }

    const spaceName = displaySpaceName(currentSpace?.name || 'Bereich');

    return (
        <div className="relative h-full w-full overflow-hidden bg-transparent">
            <div className="pointer-events-none absolute inset-0 z-[-1] bg-black/18 backdrop-blur-[22px]" />
            <div
                className="pointer-events-none absolute inset-0 z-[-1]"
                style={{
                    opacity: atmosphereIntensity,
                    background: `
                        radial-gradient(1150px 600px at 54% 56%, rgba(16, 185, 129, 0.24) 0%, transparent 64%),
                        radial-gradient(900px 420px at 24% 28%, rgba(34, 211, 238, 0.16) 0%, transparent 58%),
                        radial-gradient(760px 360px at 80% 34%, rgba(99, 102, 241, 0.14) 0%, transparent 56%),
                        radial-gradient(700px 320px at 18% 76%, rgba(167, 139, 250, 0.14) 0%, transparent 54%),
                        radial-gradient(640px 300px at 74% 82%, rgba(245, 158, 11, 0.11) 0%, transparent 50%)
                    `,
                }}
            />
            <div
                className="pointer-events-none absolute inset-0 z-[-1]"
                style={{ background: 'radial-gradient(circle at 50% 52%, transparent 44%, rgba(0,0,0,0.38) 100%)' }}
            />

            <motion.div
                className="absolute left-8 top-8 z-50 flex items-center gap-3 text-white/50"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <button
                    type="button"
                    data-testid="nav-back-to-department"
                    onClick={() => activeDepartmentId && navigateToDepartment(activeDepartmentId)}
                    className="group flex items-center gap-3 text-white/50 transition-colors hover:text-white"
                >
                    <div className="rounded-full border border-white/5 bg-white/5 p-2 transition-colors group-hover:bg-white/10">
                        <ArrowLeft size={16} />
                    </div>
                </button>
                <div className="flex flex-col items-start gap-0.5">
                    <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-emerald-500/70">
                        Zurueck
                    </span>
                    <span className="flex items-center gap-2 text-sm font-light tracking-widest">
                        <button
                            type="button"
                            data-testid="nav-root-to-universe"
                            onClick={handleNavigateToExplore}
                            className="text-white/40 transition-colors hover:text-emerald-100/90"
                        >
                            UNIVERSE
                        </button>
                        <span className="text-white/20">/</span>
                        <span className="text-emerald-100/90">{currentDepartment?.name.toUpperCase() || 'DEPARTMENT'}</span>
                        <span className="text-white/20">/</span>
                        <span className="text-white/50">{spaceName.toUpperCase()}</span>
                    </span>
                </div>
            </motion.div>

            <motion.div
                className="absolute right-8 top-8 z-50 flex items-center gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <button
                    onClick={() => activeSpaceId && void queryClient.invalidateQueries({ queryKey: ['folders', activeSpaceId] })}
                    className="rounded-full border border-white/5 bg-white/5 p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60"
                    title="Ordner aktualisieren"
                    aria-label="Ordner aktualisieren"
                >
                    <RefreshCw size={16} />
                </button>
                <motion.button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm font-light tracking-widest text-emerald-300 transition-all hover:bg-emerald-500/20 hover:text-emerald-200"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                >
                    <Plus size={15} />
                    NEUER ORDNER
                </motion.button>
            </motion.div>

            <LayerInsightRail
                className="left-8 top-32 z-40"
                eyebrow="Bereich"
                title={currentSpace?.name || 'Bereich'}
                badge={activeFolderId ? 'Aktiver Ordner' : 'Ordnerstruktur'}
                accent={currentSpace?.color || '#34d399'}
                collapsedHint="Ordner öffnen oder Control Center nutzen."
                summary={`${laneSummaries.focus.count} priorisierte, ${laneSummaries.flow.count} aktive und ${laneSummaries.archive.count} abgelegte Ordner werden aus echter Dokumentdichte und letzter Aktivität abgeleitet.`}
                metrics={[
                    { label: 'Ordner', value: rankedFolders.length, toneClassName: 'text-emerald-200' },
                    { label: 'Mit Inhalt', value: foldersWithDocs, toneClassName: 'text-cyan-200' },
                    { label: 'Dokumente', value: totalDocs, toneClassName: 'text-violet-200' },
                ]}
            >
                <div className="grid grid-cols-3 gap-2">
                    {(['focus', 'flow', 'archive'] as LaneKey[]).map((lane) => (
                        <div
                            key={lane}
                            className="rounded-xl border border-white/10 bg-black/15 px-2.5 py-2"
                        >
                            <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">
                                {LANE_CONFIG[lane].label}
                            </div>
                            <div className="mt-1 text-sm" style={{ color: LANE_CONFIG[lane].accent }}>
                                {laneSummaries[lane].count}
                            </div>
                            <div className="mt-1 text-[10px] text-white/42">
                                {formatDocCount(laneSummaries[lane].docs)}
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={openSpaceFinder}
                    className="mt-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/46 transition-colors hover:border-emerald-400/18 hover:text-emerald-200/90"
                >
                    Finder öffnen
                </button>
            </LayerInsightRail>

            {inspectedFolder && (
                <motion.div
                    className="absolute bottom-28 left-8 z-40 w-[312px] overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(12,18,26,0.9),rgba(3,6,10,0.78))] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.14 }}
                >
                    <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-24"
                        style={{
                            background: `radial-gradient(circle at top, ${inspectedFolder.resolvedColor}2e 0%, transparent 72%)`,
                        }}
                    />
                    <div className="relative">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/35">
                                    <Sparkles size={12} className="text-emerald-300/72" />
                                    {inspectedFolder.isActive ? 'Aktiver Ordner' : LANE_CONFIG[inspectedFolder.lane].label}
                                </div>
                                <div className="mt-2 truncate text-base text-white/88">
                                    {inspectedFolder.folder.name}
                                </div>
                                <div className="mt-1 text-xs text-white/42">
                                    Letztes Update {inspectedFolder.activityLabel}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => openFocusedFolder(inspectedFolder.folder.id)}
                                className="rounded-full border border-emerald-400/18 bg-emerald-500/10 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-emerald-100 transition-colors hover:bg-emerald-500/16"
                            >
                                Öffnen
                            </button>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                                <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">Relevanz</div>
                                <div className="mt-1 text-sm text-white/82">{Math.round(inspectedFolder.intensity * 100)}%</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                                <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">Dokumente</div>
                                <div className="mt-1 text-sm text-white/82">{formatDocCount(inspectedFolder.docCount)}</div>
                            </div>
                        </div>

                        <p className="mt-4 text-[11px] leading-relaxed text-white/44">
                            Die linke Karte zeigt den aktuell stärksten oder gerade geöffneten Ordner. Aktualitaet und Dokumentzahl kommen aus echten Ordnerdaten.
                        </p>
                    </div>
                </motion.div>
            )}

            <div className="absolute inset-0 z-10 flex items-center justify-center">
                {isLoadingFolders ? (
                    <LoadingState message="Bereich wird geladen..." />
                ) : (
                    <div className="relative h-full w-full pb-16">
                        <svg
                            className="pointer-events-none absolute inset-0 z-0 h-full w-full"
                            viewBox="-640 -420 1280 840"
                            preserveAspectRatio="xMidYMid meet"
                        >
                            <defs>
                                {(['focus', 'flow', 'archive'] as LaneKey[]).map((lane) => (
                                    <linearGradient key={`lane-${lane}`} id={`space-lane-${lane}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor={LANE_CONFIG[lane].accent} stopOpacity="0.08" />
                                        <stop offset="50%" stopColor={LANE_CONFIG[lane].accent} stopOpacity="0.34" />
                                        <stop offset="100%" stopColor={LANE_CONFIG[lane].accent} stopOpacity="0.08" />
                                    </linearGradient>
                                ))}
                            </defs>

                            {(['focus', 'flow', 'archive'] as LaneKey[]).map((lane) => (
                                <path
                                    key={`lane-arc-${lane}`}
                                    d={describeLaneArc(lane)}
                                    fill="none"
                                    stroke={`url(#space-lane-${lane})`}
                                    strokeWidth={lane === 'focus' ? 1.6 : 1.2}
                                    strokeDasharray={lane === 'focus' ? '6 10' : '5 11'}
                                    opacity={inspectedFolder?.lane === lane ? 0.75 : 0.34}
                                />
                            ))}

                            {positionedFolders.map((entry) => (
                                <line
                                    key={`beam-${entry.folder.id}`}
                                    x1="0"
                                    y1="0"
                                    x2={entry.x}
                                    y2={entry.y}
                                    stroke={entry.resolvedColor}
                                    strokeWidth={entry.isActive ? 2 : 0.8 + entry.intensity * 1.15}
                                    strokeDasharray={entry.isActive ? 'none' : '4 8'}
                                    opacity={entry.isActive ? 0.54 : 0.14 + entry.intensity * 0.26}
                                />
                            ))}

                            {positionedFolders.filter((entry) => entry.isActive).map((entry) => (
                                <circle
                                    key={`focus-ring-${entry.folder.id}`}
                                    cx={entry.x}
                                    cy={entry.y}
                                    r="56"
                                    fill="none"
                                    stroke={entry.resolvedColor}
                                    strokeWidth="1.2"
                                    strokeDasharray="7 8"
                                    opacity="0.42"
                                />
                            ))}
                        </svg>

                        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
                            <div
                                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                                style={{
                                    width: 320,
                                    height: 320,
                                    background: `radial-gradient(circle, ${(currentDepartment?.color || '#10b981')}44 0%, transparent 70%)`,
                                    opacity: 0.34,
                                }}
                            />
                            <div
                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                                style={{
                                    width: 210,
                                    height: 210,
                                    background: `radial-gradient(circle, ${(currentDepartment?.color || '#10b981')}52 0%, transparent 70%)`,
                                    opacity: 0.24,
                                }}
                            />
                            <div
                                className="pointer-events-auto relative flex h-40 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-full backdrop-blur-sm"
                                style={{
                                    background: `radial-gradient(145% 145% at 30% 24%, rgba(255,255,255,0.22) 0%, ${(currentDepartment?.color || '#10b981')}bb 45%, rgba(0,0,0,0.30) 100%)`,
                                    border: `1.5px solid ${(currentDepartment?.color || '#10b981')}99`,
                                    boxShadow: `0 0 90px ${(currentDepartment?.color || '#10b981')}55, 0 0 180px ${(currentDepartment?.color || '#10b981')}26, inset 2px 2px 8px rgba(255,255,255,0.28)`,
                                }}
                                onClick={openSpaceFinder}
                                title={`Finder öffnen: ${spaceName}`}
                            >
                                <div
                                    className="absolute left-[17%] top-[15%] h-[10%] w-[20%] rounded-full bg-white/70 blur-[1px]"
                                    style={{ transform: 'rotate(-45deg)' }}
                                />
                                <div
                                    className="pointer-events-none absolute inset-[21%] rounded-full mix-blend-overlay blur-md"
                                    style={{
                                        background: `radial-gradient(circle, ${(currentDepartment?.color || '#10b981')} 0%, transparent 70%)`,
                                        opacity: 0.6,
                                    }}
                                />
                                <span className="relative z-10 px-4 text-center text-[11px] font-light uppercase leading-tight tracking-[0.14em] text-white/92">
                                    {spaceName.length > 22 ? `${spaceName.slice(0, 20)}...` : spaceName}
                                </span>
                            </div>
                        </div>

                        {positionedFolders.map((entry, index) => {
                            const isInspected = inspectedFolder?.folder.id === entry.folder.id;
                            const laneConfig = LANE_CONFIG[entry.lane];
                            const showInlineCard = isInspected || entry.isActive;

                            return (
                                <motion.div
                                    key={`folder-${entry.folder.id}`}
                                    data-testid={`folder-${entry.folder.id}`}
                                    data-folder-name={entry.folder.name}
                                    className="absolute flex flex-col items-center"
                                    style={{
                                        left: `calc(50% + ${entry.x}px)`,
                                        top: `calc(50% + ${entry.y}px)`,
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: entry.isActive ? 46 : (isInspected ? 44 : 30),
                                    }}
                                    initial={{ opacity: 0, scale: 0.85 }}
                                    animate={{ opacity: 1, scale: entry.isActive ? 1.04 : 1 }}
                                    transition={{ delay: entry.delay, duration: 0.45 }}
                                    onMouseEnter={() => setInteractionFolder(entry.folder.id)}
                                    onMouseLeave={scheduleHoverClear}
                                    onClick={() => openFocusedFolder(entry.folder.id)}
                                >
                                    <FolderOrb
                                        folder={{
                                            id: entry.folder.id,
                                            name: entry.folder.name,
                                            space_id: entry.folder.space_id,
                                            color: entry.resolvedColor,
                                            node_count: entry.docCount,
                                        }}
                                        position={{ x: 0, y: 0 }}
                                        size={entry.size}
                                        orbitActive
                                        isPromoted={entry.lane === 'focus' || entry.isActive}
                                        delay={entry.delay}
                                        onHover={(hovered) => {
                                            if (hovered) {
                                                setInteractionFolder(entry.folder.id);
                                                return;
                                            }
                                            scheduleHoverClear();
                                        }}
                                    />

                                    {showInlineCard && (
                                        <div
                                            className="mt-2 min-w-[112px] rounded-2xl border px-3 py-2 text-center backdrop-blur-xl"
                                            style={{
                                                background: isInspected
                                                    ? `linear-gradient(160deg, ${entry.resolvedColor}22, rgba(3,6,10,0.74))`
                                                    : 'linear-gradient(160deg, rgba(8,12,18,0.78), rgba(3,6,10,0.62))',
                                                borderColor: isInspected ? `${entry.resolvedColor}55` : 'rgba(255,255,255,0.08)',
                                                boxShadow: isInspected ? `0 0 28px ${entry.resolvedColor}24` : 'none',
                                            }}
                                        >
                                            <div className="max-w-[140px] truncate text-[11px] tracking-wide text-white/86">
                                                {entry.folder.name}
                                            </div>
                                            <div className="mt-1 flex items-center justify-center gap-2 text-[10px] text-white/44">
                                                <span>{formatDocCount(entry.docCount)}</span>
                                                <span className="text-white/24">|</span>
                                                <span style={{ color: laneConfig.accent }}>{entry.activityLabel}</span>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}

                        {!isLoadingFolders && folders.length === 0 && (
                            <motion.div
                                className="absolute inset-0 flex flex-col items-center justify-center gap-5"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.45, duration: 0.6 }}
                            >
                                <div className="relative">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                                        <FolderOpen size={28} className="text-emerald-400/50" />
                                    </div>
                                    <div
                                        className="absolute inset-0 rounded-2xl"
                                        style={{ boxShadow: '0 0 30px rgba(16,185,129,0.12)' }}
                                    />
                                </div>

                                <div className="flex flex-col items-center gap-1.5">
                                    <p className="text-sm font-light uppercase tracking-widest text-white/55">
                                        Noch keine Ordner
                                    </p>
                                    <p className="max-w-[240px] text-center text-xs font-light leading-relaxed text-white/45">
                                        Lege den ersten Ordner an, damit dieser Bereich zu einer echten Arbeitsstruktur wird.
                                    </p>
                                </div>

                                <motion.button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="pointer-events-auto flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/8 px-6 py-2.5 text-xs tracking-widest text-emerald-300/80 transition-all hover:border-emerald-400/50 hover:bg-emerald-500/15 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60"
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

            <CreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Neuen Ordner erstellen"
            >
                <form onSubmit={handleCreateFolder} className="space-y-6">
                    <div>
                        <label className="mb-2 block text-sm tracking-wider text-emerald-400/70">NAME</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-emerald-500/50"
                            autoFocus
                            required
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm tracking-wider text-emerald-400/70">FARBE</label>
                        <div className="grid grid-cols-6 gap-2">
                            {FOLDER_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color: color.value })}
                                    className={`aspect-square w-full rounded-lg border-2 transition-all ${formData.color === color.value ? 'scale-110 border-white' : 'border-white/20 hover:border-white/40'}`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="flex-1 rounded-xl border border-white/10 py-3 text-white/60 hover:bg-white/5"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-600/20 py-3 text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Erstelle...' : 'Erstellen'}
                        </button>
                    </div>
                </form>
            </CreateModal>
        </div>
    );
};
