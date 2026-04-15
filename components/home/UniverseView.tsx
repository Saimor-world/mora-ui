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
import { Activity, ShieldCheck, Database, Cpu, X, Zap } from 'lucide-react';
import { fetchDepartmentStats, type DepartmentStats, fetchUserMemberships, type UserMembership, type UserMembershipsResponse } from '@/lib/api/coreClient';
import { LockedPlanetTooltip } from '@/components/layers/LockedPlanetTooltip';
import { LayerInsightRail } from '@/components/layers/LayerInsightRail';
import { useContextStore } from '@/lib/store/contextStore';
import { isAdmin } from '@/lib/auth/roles';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';
import {
    buildSemanticEdgeKey,
    resolveDepartmentSimilarityProfile,
    SEMANTIC_DRIVER_META,
    type DepartmentMetricSet,
} from '@/lib/universe/semanticSimilarity';

const CURATED_DEMO_LAYOUT: Record<string, { x: number; y: number }> = {
    'technology & ai': { x: 25, y: 36 },
    'hr & culture': { x: 52, y: 31 },
    'store heilbronn': { x: 81, y: 35 },
    'marketing & brand': { x: 33, y: 64 },
    management: { x: 72, y: 66 },
    'store stuttgart': { x: 24, y: 80 },
    'store san francisco': { x: 83, y: 79 },
};

const normalizeUniverseKey = (value: string | null | undefined) =>
    (value || '').trim().toLowerCase();


/**
 * UNIVERSE VIEW - V11 STELLAR ORCHESTRATION
 * VISION: A living, breathing autonomous business workspace.
 * Now with REAL department stats from backend!
 */

export default function UniverseView({ viewMode: viewModeProp = 'live' }: { viewMode?: 'live' | 'demo' }) {
    const { setOrbState, orbState } = useOrbStore(s => ({ setOrbState: s.setOrbState, orbState: s.orbState }));
    const { activeCompanyId, activeDepartmentId, coreMode, setCoreMode, viewMode, navigateToCore, navigateToDepartment } = useNavStore();
    const user = useSessionStore(s => s.user);

    const { data: departments = [] } = useDepartments(activeCompanyId);
    const { data: companies = [] }   = useCompanies();
    const { data: treeData = [] }    = useTree(activeCompanyId);

    const setPersonalSpaceId = useContextStore((s) => s.setPersonalSpaceId);
    const surfaceProfile = useSurfaceProfile();
    const isPublicDemoSurface = surfaceProfile.isPublicDemoSurface;

    const [showSystemStatus, setShowSystemStatus] = useState(false);
    const [hoverPlanetId, setHoverPlanetId] = useState<string | null>(null);
    const [insightPlanetId, setInsightPlanetId] = useState<string | null>(null);
    const [semanticPreviewPathId, setSemanticPreviewPathId] = useState<string | null>(null);
    const [isInsightRailHovered, setIsInsightRailHovered] = useState(false);
    const [isFocusBridgeHovered, setIsFocusBridgeHovered] = useState(false);
    const [heldInsightPlanetId, setHeldInsightPlanetId] = useState<string | null>(null);
    const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
    const [isCoreLogoHovered, setIsCoreLogoHovered] = useState(false);
    const [statsMap, setStatsMap] = useState<Record<string, DepartmentStats>>({});
    const [memberships, setMemberships] = useState<UserMembership[] | null>(null);
    const [membershipsLoaded, setMembershipsLoaded] = useState(false);
    const [lockedTooltipDeptId, setLockedTooltipDeptId] = useState<string | null>(null);
    const safeCompanies = useMemo(() => (Array.isArray(companies) ? companies : []), [companies]);
    const safeDepartments = useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);
    const safeTreeData = useMemo(() => (Array.isArray(treeData) ? treeData : []), [treeData]);
    // Space count is derived from API stats when available; tree-based fallback omits spaces detail.
    const totalSpaceCount: number = 0;

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
                console.warn('[UniverseView] Failed to load department stats:', error);
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
        setHeldInsightPlanetId(null);
        setInsightPlanetId(null);
        setSemanticPreviewPathId(null);
        setIsFocusBridgeHovered(false);
    }, []);

    const scheduleHoverRelease = useCallback(() => {
        clearHoverRelease();
        hoverClearRef.current = setTimeout(() => {
            if (isInsightRailHovered || isFocusBridgeHovered) {
                return;
            }
            clearUniverseInteractionState();
        }, coreMode === 'home' ? 320 : 1700);
    }, [clearHoverRelease, clearUniverseInteractionState, coreMode, isFocusBridgeHovered, isInsightRailHovered]);

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
        setIsFocusBridgeHovered(false);
        setLockedTooltipDeptId(null);
    }, [clearHoverRelease, clearUniverseInteractionState, coreMode]);

    // Legacy fallback layout for non-demo or unknown department sets.
    const rings = useMemo(() => [
        { rx: 20, ry: 18, speed: 0 }, // Inner Ring (Planets 1-3)
        { rx: 34, ry: 30, speed: 0 }, // Middle Ring (Planets 4-8)
        { rx: 46, ry: 40, speed: 0 }  // Outer Ring (Planets 9+)
    ], []);

    const planetPositions = useMemo(() => {
        if (safeDepartments.length === 0) return [];
        const count = safeDepartments.length;

        // Deterministic sorting to ensure planets stay in place
        const sortedDepts = [...safeDepartments].sort((a, b) => a.name.localeCompare(b.name));

        const canUseCuratedDemoLayout =
            (isPublicDemoSurface || currentCompany?.is_demo || currentCompany?.tenant_id === TENANT_DEMO) &&
            sortedDepts.every((dept) => CURATED_DEMO_LAYOUT[normalizeUniverseKey(dept.name)]);

        if (canUseCuratedDemoLayout) {
            return sortedDepts.map((dept) => {
                const curated = CURATED_DEMO_LAYOUT[normalizeUniverseKey(dept.name)];
                return {
                    ...dept,
                    color: dept.color,
                    x: curated.x,
                    y: curated.y,
                    angle: 0,
                    rx: 0,
                    ry: 0,
                    ringIndex: 0,
                };
            });
        }

        return sortedDepts.map((dept, index) => {
            let ringIndex = 0;
            // Distribute evenly: 3 inner, 5 middle, rest outer
            if (index >= 3 && index < 8) ringIndex = 1;
            else if (index >= 8) ringIndex = 2;

            const ring = rings[ringIndex];
            // How many planets in this specific ring?
            const planetsInThisRing = ringIndex === 0 ? Math.min(count, 3)
                : ringIndex === 1 ? Math.min(Math.max(0, count - 3), 5)
                    : Math.max(0, count - 8);

            // Calculate position in THIS ring (0-based index for this ring)
            const posInRing = ringIndex === 0 ? index
                : ringIndex === 1 ? index - 3
                    : index - 8;

            // EVEN SPACING: Divide circle by number of planets in ring
            // Add offset so rings don't align perfectly (more natural)
            const angleOffset = ringIndex * (Math.PI / 4);
            const angle = (posInRing / Math.max(1, planetsInThisRing)) * Math.PI * 2 + angleOffset - (Math.PI / 2);

            return {
                ...dept,
                color: dept.color,
                x: 50 + (ring.rx * Math.cos(angle)), // Circular orbits for stability
                y: 54 + (ring.ry * Math.sin(angle)), // +4% bias keeps planets away from top edge
                angle,
                rx: ring.rx,
                ry: ring.ry,
                ringIndex
            };
        });
    }, [safeDepartments, rings, isPublicDemoSurface, currentCompany?.is_demo, currentCompany?.tenant_id]);

    // ─── SILK DRIFT PATHS (V10.6) ───
    const visiblePlanets = useMemo(
        () => planetPositions.filter((planet) => shouldRender(planet)),
        [planetPositions, shouldRender]
    );
    const focusedPlanetId = heldInsightPlanetId || hoverPlanetId || insightPlanetId || null;

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

                const midY = 54 - Math.min(12, Math.abs(from.ringIndex - to.ringIndex) * 4 + 5);
                const labelX = (from.x * 0.25) + 25 + (to.x * 0.25);
                const labelY = (from.y * 0.25) + (midY * 0.5) + (to.y * 0.25);
                const pathId = buildSemanticEdgeKey(edge.fromId, edge.toId);
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
                    d: `M ${from.x} ${from.y} Q 50 ${midY} ${to.x} ${to.y}`,
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
    const focusBridgeStyle = useMemo(() => {
        if (!focusedPlanet) return null;

        const bridgeWidth = Math.max(18, focusedPlanet.x - 8);
        const bridgeTop = `calc(${focusedPlanet.y}% - 96px)`;

        return {
            top: bridgeTop,
            width: `${bridgeWidth}%`,
            height: '192px',
        } as const;
    }, [focusedPlanet]);
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
    }, [activeDepartmentId, insightPlanetId]);

    const handlePlanetHover = useCallback((planetId: string, hovered: boolean) => {
        if (hovered) {
            clearHoverRelease();
            setHoverPlanetId(planetId);
            setInsightPlanetId(planetId);
            setSemanticPreviewPathId(null);
            return;
        }

        setHoverPlanetId((current) => (current === planetId ? null : current));
        if (!isInsightRailHovered && !isFocusBridgeHovered) {
            scheduleHoverRelease();
        }
    }, [clearHoverRelease, scheduleHoverRelease, isFocusBridgeHovered, isInsightRailHovered]);

    const handleSemanticPreview = (pathId: string | null) => {
        setSemanticPreviewPathId(pathId);
    };

    const handleSemanticNavigate = (departmentId: string) => {
        setSemanticPreviewPathId(null);
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
    }, [currentCompany?.name, currentCompany?.tenant_id, currentCompany?.is_demo, user?.active_company_name, isPublicDemoSurface]);
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
    const showOrganizationAggregate = !isPublicDemoSurface && !surfaceProfile.isLocalTruthSurface && !currentCompany && companies.length > 1;
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
        () => Array.from({ length: 42 }, (_, index) => {
            const left = ((index * 19.7) % 96) + 2;
            const top = ((index * 13.4) % 78) + 6;
            const size = [1.4, 1.8, 2.2, 2.8][index % 4];
            const color = [
                'rgba(255,255,255,0.92)',
                'rgba(191,219,254,0.88)',
                'rgba(167,243,208,0.78)',
                'rgba(250,204,21,0.58)',
            ][index % 4];
            return {
                id: `accent-star-${index}`,
                left,
                top,
                size,
                color,
                opacity: 0.44 + ((index % 5) * 0.08),
            };
        }),
        []
    );
    const heroStars = useMemo(
        () => Array.from({ length: 14 }, (_, index) => {
            const left = ((index * 23.7) % 88) + 6;
            const top = ((index * 15.1) % 72) + 8;
            const size = [2.2, 2.8, 3.6][index % 3];
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

        if (isInsightRailHovered || isFocusBridgeHovered) {
            return;
        }

        if (heldInsightPlanetId) {
            scheduleHoverRelease();
            return;
        }

        clearHoverRelease();
        clearUniverseInteractionState();
    }, [
        clearHoverRelease,
        clearUniverseInteractionState,
        heldInsightPlanetId,
        isFocusBridgeHovered,
        isInsightRailHovered,
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
                        radial-gradient(1600px 920px at 52% 54%, rgba(52, 120, 190, 0.24) 0%, rgba(14, 34, 56, 0.12) 42%, transparent 78%),
                        radial-gradient(920px 620px at 14% 18%, rgba(26, 213, 184, 0.18) 0%, transparent 62%),
                        radial-gradient(860px 520px at 88% 16%, rgba(96, 165, 250, 0.16) 0%, transparent 58%),
                        linear-gradient(135deg, rgba(4, 18, 18, 0.32) 0%, rgba(8, 22, 34, 0.18) 48%, rgba(4, 16, 16, 0.3) 100%)
                    `,
                }}
            />
            <motion.div
                className="absolute inset-0 z-[-9] pointer-events-none"
                animate={{ x: parallaxOffset.x * 0.24, y: parallaxOffset.y * 0.18 }}
                transition={{ type: 'spring', stiffness: 28, damping: 18, mass: 1 }}
                style={{
                    background: `
                        radial-gradient(1200px 760px at 52% 56%, rgba(96, 165, 250, 0.38) 0%, transparent 66%),
                        radial-gradient(1040px 640px at 18% 24%, rgba(45, 212, 191, 0.24) 0%, transparent 54%),
                        radial-gradient(860px 480px at 84% 20%, rgba(167, 139, 250, 0.16) 0%, transparent 48%),
                        radial-gradient(760px 420px at 22% 76%, rgba(16, 185, 129, 0.16) 0%, transparent 52%)
                    `,
                }}
            />
            <motion.div
                className="absolute inset-0 z-[-8] pointer-events-none"
                animate={{ x: parallaxOffset.x * 0.44, y: parallaxOffset.y * 0.2, rotate: -2.4 }}
                transition={{ type: 'spring', stiffness: 22, damping: 16, mass: 1.05 }}
                style={{
                    background: 'linear-gradient(102deg, transparent 0%, rgba(220,248,255,0.04) 16%, rgba(96,165,250,0.1) 32%, rgba(45,212,191,0.08) 48%, rgba(167,139,250,0.06) 66%, transparent 84%)',
                    transform: 'scale(1.16)',
                    filter: 'blur(26px)',
                    opacity: 0.78,
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
                    opacity: 0.92,
                }}
            />
            <div
                className="absolute inset-0 z-[-7] pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at 50% 48%, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 24%, rgba(0,0,0,0.14) 64%, rgba(0,0,0,0.42) 100%)',
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
                        animate={{ opacity: [0.42, 1, 0.54], scale: [1, 1.18, 1] }}
                        transition={{ duration: star.duration, delay: star.delay, repeat: Infinity, ease: 'easeInOut' }}
                    />
                ))}
            </motion.div>

            {focusedPlanet && focusedPlanetMetrics && focusBridgeStyle ? (
                <div
                    className="absolute left-0 z-[27] pointer-events-auto bg-transparent"
                    style={focusBridgeStyle}
                    onMouseEnter={() => {
                        clearHoverRelease();
                        setIsFocusBridgeHovered(true);
                        if (focusedPlanet) {
                            setHeldInsightPlanetId(focusedPlanet.id);
                            setInsightPlanetId(focusedPlanet.id);
                        }
                    }}
                    onMouseLeave={() => {
                        setIsFocusBridgeHovered(false);
                        if (focusedPlanet && heldInsightPlanetId === focusedPlanet.id) {
                            setHeldInsightPlanetId(null);
                        }
                        if (!hoverPlanetId && !isInsightRailHovered) {
                            scheduleHoverRelease();
                        }
                    }}
                />
            ) : null}

            {/* 2. CENTER HUB (The Core) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 pb-20">
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
                            src={currentCompany?.logo_url}
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
                                        Die Home-Ebene bleibt ruhig im Vordergrund. Ein Klick auf das Zeichen oeffnet den grossen Raum.
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
                                        Universe oeffnen
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
                        <stop offset="32%" stopColor="rgba(125,211,252,0.18)" />
                        <stop offset="54%" stopColor="rgba(196,181,253,0.14)" />
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
                        x1="50"
                        y1="54"
                        x2={connection.x}
                        y2={connection.y}
                        stroke="url(#coreBeam)"
                        strokeWidth={connection.highlighted ? 0.16 + connection.intensity * 0.22 : 0.08 + connection.intensity * 0.1}
                        filter="url(#beamGlow)"
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: isHomeUniversePreview
                                ? (connection.highlighted ? 0.22 : 0.08 + connection.intensity * 0.03)
                                : (connection.highlighted ? 0.32 : 0.12 + connection.intensity * 0.05)
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
                                ? 0.74
                                : isFocusedPath
                                    ? 0.28
                                    : 0
                        )
                        : (
                            path.highlighted || isPreviewedPath
                                ? 0.82
                                : isFocusedPath
                                    ? 0.34
                                    : Math.max(0.14, 0.08 + path.strength * 0.18)
                        );

                    return (
                        <g key={path.id}>
                            <motion.path
                                d={path.d}
                                fill="none"
                                stroke={driverMeta.accent}
                                strokeWidth={0.24 + path.strength * 0.34}
                                strokeDasharray={driverMeta.dashArray}
                                strokeLinecap="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{
                                    pathLength: 1,
                                opacity: baseOpacity * 0.12,
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
                                strokeWidth={0.1 + path.strength * 0.18}
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
                    collapsedHint={hoverPlanetId ? 'Signal gehalten.' : 'Department fokussieren fuer Analyse.'}
                    summary={`${focusedPlanetLinkCount} semantische Beziehungen fuer ${focusedPlanet.name}. Hover previewt das Signal, die Rail haelt den Fokus und ein Klick springt direkt in den verbundenen Bereich.`}
                    alwaysExpanded
                    showToggle={false}
                    forceExpanded={Boolean(focusedPlanetId) || Boolean(semanticPreviewPathId) || isInsightRailHovered}
                    onPointerEnter={() => {
                        setIsInsightRailHovered(true);
                        setIsFocusBridgeHovered(false);
                        setHeldInsightPlanetId(focusedPlanet.id);
                        setInsightPlanetId(focusedPlanet.id);
                        clearHoverRelease();
                    }}
                    onPointerLeave={() => {
                        setIsInsightRailHovered(false);
                        setIsFocusBridgeHovered(false);
                        setHeldInsightPlanetId(null);
                        if (!hoverPlanetId) {
                            scheduleHoverRelease();
                        }
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
                    const capacity = maxNodes > 0 ? Math.round((nodeCount / maxNodes) * 100) : 0;
                    // Activity: Document count (shown as "X Docs" in hover)
                    const activity = nodeCount;
                    // Health: From API if available, otherwise calculate
                    const health = healthFromAPI ?? Math.min(100, (spaceCount > 0 ? 40 : 0) + (folderCount > 0 ? 30 : 0) + (nodeCount > 0 ? 30 : 0));

                    const locked = isLocked(p);
                    const isSemanticPreviewPlanet = semanticPreviewPlanetIds.has(p.id);

                    return (
                        <React.Fragment key={p.id}>
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
                                        onHover={isHomeUniversePreview ? undefined : (hovered) => handlePlanetHover(p.id, hovered)}
                                        onClick={() => {
                                            if (isHomeUniversePreview) {
                                                setCoreMode('explore');
                                            }
                                        }}
                                        showTooltip={false}
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
                                    onHover={isHomeUniversePreview ? undefined : (hovered) => handlePlanetHover(p.id, hovered)}
                                    onClick={() => {
                                        if (isHomeUniversePreview) {
                                            clearUniverseInteractionState();
                                            clearHoverRelease();
                                            setCoreMode('explore');
                                            return;
                                        }
                                        clearHoverRelease();
                                        setHeldInsightPlanetId(null);
                                        setHoverPlanetId(null);
                                        setInsightPlanetId(p.id);
                                        setSemanticPreviewPathId(null);
                                        navigateToDepartment(p.id);
                                    }}
                                    showTooltip={false}
                                    health={health}
                                    activity={activity}
                                    capacity={capacity}
                                />
                            )}
                            {lockedTooltipDeptId === p.id && (
                                <LockedPlanetTooltip
                                    name={p.name}
                                    description={(p as any).description}
                                    onDismiss={() => setLockedTooltipDeptId(null)}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

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
                                    <p className="text-[10px] text-white/40 tracking-[0.3em] uppercase">{isPublicDemoSurface ? 'Kuratiertes Beispielsystem' : 'Aktive Organisation'}</p>
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
                                    value={currentCompany?.is_demo ? 'Beispielsystem' : 'Geschuetzt'}
                                    status={currentCompany?.is_demo ? 'neutral' : 'secure'}
                                />
                                <InsightCard
                                    icon={<Database className="w-4 h-4" />}
                                    label={showOrganizationAggregate ? 'Organisationen' : 'Bereiche'}
                                    value={showOrganizationAggregate ? `${companies.length}` : `${totalSpaceCount}`}
                                    status="stable"
                                    progress={Math.min((showOrganizationAggregate ? companies.length : totalSpaceCount) * 20, 100)}
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
                                    {currentCompany?.name || displayCompanyName}
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
