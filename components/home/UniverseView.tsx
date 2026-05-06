"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbStore } from '@/lib/store/orbStore';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useTree } from '@/lib/queries/useTree';
import { useCompanies } from '@/lib/queries/useCompanies';
import { TENANT_DEMO, TENANT_HQ } from '@/lib/constants/tenants';
import { Planet } from '@/components/mora/Planet';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { Activity, ShieldCheck, Database, Cpu, X, Zap, Sparkles } from 'lucide-react';
import { usePaneStore } from '@/lib/store/paneStore';
import { fetchDepartmentStats, type DepartmentStats, fetchUserMemberships, type UserMembership, type UserMembershipsResponse } from '@/lib/api/coreClient';
import { LockedPlanetTooltip } from '@/components/layers/LockedPlanetTooltip';
import { LayerInsightRail } from '@/components/layers/LayerInsightRail';
import { useContextStore } from '@/lib/store/contextStore';
import { isAdmin } from '@/lib/auth/roles';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';
import { useWebsiteEntryContext } from '@/lib/hooks/useWebsiteEntryContext';
import {
    buildSemanticEdgeKey,
    resolveDepartmentSimilarityProfile,
    SEMANTIC_DRIVER_META,
    type DepartmentMetricSet,
    type SemanticDriver,
} from '@/lib/universe/semanticSimilarity';

const UNIVERSE_SAFE_BOUNDS = {
    minX: 25,
    maxX: 76,
    minY: 24,
    maxY: 61,
};

const UNIVERSE_CORE_POINT = {
    x: 50,
    y: 44,
};

const clampUniverseCoordinate = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

const stableUniverseHash = (value: string) => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const buildOrganicUniverseLayout = (
    departments: Array<any>,
    metricsMap: Record<string, { nodes: number; spaces: number; folders: number; health: number }>,
) => {
    const count = departments.length;
    if (count === 0) return [];

    const maxSignal = Math.max(
        1,
        ...departments.map((dept) => {
            const metrics = metricsMap[dept.id];
            return (metrics?.nodes || 0) + (metrics?.folders || 0) * 2 + (metrics?.spaces || 0) * 3;
        })
    );

    const orderedDepartments = departments
        .map((dept) => ({
            dept,
            seed: stableUniverseHash(`${dept.id || ''}:${dept.name || ''}`),
        }))
        .sort((a, b) => a.seed - b.seed);

    const points = orderedDepartments.map(({ dept, seed }, index) => {
        const angleStep = (Math.PI * 2) / Math.max(1, count);
        const angularJitter = ((((seed >>> 8) % 100) / 100) - 0.5) * Math.min(0.22, angleStep * 0.34);
        const angle = (-Math.PI / 2) + (index * angleStep) + angularJitter;
        const metrics = metricsMap[dept.id];
        const signal = (metrics?.nodes || 0) + (metrics?.folders || 0) * 2 + (metrics?.spaces || 0) * 3;
        const vitality = Math.min(1, signal / maxSignal);
        const radialJitter = (((seed >>> 12) % 100) / 100) * 0.08;
        const radiusBias = 0.7 + (1 - vitality) * 0.18 + radialJitter;
        const rx = 17 + radiusBias * 21;
        const ry = 10 + radiusBias * 14;

        return {
            ...dept,
            color: dept.color,
            x: clampUniverseCoordinate(
                UNIVERSE_CORE_POINT.x + (rx * Math.cos(angle)),
                UNIVERSE_SAFE_BOUNDS.minX,
                UNIVERSE_SAFE_BOUNDS.maxX
            ),
            y: clampUniverseCoordinate(
                UNIVERSE_CORE_POINT.y + (ry * Math.sin(angle)),
                UNIVERSE_SAFE_BOUNDS.minY,
                UNIVERSE_SAFE_BOUNDS.maxY
            ),
            angle,
            rx,
            ry,
            ringIndex: Math.floor(radiusBias * 3),
        };
    });

    const minDistance = count > 14 ? 8.6 : count > 8 ? 10.4 : 12.8;
    for (let iteration = 0; iteration < 28; iteration += 1) {
        for (const point of points) {
            const dx = point.x - UNIVERSE_CORE_POINT.x;
            const dy = (point.y - UNIVERSE_CORE_POINT.y) * 1.18;
            const distance = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
            const coreDistance = count > 10 ? 13 : 15.2;
            if (distance >= coreDistance) continue;

            const push = (coreDistance - distance) * 0.34;
            point.x = clampUniverseCoordinate(point.x + (dx / distance) * push, UNIVERSE_SAFE_BOUNDS.minX, UNIVERSE_SAFE_BOUNDS.maxX);
            point.y = clampUniverseCoordinate(point.y + ((dy / distance) * push) / 1.18, UNIVERSE_SAFE_BOUNDS.minY, UNIVERSE_SAFE_BOUNDS.maxY);
        }

        for (let i = 0; i < points.length; i += 1) {
            for (let j = i + 1; j < points.length; j += 1) {
                const a = points[i];
                const b = points[j];
                const dx = a.x - b.x;
                const dy = (a.y - b.y) * 1.15;
                const distance = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
                if (distance >= minDistance) continue;

                const push = (minDistance - distance) * 0.28;
                const nx = dx / distance;
                const ny = dy / distance;
                a.x = clampUniverseCoordinate(a.x + nx * push, UNIVERSE_SAFE_BOUNDS.minX, UNIVERSE_SAFE_BOUNDS.maxX);
                a.y = clampUniverseCoordinate(a.y + (ny * push) / 1.15, UNIVERSE_SAFE_BOUNDS.minY, UNIVERSE_SAFE_BOUNDS.maxY);
                b.x = clampUniverseCoordinate(b.x - nx * push, UNIVERSE_SAFE_BOUNDS.minX, UNIVERSE_SAFE_BOUNDS.maxX);
                b.y = clampUniverseCoordinate(b.y - (ny * push) / 1.15, UNIVERSE_SAFE_BOUNDS.minY, UNIVERSE_SAFE_BOUNDS.maxY);
            }
        }
    }

    return points;
};

/**
 * UNIVERSE VIEW - V11 STELLAR ORCHESTRATION
 * VISION: A living, breathing autonomous business workspace.
 * Now with REAL department stats from backend!
 */

export default function UniverseView({ viewMode: viewModeProp = 'live' }: { viewMode?: 'live' | 'demo' }) {
    const setOrbState = useOrbStore((s) => s.setOrbState);
    const orbState = useOrbStore((s) => s.orbState);
    const { activeCompanyId, activeDepartmentId, coreMode, setCoreMode, viewMode, navigateToCore, navigateToDepartment } = useNavStore();
    const user = useSessionStore(s => s.user);

    const { data: departments = [] } = useDepartments(activeCompanyId);
    const { data: companies = [] }   = useCompanies();
    const { data: treeData = [] }    = useTree(activeCompanyId);

    const setPersonalSpaceId = useContextStore((s) => s.setPersonalSpaceId);
    const openPane = usePaneStore((s) => s.openPane);
    const surfaceProfile = useSurfaceProfile();
    const websiteEntryContext = useWebsiteEntryContext();
    const isPublicDemoSurface = surfaceProfile.isPublicDemoSurface && !websiteEntryContext;

    const [showSystemStatus, setShowSystemStatus] = useState(false);
    const [hoverPlanetId, setHoverPlanetId] = useState<string | null>(null);
    const [activePlanetId, setActivePlanetId] = useState<string | null>(null);
    const [semanticPreviewPathId, setSemanticPreviewPathId] = useState<string | null>(null);
    // isInsightRailHovered is kept as state (drives hasUniverseInteraction / visibleSemanticPaths)
    // AND mirrored to a ref so callbacks always read the current value without stale closures.
    const [isInsightRailHovered, setIsInsightRailHoveredState] = useState(false);
    const isInsightRailHoveredRef = useRef(false);
    const setIsInsightRailHovered = useCallback((value: boolean) => {
        isInsightRailHoveredRef.current = value;
        setIsInsightRailHoveredState(value);
    }, []);
    const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
    const [isCoreLogoHovered, setIsCoreLogoHovered] = useState(false);
    const [statsMap, setStatsMap] = useState<Record<string, DepartmentStats>>({});
    const [memberships, setMemberships] = useState<UserMembership[] | null>(null);
    const [membershipsLoaded, setMembershipsLoaded] = useState(false);
    const [lockedTooltipDeptId, setLockedTooltipDeptId] = useState<string | null>(null);
    const safeCompanies = useMemo(() => (Array.isArray(companies) ? companies : []), [companies]);
    const safeDepartments = useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);
    const safeTreeData = useMemo(() => (Array.isArray(treeData) ? treeData : []), [treeData]);

    // ─── FETCH REAL DEPARTMENT STATS FROM BACKEND ───
    useEffect(() => {
        if (!activeCompanyId) return;

        const loadStats = async () => {
            try {
                const statsRaw = await fetchDepartmentStats(activeCompanyId);
                const stats = Array.isArray(statsRaw) ? statsRaw : [];
                const map: Record<string, DepartmentStats> = {};
                for (const s of stats) {
                    map[s.department_id] = s;
                }
                setStatsMap(map);
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[UniverseView] Failed to load department stats:', error);
                }
            }
        };

        loadStats();
    }, [activeCompanyId]);

    // ─── FETCH USER MEMBERSHIPS ───
    useEffect(() => {
        if (!activeCompanyId) {
            setMemberships(null);
            setMembershipsLoaded(false);
            setPersonalSpaceId(null);
            return;
        }

        let cancelled = false;
        setMembershipsLoaded(false);

        void fetchUserMemberships()
            .then((response) => {
                if (cancelled) return;
                if (response === null) {
                    setMemberships(null);
                    setPersonalSpaceId(null);
                } else {
                    setMemberships(response.department_memberships);
                    setPersonalSpaceId(response.personal_space_id);
                }
                setMembershipsLoaded(true);
            })
            .catch(() => {
                if (cancelled) return;
                setMemberships(null);
                setPersonalSpaceId(null);
                setMembershipsLoaded(true);
            });

        return () => {
            cancelled = true;
        };
    }, [activeCompanyId, setPersonalSpaceId]);

    // ─── MEMBERSHIP HELPERS ───
    const isMember = useCallback((deptId: string): boolean => {
        // While loading (first render before API responds): show all to avoid flash
        if (!membershipsLoaded) return true;
        if (isAdmin(user?.role)) return true;
        // API failed: restrict to public departments only (no silent cross-scope fallback)
        if (memberships === null) return false;
        return memberships.some((m) => m.department_id === deptId);
    }, [membershipsLoaded, memberships, user?.role]);

    const shouldRender = useCallback((dept: any): boolean => {
        if (isMember(dept.id)) return true;
        const vis = dept.visibility ?? 'private';    // server truth; default private
        return vis === 'public' || vis === 'visible'; // private never renders
    }, [isMember]);

    const isLocked = useCallback((dept: any): boolean => {
        if (isMember(dept.id)) return false;
        return (dept.visibility ?? 'private') === 'visible';
    }, [isMember]);

    // ─── DEPARTMENT METRICS (from API or fallback to tree) ───
    const departmentMetrics = useMemo(() => {
        const metrics: Record<string, { nodes: number; spaces: number; folders: number; health: number }> = {};

        // Use API stats if available
        if (Object.keys(statsMap).length > 0) {
            for (const [deptId, stats] of Object.entries(statsMap)) {
                metrics[deptId] = {
                    nodes: stats.docs || stats.nodes || 0,
                    spaces: stats.spaces || 0,
                    folders: stats.folders || 0,
                    health: stats.health || 0
                };
            }
            return metrics;
        }

        // Fallback: compute from treeData (less accurate)
        if (!safeTreeData.length) return metrics;

        const countChildren = (children: any[]): { nodes: number; folders: number } => {
            let nodes = 0, folders = 0;
            for (const child of children) {
                if (child.type === 'folder' || child.type === 'space') {
                    folders++;
                } else if (child.type !== 'department') {
                    nodes++;
                }
                if (child.children?.length) {
                    const sub = countChildren(child.children);
                    nodes += sub.nodes;
                    folders += sub.folders;
                }
            }
            return { nodes, folders };
        };

        for (const dept of safeTreeData) {
            if (dept.type === 'department') {
                const counts = countChildren(Array.isArray(dept.children) ? dept.children : []);
                const spaces = (Array.isArray(dept.children) ? dept.children : []).filter((c: any) => c.type === 'space')?.length || 0;
                // Calculate health based on content
                const health = Math.min(100, (spaces > 0 ? 30 : 0) + (counts.folders > 0 ? 30 : 0) + (counts.nodes > 0 ? 40 : 0));
                metrics[dept.id] = { nodes: counts.nodes, spaces, folders: counts.folders, health };
            }
        }
        return metrics;
    }, [statsMap, safeTreeData]);

    // Normalize metrics to percentages
    const maxNodes = useMemo(() => Math.max(1, ...Object.values(departmentMetrics).map(m => m.nodes)), [departmentMetrics]);

    // Dynamic Context Resolver
    const currentCompany = useMemo(() =>
        safeCompanies.find(c => c.id === activeCompanyId),
        [safeCompanies, activeCompanyId]);

    // useDepartments(activeCompanyId) auto-fetches when activeCompanyId changes — no manual sync needed.
    const hoverClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearHoverRelease = useCallback(() => {
        if (hoverClearRef.current) {
            clearTimeout(hoverClearRef.current);
            hoverClearRef.current = null;
        }
    }, []);

    const clearUniverseInteractionState = useCallback(() => {
        setHoverPlanetId(null);
        setActivePlanetId(null);
        setSemanticPreviewPathId(null);
    }, []);

    const scheduleHoverRelease = useCallback(() => {
        clearHoverRelease();
        hoverClearRef.current = setTimeout(() => {
            // Always read from ref — the closure would otherwise capture a stale
            // isInsightRailHovered value from the render when the timer was scheduled.
            if (isInsightRailHoveredRef.current) {
                return;
            }
            setHoverPlanetId(null);
            setSemanticPreviewPathId(null);
            setLockedTooltipDeptId(null);
            setActivePlanetId(null);
        }, coreMode === 'home' ? 320 : 1700);
    }, [clearHoverRelease, coreMode]);

    useEffect(() => (
        () => {
            clearHoverRelease();
        }
    ), [clearHoverRelease]);

    useEffect(() => {
        if (coreMode === 'explore') return;
        clearHoverRelease();
        clearUniverseInteractionState();
        setIsInsightRailHovered(false);
        setLockedTooltipDeptId(null);
    }, [clearHoverRelease, clearUniverseInteractionState, coreMode, setIsInsightRailHovered]);

    const planetPositions = useMemo(() => {
        if (safeDepartments.length === 0) return [];
        const stableDepartments = [...safeDepartments].sort((a, b) => {
            const left = `${a.id || ''}:${a.name || ''}`;
            const right = `${b.id || ''}:${b.name || ''}`;
            return left.localeCompare(right);
        });
        return buildOrganicUniverseLayout(stableDepartments, departmentMetrics);
    }, [safeDepartments, departmentMetrics]);

    // ─── SILK DRIFT PATHS (V10.6) ───
    const visiblePlanets = useMemo(
        () => planetPositions.filter((planet) => shouldRender(planet)),
        [planetPositions, shouldRender]
    );
    const totalSpaceCount = useMemo(
        () => Object.values(departmentMetrics).reduce((sum, metric) => sum + (metric.spaces || 0), 0),
        [departmentMetrics]
    );
    const focusedPlanetId = activePlanetId || hoverPlanetId || null;

    const semanticConnections = useMemo(() => {
        if (visiblePlanets.length < 2) return [];

        const edges = new Map<string, {
            fromId: string;
            toId: string;
            strength: number;
            semanticAffinity: number;
            dominantDriver: SemanticDriver;
        }>();

        visiblePlanets.forEach((planet) => {
            const sourceMetrics = departmentMetrics[planet.id] || { nodes: 0, spaces: 0, folders: 0, health: 0 };

            visiblePlanets
                .filter((candidate) => candidate.id !== planet.id)
                .map((candidate) => {
                    const targetMetrics = departmentMetrics[candidate.id] || { nodes: 0, spaces: 0, folders: 0, health: 0 };
                    const { semanticAffinity, dominantDriver } = resolveDepartmentSimilarityProfile(sourceMetrics, targetMetrics);
                    const ringAffinity = Math.max(0, 1 - Math.abs(planet.ringIndex - candidate.ringIndex) / 2);
                    const spatialAffinity = Math.max(0, 1 - Math.hypot(planet.x - candidate.x, planet.y - candidate.y) / 100);

                    return {
                        candidateId: candidate.id,
                        semanticAffinity,
                        dominantDriver,
                        strength: semanticAffinity * 0.82 + ringAffinity * 0.08 + spatialAffinity * 0.10,
                    };
                })
                .sort((left, right) => right.strength - left.strength)
                .slice(0, 2)
                .filter((edge) => edge.strength >= 0.46)
                .forEach((edge) => {
                    const key = buildSemanticEdgeKey(planet.id, edge.candidateId);
                    const current = edges.get(key);
                    if (!current || edge.strength > current.strength) {
                        edges.set(key, {
                            fromId: planet.id,
                            toId: edge.candidateId,
                            strength: edge.strength,
                            semanticAffinity: edge.semanticAffinity,
                            dominantDriver: edge.dominantDriver,
                        });
                    }
                });
        });

        return Array.from(edges.values());
    }, [visiblePlanets, departmentMetrics]);

    const semanticPaths = useMemo(() => {
        if (semanticConnections.length === 0) return [];

        const planetMap = new Map(visiblePlanets.map((planet) => [planet.id, planet]));

        return semanticConnections
            .map((edge) => {
                const from = planetMap.get(edge.fromId);
                const to = planetMap.get(edge.toId);
                if (!from || !to) return null;

                const pathId = buildSemanticEdgeKey(edge.fromId, edge.toId);
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const distance = Math.max(1, Math.hypot(dx, dy));
                const normalX = -dy / distance;
                const normalY = dx / distance;
                const curveSign = stableUniverseHash(pathId) % 2 === 0 ? 1 : -1;
                const curve = Math.min(5.8, Math.max(1.8, distance * 0.08)) * curveSign;
                const controlX = (from.x + to.x) / 2 + normalX * curve;
                const controlY = (from.y + to.y) / 2 + normalY * curve;
                const labelX = (from.x * 0.34) + (controlX * 0.32) + (to.x * 0.34);
                const labelY = (from.y * 0.34) + (controlY * 0.32) + (to.y * 0.34);
                const focusPeerName = focusedPlanetId
                    ? edge.fromId === focusedPlanetId
                        ? to.name
                        : edge.toId === focusedPlanetId
                            ? from.name
                            : null
                    : null;
                const focusPeerId = focusedPlanetId
                    ? edge.fromId === focusedPlanetId
                        ? to.id
                        : edge.toId === focusedPlanetId
                            ? from.id
                            : null
                    : null;

                return {
                    id: pathId,
                    d: `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`,
                    fromId: from.id,
                    fromName: from.name,
                    toId: to.id,
                    toName: to.name,
                    strength: edge.strength,
                    semanticAffinity: edge.semanticAffinity,
                    dominantDriver: edge.dominantDriver,
                    labelX,
                    labelY,
                    focusPeerName,
                    focusPeerId,
                    highlighted:
                        hoverPlanetId === from.id ||
                        hoverPlanetId === to.id ||
                        focusedPlanetId === from.id ||
                        focusedPlanetId === to.id,
                };
            })
            .filter((value): value is {
                id: string;
                d: string;
                fromId: string;
                fromName: string;
                toId: string;
                toName: string;
                strength: number;
                semanticAffinity: number;
                dominantDriver: SemanticDriver;
                labelX: number;
                labelY: number;
                focusPeerName: string | null;
                focusPeerId: string | null;
                highlighted: boolean;
            } => value !== null);
    }, [semanticConnections, visiblePlanets, hoverPlanetId, focusedPlanetId]);

    const semanticPreviewPath = useMemo(
        () => semanticPaths.find((path) => path.id === semanticPreviewPathId) || null,
        [semanticPaths, semanticPreviewPathId]
    );
    const semanticPreviewPlanetIds = useMemo(
        () => new Set(semanticPreviewPath ? [semanticPreviewPath.fromId, semanticPreviewPath.toId] : []),
        [semanticPreviewPath]
    );
    const semanticCalloutPaths = useMemo(
        () => semanticPreviewPath ? [semanticPreviewPath] : [],
        [semanticPreviewPath]
    );

    const coreConnections = useMemo(() => (
        visiblePlanets.map((planet) => {
            const metrics = departmentMetrics[planet.id] || { nodes: 0, spaces: 0, folders: 0, health: 0 };
            const loadSignal = metrics.nodes * 0.35 + metrics.folders * 1.1 + metrics.spaces * 1.4;
            return {
                id: planet.id,
                x: planet.x,
                y: planet.y,
                intensity: Math.max(0.16, Math.min(1, loadSignal / Math.max(1, maxNodes * 0.45 + 12))),
                highlighted:
                    hoverPlanetId === planet.id ||
                    semanticPreviewPlanetIds.has(planet.id),
            };
        })
    ), [visiblePlanets, departmentMetrics, hoverPlanetId, maxNodes, semanticPreviewPlanetIds]);

    const focusedPlanet = useMemo(() => {
        if (!focusedPlanetId) return null;
        return visiblePlanets.find((planet) => planet.id === focusedPlanetId) || null;
    }, [focusedPlanetId, visiblePlanets]);

    const focusedPlanetMetrics = focusedPlanet
        ? (departmentMetrics[focusedPlanet.id] || { nodes: 0, spaces: 0, folders: 0, health: 0 })
        : null;
    const focusedSemanticLinks = useMemo(() => {
        if (!focusedPlanet) return [];

        const planetMap = new Map(visiblePlanets.map((planet) => [planet.id, planet]));
        return semanticConnections
            .filter((edge) => edge.fromId === focusedPlanet.id || edge.toId === focusedPlanet.id)
            .map((edge) => {
                const otherPlanetId = edge.fromId === focusedPlanet.id ? edge.toId : edge.fromId;
                const otherPlanet = planetMap.get(otherPlanetId);
                if (!otherPlanet) return null;

                return {
                    id: `${focusedPlanet.id}:${otherPlanetId}`,
                    pathId: buildSemanticEdgeKey(focusedPlanet.id, otherPlanetId),
                    targetDepartmentId: otherPlanetId,
                    name: otherPlanet.name,
                    strength: edge.strength,
                    semanticAffinity: edge.semanticAffinity,
                    dominantDriver: edge.dominantDriver,
                };
            })
            .filter((value): value is {
                id: string;
                pathId: string;
                targetDepartmentId: string;
                name: string;
                strength: number;
                semanticAffinity: number;
                dominantDriver: SemanticDriver;
            } => value !== null)
            .sort((left, right) => right.strength - left.strength);
    }, [focusedPlanet, visiblePlanets, semanticConnections]);
    const focusedPlanetLinkCount = focusedSemanticLinks.length;
    const focusedSemanticPathIds = useMemo(
        () => new Set(focusedSemanticLinks.map((link) => link.pathId)),
        [focusedSemanticLinks]
    );

    useEffect(() => {
        setSemanticPreviewPathId(null);
        setHoverPlanetId(null);
        setActivePlanetId(null);
        setIsInsightRailHovered(false);
    }, [activeDepartmentId, setIsInsightRailHovered]);

    const handlePlanetHover = useCallback((planetId: string, hovered: boolean) => {
        if (hovered) {
            clearHoverRelease();
            setHoverPlanetId(planetId);
            // Sticky: activePlanetId keeps the rail alive even after hoverPlanetId clears
            // (when cursor moves between planet and rail). Without this, the rail unmounts
            // the instant the cursor leaves the planet, before the user reaches the rail.
            setActivePlanetId(planetId);
            setSemanticPreviewPathId(null);
            setLockedTooltipDeptId(null);
            return;
        }

        setHoverPlanetId((current) => (current === planetId ? null : current));
        // Read from ref: by the time this fires (after Planet's 220ms dwell timer),
        // the user may have already moved into the InsightRail. The state value would
        // still be false here (captured at callback creation), but the ref is current.
        if (!isInsightRailHoveredRef.current) {
            scheduleHoverRelease();
        }
    }, [clearHoverRelease, scheduleHoverRelease]);

    const handleSemanticPreview = (pathId: string | null) => {
        setSemanticPreviewPathId(pathId);
    };

    const handleSemanticNavigate = (departmentId: string) => {
        setSemanticPreviewPathId(null);
        setActivePlanetId(departmentId);
        navigateToDepartment(departmentId);
    };

    const handleUniversePointerMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const relativeX = ((event.clientX - rect.left) / rect.width) - 0.5;
        const relativeY = ((event.clientY - rect.top) / rect.height) - 0.5;
        setParallaxOffset({
            x: relativeX * 18,
            y: relativeY * 14,
        });
    }, []);

    const resetUniverseParallax = useCallback(() => {
        setParallaxOffset({ x: 0, y: 0 });
    }, []);

    const displayCompanyName = useMemo(() => {
        if (websiteEntryContext?.companyName) return websiteEntryContext.companyName;
        const raw = currentCompany?.name?.trim();
        const tenantId = currentCompany?.tenant_id;
        const isDemo = currentCompany?.is_demo;
        if (!raw) {
            const sessionCompanyName = user?.active_company_name?.trim();
            if (sessionCompanyName) return sessionCompanyName;
            if (isPublicDemoSurface && (isDemo || tenantId === TENANT_DEMO)) return 'Demo-Instanz';
            if (isDemo || tenantId === TENANT_DEMO) return 'Simple Coffee Group';
            if (tenantId === TENANT_HQ) return 'Interne Instanz';
            return 'Organisation nicht verfügbar';
        }
        return raw;
    }, [currentCompany?.name, currentCompany?.tenant_id, currentCompany?.is_demo, user?.active_company_name, isPublicDemoSurface, websiteEntryContext?.companyName]);
    const titleStyle = useMemo(() => {
        const length = displayCompanyName.length;
        const max = length > 22 ? 44 : length > 18 ? 50 : 56;
        const min = length > 22 ? 20 : 24;
        const vw = length > 22 ? 3.6 : 4.2;
        const spacing = length > 22 ? '0.12em' : length > 16 ? '0.16em' : '0.2em';
        return {
            fontSize: `clamp(${min}px, ${vw}vw, ${max}px)`,
            letterSpacing: spacing
        };
    }, [displayCompanyName]);
    // Guard: use activeCompanyId (not currentCompany) to avoid showing global org count
    // while the companies query is still hydrating (currentCompany = undefined transiently).
    const effectiveCompanyCount = surfaceProfile.isLocalTruthSurface
        ? 1
        : (activeCompanyId || currentCompany ? 1 : safeCompanies.length);
    const showOrganizationAggregate = !isPublicDemoSurface && !surfaceProfile.isLocalTruthSurface && !activeCompanyId && safeCompanies.length > 1;
    const isHomeUniversePreview = coreMode === 'home';
    const centerSummary = useMemo(() => {
        const departmentCount = visiblePlanets.length;
        const areaCount = totalSpaceCount;
        return {
            departmentLabel: `${departmentCount} ${departmentCount === 1 ? 'Abteilung' : 'Abteilungen'}`,
            areaLabel: `${areaCount} ${areaCount === 1 ? 'Bereich' : 'Bereiche'}`,
        };
    }, [totalSpaceCount, visiblePlanets.length]);

    const accentStars = useMemo(
        () => Array.from({ length: 72 }, (_, index) => {
            const left = ((index * 19.7) % 96) + 2;
            const top = ((index * 13.4) % 78) + 6;
            const size = [0.9, 1.2, 1.6, 2.2, 2.8][index % 5];
            const color = [
                'rgba(255,255,255,0.92)',
                'rgba(191,219,254,0.88)',
                'rgba(167,243,208,0.78)',
                'rgba(250,204,21,0.58)',
                'rgba(196,181,253,0.64)',
            ][index % 5];
            return {
                id: `accent-star-${index}`,
                left,
                top,
                size,
                color,
                opacity: 0.34 + ((index % 6) * 0.075),
            };
        }),
        []
    );
    const heroStars = useMemo(
        () => Array.from({ length: 20 }, (_, index) => {
            const left = ((index * 23.7) % 88) + 6;
            const top = ((index * 15.1) % 72) + 8;
            const size = [1.8, 2.4, 3.1, 3.8][index % 4];
            const color = [
                'rgba(255,255,255,0.95)',
                'rgba(125,211,252,0.88)',
                'rgba(52,211,153,0.82)',
                'rgba(250,204,21,0.7)',
            ][index % 4];
            return {
                id: `hero-star-${index}`,
                left,
                top,
                size,
                color,
                delay: index * 0.18,
                duration: 4.8 + (index % 4) * 0.9,
            };
        }),
        []
    );

    const hasUniverseInteraction = Boolean(focusedPlanetId || semanticPreviewPathId || isInsightRailHovered);
    const activeCoreBeamPlanetIds = useMemo(() => {
        const ids = new Set<string>();
        if (focusedPlanetId) ids.add(focusedPlanetId);
        semanticPreviewPlanetIds.forEach((id) => ids.add(id));
        return ids;
    }, [focusedPlanetId, semanticPreviewPlanetIds]);
    const visibleSemanticPaths = useMemo(() => {
        if (isHomeUniversePreview) {
            return semanticPaths.filter((path) => semanticPreviewPathId === path.id);
        }

        if (!hasUniverseInteraction) {
            return [];
        }

        return semanticPaths.filter((path) =>
            path.highlighted ||
            path.fromId === focusedPlanetId ||
            path.toId === focusedPlanetId ||
            semanticPreviewPathId === path.id
        );
    }, [focusedPlanetId, hasUniverseInteraction, isHomeUniversePreview, semanticPaths, semanticPreviewPathId]);

    const handleUniversePointerLeave = useCallback(() => {
        resetUniverseParallax();

        if (isInsightRailHoveredRef.current) {
            return;
        }
        scheduleHoverRelease();
    }, [
        resetUniverseParallax,
        scheduleHoverRelease,
    ]);

    return (
        <div
            className="relative w-full h-full overflow-hidden text-white bg-transparent"
            onMouseMove={handleUniversePointerMove}
            onMouseLeave={handleUniversePointerLeave}
        >
            {/* 0. UNIVERSE BACKDROP - single merged stage shared with Home overlays */}
            <div
                className="absolute inset-0 z-[-10] pointer-events-none"
                style={{
                    background: `
                        radial-gradient(1500px 900px at 51% 50%, rgba(28, 105, 155, 0.18) 0%, rgba(7, 22, 42, 0.10) 40%, transparent 72%),
                        radial-gradient(980px 640px at 12% 14%, rgba(20, 184, 166, 0.15) 0%, transparent 60%),
                        radial-gradient(860px 560px at 88% 18%, rgba(99, 102, 241, 0.12) 0%, transparent 58%),
                        radial-gradient(720px 540px at 72% 82%, rgba(180, 83, 9, 0.08) 0%, transparent 58%),
                        linear-gradient(135deg, rgba(0, 8, 10, 0.98) 0%, rgba(3, 9, 21, 0.96) 48%, rgba(0, 5, 7, 0.98) 100%)
                    `,
                }}
            />
            <motion.div
                className="absolute inset-0 z-[-9] pointer-events-none"
                animate={{ x: parallaxOffset.x * 0.24, y: parallaxOffset.y * 0.18 }}
                transition={{ type: 'spring', stiffness: 28, damping: 18, mass: 1 }}
                style={{
                    background: `
                        radial-gradient(1120px 720px at 52% 54%, rgba(56, 189, 248, 0.22) 0%, transparent 62%),
                        radial-gradient(980px 620px at 18% 24%, rgba(45, 212, 191, 0.18) 0%, transparent 54%),
                        radial-gradient(860px 520px at 84% 20%, rgba(167, 139, 250, 0.13) 0%, transparent 50%),
                        radial-gradient(780px 460px at 22% 78%, rgba(16, 185, 129, 0.10) 0%, transparent 54%)
                    `,
                    mixBlendMode: 'screen',
                }}
            />
            <motion.div
                className="absolute inset-0 z-[-8] pointer-events-none"
                animate={{ x: parallaxOffset.x * 0.44, y: parallaxOffset.y * 0.2, rotate: -2.4 }}
                transition={{ type: 'spring', stiffness: 22, damping: 16, mass: 1.05 }}
                style={{
                    background: 'linear-gradient(104deg, transparent 0%, rgba(220,248,255,0.025) 16%, rgba(96,165,250,0.075) 32%, rgba(45,212,191,0.052) 48%, rgba(167,139,250,0.044) 66%, transparent 84%)',
                    transform: 'scale(1.2)',
                    filter: 'blur(34px)',
                    opacity: 0.62,
                    mixBlendMode: 'screen',
                }}
            />
            <motion.div
                className="absolute inset-0 z-[-8] pointer-events-none"
                animate={{ x: parallaxOffset.x * 0.18, y: parallaxOffset.y * 0.12, rotate: 2.2 }}
                transition={{ type: 'spring', stiffness: 18, damping: 16, mass: 1.2 }}
                style={{
                    background: 'conic-gradient(from 218deg at 50% 50%, transparent 0deg, rgba(45,212,191,0.08) 58deg, rgba(59,130,246,0.10) 112deg, rgba(167,139,250,0.055) 168deg, transparent 250deg, rgba(250,204,21,0.035) 306deg, transparent 360deg)',
                    transform: 'scale(1.34)',
                    filter: 'blur(42px)',
                    opacity: 0.55,
                    mixBlendMode: 'screen',
                }}
            />
            <div
                className="absolute inset-0 z-[-8] pointer-events-none"
                style={{
                    backgroundImage: `
                        radial-gradient(circle at 12% 24%, rgba(255,255,255,0.95) 0 1px, transparent 1.8px),
                        radial-gradient(circle at 22% 68%, rgba(56,189,248,0.92) 0 1.1px, transparent 2px),
                        radial-gradient(circle at 44% 16%, rgba(255,255,255,0.92) 0 1px, transparent 1.8px),
                        radial-gradient(circle at 63% 58%, rgba(125,211,252,0.9) 0 1.2px, transparent 2px),
                        radial-gradient(circle at 78% 22%, rgba(250,204,21,0.78) 0 1.1px, transparent 2.2px),
                        radial-gradient(circle at 88% 72%, rgba(255,255,255,0.94) 0 1px, transparent 1.8px),
                        radial-gradient(circle at 70% 34%, rgba(45,212,191,0.78) 0 1.1px, transparent 2px),
                        radial-gradient(circle at 32% 44%, rgba(196,181,253,0.75) 0 1px, transparent 1.8px)
                    `,
                    backgroundSize: '220px 220px, 260px 260px, 280px 280px, 320px 320px, 360px 360px, 420px 420px, 300px 300px, 340px 340px',
                    backgroundPosition: '0 0, 60px 110px, 120px 24px, 24px 200px, 180px 70px, 260px 220px, 140px 160px, 210px 40px',
                    opacity: 0.82,
                }}
            />
            <div
                className="absolute inset-0 z-[-7] pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at 50% 48%, rgba(255,255,255,0.024) 0%, rgba(255,255,255,0.010) 24%, rgba(0,0,0,0.22) 64%, rgba(0,0,0,0.62) 100%)',
                }}
            />
            <motion.div
                className="absolute inset-0 z-[-6] pointer-events-none"
                animate={{ x: parallaxOffset.x * 0.9, y: parallaxOffset.y * 0.54 }}
                transition={{ type: 'spring', stiffness: 24, damping: 18, mass: 1.1 }}
            >
                {accentStars.map((star) => (
                    <div
                        key={star.id}
                        className="absolute rounded-full"
                        style={{
                            left: `${star.left}%`,
                            top: `${star.top}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            background: star.color,
                            boxShadow: `0 0 ${Math.max(8, star.size * 10)}px ${star.color}`,
                            opacity: star.opacity,
                        }}
                    />
                ))}
            </motion.div>
            <motion.div
                className="absolute inset-0 z-[-5] pointer-events-none"
                animate={{ x: parallaxOffset.x * 0.72, y: parallaxOffset.y * 0.44 }}
                transition={{ type: 'spring', stiffness: 20, damping: 16, mass: 1.08 }}
            >
                {heroStars.map((star) => (
                    <motion.div
                        key={star.id}
                        className="absolute rounded-full"
                        style={{
                            left: `${star.left}%`,
                            top: `${star.top}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            background: star.color,
                            boxShadow: `0 0 ${star.size * 16}px ${star.color}`,
                        }}
                        initial={{ opacity: 0.42, scale: 1 }}
                        animate={{ opacity: [0.42, 1, 0.54], scale: [1, 1.18, 1] }}
                        transition={{ duration: star.duration, delay: star.delay, repeat: Infinity, ease: 'easeInOut' }}
                    />
                ))}
            </motion.div>

            {/* 2. CENTER HUB (The Core) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 -translate-y-8">
                <motion.div
                    className="text-center pointer-events-auto flex flex-col items-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                >
                    {/* CENTER LOGO */}
                    <div
                        className="relative group"
                        onMouseEnter={() => setIsCoreLogoHovered(true)}
                        onMouseLeave={() => setIsCoreLogoHovered(false)}
                    >
                        {/* Glow Behind Logo */}
                        <div className="absolute inset-0 bg-cyan-500/20 blur-[80px] rounded-full scale-150 group-hover:bg-cyan-400/40 transition-all duration-700" />

                        <CompanyLogo
                            src={websiteEntryContext ? undefined : currentCompany?.logo_url}
                            companyName={displayCompanyName}
                            size="lg"
                            animated
                            onClick={() => {
                                if (isHomeUniversePreview) {
                                    setCoreMode('explore');
                                    setShowSystemStatus(false);
                                } else if (!activeDepartmentId) {
                                    setShowSystemStatus(!showSystemStatus);
                                } else {
                                    navigateToCore();
                                    setShowSystemStatus(false);
                                }
                            }}
                        />

                        <AnimatePresence>
                            {isHomeUniversePreview && isCoreLogoHovered ? (
                                <motion.div
                                    className="absolute left-1/2 top-[calc(100%+1.35rem)] w-[336px] -translate-x-1/2 rounded-[24px] border border-cyan-200/20 bg-[linear-gradient(160deg,rgba(14,34,46,0.86),rgba(5,14,18,0.58))] px-5 py-4 text-left shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-[30px]"
                                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                    transition={{ duration: 0.22, ease: 'easeOut' }}
                                >
                                    <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/54">Universe Einstieg</div>
                                    <div className="mt-2 text-[18px] font-light text-white/92">
                                        {displayCompanyName}
                                    </div>
                                    <p className="mt-2 text-[12px] leading-relaxed text-white/66">
                                        Die Home-Ebene bleibt ruhig im Vordergrund. Ein Klick auf das Zeichen öffnet den grossen Raum.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="rounded-full border border-cyan-200/14 bg-cyan-300/[0.08] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-cyan-50/76">
                                            {centerSummary.departmentLabel}
                                        </span>
                                        <span className="rounded-full border border-emerald-200/14 bg-emerald-300/[0.08] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-emerald-50/76">
                                            {centerSummary.areaLabel}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCoreMode('explore')}
                                        className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-500/[0.12] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-cyan-50/90 transition-all hover:border-cyan-200/32 hover:bg-cyan-500/[0.18]"
                                    >
                                        Universe öffnen
                                    </button>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>

            {/* 2. ORBITAL SVG (Connection Field) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <filter id="silkGlow">
                        <feGaussianBlur stdDeviation="0.3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="coreBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(125,211,252,0)" />
                        <stop offset="30%" stopColor="rgba(125,211,252,0.26)" />
                        <stop offset="56%" stopColor="rgba(196,181,253,0.19)" />
                        <stop offset="100%" stopColor="rgba(125,211,252,0)" />
                    </linearGradient>
                    <filter id="beamGlow">
                        <feGaussianBlur stdDeviation="1.2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Ambient focus-to-core field */}
                {coreConnections
                    .filter((connection) => activeCoreBeamPlanetIds.has(connection.id))
                    .map((connection) => (
                    <motion.line
                        key={`core-${connection.id}`}
                        x1={UNIVERSE_CORE_POINT.x}
                        y1={UNIVERSE_CORE_POINT.y}
                        x2={connection.x}
                        y2={connection.y}
                        stroke="url(#coreBeam)"
                        strokeWidth={connection.highlighted ? 0.14 + connection.intensity * 0.16 : 0.07 + connection.intensity * 0.07}
                        filter="url(#beamGlow)"
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: isHomeUniversePreview
                                ? (connection.highlighted ? 0.18 : 0.055 + connection.intensity * 0.025)
                                : (connection.highlighted ? 0.26 : 0.08 + connection.intensity * 0.035)
                        }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                ))}

                {/* Semantic silk paths */}
                {visibleSemanticPaths.map((path) => {
                    const driverMeta = SEMANTIC_DRIVER_META[path.dominantDriver];
                    const isFocusedPath = focusedSemanticPathIds.has(path.id);
                    const isPreviewedPath = semanticPreviewPathId === path.id;
                    const baseOpacity = isHomeUniversePreview
                        ? (
                            path.highlighted || isPreviewedPath
                                ? 0.42
                                : isFocusedPath
                                    ? 0.16
                                    : 0
                        )
                        : (
                            path.highlighted || isPreviewedPath
                                ? 0.52
                                : isFocusedPath
                                    ? 0.22
                                    : Math.max(0.05, 0.035 + path.strength * 0.08)
                        );

                    return (
                        <g key={path.id}>
                            <motion.path
                                d={path.d}
                                fill="none"
                                stroke={driverMeta.accent}
                                strokeWidth={0.22 + path.strength * 0.2}
                                strokeDasharray={driverMeta.dashArray}
                                strokeLinecap="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{
                                    pathLength: 1,
                                    opacity: baseOpacity * 0.18,
                                }}
                                transition={{
                                    pathLength: { duration: 2.1, ease: "easeInOut" },
                                    opacity: { duration: 0.35, ease: "easeOut" }
                                }}
                                filter="url(#beamGlow)"
                            />
                            <motion.path
                                d={path.d}
                                fill="none"
                                stroke={driverMeta.accent}
                                strokeWidth={0.08 + path.strength * 0.12}
                                strokeDasharray={driverMeta.dashArray}
                                strokeLinecap="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{
                                    pathLength: 1,
                                    opacity: baseOpacity,
                                }}
                                transition={{
                                    pathLength: { duration: 1.8, ease: "easeInOut" },
                                    opacity: { duration: 0.35, ease: "easeOut" }
                                }}
                                filter="url(#silkGlow)"
                            />
                        </g>
                    );
                })}
            </svg>

            <div className="pointer-events-none absolute inset-0 z-[18]">
                {semanticCalloutPaths
                    .filter((path) => path.highlighted || focusedSemanticPathIds.has(path.id) || semanticPreviewPathId === path.id)
                    .map((path) => {
                        const driverMeta = SEMANTIC_DRIVER_META[path.dominantDriver];
                        const labelTitle = path.focusPeerName || `${path.fromName} / ${path.toName}`;
                        const isInteractive = Boolean(path.focusPeerId);
                        const isPreviewedPath = semanticPreviewPathId === path.id;

                        const labelContent = (
                            <div className="min-w-[150px] max-w-[220px]">
                                <div className="truncate text-sm text-white/88">
                                    {labelTitle}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ background: driverMeta.accent, boxShadow: `0 0 10px ${driverMeta.accent}` }}
                                    />
                                    <span
                                        className="text-[10px] uppercase tracking-[0.18em]"
                                        style={{ color: driverMeta.accent }}
                                    >
                                        {driverMeta.label}
                                    </span>
                                    <span className="text-[11px] text-white/74">
                                        {Math.round(path.semanticAffinity * 100)}%
                                    </span>
                                </div>
                            </div>
                        );

                        return (
                            <motion.div
                                key={`${path.id}-label`}
                                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[18px] border border-white/10 bg-black/55 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl"
                                style={{
                                    left: `${path.labelX}%`,
                                    top: `${path.labelY}%`,
                                    boxShadow: `0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px ${driverMeta.accent}22`,
                                }}
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: path.highlighted || focusedSemanticPathIds.has(path.id) || isPreviewedPath ? 0.96 : 0.78, scale: 1 }}
                                transition={{ duration: 0.28, ease: 'easeOut' }}
                            >
                                {isInteractive ? (
                                    <button
                                        type="button"
                                        className="pointer-events-auto text-left"
                                        onMouseEnter={() => handleSemanticPreview(path.id)}
                                        onMouseLeave={() => handleSemanticPreview(null)}
                                        onClick={() => handleSemanticNavigate(path.focusPeerId!)}
                                    >
                                        {labelContent}
                                    </button>
                                ) : (
                                    labelContent
                                )}
                            </motion.div>
                        );
                    })}
            </div>

            {focusedPlanet && focusedPlanetMetrics && (
                <LayerInsightRail
                    className="left-8 top-28 z-30"
                    eyebrow={hoverPlanetId ? 'Live Focus' : 'Department Signal'}
                    title={focusedPlanet.name}
                    badge={isLocked(focusedPlanet) ? 'Sichtbar' : 'Mitglied'}
                    accent={focusedPlanet.color || '#34d399'}
                    collapsedHint={hoverPlanetId ? 'Signal gehalten.' : 'Department fokussieren für Analyse.'}
                    summary={`${focusedPlanetLinkCount} semantische Beziehungen für ${focusedPlanet.name}. Hover previewt das Signal, die Rail haelt den Fokus und ein Klick springt direkt in den verbundenen Bereich.`}
                    alwaysExpanded
                    showToggle={false}
                    forceExpanded={Boolean(focusedPlanetId) || Boolean(semanticPreviewPathId) || isInsightRailHovered}
                    onPointerEnter={() => {
                        setIsInsightRailHovered(true);
                        setActivePlanetId(focusedPlanet.id);
                        clearHoverRelease();
                    }}
                    onPointerLeave={() => {
                        setIsInsightRailHovered(false);
                        if (hoverPlanetId) {
                            setActivePlanetId(hoverPlanetId);
                            return;
                        }
                        setActivePlanetId(null);
                        scheduleHoverRelease();
                    }}
                    metrics={[
                        { label: 'Bereiche', value: focusedPlanetMetrics.spaces, toneClassName: 'text-emerald-200' },
                        { label: 'Ordner', value: focusedPlanetMetrics.folders, toneClassName: 'text-cyan-200' },
                        { label: 'Dokumente', value: focusedPlanetMetrics.nodes, toneClassName: 'text-violet-200' },
                        { label: 'Health', value: `${focusedPlanetMetrics.health}%`, toneClassName: 'text-amber-200' },
                    ]}
                >
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/35">
                            <span>Semantische Links</span>
                            <span>{focusedPlanetLinkCount}</span>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-white/45">
                            Verbindungen richten sich nach inhaltlicher, struktureller und operativer Naehe. Die Route erscheint erst dann stark, wenn du sie wirklich fokussierst.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {Object.values(SEMANTIC_DRIVER_META).map((driver) => (
                                <div
                                    key={driver.label}
                                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1"
                                >
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ background: driver.accent, boxShadow: `0 0 10px ${driver.accent}` }}
                                    />
                                    <span className="text-[10px] uppercase tracking-[0.16em] text-white/55">
                                        {driver.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {focusedSemanticLinks.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {focusedSemanticLinks.slice(0, 3).map((link) => {
                                    const driverMeta = SEMANTIC_DRIVER_META[link.dominantDriver];

                                    return (
                                        <button
                                            type="button"
                                            key={link.id}
                                        onMouseEnter={() => handleSemanticPreview(link.pathId)}
                                            onMouseLeave={() => handleSemanticPreview(null)}
                                            onClick={() => handleSemanticNavigate(link.targetDepartmentId)}
                                            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors ${
                                                semanticPreviewPathId === link.pathId
                                                    ? 'border-white/18 bg-white/[0.07]'
                                                    : 'border-white/10 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]'
                                            }`}
                                        >
                                            <div className="min-w-0">
                                                <div className="truncate text-xs text-white/84">{link.name}</div>
                                                <div
                                                    className="mt-1 text-[10px] uppercase tracking-[0.16em]"
                                                    style={{ color: driverMeta.accent }}
                                                >
                                                    {driverMeta.label} · {driverMeta.reason}
                                                </div>
                                            </div>
                                            <div className="ml-3 text-right">
                                                <div className="text-[11px] text-white/66">
                                                    {Math.round(link.semanticAffinity * 100)}%
                                                </div>
                                                <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/34">
                                                    Zoom
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </LayerInsightRail>
            )}

            {/* 3. PLANET LAYER (Managed by Store Data) */}
            {/*
             * IMPORTANT: Use React.Fragment (not a div) as the per-planet key wrapper.
             * A div with position:relative would collapse to height:0 because Planet
             * renders position:absolute (out of flow), making top:X% resolve to 0px.
             * Fragment creates no DOM box — absolute planets resolve against the
             * absolute inset-0 container which correctly fills the full viewport.
            */}
            <div className="absolute inset-0 z-30 pointer-events-none">
                {visiblePlanets
                    .map((p, idx) => {
                    // REAL METRICS from API or tree data
                    const deptStats = departmentMetrics[p.id];
                    const nodeCount = deptStats?.nodes || 0;
                    const spaceCount = deptStats?.spaces || 0;
                    const folderCount = deptStats?.folders || 0;
                    const healthFromAPI = deptStats?.health;

                    // Capacity: % of nodes relative to largest department
                    const capacity = nodeCount > 0 && maxNodes > 0
                        ? Math.round((nodeCount / maxNodes) * 100)
                        : null;
                    // Activity: Document count (shown as "X Docs" in hover)
                    const activity = nodeCount;
                    // Health: From API if available, otherwise calculate
                    const health = healthFromAPI ?? Math.min(100, (spaceCount > 0 ? 40 : 0) + (folderCount > 0 ? 30 : 0) + (nodeCount > 0 ? 30 : 0));

                    const locked = isLocked(p);
                    const isSemanticPreviewPlanet = semanticPreviewPlanetIds.has(p.id);
                    const shouldShowPlanetLabel = !isHomeUniversePreview && (
                        focusedPlanetId === p.id ||
                        isSemanticPreviewPlanet ||
                        activeDepartmentId === p.id
                    );
                    const planetSize = isHomeUniversePreview
                        ? 'sm'
                        : (shouldShowPlanetLabel ? 'lg' : 'md');

                    return (
                        <React.Fragment key={p.id}>
                            {!isHomeUniversePreview && !shouldShowPlanetLabel && (
                                <div
                                    className="pointer-events-none absolute z-20 max-w-[164px] -translate-x-1/2 translate-y-[52px] truncate rounded-full border border-white/[0.06] bg-black/[0.12] px-2.5 py-1 text-center text-[8px] uppercase tracking-[0.13em] text-white/42 backdrop-blur-[8px]"
                                    style={{
                                        left: `${p.x}%`,
                                        top: `${p.y}%`,
                                    }}
                                >
                                    {p.name}
                                </div>
                            )}
                            {locked ? (
                                <div
                                    data-testid={`locked-planet-${p.id}`}
                                    onClick={() => {
                                        if (isHomeUniversePreview) {
                                            setCoreMode('explore');
                                            return;
                                        }
                                        clearUniverseInteractionState();
                                        clearHoverRelease();
                                        setLockedTooltipDeptId(p.id);
                                    }}
                                    style={{ opacity: 0.4, cursor: 'pointer', filter: 'grayscale(0.6)' }}
                                >
                                    <Planet
                                        department={p as any}
                                        position={{ x: p.x + '%', y: p.y + '%' } as any}
                                        isActive={focusedPlanetId === p.id || isSemanticPreviewPlanet}
                                        size={planetSize}
                                        showLabel={shouldShowPlanetLabel}
                                        labelSide={p.x > 57 ? 'left' : 'right'}
                                        onHover={isHomeUniversePreview ? undefined : (hovered) => handlePlanetHover(p.id, hovered)}
                                        onClick={() => {
                                            if (isHomeUniversePreview) {
                                                setCoreMode('explore');
                                            }
                                        }}
                                        health={health}
                                        activity={activity}
                                        capacity={capacity}
                                    />
                                </div>
                            ) : (
                                <Planet
                                    department={p as any}
                                    position={{ x: p.x + '%', y: p.y + '%' } as any}
                                    isActive={focusedPlanetId === p.id || isSemanticPreviewPlanet}
                                    size={planetSize}
                                    showLabel={shouldShowPlanetLabel}
                                    labelSide={p.x > 57 ? 'left' : 'right'}
                                    onHover={isHomeUniversePreview ? undefined : (hovered) => handlePlanetHover(p.id, hovered)}
                                    onClick={() => {
                                        if (isHomeUniversePreview) {
                                            clearUniverseInteractionState();
                                            clearHoverRelease();
                                            setCoreMode('explore');
                                            return;
                                        }
                                        clearHoverRelease();
                                        setHoverPlanetId(null);
                                        setActivePlanetId(p.id);
                                        setSemanticPreviewPathId(null);
                                        setLockedTooltipDeptId(null);
                                        navigateToDepartment(p.id);
                                    }}
                                    health={health}
                                    activity={activity}
                                    capacity={capacity}
                                />
                            )}
                            {lockedTooltipDeptId === p.id && (
                                <div
                                    className="absolute z-50"
                                    style={{
                                        left: `${p.x}%`,
                                        top: `${p.y}%`,
                                        transform: 'translate(72px, -50%)',
                                    }}
                                >
                                    <LockedPlanetTooltip
                                        name={p.name}
                                        description={(p as any).description}
                                        onDismiss={() => setLockedTooltipDeptId(null)}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* 3b. EMPTY STATE - shown when no departments exist (setup_required or no company) */}
            <AnimatePresence>
                {membershipsLoaded && visiblePlanets.length === 0 && !isHomeUniversePreview && (
                    <motion.div
                        className="absolute inset-0 z-[50] flex items-center justify-center pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, delay: 0.6 }}
                    >
                        <div className="pointer-events-auto flex flex-col items-center gap-4 text-center px-8 py-10 max-w-sm rounded-[32px] border border-amber-400/18 bg-black/55 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/25 bg-amber-500/10">
                                <Sparkles className="h-7 w-7 text-amber-300/80" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.3em] text-amber-200/55">Einrichtung erforderlich</div>
                                <h2 className="mt-2 text-lg font-light tracking-[-0.02em] text-white/88">
                                    Noch keine Abteilungen
                                </h2>
                                <p className="mt-3 text-sm leading-relaxed text-white/52">
                                    Das Universe wird lebendig, sobald dein Unternehmen Abteilungen hat.
                                    Erstelle oder verknüpfe dein Unternehmen in den Einstellungen.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => openPane({ id: 'settings-main', type: 'settings', title: 'Einstellungen', size: { width: 720, height: 640 } })}
                                className="mt-1 inline-flex items-center gap-2 rounded-full border border-amber-400/22 bg-amber-500/12 px-5 py-2.5 text-xs uppercase tracking-[0.16em] text-amber-100/80 transition-all hover:border-amber-300/36 hover:bg-amber-500/20"
                            >
                                Einstellungen öffnen
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 4. SYSTEM INSIGHT (V10.6 OVERLAY) */}
            <AnimatePresence>
                {showSystemStatus && (
                    <motion.div
                        className="absolute inset-0 z-[100] flex items-center justify-center p-6 md:p-12"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Backdrop Blur */}
                        <motion.div
                            className="absolute inset-0 bg-black/40 backdrop-blur-[30px]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSystemStatus(false)}
                        />

                        <motion.div
                            className="bg-black/60 border border-white/10 rounded-2xl p-10 max-w-3xl w-full shadow-2xl relative overflow-hidden backdrop-blur-xl"
                            initial={{ scale: 0.9, y: 30, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 30, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        >
                            {/* Animated Background Highlights */}
                            <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

                            <div className="flex justify-between items-start mb-10 relative">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Activity className="w-5 h-5 text-cyan-400" />
                                        <h2 className="text-2xl font-light tracking-[0.2em] uppercase text-white/90">Systemstatus</h2>
                                    </div>
                                    <p className="text-[10px] text-white/40 tracking-[0.3em] uppercase">{websiteEntryContext ? 'Website-Dossier' : isPublicDemoSurface ? 'Kuratiertes Beispielsystem' : 'Aktive Organisation'}</p>
                                </div>
                                <button
                                    onClick={() => setShowSystemStatus(false)}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all group border border-white/5"
                                >
                                    <X className="w-5 h-5 text-white/40 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                                <InsightCard
                                    icon={<Cpu className="w-4 h-4" />}
                                    label="Abteilungen"
                                    value={`${departments.length}`}
                                    status="optimal"
                                    progress={Math.min(departments.length * 10, 100)}
                                />
                                <InsightCard
                                    icon={<ShieldCheck className="w-4 h-4" />}
                                    label="Kontext"
                                    value={websiteEntryContext ? 'Dossier' : currentCompany?.is_demo ? 'Beispielsystem' : 'Geschuetzt'}
                                    status={websiteEntryContext ? 'stable' : currentCompany?.is_demo ? 'neutral' : 'secure'}
                                />
                                <InsightCard
                                    icon={<Database className="w-4 h-4" />}
                                    label={showOrganizationAggregate ? 'Organisationen' : 'Bereiche'}
                                    value={showOrganizationAggregate ? `${effectiveCompanyCount}` : `${totalSpaceCount}`}
                                    status="stable"
                                    progress={Math.min((showOrganizationAggregate ? effectiveCompanyCount : totalSpaceCount) * 20, 100)}
                                />
                                <InsightCard
                                    icon={<Zap className="w-4 h-4" />}
                                    label="Status"
                                    value={orbState || 'idle'}
                                    status={orbState === 'alert' ? 'warning' : 'synced'}
                                />
                            </div>

                            <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 relative">
                                <div className="flex items-center gap-4 text-[9px] tracking-[0.3em] text-white/20 uppercase">
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live-Signal</span>
                                    <span>•</span>
                                    <span>Universe v2</span>
                                </div>
                                <div className="text-[9px] tracking-[0.2em] text-white/30 truncate max-w-[240px]">
                                    {displayCompanyName}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

type InsightCardProps = {
    icon: React.ReactNode;
    label: string;
    value: string;
    status: 'optimal' | 'secure' | 'stable' | 'synced' | 'warning' | 'neutral';
    progress?: number;
};

function InsightCard({ icon, label, value, status, progress }: InsightCardProps) {
    const statusTone = status === 'optimal' || status === 'secure'
        ? 'text-emerald-400'
        : status === 'synced'
            ? 'text-cyan-400'
            : status === 'stable'
                ? 'text-sky-300'
                : status === 'warning'
                    ? 'text-amber-400'
                    : 'text-white/50';

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/40">
                <span className={statusTone}>{icon}</span>
                <span>{label}</span>
            </div>
            <div className="space-y-1">
                <div className="text-2xl font-light tracking-wider text-white/90">{value}</div>
                <div className={`text-[10px] uppercase tracking-[0.3em] ${statusTone}`}>{status}</div>
            </div>
            {progress !== undefined && (
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-cyan-500/50"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                </div>
            )}
        </div>
    );
}
