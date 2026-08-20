"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useActiveRitualScene } from '@/lib/hooks/useActiveRitualScene';
import type { RitualSceneId } from '@/lib/os/ritualMode';
import { useOrbStore } from '@/lib/store/orbStore';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useTree } from '@/lib/queries/useTree';
import { useCompanies } from '@/lib/queries/useCompanies';
import { TENANT_DEMO, TENANT_HQ } from '@/lib/constants/tenants';
import { Planet } from '@/components/mora/Planet';
import { DeptSpaceMap } from '@/components/mora/DeptSpaceMap';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { Activity, ShieldCheck, Database, Cpu, X, Zap, Sparkles, Search, Folder, LayoutGrid, Map as MapIcon } from 'lucide-react';
import { WidgetGrid } from '@/components/widgets/WidgetGrid';
import { SpatialMindfield, type FabricSignal } from '@/components/canvas/SpatialMindfield';
import { usePaneStore } from '@/lib/store/paneStore';
import { fetchDepartmentStats, type DepartmentStats, fetchUserMemberships, type UserMembership, type UserMembershipsResponse, searchGlobal } from '@/lib/api/coreClient';
import { openSearchResult } from '@/lib/utils/searchOpen';
import { LockedPlanetTooltip } from '@/components/layers/LockedPlanetTooltip';
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
import {
    UNIVERSE_CORE_POINT,
    buildSoftUniverseRoute,
    buildOrganicUniverseLayout,
} from '@/lib/universe/layout';
import { ACCENT_STARS } from '@/lib/universe/backdrop';
import { fetchNightwatchIncidents } from '@/lib/api/nightwatchClient';
import { incidentBelongsToDepartment } from '@/lib/openflow/departmentIncidentContext';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import { useBridgePulse } from '@/lib/hooks/useBridgePulse';
import { feedsPaneRequest } from '@/lib/rss/feedsPane';
import { GLASS_SHEET_SIZE } from '@/lib/os/glassSheet';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';
import { useCommunicationLiveData } from '@/lib/hooks/useCommunicationLiveData';
import { resolveIntegrationConnectionStates } from '@/lib/integrations/connectionState';
import {
    UNIVERSE_HOVER_RELEASE_HOME_MS,
    UNIVERSE_HOVER_RELEASE_MS,
} from '@/lib/universe/hoverTiming';
import {
    isNearAnyPlanet,
    resolveUniverseFocusMode,
    resolveUniverseInteractionZone,
    universeWidgetOpacity,
    type UniverseFocusMode,
} from '@/lib/universe/interactionZones';

const EMPTY_UNIVERSE_ITEMS: any[] = [];

// Per-scene nebula colors — Universe background reacts dramatically to scene switches
const UNIVERSE_BASE: Record<RitualSceneId, string> = {
    flow:   'linear-gradient(145deg, #12394b 0%, #0a2538 42%, #071827 72%, #06111d 100%)',
    build:  'linear-gradient(145deg, #173e59 0%, #0b2944 42%, #0a1930 74%, #070f1d 100%)',
    lounge: 'linear-gradient(145deg, #3a2936 0%, #24253d 42%, #121d31 74%, #091421 100%)',
    night:  'linear-gradient(145deg, #20284b 0%, #151d3d 42%, #0b1730 74%, #070f20 100%)',
};
const UNIVERSE_NEBULA: Record<RitualSceneId, string> = {
    flow: `
        radial-gradient(1180px 760px at 52% 54%, rgba(16,185,129,0.22) 0%, transparent 64%),
        radial-gradient(1000px 640px at 18% 24%, rgba(20,184,166,0.16) 0%, transparent 56%),
        radial-gradient(880px 540px at 84% 20%, rgba(34,211,238,0.10) 0%, transparent 52%),
        radial-gradient(800px 480px at 22% 78%, rgba(16,185,129,0.09) 0%, transparent 56%)`,
    build: `
        radial-gradient(1180px 760px at 52% 54%, rgba(56,189,248,0.22) 0%, transparent 64%),
        radial-gradient(1000px 640px at 18% 24%, rgba(99,102,241,0.16) 0%, transparent 56%),
        radial-gradient(880px 540px at 84% 20%, rgba(251,191,36,0.10) 0%, transparent 52%),
        radial-gradient(800px 480px at 22% 78%, rgba(56,189,248,0.09) 0%, transparent 56%)`,
    lounge: `
        radial-gradient(1180px 760px at 52% 44%, rgba(251,146,60,0.18) 0%, transparent 62%),
        radial-gradient(1000px 640px at 82% 18%, rgba(244,114,182,0.13) 0%, transparent 54%),
        radial-gradient(900px 560px at 16% 82%, rgba(99,102,241,0.15) 0%, transparent 56%),
        radial-gradient(760px 460px at 30% 26%, rgba(249,115,22,0.07) 0%, transparent 52%)`,
    night: `
        radial-gradient(1180px 760px at 52% 54%, rgba(99,102,241,0.23) 0%, transparent 64%),
        radial-gradient(1000px 640px at 18% 24%, rgba(139,92,246,0.17) 0%, transparent 56%),
        radial-gradient(880px 540px at 84% 20%, rgba(34,211,238,0.09) 0%, transparent 52%),
        radial-gradient(800px 480px at 22% 78%, rgba(99,102,241,0.10) 0%, transparent 56%)`,
};

export default function UniverseView({ viewMode: viewModeProp = 'live' }: { viewMode?: 'live' | 'demo' }) {
    const setOrbState = useOrbStore((s) => s.setOrbState);
    const ritualScene = useActiveRitualScene();
    const orbState = useOrbStore((s) => s.orbState);
    const { activeCompanyId, activeDepartmentId, coreMode, setCoreMode, viewMode, navigateToCore, navigateToDepartment, universeScope, universeScopeDeptId, setUniverseScope } = useNavStore();
    const user = useSessionStore(s => s.user);

    const { data: companiesData }   = useCompanies();
    const safeCompanies = useMemo(() => (Array.isArray(companiesData) ? companiesData : EMPTY_UNIVERSE_ITEMS), [companiesData]);
    const effectiveCompanyId = activeCompanyId || (safeCompanies.length > 0 ? safeCompanies[0].id : null);

    useEffect(() => {
        if (!activeCompanyId && effectiveCompanyId) {
            useNavStore.getState().setActiveCompany(effectiveCompanyId);
        }
    }, [activeCompanyId, effectiveCompanyId]);

    const { data: departmentsData } = useDepartments(effectiveCompanyId);
    const { data: treeDataRaw }     = useTree(effectiveCompanyId);

    const setPersonalSpaceId = useContextStore((s) => s.setPersonalSpaceId);
    const openPane = usePaneStore((s) => s.openPane);
    const surfaceProfile = useSurfaceProfile();
    const websiteEntryContext = useWebsiteEntryContext();
    const isPublicDemoSurface = surfaceProfile.isPublicDemoSurface && !websiteEntryContext;
    const {
        overview: integrationsOverview,
        isLoading: integrationsLoading,
        error: integrationsError,
    } = useCommunicationSurface();
    const { mailPreview, calendarPreview, feedPreview } = useCommunicationLiveData();
    const integrationStates = resolveIntegrationConnectionStates(
        integrationsOverview,
        integrationsLoading,
        integrationsError,
    );

    const openMailPane = useCallback(() => {
        if (!integrationsOverview?.mail?.configured) {
            openPane({ id: 'integrations-main', type: 'integrations', title: 'Integrationen', size: GLASS_SHEET_SIZE });
            return;
        }
        openPane({ id: 'mail-main', type: 'mail', title: 'Post', size: { width: 960, height: 720 } });
    }, [integrationsOverview?.mail?.configured, openPane]);

    const openCalendarPane = useCallback(() => {
        if (!integrationsOverview?.calendar?.configured) {
            openPane({ id: 'integrations-main', type: 'integrations', title: 'Integrationen', size: GLASS_SHEET_SIZE });
            return;
        }
        openPane({ id: 'calendar-main', type: 'calendar', title: 'Kalender', size: { width: 840, height: 620 } });
    }, [integrationsOverview?.calendar?.configured, openPane]);

    const openIntegrationsPane = useCallback(() => {
        openPane({ id: 'integrations-main', type: 'integrations', title: 'Integrationen', size: GLASS_SHEET_SIZE });
    }, [openPane]);

    const openFeedPane = useCallback(() => {
        openPane(feedsPaneRequest());
    }, [openPane]);

    const [universeMode, setUniverseMode] = useState<'map' | 'desktop'>('map');
    const [showSystemStatus, setShowSystemStatus] = useState(false);
    const [hoverPlanetId, setHoverPlanetId] = useState<string | null>(null);
    const [activePlanetId, setActivePlanetId] = useState<string | null>(null);
    const [semanticPreviewPathId, setSemanticPreviewPathId] = useState<string | null>(null);
    const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
    const [isCoreLogoHovered, setIsCoreLogoHovered] = useState(false);
    const [statsMap, setStatsMap] = useState<Record<string, DepartmentStats>>({});
    const [nightwatchIncidents, setNightwatchIncidents] = useState<NightwatchIncidentItem[]>([]);
    const [memberships, setMemberships] = useState<UserMembership[] | null>(null);
    const [membershipsLoaded, setMembershipsLoaded] = useState(false);
    const [lockedTooltipDeptId, setLockedTooltipDeptId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    // Planet being "flown into" — drives the cosmos zoom toward that planet
    // right before the department surface resolves. { x, y } in viewport %.
    const [flyToPlanet, setFlyToPlanet] = useState<{ id: string; x: number; y: number } | null>(null);
    const [universeFocusMode, setUniverseFocusMode] = useState<UniverseFocusMode>('explore');
    const prefersReducedMotion = useReducedMotion();
    const flyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const parallaxRafRef = useRef<number | null>(null);
    const parallaxPendingRef = useRef({ x: 0, y: 0 });
    const focusModeRef = useRef<UniverseFocusMode>('explore');

    const safeDepartments = useMemo(() => (Array.isArray(departmentsData) ? departmentsData : EMPTY_UNIVERSE_ITEMS), [departmentsData]);
    const safeTreeData = useMemo(() => (Array.isArray(treeDataRaw) ? treeDataRaw : EMPTY_UNIVERSE_ITEMS), [treeDataRaw]);
    const fabricSignals = useMemo<FabricSignal[]>(() => {
        const normalizedDepartments = safeDepartments.map((department) => ({
            id: department.id,
            name: String(department.name || '').trim(),
            needle: String(department.name || '').trim().toLocaleLowerCase('de-DE'),
        })).filter((department) => department.needle.length >= 3);
        const matchDepartment = (text: string) => {
            const haystack = text.toLocaleLowerCase('de-DE');
            return normalizedDepartments.find((department) => haystack.includes(department.needle))?.id || null;
        };
        const signals: FabricSignal[] = [];

        nightwatchIncidents.slice(0, 4).forEach((incident) => {
            const targetId = incident.department_id || incident.affected_department_id || matchDepartment(`${incident.title || ''} ${incident.summary || ''}`);
            if (!targetId || !normalizedDepartments.some((department) => department.id === targetId)) return;
            signals.push({ id: incident.id, title: incident.title || incident.host || 'Nightwatch', subtitle: `Nightwatch · ${incident.severity || 'Hinweis'}`, targetId, kind: 'nightwatch', severity: incident.severity });
        });
        feedPreview.slice(0, 4).forEach((item) => {
            const targetId = matchDepartment(`${item.title} ${item.summary || ''}`);
            if (!targetId) return;
            signals.push({ id: item.id, title: item.title, subtitle: `Feed · ${item.sourceTitle}`, targetId, kind: 'rss', href: item.link });
        });
        mailPreview.slice(0, 3).forEach((item) => {
            const targetId = matchDepartment(`${item.subject} ${item.snippet || ''}`);
            if (!targetId) return;
            signals.push({ id: item.id, title: item.subject, subtitle: `Mail · ${item.from}`, targetId, kind: 'mail' });
        });
        calendarPreview.slice(0, 3).forEach((item) => {
            const targetId = matchDepartment(`${item.title} ${item.location || ''}`);
            if (!targetId) return;
            signals.push({ id: item.id, title: item.title, subtitle: 'Kalender', targetId, kind: 'calendar' });
        });
        return signals;
    }, [calendarPreview, feedPreview, mailPreview, nightwatchIncidents, safeDepartments]);

    const departmentsRef = useRef(safeDepartments);
    departmentsRef.current = safeDepartments;

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults((previous) => previous.length === 0 ? previous : []);
            setIsSearching((previous) => previous ? false : previous);
            return;
        }

        setIsSearching((previous) => previous ? previous : true);
        const timer = setTimeout(async () => {
            try {
                const response = await searchGlobal(searchQuery, activeCompanyId || undefined);
                setSearchResults(response.results || []);
            } catch (err) {
                console.error('[UniverseView] search error:', err);
                const matches = departmentsRef.current.filter(d => 
                    d.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).map(d => ({
                    id: d.id,
                    title: d.name,
                    type: 'department',
                    departmentId: d.id
                }));
                setSearchResults(matches);
            } finally {
                setIsSearching((previous) => previous ? false : previous);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, activeCompanyId]);

    const matchedDepartmentIds = useMemo(() => {
        if (!searchQuery.trim()) return null;
        const ids = new Set<string>();
        searchResults.forEach(r => {
            if (r.departmentId) ids.add(r.departmentId);
            else if (r.department_id) ids.add(r.department_id);
            else if (r.type === 'department' && r.id) ids.add(r.id);
        });
        safeDepartments.forEach(d => {
            if (d.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                ids.add(d.id);
            }
        });
        return ids;
    }, [searchResults, searchQuery, safeDepartments]);

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
        const interval = window.setInterval(loadStats, 45_000);
        return () => window.clearInterval(interval);
    }, [activeCompanyId]);

    // ─── FETCH NIGHTWATCH INCIDENTS FOR PLANET HEALTH ───
    useEffect(() => {
        let cancelled = false;
        fetchNightwatchIncidents().then((incidents) => {
            if (!cancelled) setNightwatchIncidents(incidents);
        }).catch(() => {});
        return () => { cancelled = true; };
    }, []);

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
                    if (!isAdmin(user?.role) && response.department_memberships.length === 1) {
                        setUniverseScope('dept', response.department_memberships[0].department_id);
                    }
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
    }, [activeCompanyId, setPersonalSpaceId, setUniverseScope, user?.role]);

    // ─── MEMBERSHIP HELPERS ───
    const isMember = useCallback((deptId: string): boolean => {
        if (!membershipsLoaded) return true;
        if (isAdmin(user?.role) || !user) return true;
        if (memberships === null || memberships.length === 0) return true;
        return memberships.some((m) => m.department_id === deptId);
    }, [membershipsLoaded, memberships, user]);

    const shouldRender = useCallback((dept: any): boolean => {
        return true; // The Universe is the holistic organizational map: all company departments render
    }, []);

    const isLocked = useCallback((dept: any): boolean => {
        if (isAdmin(user?.role) || !user) return false;
        if (memberships && memberships.length > 0 && !memberships.some((m) => m.department_id === dept.id)) {
            return (dept.visibility ?? 'private') === 'visible';
        }
        return false;
    }, [memberships, user]);

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

    // ─── PLANET ALERT LEVELS (incident-driven; no LLM scoring) ───
    const deptAlertLevels = useMemo((): Record<string, 'ok' | 'warning' | 'critical'> => {
        if (!nightwatchIncidents.length) return {};
        const result: Record<string, 'ok' | 'warning' | 'critical'> = {};
        for (const dept of safeDepartments) {
            const hasIncident = nightwatchIncidents.some((inc) =>
                incidentBelongsToDepartment(inc, dept.id, safeTreeData)
            );
            if (hasIncident) result[dept.id] = 'critical';
        }
        return result;
    }, [nightwatchIncidents, safeDepartments, safeTreeData]);

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
            setHoverPlanetId(null);
            setSemanticPreviewPathId(null);
            setLockedTooltipDeptId(null);
            setActivePlanetId(null);
        }, coreMode === 'home' ? UNIVERSE_HOVER_RELEASE_HOME_MS : UNIVERSE_HOVER_RELEASE_MS);
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
        setLockedTooltipDeptId(null);
    }, [clearHoverRelease, clearUniverseInteractionState, coreMode]);

    const planetPositions = useMemo(() => {
        if (safeDepartments.length === 0) return [];
        const stableDepartments = [...safeDepartments].sort((a, b) => {
            const left = `${a.id || ''}:${a.name || ''}`;
            const right = `${b.id || ''}:${b.name || ''}`;
            return left.localeCompare(right);
        });
        const base = buildOrganicUniverseLayout(stableDepartments, departmentMetrics);
        return base;
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
                const route = buildSoftUniverseRoute(from, to, pathId, 3.3, 0.22, 5.5, 16.0);
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
                    d: route.d,
                    fromId: from.id,
                    fromName: from.name,
                    toId: to.id,
                    toName: to.name,
                    strength: edge.strength,
                    semanticAffinity: edge.semanticAffinity,
                    dominantDriver: edge.dominantDriver,
                    labelX: route.labelX,
                    labelY: route.labelY,
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
            const route = buildSoftUniverseRoute(UNIVERSE_CORE_POINT, planet, `core:${planet.id}`, 4.8, 0.18, 4.0, 12.0);
            return {
                id: planet.id,
                x: planet.x,
                y: planet.y,
                d: route.d,
                intensity: Math.max(0.16, Math.min(1, loadSignal / Math.max(1, maxNodes * 0.45 + 12))),
                highlighted:
                    hoverPlanetId === planet.id ||
                    semanticPreviewPlanetIds.has(planet.id) ||
                    (matchedDepartmentIds ? matchedDepartmentIds.has(planet.id) : false),
            };
        })
    ), [visiblePlanets, departmentMetrics, hoverPlanetId, maxNodes, semanticPreviewPlanetIds, matchedDepartmentIds]);

    const focusedPlanet = useMemo(() => {
        if (!focusedPlanetId) return null;
        return visiblePlanets.find((planet) => planet.id === focusedPlanetId) || null;
    }, [focusedPlanetId, visiblePlanets]);

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
    }, [activeDepartmentId]);

    const handlePlanetHover = useCallback((planetId: string, hovered: boolean) => {
        useNavStore.getState().setHoverDepartmentId(hovered ? planetId : null);
        if (hovered) {
            clearHoverRelease();
            setHoverPlanetId(planetId);
            setActivePlanetId(planetId);
            setSemanticPreviewPathId(null);
            setLockedTooltipDeptId(null);
            return;
        }

        setHoverPlanetId((current) => (current === planetId ? null : current));
        scheduleHoverRelease();
    }, [clearHoverRelease, scheduleHoverRelease]);

    // Cinematic drill-in: briefly zoom the cosmos toward the clicked planet, then
    // resolve the department surface (ViewPort continues the zoom from the same
    // origin). Reduced-motion users navigate instantly.
    const flyIntoDepartment = useCallback((deptId: string, x: number, y: number) => {
        if (flyToPlanet) return; // a flight is already in progress
        clearHoverRelease();
        setHoverPlanetId(null);
        setActivePlanetId(deptId);
        setSemanticPreviewPathId(null);
        setLockedTooltipDeptId(null);

        if (prefersReducedMotion) {
            navigateToDepartment(deptId, { x, y });
            return;
        }

        setFlyToPlanet({ id: deptId, x, y });
        flyTimerRef.current = setTimeout(() => {
            navigateToDepartment(deptId, { x, y });
        }, 260);
    }, [flyToPlanet, clearHoverRelease, prefersReducedMotion, navigateToDepartment]);

    useEffect(() => () => {
        if (flyTimerRef.current) clearTimeout(flyTimerRef.current);
        if (parallaxRafRef.current) cancelAnimationFrame(parallaxRafRef.current);
    }, []);

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
        parallaxPendingRef.current = {
            x: relativeX * 18,
            y: relativeY * 14,
        };

        if (!parallaxRafRef.current) {
            parallaxRafRef.current = requestAnimationFrame(() => {
                parallaxRafRef.current = null;
                setParallaxOffset(parallaxPendingRef.current);
            });
        }

        const normX = (event.clientX - rect.left) / rect.width;
        const normY = (event.clientY - rect.top) / rect.height;
        const zone = resolveUniverseInteractionZone(normX, normY);
        const nearPlanet = isNearAnyPlanet(normX, normY, visiblePlanets);
        const nextMode = resolveUniverseFocusMode({
            zone,
            nearPlanet,
            planetHovered: Boolean(hoverPlanetId),
            widgetHovered: false,
        });
        if (nextMode !== focusModeRef.current) {
            focusModeRef.current = nextMode;
            setUniverseFocusMode(nextMode);
        }
    }, [visiblePlanets, hoverPlanetId]);

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
            if (isDemo || tenantId === TENANT_DEMO) return '';
            if (tenantId === TENANT_HQ) return '';
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
    const bridgePulse = useBridgePulse(!isHomeUniversePreview);
    const nebulaPulseFactor = 0.82 + bridgePulse.ambientIntensity * 0.22;
    const centerSummary = useMemo(() => {
        const departmentCount = visiblePlanets.length;
        const areaCount = totalSpaceCount;
        return {
            departmentLabel: `${departmentCount} ${departmentCount === 1 ? 'Abteilung' : 'Abteilungen'}`,
            areaLabel: `${areaCount} ${areaCount === 1 ? 'Bereich' : 'Bereiche'}`,
        };
    }, [totalSpaceCount, visiblePlanets.length]);

    const accentStars = ACCENT_STARS;
    const heroStars = useMemo(
        () => Array.from({ length: 8 }, (_, index) => {
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

    const hasUniverseInteraction = Boolean(focusedPlanetId || semanticPreviewPathId || (matchedDepartmentIds && matchedDepartmentIds.size > 0));
    const backgroundCalmFactor = (hasUniverseInteraction ? 0.82 : 1) * nebulaPulseFactor;
    const widgetGlanceOpacity = coreMode === 'mindfield'
        ? 0
        : universeWidgetOpacity(universeFocusMode, hasUniverseInteraction);
    const activeCoreBeamPlanetIds = useMemo(() => {
        const ids = new Set<string>();
        if (focusedPlanetId) ids.add(focusedPlanetId);
        semanticPreviewPlanetIds.forEach((id) => ids.add(id));
        if (matchedDepartmentIds) {
            matchedDepartmentIds.forEach((id) => ids.add(id));
        }
        return ids;
    }, [focusedPlanetId, semanticPreviewPlanetIds, matchedDepartmentIds]);
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
        focusModeRef.current = 'explore';
        setUniverseFocusMode('explore');
        scheduleHoverRelease();
    }, [resetUniverseParallax, scheduleHoverRelease]);

    if (universeScope === 'dept' && universeScopeDeptId) {
        const scopedDept = safeDepartments.find((d) => d.id === universeScopeDeptId);
        return (
            <DeptSpaceMap
                departmentId={universeScopeDeptId}
                departmentName={scopedDept?.name}
            />
        );
    }

    return (
        <motion.div
            className="relative w-full h-full overflow-hidden text-white bg-transparent"
            onMouseMove={handleUniversePointerMove}
            onMouseLeave={handleUniversePointerLeave}
            style={{ transformOrigin: flyToPlanet ? `${flyToPlanet.x}% ${flyToPlanet.y}%` : '50% 50%' }}
            animate={flyToPlanet
                ? { scale: 1.7, opacity: 0.32, filter: 'blur(3px)' }
                : { scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
            {/* 0. UNIVERSE BACKDROP — scene-reactive dark base */}
            <AnimatePresence mode="sync">
                <motion.div
                    key={`base-${ritualScene.id}`}
                    className="absolute inset-0 z-[-10] pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4, ease: 'easeInOut' }}
                    style={{ background: UNIVERSE_BASE[ritualScene.id] }}
                />
            </AnimatePresence>
            {/* Scene-reactive nebula blobs */}
            <AnimatePresence mode="sync">
                <motion.div
                    key={`nebula-${ritualScene.id}`}
                    className="absolute inset-0 z-[-9] pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ x: parallaxOffset.x * 0.24, y: parallaxOffset.y * 0.18, opacity: 1 * backgroundCalmFactor }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4, ease: 'easeInOut', x: { type: 'spring', stiffness: 28, damping: 18 }, y: { type: 'spring', stiffness: 28, damping: 18 } }}
                    style={{ background: UNIVERSE_NEBULA[ritualScene.id], mixBlendMode: 'screen' }}
                />
            </AnimatePresence>
            <motion.div
                className="absolute inset-0 z-[-8] pointer-events-none"
                animate={{
                    x: parallaxOffset.x * 0.44,
                    y: parallaxOffset.y * 0.2,
                    rotate: -2.4,
                    opacity: 0.38 * backgroundCalmFactor,
                }}
                transition={{
                    type: 'spring',
                    stiffness: 22,
                    damping: 16,
                    mass: 1.05,
                    opacity: { duration: 0.45, ease: 'easeOut' },
                }}
                style={{
                    background: `linear-gradient(104deg, transparent 0%, ${ritualScene.accent.replace(/[\d.]+\)$/, '0.06)')} 16%, ${ritualScene.aura.replace(/[\d.]+\)$/, '0.10)')} 32%, ${ritualScene.accent.replace(/[\d.]+\)$/, '0.06)')} 48%, transparent 84%)`,
                    transform: 'scale(1.2)',
                    filter: 'blur(20px)',
                    mixBlendMode: 'screen',
                }}
            />
            <motion.div
                className="absolute inset-0 z-[-8] pointer-events-none"
                animate={{
                    x: parallaxOffset.x * 0.18,
                    y: parallaxOffset.y * 0.12,
                    rotate: 2.2,
                    opacity: 0.34 * backgroundCalmFactor,
                }}
                transition={{
                    type: 'spring',
                    stiffness: 18,
                    damping: 16,
                    mass: 1.2,
                    opacity: { duration: 0.45, ease: 'easeOut' },
                }}
                style={{
                    background: 'conic-gradient(from 218deg at 50% 50%, transparent 0deg, rgba(45,212,191,0.05) 58deg, rgba(59,130,246,0.06) 112deg, rgba(167,139,250,0.035) 168deg, transparent 250deg, rgba(250,204,21,0.022) 306deg, transparent 360deg)',
                    transform: 'scale(1.34)',
                    filter: 'blur(24px)',
                    mixBlendMode: 'screen',
                }}
            />
            <motion.div
                className="absolute inset-0 z-[-8] pointer-events-none"
                animate={{ opacity: 0.72 * backgroundCalmFactor }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
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
                }}
            />
            <div
                className="absolute inset-0 z-[-7] pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at 50% 44%, rgba(186,230,253,0.13) 0%, rgba(103,232,249,0.055) 28%, rgba(5,18,32,0.10) 62%, rgba(2,8,18,0.36) 100%)',
                }}
            />
            <motion.div
                className="absolute inset-0 z-[-6] pointer-events-none"
                animate={{
                    x: parallaxOffset.x * 0.9,
                    y: parallaxOffset.y * 0.54,
                    opacity: backgroundCalmFactor,
                }}
                transition={{
                    type: 'spring',
                    stiffness: 24,
                    damping: 18,
                    mass: 1.1,
                    opacity: { duration: 0.45, ease: 'easeOut' },
                }}
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
                            boxShadow: `0 0 ${Math.max(4, star.size * 6)}px ${star.color}`,
                            opacity: star.opacity,
                        }}
                    />
                ))}
            </motion.div>
            <motion.div
                className="absolute inset-0 z-[-5] pointer-events-none"
                animate={{
                    x: parallaxOffset.x * 0.72,
                    y: parallaxOffset.y * 0.44,
                    opacity: backgroundCalmFactor,
                }}
                transition={{
                    type: 'spring',
                    stiffness: 20,
                    damping: 16,
                    mass: 1.08,
                    opacity: { duration: 0.45, ease: 'easeOut' },
                }}
            >
                {heroStars.map((star) => (
                    <div
                        key={star.id}
                        className="absolute rounded-full animate-pulse"
                        style={{
                            left: `${star.left}%`,
                            top: `${star.top}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            background: star.color,
                            boxShadow: `0 0 ${star.size * 12}px ${star.color}`,
                            animationDuration: `${star.duration}s`,
                            animationDelay: `${star.delay}s`,
                        }}
                    />
                ))}
            </motion.div>

            <div className="absolute left-1/2 top-[74px] z-[46] -translate-x-1/2 rounded-full border border-sky-100/10 bg-slate-950/28 p-1 shadow-[0_16px_50px_rgba(0,8,20,0.22)] backdrop-blur-xl">
                <button type="button" onClick={() => setCoreMode('explore')} className={`rounded-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] transition-all ${coreMode === 'explore' ? 'bg-sky-100/12 text-sky-50' : 'text-sky-100/42 hover:text-sky-50/80'}`}>
                    Organisation
                </button>
                <button type="button" onClick={() => setCoreMode('mindfield')} className={`rounded-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] transition-all ${coreMode === 'mindfield' ? 'bg-violet-300/14 text-violet-50' : 'text-sky-100/42 hover:text-sky-50/80'}`}>
                    Zusammenhänge
                </button>
            </div>
            <AnimatePresence>
                {coreMode === 'mindfield' && (
                    <motion.section
                        key="universe-relations"
                        data-testid="universe-relations-layer"
                        className="absolute inset-0 z-[28] pointer-events-auto"
                        initial={{ opacity: 0, scale: 1.025 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.985 }}
                        transition={{ duration: 0.5, ease: [0.22, 0.9, 0.18, 1] }}
                    >
                        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 48%, rgba(18,52,78,0.64) 0%, rgba(8,28,48,0.82) 46%, rgba(4,15,29,0.92) 100%)', backdropFilter: 'blur(2px)' }} />
                        <div className="pointer-events-none absolute left-1/2 top-24 z-40 -translate-x-1/2 text-center">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.32em] text-cyan-100/55">Zusammenhänge</p>
                            <p className="mt-1 text-[12px] text-sky-50/52">Das lebende Wissen deiner Organisation</p>
                        </div>
                        <SpatialMindfield embedded signals={fabricSignals} />
                    </motion.section>
                )}
            </AnimatePresence>
            {/* UNIVERSE DESKTOP — peripheral glance panels that visualize company state.
                Planets stay above (z-12) and remain clickable; widgets recede when exploring. */}
            <motion.div
                className="absolute inset-0 z-[10] pointer-events-none overflow-y-auto px-3 pt-3 pb-28"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.2) transparent' }}
                animate={{
                    opacity: widgetGlanceOpacity,
                }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
            >
                <div className="pointer-events-none">
                    <WidgetGrid
                        surface="universe"
                        focusMode={universeFocusMode}
                        context={{
                            surface: 'universe',
                            data: {
                                mailPreview,
                                calendarPreview,
                                feedPreview,
                                mailState: integrationStates.mail,
                                calendarState: integrationStates.calendar,
                                cloudState: integrationStates.cloud,
                                rssState: integrationStates.rss,
                            },
                            openMail: openMailPane,
                            openCalendar: openCalendarPane,
                            openIntegrations: openIntegrationsPane,
                            openFeed: openFeedPane,
                            openMora: () => setOrbState('curious'),
                            openFinder: () => openPane({ id: 'finder-universe', type: 'finder', title: 'Finder', size: GLASS_SHEET_SIZE }),
                            openTeam: () => openPane({ id: 'team-main', type: 'team', title: 'Team', size: GLASS_SHEET_SIZE }),
                            openApps: () => openPane({ id: 'apps-main', type: 'apps', title: 'Apps', size: { width: 900, height: 680 } }),
                            openNightwatch: () => openPane({ id: 'nightwatch-main', type: 'nightwatch', title: 'Nightwatch', size: GLASS_SHEET_SIZE }),
                            openDashboard: () => window.open(bridgePulse.dashboardUrl, '_blank', 'noopener,noreferrer'),
                            openLarryNode: (nodeId, title) => openPane({
                                id: `document-${nodeId}`,
                                type: 'document',
                                title: title || 'Workspace',
                                size: GLASS_SHEET_SIZE,
                                data: { nodeId },
                            }),
                            goExplore: () => navigateToCore(),
                        }}
                    />
                </div>
            </motion.div>

            {/* MAP CONTENT — planets and semantic connections, always visible behind widgets */}
            <div>

            {/* 2. CENTER HUB (The Core) — sits on the true orbit centre (50,50) so
                 planets and semantic lines align with the logo; no -translate-y. */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
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
                        {/* Glow Behind Logo — liquid glass / hologram ripples */}
                        <div className="absolute inset-0 rounded-full scale-[2.4] pointer-events-none" style={{
                            background: 'radial-gradient(circle, rgba(6,182,212,0.20) 0%, rgba(139,92,246,0.12) 50%, transparent 75%)',
                            filter: 'blur(24px)',
                            transition: 'all 0.7s ease',
                        }} />
                        <div className="absolute inset-0 rounded-full scale-[3.8] pointer-events-none group-hover:scale-[4.5] transition-all duration-1000" style={{
                            background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)',
                            filter: 'blur(36px)',
                        }} />

                        {/* Scanning / Hologram Rings */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="absolute rounded-full border border-cyan-500/20"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                    }}
                                    animate={{
                                        scale: [1, 2.2 + i * 0.6],
                                        opacity: [0.4, 0],
                                    }}
                                    transition={{
                                        duration: 4.5,
                                        repeat: Infinity,
                                        delay: i * 1.5,
                                        ease: 'easeOut',
                                    }}
                                />
                            ))}
                        </div>

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
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[8]" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
                <defs>
                    {/* Deep-space diffuse glow — wider spread, fainter */}
                    <filter id="silkGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="0.55" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    {/* Tight accent glow for focused/active lines */}
                    <filter id="accentGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="0.28" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="coreBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(125,211,252,0)" />
                        <stop offset="30%" stopColor="rgba(125,211,252,0.32)" />
                        <stop offset="56%" stopColor="rgba(196,181,253,0.24)" />
                        <stop offset="100%" stopColor="rgba(125,211,252,0)" />
                    </linearGradient>
                    <filter id="beamGlow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="0.75" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Always visible living energy beams connecting Saimôr Core to every planet */}
                {coreConnections.map((connection) => {
                    const isBeamActive = activeCoreBeamPlanetIds.has(connection.id);
                    const planetColors: Record<string, { stroke: string; glow: string }> = {
                        intelligence: { stroke: 'rgba(6, 182, 212, 0.85)', glow: 'rgba(6, 182, 212, 0.25)' },
                        product:      { stroke: 'rgba(168, 85, 247, 0.85)', glow: 'rgba(168, 85, 247, 0.25)' },
                        rd:           { stroke: 'rgba(59, 130, 246, 0.85)', glow: 'rgba(59, 130, 246, 0.25)' },
                        growth:       { stroke: 'rgba(234, 179, 8, 0.85)', glow: 'rgba(234, 179, 8, 0.25)' },
                    };
                    const colorMeta = planetColors[connection.id] || { stroke: 'rgba(16, 185, 129, 0.85)', glow: 'rgba(16, 185, 129, 0.25)' };

                    return (
                        <g key={`core-${connection.id}`}>
                            {/* Soft diffuse ambient glow */}
                            <motion.path
                                d={connection.d}
                                fill="none"
                                stroke={colorMeta.glow}
                                strokeWidth={0.28}
                                strokeLinecap="round"
                                filter="url(#beamGlow)"
                                animate={{
                                    opacity: isBeamActive ? 0.65 : 0.35,
                                }}
                                transition={{ duration: 0.5 }}
                            />

                            {/* Ultra-fine silken laser conductor line */}
                            <motion.path
                                d={connection.d}
                                fill="none"
                                stroke={colorMeta.stroke}
                                strokeWidth={isBeamActive ? 0.16 : 0.10}
                                strokeLinecap="round"
                                animate={{
                                    opacity: isBeamActive ? 0.95 : 0.65,
                                }}
                                transition={{ duration: 0.4 }}
                            />

                            {/* Flowing laser energy pulse */}
                            <motion.path
                                d={connection.d}
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth={0.12}
                                strokeDasharray="2 10"
                                strokeLinecap="round"
                                animate={{
                                    strokeDashoffset: [0, -24],
                                    opacity: isBeamActive ? 0.9 : 0.6,
                                }}
                                transition={{
                                    strokeDashoffset: { duration: 2.8, repeat: Infinity, ease: "linear" },
                                    opacity: { duration: 0.4 },
                                }}
                            />
                        </g>
                    );
                })}

                {/* Real Data-Driven Semantic Paths (Dynamic relation strength between departments) */}
                {visibleSemanticPaths.map((path) => {
                    const driverMeta = SEMANTIC_DRIVER_META[path.dominantDriver];
                    const isFocusedPath = focusedSemanticPathIds.has(path.id);
                    const isPreviewedPath = semanticPreviewPathId === path.id;
                    const isActive = path.highlighted || isFocusedPath || isPreviewedPath;
                    const baseOpacity = isHomeUniversePreview
                        ? (isActive ? 0.85 : 0.25)
                        : (isActive ? 0.95 : (0.25 + path.strength * 0.45));

                    return (
                        <g key={path.id}>
                            {/* Fine silken semantic connection line */}
                            <motion.path
                                d={path.d}
                                fill="none"
                                stroke={driverMeta.accent}
                                strokeWidth={isActive ? 0.16 : (0.08 + path.strength * 0.06)}
                                strokeDasharray={driverMeta.dashArray}
                                strokeLinecap="round"
                                animate={{
                                    opacity: baseOpacity * (isActive ? 1.0 : 0.70),
                                }}
                                transition={{ duration: 0.4 }}
                            />
                            {/* Action-potential light pulse traveling along real data link */}
                            <motion.path
                                d={path.d}
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth={0.10}
                                strokeDasharray="2 10"
                                strokeLinecap="round"
                                animate={{
                                    strokeDashoffset: [0, -24],
                                    opacity: isActive ? 0.95 : 0.50,
                                }}
                                transition={{
                                    strokeDashoffset: { repeat: Infinity, duration: Math.max(1.8, 3.2 / (path.strength || 1)), ease: "linear" },
                                    opacity: { duration: 0.4 },
                                }}
                            />
                        </g>
                    );
                })}
            </svg>

            <div className="pointer-events-none absolute inset-0 z-[9]">
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
                                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-white/8 bg-black/38 px-2.5 py-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.22)] backdrop-blur-md"
                                style={{
                                    left: `${path.labelX}%`,
                                    top: `${path.labelY}%`,
                                    boxShadow: `0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px ${driverMeta.accent}22`,
                                }}
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: path.highlighted || focusedSemanticPathIds.has(path.id) || isPreviewedPath ? 0.82 : 0.62, scale: 1 }}
                                transition={{ duration: 0.42, ease: 'easeOut' }}
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

            {/* 3. PLANET LAYER (Managed by Store Data) */}
            {/*
             * IMPORTANT: Use React.Fragment (not a div) as the per-planet key wrapper.
             * A div with position:relative would collapse to height:0 because Planet
             * renders position:absolute (out of flow), making top:X% resolve to 0px.
             * Fragment creates no DOM box — absolute planets resolve against the
             * absolute inset-0 container which correctly fills the full viewport.
            */}
            <div className="absolute inset-0 z-[12] pointer-events-none">
                {visiblePlanets
                    .map((p, planetIndex) => {
                    // REAL METRICS from API or tree data
                    const deptStats = departmentMetrics[p.id];
                    const nodeCount = deptStats?.nodes || 0;
                    const spaceCount = deptStats?.spaces || 0;
                    const folderCount = deptStats?.folders || 0;
                    const healthFromAPI = deptStats?.health;

                    // Find department children/spaces from treeData
                    const deptTreeNode = safeTreeData.find((d: any) => d.id === p.id);
                    const spacesList = deptTreeNode?.children?.filter((c: any) => c.type === 'space') || [];

                    // Capacity: % of nodes relative to largest department
                    const capacity = nodeCount > 0 && maxNodes > 0
                        ? Math.round((nodeCount / maxNodes) * 100)
                        : null;
                    // Activity: Document count (shown as "X Docs" in hover)
                    const activity = nodeCount;
                    // Health: From API if available, otherwise calculate
                    const health = healthFromAPI ?? Math.min(100, (spaceCount > 0 ? 40 : 0) + (folderCount > 0 ? 30 : 0) + (nodeCount > 0 ? 30 : 0));

                    const locked = isLocked(p);
                    const isMatched = matchedDepartmentIds ? matchedDepartmentIds.has(p.id) : false;
                    const isSemanticPreviewPlanet = semanticPreviewPlanetIds.has(p.id);
                    const isFocusedPlanet = focusedPlanetId === p.id;
                    const isDimmed = (matchedDepartmentIds && !isMatched) || (hasUniverseInteraction && focusedPlanetId && !isFocusedPlanet && !isSemanticPreviewPlanet);
                    const planetSize = isHomeUniversePreview ? 'sm' : 'lg';

                    return (
                        <React.Fragment key={p.id}>
                            <Planet
                                department={p as any}
                                spaces={spacesList}
                                position={{ x: p.x, y: p.y }}
                                stackOrder={planetIndex}
                                isActive={focusedPlanetId === p.id || isSemanticPreviewPlanet || isMatched}
                                size={planetSize}
                                showLabel={!isHomeUniversePreview}
                                ambientLabel={true}
                                labelSide={p.x >= 50 ? 'left' : 'right'}
                                onHover={isHomeUniversePreview ? undefined : (hovered) => handlePlanetHover(p.id, hovered)}
                                onClick={() => {
                                    if (isHomeUniversePreview) {
                                        clearUniverseInteractionState();
                                        clearHoverRelease();
                                        setCoreMode('explore');
                                        return;
                                    }
                                    if (locked) {
                                        clearUniverseInteractionState();
                                        clearHoverRelease();
                                        setLockedTooltipDeptId(p.id);
                                        return;
                                    }
                                    flyIntoDepartment(p.id, p.x, p.y);
                                }}
                                health={health}
                                activity={activity}
                                capacity={capacity}
                                alertLevel={deptAlertLevels[p.id] ?? 'ok'}
                            />
                            {lockedTooltipDeptId === p.id && (
                                <div
                                    className="absolute z-50 pointer-events-auto"
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
                                    value={`${safeDepartments.length}`}
                                    status="optimal"
                                    progress={Math.min(safeDepartments.length * 10, 100)}
                                />
                                <InsightCard
                                    icon={<ShieldCheck className="w-4 h-4" />}
                                    label="Kontext"
                                    value={websiteEntryContext ? 'Dossier' : currentCompany?.is_demo ? 'Beispielsystem' : 'Geschützt'}
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

            {/* Top-Center Search Input */}
            {!isHomeUniversePreview && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[45] pointer-events-auto w-[360px] md:w-[480px]">
                    <div className="relative flex items-center rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all hover:border-cyan-400/30 focus-within:border-cyan-400/50">
                        <Search className="absolute left-4 w-4 h-4 text-white/35" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Suche in Saimor..."
                            className="w-full pl-12 pr-10 py-3 bg-transparent text-sm text-white placeholder-white/30 border-0 outline-none rounded-2xl focus:ring-0 focus:outline-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 text-white/35 hover:text-white/80 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Search Results Panel (Left Side) */}
            <AnimatePresence>
                {!isHomeUniversePreview && searchQuery.trim() && (
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        className="absolute top-24 left-6 z-[45] pointer-events-auto w-[320px] max-h-[calc(100vh-220px)] overflow-hidden flex flex-col rounded-[24px] border border-white/[0.08] bg-[#0B0F10]/75 backdrop-blur-[24px] shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-black/20">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                                    Ergebnisse
                                </span>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">
                                {isSearching ? 'Suche...' : `${searchResults.length} Treffer`}
                            </span>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 scrollbar-thin">
                            {isSearching ? (
                                <div className="text-center py-10 text-xs text-white/40 flex flex-col items-center gap-3">
                                    <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                    <span>Suche in Mora...</span>
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="text-center py-10 text-xs text-white/45 flex flex-col items-center gap-2">
                                    <Search className="w-8 h-8 text-white/20 mb-1" />
                                    <span>Keine Treffer für &quot;{searchQuery}&quot;</span>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {searchResults.map((result) => {
                                        const typeLabel = result.type === 'department' ? 'Abteilung' 
                                            : result.type === 'space' ? 'Bereich' 
                                            : result.type === 'folder' ? 'Ordner' 
                                            : 'Dokument';
                                        const pathText = result.subtitle || result.path || typeLabel;

                                        return (
                                            <button
                                                key={`${result.type}-${result.id}`}
                                                onClick={() => {
                                                    if (result.type === 'department') {
                                                        navigateToDepartment(result.id);
                                                        setSearchQuery('');
                                                    } else {
                                                        openSearchResult(result, openPane, { companyId: activeCompanyId || result.companyId || undefined });
                                                        setSearchQuery('');
                                                    }
                                                }}
                                                className="w-full text-left p-2.5 rounded-xl border border-transparent hover:border-white/[0.06] hover:bg-white/[0.03] transition-all flex items-start gap-3 group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center text-white/60 group-hover:text-cyan-300 group-hover:border-cyan-500/20 shrink-0 transition-colors">
                                                    {result.type === 'department' ? <Cpu size={14} /> 
                                                        : result.type === 'space' ? <Folder size={14} className="text-cyan-400" />
                                                        : result.type === 'folder' ? <Folder size={14} className="text-amber-400" />
                                                        : <Database size={14} className="text-emerald-400" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[11px] font-semibold text-white/80 group-hover:text-white truncate">
                                                        {result.title}
                                                    </div>
                                                    <div className="text-[8px] uppercase tracking-wider text-white/30 group-hover:text-white/45 truncate mt-0.5">
                                                        {pathText}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>{/* end MAP CONTENT */}
        </motion.div>
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
