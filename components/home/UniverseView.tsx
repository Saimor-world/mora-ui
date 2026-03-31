"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoraStore } from '@/lib/store/moraState';
import { TENANT_DEMO, TENANT_HQ } from '@/lib/constants/tenants';
import { Planet } from '@/components/mora/Planet';
import { StarField } from '@/components/visual/StarField';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { Activity, ShieldCheck, Database, Cpu, X, Zap } from 'lucide-react';
import { fetchDepartmentStats, type DepartmentStats, fetchUserMemberships, type UserMembership, type UserMembershipsResponse } from '@/lib/api/coreClient';
import { LockedPlanetTooltip } from '@/components/layers/LockedPlanetTooltip';
import { LayerInsightRail } from '@/components/layers/LayerInsightRail';
import { useContextStore } from '@/lib/store/contextStore';
import { isAdmin } from '@/lib/auth/roles';

const metricAffinity = (left: number, right: number) => {
    const baseline = Math.max(1, left, right);
    return Math.max(0, 1 - Math.abs(left - right) / baseline);
};

const resolveDepartmentSimilarity = (
    left: { nodes: number; spaces: number; folders: number; health: number },
    right: { nodes: number; spaces: number; folders: number; health: number }
) => (
    metricAffinity(left.nodes, right.nodes) * 0.4 +
    metricAffinity(left.spaces, right.spaces) * 0.2 +
    metricAffinity(left.folders, right.folders) * 0.25 +
    metricAffinity(left.health, right.health) * 0.15
);

/**
 * UNIVERSE VIEW - V11 STELLAR ORCHESTRATION
 * VISION: A living, breathing autonomous business workspace.
 * Now with REAL department stats from backend!
 */

export default function UniverseView({ viewMode: viewModeProp = 'live' }: { viewMode?: 'live' | 'demo' }) {
    const {
        departments,
        companies,
        activeCompanyId,
        activeDepartmentId,
        setOrbState,
        orbState,
        viewMode,
        user,
        navigateToCore,
        navigateToDepartment,
        treeData,
        spacesByDepartment
    } = useMoraStore();

    const setPersonalSpaceId = useContextStore((s) => s.setPersonalSpaceId);

    const [showSystemStatus, setShowSystemStatus] = useState(false);
    const [hoverPlanetId, setHoverPlanetId] = useState<string | null>(null);
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
    const isMember = (deptId: string): boolean => {
        // While loading (first render before API responds): show all to avoid flash
        if (!membershipsLoaded) return true;
        if (isAdmin(user?.role)) return true;
        // API failed: restrict to public departments only (no silent cross-scope fallback)
        if (memberships === null) return false;
        return memberships.some((m) => m.department_id === deptId);
    };

    const shouldRender = (dept: any): boolean => {
        if (isMember(dept.id)) return true;
        const vis = dept.visibility ?? 'private';    // server truth; default private
        return vis === 'public' || vis === 'visible'; // private never renders
    };

    const isLocked = (dept: any): boolean => {
        if (isMember(dept.id)) return false;
        return (dept.visibility ?? 'private') === 'visible';
    };

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
                const deptSpaces = Array.isArray(spacesByDepartment?.[dept.id]) ? spacesByDepartment[dept.id] : [];
                const spaces = deptSpaces.length || ((Array.isArray(dept.children) ? dept.children : []).filter((c: any) => c.type === 'space')?.length || 0);
                // Calculate health based on content
                const health = Math.min(100, (spaces > 0 ? 30 : 0) + (counts.folders > 0 ? 30 : 0) + (counts.nodes > 0 ? 40 : 0));
                metrics[dept.id] = { nodes: counts.nodes, spaces, folders: counts.folders, health };
            }
        }
        return metrics;
    }, [statsMap, safeTreeData, spacesByDepartment]);

    // Normalize metrics to percentages
    const maxNodes = useMemo(() => Math.max(1, ...Object.values(departmentMetrics).map(m => m.nodes)), [departmentMetrics]);

    // Dynamic Context Resolver
    const currentCompany = useMemo(() =>
        safeCompanies.find(c => c.id === activeCompanyId),
        [safeCompanies, activeCompanyId]);

    // ─── SYNC GUARD (V10.6) ───
    // Ensures data is loaded without disruptive flashes
    const lastSyncId = useRef<string | null>(null);
    useEffect(() => {
        if (activeCompanyId && activeCompanyId !== lastSyncId.current) {
            useMoraStore.getState().loadDepartments(activeCompanyId);
            lastSyncId.current = activeCompanyId;
        }
    }, [activeCompanyId]);

    // ─── DYNAMIC ORBITAL SYSTEM (CALM & DETERMINISTIC) ───
    // Fixed rings for calm "Solar System" feel.
    // ry capped at 40 so outer-ring planets stay within the visible viewport
    // (prevents clipping above the shell nav bar and below the Dock).
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
    }, [safeDepartments, rings]);

    // ─── SILK DRIFT PATHS (V10.6) ───
    const visiblePlanets = useMemo(
        () => planetPositions.filter((planet) => shouldRender(planet)),
        [planetPositions, membershipsLoaded, memberships, user?.role]
    );

    const semanticConnections = useMemo(() => {
        if (visiblePlanets.length < 2) return [];

        const edges = new Map<string, { fromId: string; toId: string; strength: number }>();

        visiblePlanets.forEach((planet) => {
            const sourceMetrics = departmentMetrics[planet.id] || { nodes: 0, spaces: 0, folders: 0, health: 0 };

            visiblePlanets
                .filter((candidate) => candidate.id !== planet.id)
                .map((candidate) => {
                    const targetMetrics = departmentMetrics[candidate.id] || { nodes: 0, spaces: 0, folders: 0, health: 0 };
                    const semanticAffinity = resolveDepartmentSimilarity(sourceMetrics, targetMetrics);
                    const ringAffinity = Math.max(0, 1 - Math.abs(planet.ringIndex - candidate.ringIndex) / 2);
                    const spatialAffinity = Math.max(0, 1 - Math.hypot(planet.x - candidate.x, planet.y - candidate.y) / 100);

                    return {
                        candidateId: candidate.id,
                        strength: semanticAffinity * 0.65 + ringAffinity * 0.2 + spatialAffinity * 0.15,
                    };
                })
                .sort((left, right) => right.strength - left.strength)
                .slice(0, 2)
                .filter((edge) => edge.strength >= 0.42)
                .forEach((edge) => {
                    const key = [planet.id, edge.candidateId].sort().join(':');
                    const current = edges.get(key);
                    if (!current || edge.strength > current.strength) {
                        edges.set(key, {
                            fromId: planet.id,
                            toId: edge.candidateId,
                            strength: edge.strength,
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

                return {
                    id: `${edge.fromId}-${edge.toId}`,
                    d: `M ${from.x} ${from.y} Q 50 ${midY} ${to.x} ${to.y}`,
                    strength: edge.strength,
                    highlighted:
                        hoverPlanetId === from.id ||
                        hoverPlanetId === to.id ||
                        activeDepartmentId === from.id ||
                        activeDepartmentId === to.id,
                };
            })
            .filter((value): value is { id: string; d: string; strength: number; highlighted: boolean } => value !== null);
    }, [semanticConnections, visiblePlanets, hoverPlanetId, activeDepartmentId]);

    const coreConnections = useMemo(() => (
        visiblePlanets.map((planet) => {
            const metrics = departmentMetrics[planet.id] || { nodes: 0, spaces: 0, folders: 0, health: 0 };
            const loadSignal = metrics.nodes * 0.35 + metrics.folders * 1.1 + metrics.spaces * 1.4;
            return {
                id: planet.id,
                x: planet.x,
                y: planet.y,
                intensity: Math.max(0.16, Math.min(1, loadSignal / Math.max(1, maxNodes * 0.45 + 12))),
                highlighted: hoverPlanetId === planet.id || activeDepartmentId === planet.id,
            };
        })
    ), [visiblePlanets, departmentMetrics, hoverPlanetId, activeDepartmentId, maxNodes]);

    const focusedPlanet = useMemo(() => {
        const focusedId = hoverPlanetId || activeDepartmentId || visiblePlanets[0]?.id || null;
        if (!focusedId) return null;
        return visiblePlanets.find((planet) => planet.id === focusedId) || null;
    }, [hoverPlanetId, activeDepartmentId, visiblePlanets]);

    const focusedPlanetMetrics = focusedPlanet
        ? (departmentMetrics[focusedPlanet.id] || { nodes: 0, spaces: 0, folders: 0, health: 0 })
        : null;
    const focusedPlanetLinkCount = focusedPlanet
        ? semanticConnections.filter((edge) => edge.fromId === focusedPlanet.id || edge.toId === focusedPlanet.id).length
        : 0;

    const displayCompanyName = useMemo(() => {
        const raw = currentCompany?.name?.trim();
        const tenantId = currentCompany?.tenant_id;
        const isDemo = currentCompany?.is_demo;
        if (!raw) {
            const sessionCompanyName = user?.active_company_name?.trim();
            if (sessionCompanyName) return sessionCompanyName;
            if (isDemo || tenantId === TENANT_DEMO) return 'Simple Coffee Group';
            if (tenantId === TENANT_HQ) return 'Saimor HQ';
            return 'Firmenkontext fehlt';
        }
        return raw;
    }, [currentCompany?.name, currentCompany?.tenant_id, currentCompany?.is_demo, user?.active_company_name]);
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

    return (
        <div className="relative w-full h-full overflow-hidden text-white bg-transparent">
            {/* 0. DEEP UNIVERSE BACKGROUND (Consolidated StarField) */}
            <StarField warp={false} />
            {/* Galaxy wash */}
            <div className="absolute inset-0 z-[-9] pointer-events-none" style={{
                background: `
                    radial-gradient(1240px 620px at 60% 60%, rgba(34, 160, 220, 0.42) 0%, transparent 65%),
                    radial-gradient(960px 440px at 20% 25%, rgba(34, 197, 94, 0.28) 0%, transparent 60%),
                    radial-gradient(860px 440px at 80% 35%, rgba(99, 102, 241, 0.30) 0%, transparent 55%),
                    radial-gradient(1040px 560px at 40% 80%, rgba(12, 74, 110, 0.28) 0%, transparent 60%)
                `
            }} />
            {/* Deep space gradient */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#072522] via-[#0b1b2d] to-[#103636] opacity-80 z-[-8] pointer-events-none" />
            {/* Galaxy band */}
            <div className="absolute inset-0 z-[-7] pointer-events-none" style={{
                background: "linear-gradient(120deg, rgba(16,185,129,0.10) 0%, rgba(6,182,212,0.17) 45%, rgba(99,102,241,0.13) 70%, transparent 100%)",
                mixBlendMode: "screen"
            }} />
            <div className="absolute inset-0 z-[-7] pointer-events-none" style={{
                background: "radial-gradient(760px 280px at 52% 48%, rgba(255,255,255,0.05) 0%, rgba(34,211,238,0.05) 22%, transparent 70%)",
                mixBlendMode: "screen"
            }} />
            {/* Subtle vignette */}
            <div className="absolute inset-0 z-[-6] pointer-events-none" style={{
                background: "radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.42) 78%, rgba(0,0,0,0.68) 100%)"
            }} />

            {/* 1. TOP CENTER TITLE (IMMERSIVE BRANDING) */}
            <div className="absolute top-12 left-0 right-0 flex flex-col items-center pointer-events-none z-30">
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <h1
                        className="font-light uppercase text-white/90 text-center font-sans"
                        style={{
                            ...titleStyle,
                            textShadow: '0 0 40px rgba(16, 185, 129, 0.4)', // Emerald glow, softer
                        }}
                    >
                        {displayCompanyName}
                    </h1>

                    <motion.div
                        className="flex items-center justify-center gap-4"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1, duration: 1.5 }}
                    >
                        <div className="h-[1px] w-12 bg-white/20" />
                        <span className="text-[10px] tracking-[0.3em] text-emerald-400/60 uppercase font-medium">Corporate Overview</span>
                        <div className="h-[1px] w-12 bg-white/20" />
                    </motion.div>
                </motion.div>
            </div>

            {/* 2. CENTER HUB (The Core) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 pb-20">
                <motion.div
                    className="text-center pointer-events-auto flex flex-col items-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                >
                    {/* CENTER LOGO */}
                    <div className="relative group">
                        {/* Glow Behind Logo */}
                        <div className="absolute inset-0 bg-cyan-500/20 blur-[80px] rounded-full scale-150 group-hover:bg-cyan-400/40 transition-all duration-700" />

                        <CompanyLogo
                            src={currentCompany?.logo_url}
                            companyName={displayCompanyName}
                            size="lg"
                            animated
                            onClick={() => {
                                if (!activeDepartmentId) {
                                    setShowSystemStatus(!showSystemStatus);
                                } else {
                                    navigateToCore();
                                    setShowSystemStatus(false);
                                }
                            }}
                        />
                    </div>
                </motion.div>
            </div>

            {/* 2. ORBITAL SVG (Connection Network) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <filter id="silkGlow">
                        <feGaussianBlur stdDeviation="0.3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(6,182,212,0)" />
                        <stop offset="50%" stopColor="rgba(6,182,212,0.8)" />
                        <stop offset="100%" stopColor="rgba(6,182,212,0)" />
                    </linearGradient>
                    <linearGradient id="coreBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(16,185,129,0)" />
                        <stop offset="50%" stopColor="rgba(16,185,129,0.65)" />
                        <stop offset="100%" stopColor="rgba(16,185,129,0)" />
                    </linearGradient>
                    <filter id="beamGlow">
                        <feGaussianBlur stdDeviation="0.8" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Static Elliptical Rings */}
                {rings.map((r, i) => (
                    <ellipse
                        key={i} cx="50" cy="54" rx={r.rx} ry={r.ry}
                        fill="none" stroke="white" strokeWidth="0.05" strokeOpacity={0.08 + i * 0.03}
                        className="transition-all duration-1000"
                    />
                ))}

                {/* Core-to-Planet Light Threads */}
                {coreConnections.map((connection) => (
                    <motion.line
                        key={`core-${connection.id}`}
                        x1="50"
                        y1="54"
                        x2={connection.x}
                        y2={connection.y}
                        stroke="url(#coreBeam)"
                        strokeWidth={0.14 + connection.intensity * 0.36}
                        strokeDasharray={connection.highlighted ? '3 4' : '2 8'}
                        filter="url(#beamGlow)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: connection.highlighted ? 0.58 : 0.12 + connection.intensity * 0.16 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                ))}

                {/* Semantic silk paths */}
                {semanticPaths.map((path) => (
                    <motion.path
                        key={path.id}
                        d={path.d}
                        fill="none"
                        stroke="url(#orbitGrad)"
                        strokeWidth={0.18 + path.strength * 0.32}
                        strokeDasharray={path.highlighted ? '0 0' : '4 5'}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                            pathLength: 1,
                            opacity: path.highlighted ? 0.56 : 0.16 + path.strength * 0.22,
                        }}
                        transition={{
                            pathLength: { duration: 2.4, ease: "easeInOut" },
                            opacity: { duration: 0.35, ease: "easeOut" }
                        }}
                        filter="url(#silkGlow)"
                    />
                ))}
            </svg>

            {focusedPlanet && focusedPlanetMetrics && (
                <LayerInsightRail
                    className="left-8 top-28 z-30"
                    eyebrow={hoverPlanetId ? 'Live Focus' : 'Department Signal'}
                    title={focusedPlanet.name}
                    badge={isLocked(focusedPlanet) ? 'Visible' : 'Member'}
                    accent={focusedPlanet.color || '#34d399'}
                    summary={`${focusedPlanetLinkCount} semantische Verbindungen bleiben sichtbar, aber die volle Analyse klappt erst bei Hover oder echtem Fokus auf.`}
                    forceExpanded={Boolean(hoverPlanetId)}
                    metrics={[
                        { label: 'Spaces', value: focusedPlanetMetrics.spaces, toneClassName: 'text-emerald-200' },
                        { label: 'Folders', value: focusedPlanetMetrics.folders, toneClassName: 'text-cyan-200' },
                        { label: 'Docs', value: focusedPlanetMetrics.nodes, toneClassName: 'text-violet-200' },
                        { label: 'Health', value: `${focusedPlanetMetrics.health}%`, toneClassName: 'text-amber-200' },
                    ]}
                >
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/35">
                            <span>Semantic Links</span>
                            <span>{focusedPlanetLinkCount}</span>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-white/45">
                            Verbindungen richten sich jetzt nach echter Department-Aehnlichkeit in Docs, Spaces, Folders und Health statt nach reiner Orbit-Reihenfolge.
                        </p>
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

                    return (
                        <React.Fragment key={p.id}>
                            {locked ? (
                                <div
                                    data-testid={`locked-planet-${p.id}`}
                                    onClick={() => setLockedTooltipDeptId(p.id)}
                                    style={{ opacity: 0.4, cursor: 'pointer', filter: 'grayscale(0.6)' }}
                                >
                                    <Planet
                                        department={p as any}
                                        position={{ x: p.x + '%', y: p.y + '%' } as any}
                                        isActive={activeDepartmentId === p.id}
                                        onHover={(hovered) => setHoverPlanetId(hovered ? p.id : null)}
                                        onClick={() => {
                                            // Locked: outer wrapper handles click (tooltip). Block navigation.
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
                                    isActive={activeDepartmentId === p.id}
                                    onHover={(hovered) => setHoverPlanetId(hovered ? p.id : null)}
                                    onClick={() => {
                                        navigateToDepartment(p.id);
                                    }}
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
                                        <h2 className="text-2xl font-light tracking-[0.2em] uppercase text-white/90">System Insight</h2>
                                    </div>
                                    <p className="text-[10px] text-white/40 tracking-[0.3em] uppercase">Instance: Einheit_R1_Cortex_{activeCompanyId?.slice(0, 4)}</p>
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
                                    label="Departments"
                                    value={`${departments.length}`}
                                    status="optimal"
                                    progress={Math.min(departments.length * 10, 100)}
                                />
                                <InsightCard
                                    icon={<ShieldCheck className="w-4 h-4" />}
                                    label="Tenant"
                                    value={currentCompany?.tenant_id?.replace('tenant-', '') || 'unknown'}
                                    status={currentCompany?.is_demo ? 'neutral' : 'secure'}
                                />
                                <InsightCard
                                    icon={<Database className="w-4 h-4" />}
                                    label="Companies"
                                    value={`${companies.length}`}
                                    status="stable"
                                    progress={Math.min(companies.length * 20, 100)}
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
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Pulse</span>
                                    <span>•</span>
                                    <span>Firmware V10.6.4</span>
                                </div>
                                <div className="text-[9px] tracking-[0.2em] text-white/30 truncate max-w-[200px]">
                                    TENANT_IDENTIFIER: {activeCompanyId}
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
