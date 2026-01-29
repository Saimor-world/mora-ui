"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Planet } from '@/components/mora/Planet';
import { Star } from '@/components/mora/Star';
import { NodeStar } from '@/components/mora/NodeStar';
import { Folder } from '@/components/mora/Folder';
import { UniverseControls } from '@/components/home/UniverseControls';

import { useMoraStore } from '@/lib/store/moraState';
import { fetchAwarenessPulse, type OrbState } from '@/lib/api/awarenessClient';
import { useUser } from '@/lib/hooks/useUser';
import { X, Activity, TrendingUp, Zap, Sparkles, Clock, Users, PlusCircle, Trash2, RefreshCw, Minimize2, Briefcase, Building2, BarChart3, Compass, Cpu, Database, Factory, Flame, FlaskConical, Gem, Globe2, HeartPulse, Home, Lightbulb, Megaphone, Palette, Shield, ShoppingBag, Target, Wrench } from 'lucide-react';
import { toast } from '@/lib/toast';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { TENANT_HQ, isDemoTenant } from '@/lib/constants/tenants';
import type { CoreNode, CoreFolder } from '@/lib/types/core';

import { useOrbitalPhysics } from '@/lib/hooks/useOrbitalPhysics';
import { useSemanticConstellation } from '@/lib/hooks/useSemanticConstellation'; // UPGRADE E2
import { SemanticLinesRenderer } from '@/components/semantic/SemanticLinesRenderer'; // UPGRADE E2
import { useIntelligenceStore } from '@/lib/store/intelligenceStore'; // UPGRADE P4
import { useIntelligencePulse } from '@/lib/hooks/useIntelligencePulse'; // UPGRADE B3
import { usePaneStore } from '@/lib/store/paneStore'; // Window Management
import { useAccentColor } from '@/lib/hooks/useAccentColor'; // Global accent color
import { DepartmentWizard } from '@/components/wizards/DepartmentWizard'; // Department creation wizard
import { BootSequence } from '@/components/ui/BootSequence'; // OS-style boot sequence

/**
 * UNIVERSE VIEW (The Core Interface)
 * 
 * DESIGN PHILOSOPHY:
 * The Universe View is the primary spatial interface of SAIMÔR.
 * It maps hierarchical data to orbital mechanics:
 * 
 * 1. SUN (Center)      = Active Company / Context
 * 2. PLANETS (Orbit 1) = Departments (Abteilungen) - e.g. "Finance", "HR"
 * 3. MOONS (Orbit 2)   = Spaces (Teams/Projects) - Orbiting their parent Department
 * 4. STARS (Orbit 3)   = Folders - Orbiting their parent Space
 * 5. NODES (Free)      = Files/Knowledge - Floating freely or clustered by semantic relevance
 * 
 * DATA FLOW:
 * - Data is fetched via `useMoraStore` (merged treeData + flat lists).
 * - "Visible Planets" are derived from this data.
 * - If data exists, the Universe is "Alive". If empty, it shows "Universe Silent".
 * 
 * VISUALS:
 * - Uses SVG for orbital lines (Connections).
 * - Uses DOM/Motion for interactive elements (Planets/Moons).
 * - Background is a deep radial gradient to simulated deep space depth.
 */
// ⚡ MAX DEPARTMENTS LIMIT - Set to 25 for UI/rendering (User Request: cap=25, no data loss)
const MAX_DEPARTMENTS = 25;

// Helper for deterministic random numbers
function seededRandom(seed: number) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

const PROMOTED_MOONS_PER_PLANET = 2;
const PROMOTED_STARS_PER_MOON = 2;
const PROMOTED_NODES_PER_FOLDER = 2;
const ORBIT_STEPS = [0, Math.PI * 2 / 3, Math.PI * 4 / 3, Math.PI * 2];

const KEYWORD_WEIGHTS: Array<{ pattern: RegExp; weight: number }> = [
    { pattern: /(marketing|brand|growth|campaign|ads|social|local)/i, weight: 2.2 },
    { pattern: /(sales|crm|pipeline|lead|partner)/i, weight: 1.8 },
    { pattern: /(product|research|design|ux|ui)/i, weight: 1.4 },
    { pattern: /(engineering|dev|platform|data|analytics)/i, weight: 1.2 },
    { pattern: /(ops|operations|legal|finance|hr|people)/i, weight: 1.1 },
];

const scoreText = (text?: string) => {
    if (!text) return 0;
    return KEYWORD_WEIGHTS.reduce((total, entry) => (
        entry.pattern.test(text) ? total + entry.weight : total
    ), 0);
};

const isImportantNode = (node: CoreNode) => {
    const tags: string[] = (node.metadata?.tags as string[]) || [];
    return (
        node.metadata?.is_pinned === true ||
        node.metadata?.is_important === true ||
        tags.some((tag: string) => ['important', 'urgent', 'priority'].includes(tag.toLowerCase()))
    );
};

const getNodeTags = (node: CoreNode) => {
    const tags: string[] = (node.metadata?.tags as string[]) || [];
    return tags.map(tag => tag.toLowerCase());
};

const getNodeKeywords = (node: CoreNode) => {
    const text = `${node.title || ''} ${node.name || ''}`.toLowerCase();
    return text
        .split(/[^a-z0-9]+/i)
        .filter(token => token.length > 3);
};

const scoreNodeSimilarity = (a: CoreNode, b: CoreNode) => {
    const tagsA = getNodeTags(a);
    const tagsB = getNodeTags(b);
    const sharedTags = tagsA.filter(tag => tagsB.includes(tag)).length;

    const keywordsA = getNodeKeywords(a);
    const keywordsB = getNodeKeywords(b);
    const sharedKeywords = keywordsA.filter(word => keywordsB.includes(word)).length;

    let score = 0;
    score += Math.min(0.6, sharedTags * 0.25);
    score += Math.min(0.2, sharedKeywords * 0.05);
    if (a.type === b.type) score += 0.15;
    if (isImportantNode(a) && isImportantNode(b)) score += 0.1;
    return Math.min(1, score);
};

export const UniverseView: React.FC = () => {
    const {
        viewMode,
        setViewMode,
        viewLevel,
        departments,
        loadDepartments,
        navigateToDepartment,
        activeDepartmentId,
        activeCompanyId,
        setActiveDepartment,
        spacesByDepartment,
        loadSpacesForDepartment,
        navigateToSpace,
        setActiveSpace,
        foldersBySpace,
        loadFoldersForSpace,
        navigateToFolder,
        navigateToCore,
        activeSpaceId,
        activeFolderId,
        nodesByCompany,
        loadNodesForCompany,
        loadNodeDetails,
        orbState: storeOrbState,
        setOrbState,
        orbNotifications,
        companies,
        loadCompanies,
        setActiveCompany,
        isLoadingDepartments,
        isLoadingCompanies,
        hasBooted,
        setHasBooted,
        // DATA CONSISTENCY FIX: Also load tree for Finder consistency
        loadTree
    } = useMoraStore();

    const { openPane } = usePaneStore();

    const { role, user, tenantId } = useUser();
    const isDemoResult = isDemoTenant(tenantId);
    const visibleModes = useMemo(() => (
        role === 'system_owner'
            ? ['owner', 'workspace', 'demo']
            : (isDemoResult ? ['owner', 'workspace', 'demo'] : ['workspace'])
    ), [role, isDemoResult]);


    const contextCompanies = useMemo(() => {
        if (role === 'system_owner') {
            if (viewMode === 'demo') {
                return companies.filter(c => c.is_demo);
            }
            if (viewMode === 'workspace') {
                return companies.filter(c => c.tenant_id === TENANT_HQ);
            }
            return companies;
        }
        if (isDemoResult) {
            if (viewMode === 'demo') {
                return companies.filter(c => c.is_demo);
            }
            if (viewMode === 'workspace') {
                return companies.filter(c => c.tenant_id === TENANT_HQ);
            }
        }
        return companies;
    }, [role, viewMode, isDemoResult, companies]);
    const { accentColor } = useAccentColor(); // Global accent color
    const { center, isReady } = useOrbitalPhysics(); // PHASE 1 FIX
    const [apiOrbState, setApiOrbState] = useState<OrbState>('idle');
    const [planetOrbitActive, setPlanetOrbitActive] = useState(false);
    const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
    const [heldPlanetId, setHeldPlanetId] = useState<string | null>(null);
    const [orbitShiftActive, setOrbitShiftActive] = useState(false); // UPGRADE B1: Orbit shift animations
    const [cosmicMode, setCosmicMode] = useState(true); // UPGRADE F1: Cosmic passive mode
    const [lastCompanyName, setLastCompanyName] = useState<string | null>(null);

    // Semantic Constellation Hook (Light Connections)
    const { connections, fetchConstellation, clearConstellation } = useSemanticConstellation();

    const [isMounted, setIsMounted] = useState(false); // Fix hydration mismatch

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [cosmicParticles, setCosmicParticles] = useState<Array<{
        id: number;
        cx: string;
        cy: string;
        r: number;
        animate: any;
        transition: any;
    }>>([]);

    // Wizard state for department creation
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    const handleCreateDepartment = () => {
        // Open the wizard instead of simple prompt
        setIsWizardOpen(true);
    };

    const handleWizardClose = () => {
        setIsWizardOpen(false);
        // Reload departments after wizard closes
        loadDepartments(activeCompanyId || undefined);
    };

    const handleDeleteDepartment = async () => {
        if (!activeDepartmentId) {
            toast.error("Kein Planet ausgewählt");
            return;
        }
        if (!window.confirm("Diesen Planeten wirklich löschen?")) return;
        try {
            const { deleteDepartment } = useMoraStore.getState();
            await deleteDepartment(activeDepartmentId);
            await loadDepartments(activeCompanyId || undefined);
            toast.success("Planet gelöscht");
        } catch (e: any) {
            toast.error(e?.message || "Delete failed");
        }
    };

    const handleReloadDepartments = async () => {
        try {
            await loadDepartments(activeCompanyId || undefined);
            toast.success("Planeten neu geladen");
        } catch (e: any) {
            toast.error(e?.message || "Reload failed");
        }
    };

    // Generate cosmic particles client-side only
    useEffect(() => {
        if (cosmicMode) {
            const particles = Array.from({ length: 12 }).map((_, i) => ({
                id: i,
                cx: `${20 + Math.sin(i * 1.3) * 60}%`,
                cy: `${30 + Math.cos(i * 1.7) * 40}%`,
                r: Math.random() * 1.5 + 0.5,
                animate: {
                    cx: [
                        `${20 + Math.sin(i * 1.3) * 60}%`,
                        `${20 + Math.sin(i * 1.3 + Math.PI) * 60}%`,
                        `${20 + Math.sin(i * 1.3) * 60}%`
                    ],
                    cy: [
                        `${30 + Math.cos(i * 1.7) * 40}%`,
                        `${30 + Math.cos(i * 1.7 + Math.PI) * 40}%`,
                        `${30 + Math.cos(i * 1.7) * 40}%`
                    ],
                    opacity: [0.1, 0.4, 0.1]
                },
                transition: {
                    duration: 15 + i * 2,
                    repeat: Infinity,
                    delay: i * 0.8,
                    ease: "easeInOut"
                }
            }));
            setCosmicParticles(particles);
        }
    }, [cosmicMode]);

    // AI Cursor Agent is now global in MoraShell
    const { cursorAgent, setCursorAgent } = useMoraStore();

    // ACTIVATE CURSOR AGENT: Always active in Universe Mode (roaming)
    useEffect(() => {
        if (viewMode !== 'owner') {
            // Slight delay to let things load
            const timer = setTimeout(() => {
                setCursorAgent({ active: true, action: 'roam' });
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [viewMode]);

    // 🔥 FIX: Track which departments have been loaded to prevent duplicate calls
    const loadedDeptIds = useRef<Set<string>>(new Set());
    const isLoadingSpacesRef = useRef<boolean>(false);
    const prevViewModeRef = useRef<string | null>(null);

    // 🌌 UNIVERSE INITIALIZATION PER COMPANY/USER - Tesla-Style Consistency
    // Orbital-Konfiguration basierend auf companyId + userId für konsistente Universen
    const universeSeed = useMemo(() => {
        const userId = user?.email || 'anonymous';
        return `${activeCompanyId}-${userId}`;
    }, [activeCompanyId, user?.email]);

    const isLoading = isLoadingDepartments || isLoadingCompanies;

    const activeSpaceDepartmentId = useMemo(() => {
        if (!activeSpaceId) return null;
        for (const [deptId, spaces] of Object.entries(spacesByDepartment || {})) {
            if (spaces?.some(space => space.id === activeSpaceId)) {
                return deptId;
            }
        }
        return null;
    }, [activeSpaceId, spacesByDepartment]);

    const spaceDepartmentMap = useMemo(() => {
        const map = new Map<string, string>();
        Object.entries(spacesByDepartment || {}).forEach(([deptId, spaces]) => {
            spaces?.forEach(space => map.set(space.id, deptId));
        });
        return map;
    }, [spacesByDepartment]);

    const activeFolderSpaceId = useMemo(() => {
        if (!activeFolderId) return null;
        for (const [spaceId, folders] of Object.entries(foldersBySpace || {})) {
            if (folders?.some(folder => folder.id === activeFolderId)) {
                return spaceId;
            }
        }
        return null;
    }, [activeFolderId, foldersBySpace]);

    const activeFolderDepartmentId = useMemo(() => {
        if (!activeFolderSpaceId) return null;
        for (const [deptId, spaces] of Object.entries(spacesByDepartment || {})) {
            if (spaces?.some(space => space.id === activeFolderSpaceId)) {
                return deptId;
            }
        }
        return null;
    }, [activeFolderSpaceId, spacesByDepartment]);

    const focusPlanetId = useMemo(() => {
        if (viewMode === 'owner') return null;
        if (hoveredPlanet) return hoveredPlanet;
        if (heldPlanetId) return heldPlanetId;
        if (viewLevel !== 'core') {
            return activeDepartmentId || activeSpaceDepartmentId || activeFolderDepartmentId || null;
        }
        return null;
    }, [viewMode, hoveredPlanet, heldPlanetId, viewLevel, activeDepartmentId, activeSpaceDepartmentId, activeFolderDepartmentId]);

    const focusSpaceId = useMemo(() => {
        if (viewMode === 'owner') return null;
        return activeSpaceId || activeFolderSpaceId || null;
    }, [viewMode, activeSpaceId, activeFolderSpaceId]);

    const focusFolderId = useMemo(() => {
        if (viewMode === 'owner') return null;
        return activeFolderId || null;
    }, [viewMode, activeFolderId]);

    const HOLD_MS = 20000;
    const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const clearPlanetHold = useCallback(() => {
        if (holdTimeoutRef.current) {
            clearTimeout(holdTimeoutRef.current);
            holdTimeoutRef.current = null;
        }
    }, []);

    const schedulePlanetHold = useCallback((deptId: string) => {
        clearPlanetHold();
        setHeldPlanetId(deptId);
        holdTimeoutRef.current = setTimeout(() => {
            setHeldPlanetId(prev => (prev === deptId ? null : prev));
        }, HOLD_MS);
    }, [clearPlanetHold]);

    useEffect(() => {
        return () => clearPlanetHold();
    }, [clearPlanetHold]);

    useEffect(() => {
        // Reset hold when switching company/view
        clearPlanetHold();
        setHeldPlanetId(null);
    }, [activeCompanyId, viewMode, clearPlanetHold]);

    const hoverOrbitActive = Boolean(hoveredPlanet || heldPlanetId);
    const orbitActive = planetOrbitActive || hoverOrbitActive;
    const getOrbitOffsets = useCallback((originX: number, originY: number, targetX: number, targetY: number) => {
        const baseVecX = targetX - originX;
        const baseVecY = targetY - originY;
        const orbitRadius = Math.sqrt(baseVecX * baseVecX + baseVecY * baseVecY);
        const baseAngle = Math.atan2(baseVecY, baseVecX);

        return ORBIT_STEPS.map(step => {
            const angle = baseAngle + step;
            const rx = Math.cos(angle) * orbitRadius;
            const ry = Math.sin(angle) * orbitRadius;
            return { x: rx - baseVecX, y: ry - baseVecY };
        });
    }, []);

    // 🔥 FIX: Debounced space loading - only on hover
    const handlePlanetHover = useCallback((deptId: string, hovered: boolean) => {
        setHoveredPlanet(hovered ? deptId : null);
        schedulePlanetHold(deptId);
        setPlanetOrbitActive(hovered);

        // LAZY LOAD: Only load spaces when hovering over a planet
        if (hovered && !spacesByDepartment[deptId] && !loadedDeptIds.current.has(deptId) && !isLoadingSpacesRef.current) {
            loadedDeptIds.current.add(deptId);
            isLoadingSpacesRef.current = true;

            // Debounce: Wait 300ms before loading
            setTimeout(() => {
                loadSpacesForDepartment(deptId).finally(() => {
                    isLoadingSpacesRef.current = false;
                });
            }, 300);
        }
    }, [spacesByDepartment, loadSpacesForDepartment, schedulePlanetHold]);

    // Load companies first
    useEffect(() => {
        const init = async () => {
            if ((companies?.length || 0) === 0) {
                await loadCompanies();
            }
        };
        init();
    }, [companies?.length, loadCompanies]);

    useEffect(() => {
        if (activeCompanyId || (contextCompanies?.length || 0) === 0) return;
        if (typeof window === 'undefined') return;
        const lastCompanyId = localStorage.getItem('last_company_id');
        if (lastCompanyId && contextCompanies.some(c => c.id === lastCompanyId)) {
            setActiveCompany(lastCompanyId);
        }
    }, [activeCompanyId, contextCompanies, setActiveCompany]);

    // Reload company list when view mode changes (demo vs workspace vs owner)
    useEffect(() => {
        if (prevViewModeRef.current === null) {
            prevViewModeRef.current = viewMode;
            return;
        }
        if (prevViewModeRef.current !== viewMode) {
            prevViewModeRef.current = viewMode;
            loadedDeptIds.current.clear();
            loadCompanies().catch(console.warn);
        }
    }, [viewMode, loadCompanies]);

    // Active company selection is handled centrally (auth bootstrap + store loadCompanies).

    // 🔥 FIX: Auto-load spaces for visible departments (Universe Experience)
    // Instead of lazy-loading on hover, we load them to populate the universe with Moons
    useEffect(() => {
        if (!activeCompanyId || departments.length === 0) return;

        departments.forEach(dept => {
            if (!spacesByDepartment[dept.id] && !loadedDeptIds.current.has(dept.id)) {

                // Stagger loading to prevent API flooding
                const delay = Math.random() * 1000;
                setTimeout(() => {
                    if (!loadedDeptIds.current.has(dept.id)) {
                        loadedDeptIds.current.add(dept.id);
                        loadSpacesForDepartment(dept.id).catch(console.warn);
                    }
                }, delay);
            }
        });
    }, [activeCompanyId, departments, spacesByDepartment, loadSpacesForDepartment]);

    // Load departments when company is active
    // DATA CONSISTENCY FIX: Also load tree to keep Finder in sync
    useEffect(() => {
        if (activeCompanyId) {
            loadDepartments(activeCompanyId);
            // Load tree data for Finder consistency
            loadTree().catch(console.warn);
        }
    }, [activeCompanyId, loadDepartments, loadTree]);

    // Load nodes for current company - FORCE RELOAD on company change
    useEffect(() => {
        if (activeCompanyId && !nodesByCompany[activeCompanyId]) {
            loadNodesForCompany(activeCompanyId);
        }
    }, [activeCompanyId, nodesByCompany, loadNodesForCompany]);

    // 🔥 FIX: REMOVED auto-loading of all spaces! 
    // Spaces are now loaded on-demand (hover/click) via handlePlanetHover

    // Awareness pulse with exponential backoff
    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;
        let interval = 15000; // Start at 15s
        const maxInterval = 120000; // Max 2 minutes

        const loadAwareness = async () => {
            try {
                const pulse = await fetchAwarenessPulse();
                if (isMounted) {
                    setApiOrbState(pulse.state);
                    // Success - reset interval
                    interval = 15000;
                }
            } catch (error) {
                // Silent fail - apply backoff
                interval = Math.min(interval * 1.5, maxInterval);
            }
            // Schedule next with current interval
            if (isMounted) {
                timeoutId = setTimeout(loadAwareness, interval);
            }
        };
        // Initial fetch after small delay
        timeoutId = setTimeout(loadAwareness, 2000);
        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, []);

    const finalOrbState = storeOrbState || apiOrbState;

    // TESLA-STYLE: Minimal data, maximum impact
    // 🔥 FIX: Limit to MAX_DEPARTMENTS (10) to prevent performance issues
    // ✨ UNIQUE DEPARTMENTS: Ensure each department symbol is unique and distinguishable
    // UNIFIED DATA SOURCE: Use treeData (consistent with Finder) or fallback to departments
    const { treeData } = useMoraStore();

    const visiblePlanets = useMemo(() => {
        if (viewMode === 'owner') {
            return companies.slice(0, 6).map(company => ({
                id: company.id,
                name: company.name,
                color: company.is_demo ? '#3B82F6' : '#10B981',
                description: company.description || '',
                type: 'company' as const
            }));
        }

        // PREFER TREE DATA (Hierarchical & Consistent with Finder)
        if (treeData && treeData.length > 0) {
            // Find department nodes in tree (usually top level or children of company root)
            let deptNodes: any[] = [];

            // Check if root is company or list of depts
            const roots = Array.isArray(treeData) ? treeData : [treeData];

            roots.forEach(node => {
                if (node.type === 'department') {
                    deptNodes.push(node);
                } else if (node.children) {
                    node.children.forEach((child: any) => {
                        if (child.type === 'department') deptNodes.push(child);
                    });
                }
            });

            if (deptNodes.length > 0) {
                // SEMANTIC CLEANUP: Deduplicate by name to avoid clutter (e.g. multiple 'Finance' planets)
                const uniqueDeptNodes = deptNodes.filter((dept, index, arr) =>
                    arr.findIndex(d => (d.name || '').toLowerCase() === (dept.name || '').toLowerCase()) === index
                );

                const shouldUseTree = departments.length === 0 || uniqueDeptNodes.length >= departments.length;

                if (shouldUseTree) {
                    // UPDATED: Cap at 25 per user feedback (no hard data loss, UI/rendering only)
                    return uniqueDeptNodes.slice(0, MAX_DEPARTMENTS).map((dept, idx) => ({
                        id: dept.id,
                        name: dept.name,
                        // VIBRANT COLORS: Rotate through a vivid palette
                        color: ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4', '#F43F5E', '#6366F1'][idx % 8],
                        description: dept.name,
                        type: 'department' as const
                    }));
                }
            }
        }

        // FALLBACK: Legacy Departments array
        const uniqueDepartments = departments
            .filter((dept, index, arr) =>
                arr.findIndex(d => (d.name || '').toLowerCase() === (dept.name || '').toLowerCase()) === index
            )
            .slice(0, MAX_DEPARTMENTS); // Cap at 25 (UI/rendering limit)

        return uniqueDepartments.map((dept, idx) => ({
            id: dept.id,
            name: dept.name,
            color: dept.color || ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4', '#F43F5E', '#6366F1'][idx % 8],
            description: dept.name,
            type: 'department' as const
        }));
    }, [viewMode, companies, departments, treeData]);

    const departmentIconMap = useMemo(() => {
        const iconPool = [
            Compass,
            Briefcase,
            Megaphone,
            BarChart3,
            Cpu,
            Database,
            Wrench,
            Factory,
            Sparkles,
            Palette,
            Target,
            Shield,
            HeartPulse,
            Lightbulb,
            ShoppingBag,
            Building2,
            Home,
            Globe2,
            Flame,
            Gem,
            FlaskConical
        ];

        const keywordIcons: Array<{ pattern: RegExp; icon: any }> = [
            { pattern: /(marketing|brand|growth|campaign|ads|social|local)/i, icon: Megaphone },
            { pattern: /(sales|crm|pipeline|lead|partner)/i, icon: Target },
            { pattern: /(product|research|design|ux|ui)/i, icon: Palette },
            { pattern: /(engineering|dev|platform|data|analytics)/i, icon: Cpu },
            { pattern: /(ops|operations|legal|finance|hr|people)/i, icon: Briefcase },
            { pattern: /(health|care|medical|support)/i, icon: HeartPulse },
            { pattern: /(security|compliance|risk)/i, icon: Shield },
            { pattern: /(store|retail|shop)/i, icon: ShoppingBag },
            { pattern: /(research|lab|science)/i, icon: FlaskConical },
        ];

        const used = new Set<any>();
        const map = new Map<string, any>();
        const sorted = [...visiblePlanets].sort((a, b) => a.id.localeCompare(b.id));

        const assignIcon = (deptId: string, icon: any) => {
            if (!used.has(icon)) {
                used.add(icon);
                map.set(deptId, icon);
                return true;
            }
            return false;
        };

        sorted.forEach((dept) => {
            const match = keywordIcons.find(entry => entry.pattern.test(dept.name || ''));
            if (match) {
                assignIcon(dept.id, match.icon);
            }
        });

        sorted.forEach((dept, index) => {
            if (map.has(dept.id)) return;
            const icon = iconPool.find(candidate => !used.has(candidate));
            if (icon) {
                assignIcon(dept.id, icon);
            } else {
                const fallback = iconPool[index % iconPool.length] || Compass;
                map.set(dept.id, fallback);
            }
        });

        return map;
    }, [visiblePlanets]);

    const visibleMoons = useMemo(() => {
        if (viewMode === 'owner') return [];

        // PREFER TREE DATA (Hierarchical & Consistent with Finder)
        if (treeData && treeData.length > 0) {
            const moons: any[] = [];

            // Helper to find spaces recursively or directly
            const traverseForSpaces = (nodes: any[]) => {
                nodes.forEach(node => {
                    // If this is a Dept, its children might be Spaces
                    if (node.type === 'department') {
                        if (node.children) {
                            node.children.forEach((child: any) => {
                                if (child.type === 'space') {
                                    moons.push({
                                        id: child.id,
                                        name: child.name,
                                        departmentId: node.id,
                                        type: 'moon' as const
                                    });
                                }
                            });
                        }
                    } else if (node.children) {
                        traverseForSpaces(node.children);
                    }
                });
            };

            traverseForSpaces(Array.isArray(treeData) ? treeData : [treeData]);
            return moons.slice(0, 30); // Limit global moons for performance
        }

        // Use the same unique departments filtering as planets
        const uniqueDepartments = departments
            .filter((dept, index, arr) =>
                arr.findIndex(d => (d.name || '').toLowerCase() === (dept.name || '').toLowerCase()) === index
            )
            .slice(0, 6); // Limit for performance

        return uniqueDepartments.flatMap(dept => {
            const deptSpaces = spacesByDepartment[dept.id] || [];
            // UNIQUE SPACES: Also filter for distinct space names
            const uniqueSpaces = deptSpaces.filter((space, index, arr) =>
                arr.findIndex(s => (s.name || '').toLowerCase() === (space.name || '').toLowerCase()) === index
            );
            return uniqueSpaces.slice(0, 1).map(space => ({ // Max 1 space per dept (User Request: "Nur ein Moon")
                ...space,
                departmentId: dept.id,
                type: 'moon' as const // Explicit type for clarity
            }));
        });
    }, [viewMode, departments, spacesByDepartment, treeData]);

    // STARS (Folders) computation - Orbiting Moons
    const visibleFolderStars = useMemo(() => {
        if (viewMode === 'owner') return [];

        // PREFER TREE DATA
        if (treeData && treeData.length > 0) {
            const stars: any[] = [];

            const traverseForFolders = (nodes: any[]) => {
                nodes.forEach(node => {
                    // Check for Spaces -> Folders
                    if (node.type === 'space') {
                        if (node.children) {
                            node.children.forEach((child: any) => {
                                if (child.type === 'folder') {
                                    stars.push({
                                        id: child.id,
                                        name: child.name,
                                        spaceId: node.id,
                                        type: 'star' as const
                                    });
                                }
                            });
                        }
                    } else if (node.children) {
                        traverseForFolders(node.children);
                    }
                });
            };

            traverseForFolders(Array.isArray(treeData) ? treeData : [treeData]);
            return stars.slice(0, 50);
        }

        // Get folders for visible moons only (limited to avoid overload)
        return visibleMoons.flatMap(space => {
            const spaceFolders = foldersBySpace[space.id] || [];
            // UNIQUE FOLDERS: Filter for distinct folder names
            const uniqueFolders = spaceFolders.filter((folder, index, arr) =>
                arr.findIndex(f => (f.name || '').toLowerCase() === (folder.name || '').toLowerCase()) === index
            );
            return uniqueFolders.slice(0, 5).map(folder => ({ // Max 5 folders per space
                ...folder,
                spaceId: space.id,
                type: 'star' as const
            }));
        });
    }, [viewMode, visibleMoons, foldersBySpace, treeData]);

    // UPGRADE B1: Enhanced planetary orbit system - VIEWPORT UNITS with SEEDED VARIATION
    const planetPositions = useMemo(() => {
        const count = visiblePlanets.length;
        if (count === 0) return [];

        // Create a simple hash from company ID for seeded randomization
        // This ensures same company = same layout, different company = different layout
        const companyId = activeCompanyId || 'default';
        let seed = 0;
        for (let i = 0; i < companyId.length; i++) {
            seed = ((seed << 5) - seed) + companyId.charCodeAt(i);
            seed = seed & seed; // Convert to 32bit integer
        }

        // Seeded random function (deterministic based on seed)
        const seededRandom = (offset: number) => {
            const x = Math.sin(seed + offset) * 10000;
            return x - Math.floor(x);
        };

        // CENTER-BASED POSITIONING (Restored to fix "Broken/Empty" look)
        // Planets orbit the Central Sun (Company Logo/Text) at 50,50
        const orbX = 50; // Center VW
        const orbY = 50; // Center VH

        // Orbit radius (Tuned for safe margins - 15% clear zone)
        // Reduced from 38vw/25vh to ensure planets stay within bounds
        // EXPANDED ORBIT: Use more screen space (User Request: "Verteilt im ganzen Universe")
        // EXPANDED ORBIT: Tuned for better visibility (User Feedback: "Where is data?")
        // Reduced from 42vw to 34vw to ensure planets are safely within viewport
        const orbitRadiusX = 34 + seededRandom(3) * 5; // 34-39vw (Safe Zone)
        const orbitRadiusY = 28 + seededRandom(4) * 5; // 28-33vh (Safe Zone)


        // Full 360 orbit
        const arcStart = 0;
        const arcEnd = Math.PI * 2;
        const arcSpan = arcEnd - arcStart;
        // SORT PLANETS deterministicially by Name/ID to ensure consistent orbital slot assignment
        // This prevents planets from 'swapping' places if the API returns them in different order
        const sortedPlanets = [...visiblePlanets].sort((a, b) => a.id.localeCompare(b.id));

        const angleStep = arcSpan / Math.max(count, 1); // Divide by count for full circle

        return sortedPlanets.map((planet, i) => {
            // Each planet gets a slight individual offset too
            const planetSeed = seed + planet.id.charCodeAt(0);
            const individualOffset = (Math.sin(planetSeed) * 0.5 + 0.5) * 2 - 1; // -1 to 1

            const angle = arcStart + (i * angleStep) + (individualOffset * 0.1);

            // Calculate position as VIEWPORT UNITS (relative to Center)
            const x = orbX + Math.cos(angle) * orbitRadiusX;
            const y = orbY + Math.sin(angle) * orbitRadiusY;

            // Clamp to keep labels within safe viewport zone
            const safeX = Math.min(88, Math.max(12, x));
            const safeY = Math.min(78, Math.max(22, y));

            return {
                planet,
                x: safeX, // vw units
                y: safeY, // vh units
                angle,
                radius: orbitRadiusX,
                delay: i * 0.1
            };
        });
    }, [visiblePlanets, activeCompanyId]);

    // UPGRADE B1: Moons (Spaces) orbiting planets with enhanced positioning
    const moonPositions = useMemo(() => {
        if (!visibleMoons || visibleMoons.length === 0 || !planetPositions || planetPositions.length === 0) return [];

        return visibleMoons.map((space, i) => {
            // Find parent planet position
            const parentPlanet = planetPositions.find(p => p.planet && p.planet.id === space.departmentId);

            if (!parentPlanet) {
                return {
                    space,
                    x: 50 + (Math.random() - 0.5) * 20, // Random near center
                    y: 50 + (Math.random() - 0.5) * 20,
                    delay: i * 0.05,
                    orbitRadiusX: 0,
                    orbitRadiusY: 0,
                    orbitAngle: 0
                };
            }

            // UPGRADE B1: Smart moon positioning around planets
            const planetSpaceCount = visibleMoons.filter(s => s.departmentId === space.departmentId).length;
            const moonIndex = visibleMoons.filter(s => s.departmentId === space.departmentId)
                .findIndex(s => s.id === space.id);

            // Distribute moons evenly around the planet
            const moonAngle = (moonIndex / Math.max(planetSpaceCount, 1)) * Math.PI * 2;

            // Orbit radius in relative units (approx 6vw / 10vh)
            const orbitRadiusX = 6 + (moonIndex * 1.5);
            const orbitRadiusY = 10 + (moonIndex * 2.5);

            // Calculate moon position relative to planet (VW/VH)
            const moonX = Math.cos(moonAngle) * orbitRadiusX;
            const moonY = Math.sin(moonAngle) * orbitRadiusY;

            return {
                space,
                x: parentPlanet.x + moonX, // VW
                y: parentPlanet.y + moonY, // VH
                delay: i * 0.06,
                orbitRadiusX,
                orbitRadiusY,
                orbitAngle: moonAngle,
                parentPlanet: parentPlanet
            };
        });
    }, [visibleMoons, planetPositions]);

    // STARS (Folders) orbiting moons
    const folderStarPositions = useMemo(() => {
        if (!visibleFolderStars || visibleFolderStars.length === 0 || !moonPositions || moonPositions.length === 0) return [];

        return visibleFolderStars.map((folder, i) => {
            // Find parent moon (space) position
            const parentMoon = moonPositions.find(m => m.space && m.space.id === folder.spaceId);

            if (!parentMoon) {
                const fallbackSeed = Array.from(folder.id || '').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
                const seededFallback = (offset: number) => seededRandom(fallbackSeed + offset + i * 7);
                return {
                    folder,
                    x: 50 + (seededFallback(1) - 0.5) * 20,
                    y: 50 + (seededFallback(9) - 0.5) * 20,
                    delay: i * 0.03,
                    orbitRadiusX: 0,
                    orbitRadiusY: 0,
                    orbitAngle: 0
                };
            }

            // STARS orbit around their moons
            const moonFolderCount = visibleFolderStars.filter(f => f.spaceId === folder.spaceId).length;
            const starIndex = visibleFolderStars.filter(f => f.spaceId === folder.spaceId)
                .findIndex(f => f.id === folder.id);

            // Distribute stars around the moon
            const starAngle = (starIndex / Math.max(moonFolderCount, 1)) * Math.PI * 2;
            // Tighter orbit (approx 2vw / 4vh)
            const orbitRadiusX = 2 + (starIndex * 0.5);
            const orbitRadiusY = 4 + (starIndex * 0.8);

            const starX = Math.cos(starAngle) * orbitRadiusX;
            const starY = Math.sin(starAngle) * orbitRadiusY;

            return {
                folder,
                x: parentMoon.x + starX, // VW
                y: parentMoon.y + starY, // VH
                delay: i * 0.04,
                orbitRadiusX,
                orbitRadiusY,
                orbitAngle: starAngle,
                parentMoon: parentMoon
            };
        });
    }, [visibleFolderStars, moonPositions]);

    const moonOrbitOffsetMap = useMemo(() => {
        const map = new Map<string, Array<{ x: number; y: number }>>();
        moonPositions.forEach(moon => {
            if (!moon.parentPlanet) return;
            map.set(
                moon.space.id,
                getOrbitOffsets(moon.parentPlanet.x, moon.parentPlanet.y, moon.x, moon.y)
            );
        });
        return map;
    }, [moonPositions, getOrbitOffsets]);

    const folderOrbitOffsetMap = useMemo(() => {
        const map = new Map<string, Array<{ x: number; y: number }>>();
        folderStarPositions.forEach(star => {
            const parentMoon = star.parentMoon?.space.id;
            if (!parentMoon) return;
            const offsets = moonOrbitOffsetMap.get(parentMoon);
            if (offsets) {
                map.set(star.folder.id, offsets);
            }
        });
        return map;
    }, [folderStarPositions, moonOrbitOffsetMap]);


    // Node Stars - Distributed throughout the universe (UNIQUE NODES)
    const nodeStarPositions = useMemo(() => {
        const currentNodes = activeCompanyId ? nodesByCompany[activeCompanyId] || [] : [];
        if (currentNodes.length === 0) return [];

        // UNIQUE NODES & STRICT FILE FILTER (User Request: "Stars = Files")
        // Only show nodes that are actually documents/files.
        const uniqueNodes = currentNodes.filter((node, index, arr) => {
            // Must be distinct
            const isDistinct = arr.findIndex(n => n.title?.toLowerCase() === node.title?.toLowerCase()) === index;
            if (!isDistinct) return false;

            // Must be a file
            const typeStr = node.type as string;
            const isFile = typeStr === 'document' || typeStr === 'file' || !!node.metadata?.file_path;

            // Allow if metadata explicitly says "is_file" or similar, or if it has an extension in title?
            // For now, rely on type.
            return isFile;
        });

        // Generate positions based on company seed for consistency
        const seed = universeSeed;
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash = hash & hash;
        }

        return uniqueNodes.slice(0, 50).map((node, i) => { // Limit to 50 nodes
            // Deterministic positioning based on node ID and company seed
            const nodeSeed = hash + node.id.charCodeAt(0) + node.id.charCodeAt(node.id.length - 1);
            const seededRandom = (offset: number) => {
                const x = Math.sin(nodeSeed + offset + i * 2.1) * 10000;
                return x - Math.floor(x);
            };

            // DEFAULT: Deep Space (if orphan)
            let x = seededRandom(0) * 100;
            let y = seededRandom(100) * 100;

            // ANCHOR LOGIC (User Request: "Stars in Moons")
            // Try to find the parent folder in our visible universe
            const parentFolderPos = folderStarPositions.find(f => f.folder.id === node.folder_id);

            if (parentFolderPos) {
                // Orbit the folder (Static Cluster)
                // Use index to distribute evenly around the folder
                const angle = (i * 1.1) + seededRandom(5);
                const dist = 3 + seededRandom(10) * 2; // 3-5vw distance

                x = parentFolderPos.x + Math.cos(angle) * dist;
                y = parentFolderPos.y + Math.sin(angle) * dist;
            } else if (moonPositions.length > 0) {
                // Fallback: Attach to specific Moon if mapped, or closest Moon?
                // For now, if orphaned, cluster near the Center or random Moon to avoid "Lost in Space"
                const randomMoon = moonPositions[Math.floor(seededRandom(50) * moonPositions.length)];
                if (randomMoon) {
                    const angle = seededRandom(60) * Math.PI * 2;
                    const dist = 8 + seededRandom(70) * 4;
                    x = randomMoon.x + Math.cos(angle) * dist;
                    y = randomMoon.y + Math.sin(angle) * dist;
                }
            }

        return {
            node,
            x,
            y,
            delay: i * 0.02 // Staggered animation
        };
    });
    }, [activeCompanyId, nodesByCompany, universeSeed, folderStarPositions, moonPositions]);

    const focusPlanetSpaceIds = useMemo(() => {
        if (!focusPlanetId) return new Set<string>();
        const spaces = spacesByDepartment[focusPlanetId] || [];
        return new Set(spaces.map(space => space.id));
    }, [focusPlanetId, spacesByDepartment]);

    const visibleMoonPositions = useMemo(() => {
        if (!focusPlanetId) return [];
        return moonPositions.filter(m => m.space.departmentId === focusPlanetId);
    }, [focusPlanetId, moonPositions]);

    const visibleFolderStarPositions = useMemo(() => {
        if (!focusPlanetId && !focusSpaceId) return [];
        return folderStarPositions.filter(star => {
            const spaceId = star.parentMoon?.space.id;
            if (!spaceId) return false;
            if (focusSpaceId) return spaceId === focusSpaceId;
            return star.parentMoon?.space.departmentId === focusPlanetId;
        });
    }, [focusPlanetId, focusSpaceId, folderStarPositions]);

    const visibleNodeStarPositions = useMemo(() => {
        if (!focusPlanetId && !focusSpaceId && !focusFolderId) return [];
        return nodeStarPositions.filter(({ node }) => {
            if (focusFolderId) return node.folder_id === focusFolderId;
            if (focusSpaceId) return node.space_id === focusSpaceId;
            if (focusPlanetSpaceIds.size) return focusPlanetSpaceIds.has(node.space_id);
            return false;
        });
    }, [focusPlanetId, focusSpaceId, focusFolderId, nodeStarPositions, focusPlanetSpaceIds]);

    const visibleNodePositionsByFolder = useMemo(() => {
        const map = new Map<string, Array<{ id: string; x: number; y: number; node: CoreNode }>>();
        visibleNodeStarPositions.forEach(({ node, x, y }) => {
            if (!node.folder_id) return;
            const list = map.get(node.folder_id) || [];
            list.push({ id: node.id, x, y, node });
            map.set(node.folder_id, list);
        });
        return map;
    }, [visibleNodeStarPositions]);

    // 🔍 DEBUG STATE: Now safe to reference all positions
    const debugState = useMemo(() => ({
        activeCompanyId: activeCompanyId || 'NONE',
        companiesCount: companies?.length || 0,
        departmentsCount: departments?.length || 0,
        spacesCount: Object.keys(spacesByDepartment || {}).length,
        nodesCount: activeCompanyId ? (nodesByCompany[activeCompanyId] || []).length : 0,
        planetPositionsCount: planetPositions?.length || 0,
        moonPositionsCount: moonPositions?.length || 0,
        viewMode,
        isLoadingCompanies,
        isLoadingDepartments
    }), [activeCompanyId, companies?.length, departments?.length, spacesByDepartment, nodesByCompany, planetPositions?.length, moonPositions?.length, viewMode, isLoadingCompanies, isLoadingDepartments]);


    // UPGRADE E2: Map for Semantic Lookups
    const nodePosMap = useMemo(() => {
        const map = new Map<string, { x: number, y: number }>();
        nodeStarPositions.forEach(p => map.set(p.node.id, { x: p.x, y: p.y }));
        return map;
    }, [nodeStarPositions]);

    // UPGRADE P4: Sync positions to Intelligence Store for Overlay
    const setNodePositions = useIntelligenceStore(state => state.setNodePositions);
    useEffect(() => {
        setNodePositions(nodePosMap);
    }, [nodePosMap, setNodePositions]);

    // UPGRADE E2: Semantic Constellations are fetched on node hover only

    // UPGRADE B3: MindLoop Intelligence Pulse
    const pulseData = useIntelligencePulse();
    const addOrbNotification = useMoraStore(s => s.addOrbNotification);
    const lastNotifiedRef = useRef<string>('');

    useEffect(() => {
        if (pulseData.insights && pulseData.insights.length > 0) {
            // Get the most relevant insight (first one)
            const latest = pulseData.insights[0];
            const key = `${latest.type}-${latest.summary}`;

            // Only notify if it's new (simple de-duplication)
            if (key !== lastNotifiedRef.current) {
                lastNotifiedRef.current = key;

                addOrbNotification({
                    id: `intel-${Date.now()}`,
                    type: 'insight',
                    message: latest.summary
                });

                // Also show a toast for immediate feedback
                if (latest.summary) {
                    toast.success(latest.summary, { duration: 4000 });
                }
            }
        }
    }, [pulseData, addOrbNotification]);

    // UPGRADE B2: Listen for AI Command Events (Agency Bridge)
    useEffect(() => {
        const handleAICommand = (e: CustomEvent) => {
            const detail = e.detail;
            if (detail.type === 'highlight') {
                const selector = detail.target?.selector;
                if (selector) {
                    // Try to find element
                    // Note: We use a slight delay to allow navigation to complete if simultaneous
                    setTimeout(() => {
                        let el = document.querySelector(selector);
                        if (!el && selector.startsWith('#')) {
                            el = document.getElementById(selector.substring(1));
                        }

                        if (el) {
                            const rect = el.getBoundingClientRect();
                            setCursorAgent({
                                active: true,
                                action: 'highlight',
                                target: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
                            });

                            // Reset to roam after highlight
                            setTimeout(() => {
                                setCursorAgent({ action: 'roam', target: undefined });
                            }, detail.duration || 2500);
                        }
                    }, 500); // 500ms delay for DOM readiness
                }
            }
        };

        window.addEventListener('mora-ai-action' as any, handleAICommand as any);
        return () => window.removeEventListener('mora-ai-action' as any, handleAICommand as any);
    }, []);

    // ═══════════════════════════════════════════════════════════════════════════
    // SEMANTIC HIERARCHY SYSTEM - Star to Moon Promotion ("Nervous System")
    // ═══════════════════════════════════════════════════════════════════════════
    const activeNodes: CoreNode[] = useMemo(() => (
        activeCompanyId ? (nodesByCompany[activeCompanyId] || []) : []
    ), [activeCompanyId, nodesByCompany]);

    const { nodesBySpace, nodesByFolder } = useMemo(() => {
        const bySpace = new Map<string, CoreNode[]>();
        const byFolder = new Map<string, CoreNode[]>();

        activeNodes.forEach(node => {
            if (!bySpace.has(node.space_id)) bySpace.set(node.space_id, []);
            bySpace.get(node.space_id)!.push(node);

            if (node.folder_id) {
                if (!byFolder.has(node.folder_id)) byFolder.set(node.folder_id, []);
                byFolder.get(node.folder_id)!.push(node);
            }
        });

        return { nodesBySpace: bySpace, nodesByFolder: byFolder };
    }, [activeNodes]);

    const spaceScores = useMemo(() => {
        const scores = new Map<string, number>();
        visibleMoons.forEach(space => {
            const nodes = nodesBySpace.get(space.id) || [];
            const importantCount = nodes.filter(isImportantNode).length;
            const weightSum = nodes.reduce((sum, node) => sum + (Number(node.metadata?.weight) || 0), 0);
            const textScore = scoreText(`${space.name || ''} ${space.description || ''}`);
            const score = (nodes.length * 0.12) + (importantCount * 0.7) + (weightSum * 0.45) + textScore;
            scores.set(space.id, score);
        });
        return scores;
    }, [visibleMoons, nodesBySpace]);

    const folderScores = useMemo(() => {
        const scores = new Map<string, number>();
        Object.values(foldersBySpace).forEach((folders) => {
            folders.forEach((folder: CoreFolder) => {
                const nodes = nodesByFolder.get(folder.id) || [];
                const importantCount = nodes.filter(isImportantNode).length;
                const weightSum = nodes.reduce((sum, node) => sum + (Number(node.metadata?.weight) || 0), 0);
                const textScore = scoreText(`${folder.name || ''} ${folder.description || ''}`);
                const score = (nodes.length * 0.18) + (importantCount * 0.8) + (weightSum * 0.45) + textScore;
                scores.set(folder.id, score);
            });
        });
        return scores;
    }, [foldersBySpace, nodesByFolder]);

    const nodeScores = useMemo(() => {
        const scores = new Map<string, number>();
        activeNodes.forEach(node => {
            const tags: string[] = (node.metadata?.tags as string[]) || [];
            const weight = Number(node.metadata?.weight) || 0;
            const textScore = scoreText(`${node.title || node.name || ''} ${node.content || ''}`);
            const score = (weight * 1.2) + (isImportantNode(node) ? 1.5 : 0) + (Math.min(tags.length, 4) * 0.4) + (textScore * 0.6);
            scores.set(node.id, score);
        });
        return scores;
    }, [activeNodes]);

    const maxSpaceScore = useMemo(() => {
        const values = Array.from(spaceScores.values());
        return values.length ? Math.max(1, ...values) : 1;
    }, [spaceScores]);

    const maxFolderScore = useMemo(() => {
        const values = Array.from(folderScores.values());
        return values.length ? Math.max(1, ...values) : 1;
    }, [folderScores]);

    const maxNodeScore = useMemo(() => {
        const values = Array.from(nodeScores.values());
        return values.length ? Math.max(1, ...values) : 1;
    }, [nodeScores]);

    const promotedMoonIds = useMemo(() => {
        const ids = new Set<string>();
        if (viewMode === 'owner') return ids;

        const byDept = new Map<string, Array<{ id: string; score: number }>>();
        visibleMoons.forEach(space => {
            const score = spaceScores.get(space.id) || 0;
            const list = byDept.get(space.departmentId) || [];
            list.push({ id: space.id, score });
            byDept.set(space.departmentId, list);
        });

        byDept.forEach(entries => {
            entries.sort((a, b) => b.score - a.score);
            entries.slice(0, PROMOTED_MOONS_PER_PLANET).forEach(entry => ids.add(entry.id));
        });

        if (activeSpaceId) ids.add(activeSpaceId);
        return ids;
    }, [viewMode, visibleMoons, spaceScores, activeSpaceId]);

    const promotedFolderIdsBySpace = useMemo(() => {
        const map = new Map<string, string[]>();
        if (viewMode === 'owner') return map;

        Object.entries(foldersBySpace).forEach(([spaceId, folders]) => {
            const scored = folders.map(folder => ({
                id: folder.id,
                score: folderScores.get(folder.id) || 0
            }));
            scored.sort((a, b) => b.score - a.score);
            const top = scored.slice(0, PROMOTED_STARS_PER_MOON).map(entry => entry.id);

            if (activeFolderId && folders.some(folder => folder.id === activeFolderId) && !top.includes(activeFolderId)) {
                top.unshift(activeFolderId);
            }

            map.set(spaceId, top);
        });

        return map;
    }, [viewMode, foldersBySpace, folderScores, activeFolderId]);

    const promotedFolderIds = useMemo(() => {
        const ids = new Set<string>();
        promotedFolderIdsBySpace.forEach(list => {
            list.forEach(id => ids.add(id));
        });
        return ids;
    }, [promotedFolderIdsBySpace]);

    const promotedNodeIds = useMemo(() => {
        const ids = new Set<string>();
        if (viewMode === 'owner') return ids;

        promotedFolderIds.forEach(folderId => {
            const nodes = nodesByFolder.get(folderId) || [];
            const scored = nodes.map(node => ({ id: node.id, score: nodeScores.get(node.id) || 0 }));
            scored.sort((a, b) => b.score - a.score);
            scored.slice(0, PROMOTED_NODES_PER_FOLDER).forEach(entry => ids.add(entry.id));
        });
        return ids;
    }, [viewMode, promotedFolderIds, nodesByFolder, nodeScores]);

    const currentCompany = companies.find(c => c.id === activeCompanyId);
    const fallbackCompanyName = useMemo(() => {
        if (currentCompany?.name) return currentCompany.name;
        const tenantMatch = tenantId ? companies.find(c => c.tenant_id === tenantId) : null;
        return tenantMatch?.name || companies[0]?.name || null;
    }, [currentCompany?.name, tenantId, companies]);

    useEffect(() => {
        if (currentCompany?.name) {
            setLastCompanyName(currentCompany.name);
        }
    }, [currentCompany?.name]);

    const displayCompanyName = fallbackCompanyName
        || lastCompanyName
        || (typeof window !== 'undefined' ? localStorage.getItem('last_workspace') : null)
        || 'Workspace';




    // Derived state for UI

    // Stable callback to prevent effect loops
    const handleBootComplete = useCallback(() => {
        console.log('[Boot] Sequence complete');
        setHasBooted(true);
    }, [setHasBooted]);

    return (
        <div className="fixed inset-0 w-full h-full min-w-full min-h-full overflow-hidden bg-transparent">
            {/* BACKGROUND UNIVERSE (Gradient + Stars) - REMOVED: Managed by MoraShell */}
            {/* <StarField seed={universeSeed} /> */}

            {/* BOOT SEQUENCE */}
            {!hasBooted && (
                <div className="absolute inset-0 z-[100]">
                    <BootSequence
                        onComplete={handleBootComplete}
                        user={user ? { name: user?.full_name || user?.email || 'User', role: user?.role || 'USER' } : null}
                        companyName={companies.find(c => c.id === activeCompanyId)?.name || 'UNKNOWN SECTOR'}
                        environment={process.env.NODE_ENV}
                    />
                </div>
            )}



            {/* Subtle pointer to top bar */}

            <UniverseControls
                viewMode={viewMode}
                setViewMode={setViewMode}
                activeCompany={currentCompany ? { id: currentCompany.id, name: currentCompany.name } : undefined}
                companies={contextCompanies.map(c => ({ id: c.id, name: c.name }))}
                onSwitchCompany={(id) => {
                    console.log('[ContextSwitch] Manual switch to:', id);
                    const chosen = companies.find(c => c.id === id);
                    const targetTenant = chosen?.tenant_id || tenantId || undefined;
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('last_company_id', id);
                        if (chosen?.name) {
                            localStorage.setItem('last_workspace', chosen.name);
                        }
                    }
                    setActiveCompany(id);
                    loadDepartments(id);
                    // Also reload nodes to ensure deep space is correct
                    loadNodesForCompany(id).catch(console.warn);
                    loadTree(targetTenant, id).catch(console.warn);
                    toast.success("Context Switched");
                }}
                visibleModes={visibleModes}
                workspaceLabel={role === 'system_owner' ? 'HQ' : 'Space'}
            />

            {/* DEBUG INFO REMOVED - Clean interface per user request */}


            {/* Control Bar removed - Department management now in Settings > Admin */}

            {/* Atmosphere and starfield removed to use universal MoraShell background */}

            {/* Header removed - now using Center Universe Hub */}

            {/* CENTER UNIVERSE HUB - Premium Glass Design */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-24">
                <motion.div
                    className="text-center pointer-events-auto"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                >
                    {/* Company Logo - Universal Component */}
                    <button
                        type="button"
                        onClick={() => {
                            navigateToCore();
                            setOrbState('idle');
                        }}
                        className="mx-auto mb-8 block cursor-pointer"
                        aria-label="Zurück zur Übersicht"
                    >
                        <CompanyLogo
                            src={
                                currentCompany?.logo_url ||
                                (currentCompany?.is_demo ? '/images/simple_coffee_logo.png' : null)
                            }
                            companyName={displayCompanyName}
                            size="lg"
                            animated={true}
                            accentColor={accentColor}
                        />
                    </button>

                    {/* Company Name */}
                    <h1 className="text-4xl md:text-5xl font-extralight tracking-[0.4em] text-white/80 mb-2">
                        {displayCompanyName.toUpperCase()}
                    </h1>

                    {/* Divider */}
                    <div className="w-32 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent mx-auto my-4" />

                    {/* Stats Bar - Only show real data */}
                    <div className="flex items-center justify-center gap-8 text-xs text-white/40 font-mono tracking-widest">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                            <span>{visiblePlanets.length} ABTEILUNGEN</span>
                        </div>
                    </div>

                    {/* Mode Indicator */}
                    {viewMode === 'demo' && (
                        <motion.div
                            className="mt-4 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 inline-block"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <span className="text-[10px] text-blue-400 tracking-widest">DEMO MODE</span>
                        </motion.div>
                    )}
                </motion.div>
            </div>

            {/* ORBITAL SYSTEM - Fixed Full Screen Overlay */}
            <div
                className="fixed inset-0 z-10 pointer-events-none overflow-hidden"
            >
                {/* SEMANTIC CONSTELLATIONS - The "Nervous System" */}
                <SemanticLinesRenderer lines={connections} />
                {/* UPGRADE E1: Semantic Constellations - SVG-based connection visualization */}
                {viewMode !== 'owner' && (
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        viewBox="0 0 100 100" // Normalize coordinate system to 0-100 (VW/VH)
                        preserveAspectRatio="none"
                        style={{ overflow: 'visible' }}
                    >
                        <defs>
                            {/* NEURAL PATHWAY GRADIENT - Premium Light */}
                            <linearGradient id="semanticGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#10B981" stopOpacity="0.7" />
                                <stop offset="30%" stopColor="#60A5FA" stopOpacity="0.55" />
                                <stop offset="70%" stopColor="#8B5CF6" stopOpacity="0.55" />
                                <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.7" />
                            </linearGradient>

                            {/* Pure White Light for Sun Rays */}
                            <linearGradient id="sunRayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                                <stop offset="50%" stopColor="rgba(16,185,129,0.4)" />
                                <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                            </linearGradient>

                            {/* Ethereal Glow Filter */}
                            <filter id="neuralGlow" x="-100%" y="-100%" width="300%" height="300%">
                                <feGaussianBlur stdDeviation="2" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Render semantic constellation lines */}
                        {(() => {
                            if (!focusPlanetId) return null;
                            const semanticConnections: Array<{
                                id: string;
                                x1: number;
                                y1: number;
                                x2: number;
                                y2: number;
                                strength: number;
                                animated: boolean;
                                orbit?: {
                                    x1?: number[];
                                    y1?: number[];
                                    x2?: number[];
                                    y2?: number[];
                                };
                            }> = [];

                            const focusPlanet = planetPositions.find(p => p.planet?.id === focusPlanetId);
                            if (!focusPlanet) return null;

                            const isFocusedPlanet = hoveredPlanet === focusPlanetId || heldPlanetId === focusPlanetId || activeDepartmentId === focusPlanetId;

                            visibleMoonPositions.forEach(moon => {
                                const spaceScore = spaceScores.get(moon.space.id) || 0;
                                const normalizedSpace = spaceScore / maxSpaceScore;
                                const isFocusedMoon = isFocusedPlanet || moon.space.id === activeSpaceId;
                                const showMoonConnection = isFocusedMoon || promotedMoonIds.has(moon.space.id);
                                if (!showMoonConnection) return;
                                const moonOrbitOffsets = moonOrbitOffsetMap.get(moon.space.id);

                                semanticConnections.push({
                                    id: `semantic-planet-${focusPlanetId}-${moon.space.id}`,
                                    x1: focusPlanet.x,
                                    y1: focusPlanet.y,
                                    x2: moon.x,
                                    y2: moon.y,
                                    strength: 0.25 + (normalizedSpace * 0.55),
                                    animated: isFocusedMoon || normalizedSpace > 0.75,
                                    orbit: moonOrbitOffsets ? {
                                        x2: moonOrbitOffsets.map(o => moon.x + o.x),
                                        y2: moonOrbitOffsets.map(o => moon.y + o.y)
                                    } : undefined
                                });

                                const moonStars = visibleFolderStarPositions.filter(s => s.parentMoon?.space.id === moon.space.id);
                                moonStars.forEach(star => {
                                    const folderScore = folderScores.get(star.folder.id) || 0;
                                    const normalizedFolder = folderScore / maxFolderScore;
                                    const isFocusedStar = isFocusedMoon || star.folder.id === activeFolderId;
                                    const showStarConnection = isFocusedStar || promotedFolderIds.has(star.folder.id);
                                    if (!showStarConnection) return;
                                    const folderOrbitOffsets = folderOrbitOffsetMap.get(star.folder.id) || moonOrbitOffsets;

                                    semanticConnections.push({
                                        id: `semantic-moon-${moon.space.id}-${star.folder.id}`,
                                        x1: moon.x,
                                        y1: moon.y,
                                        x2: star.x,
                                        y2: star.y,
                                        strength: 0.2 + (normalizedFolder * 0.4),
                                        animated: isFocusedStar || normalizedFolder > 0.75,
                                        orbit: moonOrbitOffsets ? {
                                            x1: moonOrbitOffsets.map(o => moon.x + o.x),
                                            y1: moonOrbitOffsets.map(o => moon.y + o.y),
                                            x2: moonOrbitOffsets.map(o => star.x + o.x),
                                            y2: moonOrbitOffsets.map(o => star.y + o.y)
                                        } : undefined
                                    });

                                    const folderNodes = (visibleNodePositionsByFolder.get(star.folder.id) || [])
                                        .map(entry => ({
                                            ...entry,
                                            score: nodeScores.get(entry.id) || 0
                                        }))
                                        .sort((a, b) => b.score - a.score);

                                    const maxNodeLinks = isFocusedStar ? 6 : 4;
                                    const nodeCandidates = folderNodes.slice(0, maxNodeLinks);
                                    const nodeLinkTargets = nodeCandidates.filter(entry => isFocusedStar || promotedNodeIds.has(entry.id));

                                    nodeLinkTargets.forEach(nodePos => {
                                        const normalizedNode = nodePos.score / maxNodeScore;
                                        semanticConnections.push({
                                            id: `semantic-star-${star.folder.id}-${nodePos.id}`,
                                            x1: star.x,
                                            y1: star.y,
                                            x2: nodePos.x,
                                            y2: nodePos.y,
                                            strength: 0.18 + (normalizedNode * 0.3),
                                            animated: normalizedNode > 0.8,
                                            orbit: folderOrbitOffsets ? {
                                                x1: folderOrbitOffsets.map(o => star.x + o.x),
                                                y1: folderOrbitOffsets.map(o => star.y + o.y),
                                                x2: folderOrbitOffsets.map(o => nodePos.x + o.x),
                                                y2: folderOrbitOffsets.map(o => nodePos.y + o.y)
                                            } : undefined
                                        });
                                    });
                                });
                            });

                            return semanticConnections.map(connection => {
                                const baseOpacity = Math.min(0.85, 0.35 + (connection.strength * 0.6));
                                const hasOrbit = orbitActive && connection.orbit;
                                const x1 = (hasOrbit && connection.orbit?.x1) ? connection.orbit.x1 : connection.x1;
                                const y1 = (hasOrbit && connection.orbit?.y1) ? connection.orbit.y1 : connection.y1;
                                const x2 = (hasOrbit && connection.orbit?.x2) ? connection.orbit.x2 : connection.x2;
                                const y2 = (hasOrbit && connection.orbit?.y2) ? connection.orbit.y2 : connection.y2;
                                const transition = {
                                    duration: hasOrbit ? 18 : (connection.animated ? 3.5 : 0.9),
                                    repeat: (hasOrbit || connection.animated) ? Infinity : 0,
                                    ease: hasOrbit ? "linear" : "easeInOut"
                                };

                                return (
                                    <g key={connection.id}>
                                        {/* Primary Glow Line */}
                                        <motion.line
                                            x1={connection.x1}
                                            y1={connection.y1}
                                            x2={connection.x2}
                                            y2={connection.y2}
                                            animate={{ x1, y1, x2, y2, opacity: baseOpacity }}
                                            stroke="url(#semanticGradient)"
                                            strokeWidth={connection.animated ? 1.6 : 1.1}
                                            strokeLinecap="round"
                                            filter="url(#neuralGlow)"
                                            initial={{ opacity: 0 }}
                                            transition={transition}
                                        />

                                        {/* Core Light Thread */}
                                        <motion.line
                                            x1={connection.x1}
                                            y1={connection.y1}
                                            x2={connection.x2}
                                            y2={connection.y2}
                                            stroke="rgba(255,255,255,0.3)"
                                            strokeWidth={connection.animated ? 0.8 : 0.5}
                                            strokeLinecap="round"
                                            initial={{ opacity: 0 }}
                                            animate={{
                                                x1,
                                                y1,
                                                x2,
                                                y2,
                                                opacity: connection.animated ? [0.3, 0.7, 0.3] : connection.strength * 0.4
                                            }}
                                            transition={transition}
                                        />

                                        {/* Endpoint Glow */}
                                        <motion.circle
                                            cx={connection.x2}
                                            cy={connection.y2}
                                            r={connection.animated ? 0.45 : 0.3}
                                            fill="rgba(255,255,255,0.6)"
                                            animate={{
                                                cx: x2,
                                                cy: y2,
                                                opacity: connection.animated ? [0.4, 0.9, 0.4] : 0.45
                                            }}
                                            transition={transition}
                                        />
                                    </g>
                                );
                            });
                        })()}

                        {/* 🌌 CONSTELLATIONS - Parent-Child Relations (Option C) */}
                        {/* 🌌 CONSTELLATIONS - Parent-Child Relations (Option C) - REMOVED FOR STABILITY */}
                        {null}
                    </svg>
                )}


                {/* Planets - using fixed positioning with viewport units */}
                <div className="pointer-events-none">
                    <div className="pointer-events-auto">

                        {planetPositions.map(({ planet, x, y, delay }) => {
                            const isActive = planet.type === 'department'
                                ? planet.id === activeDepartmentId
                                : planet.id === activeCompanyId;
                            const isHoveredPlanet = hoveredPlanet === planet.id || heldPlanetId === planet.id;

                            return (
                                <div
                                    key={planet.id}
                                    className="fixed z-20"
                                    style={{
                                        left: `${x}vw`,
                                        top: `${y}vh`,
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                >
                                    {/* SUBTLE HOVER GLOW - Daily-Use Friendly */}
                                    {isHoveredPlanet && (
                                        <motion.div
                                            className="absolute rounded-full pointer-events-none"
                                            style={{
                                                left: '50%',
                                                top: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                width: 120,
                                                height: 120,
                                                background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
                                                filter: 'blur(15px)'
                                            }}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1.1, opacity: 0.6 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: 'easeOut' }}
                                        />
                                    )}
                                    {/* 2. Intelligence Overlays (Subtle) */}
                                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10" />
                                    <Planet
                                        department={planet}
                                        iconOverride={departmentIconMap.get(planet.id)}
                                        position={{ x: 0, y: 0 }}
                                        delay={delay}
                                        isActive={isActive}
                                        size={isActive ? 'lg' : 'md'}
                                        orbitActive={orbitActive}
                                        onClick={() => {
                                            if (planet.type === 'company') {
                                                // COMPLETE COMPANY SWITCH - Load all company data
                                                // NOTE: Do NOT change viewMode here - preserve current mode
                                                setActiveCompany(planet.id);
                                                loadDepartments(planet.id);
                                                // Load nodes for the new company (background stars)
                                                loadNodesForCompany(planet.id).catch(console.warn);
                                            } else {
                                                if (!spacesByDepartment[planet.id]) {
                                                    loadSpacesForDepartment(planet.id);
                                                }
                                                navigateToDepartment(planet.id);
                                            }
                                            // UPGRADE B1: Orbit shift animation on navigation
                                            setOrbitShiftActive(true);
                                            setPlanetOrbitActive(true);
                                            // INTELLIGENCE: Orb reacts to navigation
                                            setOrbState('thinking');
                                            setTimeout(() => setOrbState('focus'), 400); // Transition to focus

                                            // Navigation Action
                                            navigateToDepartment(planet.id);

                                            // REAL SYSTEM: Instant feedback (800ms transition)
                                            setOrbitShiftActive(true);
                                            setPlanetOrbitActive(true);
                                            setOrbState('focus');

                                            setTimeout(() => {
                                                setOrbitShiftActive(false);
                                                setPlanetOrbitActive(false);
                                                setOrbState('idle');
                                            }, 800);
                                        }}
                                        onHover={(hovered) => handlePlanetHover(planet.id, hovered)}
                                        onQuickFilesAccess={(clickPos) => {
                                            const paneId = 'finder-main';
                                            const paneWidth = 900;
                                            const paneHeight = 620;
                                            let posX = clickPos.x + 10;
                                            let posY = clickPos.y - 50;
                                            if (posX + paneWidth > window.innerWidth) {
                                                posX = clickPos.x - paneWidth - 10;
                                            }
                                            if (posY + paneHeight > window.innerHeight) {
                                                posY = window.innerHeight - paneHeight - 50;
                                            }
                                            if (posY < 50) posY = 50;

                                            openPane({
                                                id: paneId,
                                                type: 'finder',
                                                title: 'Finder',
                                                size: { width: paneWidth, height: paneHeight },
                                                position: { x: Math.floor(posX), y: Math.floor(posY) }
                                            });
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>


                {viewMode !== 'owner' && visibleMoonPositions.length > 0 && (
                    <div className="absolute inset-0 w-full h-full pointer-events-auto">
                        {visibleMoonPositions.map(({ space, x, y, delay, parentPlanet }) => {
                            const originX = parentPlanet?.x ?? x;
                            const originY = parentPlanet?.y ?? y;
                            const moonOrbitOffsets = parentPlanet
                                ? (moonOrbitOffsetMap.get(space.id) || getOrbitOffsets(originX, originY, x, y))
                                : null;
                            return (
                                <motion.div
                                    key={space.id}
                                    className="absolute"
                                    initial={{ scale: 0, opacity: 0 }}
                                    style={{
                                        left: `${x}vw`,
                                        top: `${y}vh`,
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                    animate={{
                                        scale: 1,
                                        opacity: 1,
                                        x: (orbitActive && moonOrbitOffsets) ? moonOrbitOffsets.map(o => o.x) : 0,
                                        y: (orbitActive && moonOrbitOffsets) ? moonOrbitOffsets.map(o => o.y) : 0
                                    }}
                                    transition={{
                                        delay,
                                        duration: orbitActive ? 18 : (orbitShiftActive ? 1.5 : 0.8),
                                        repeat: orbitActive ? Infinity : 0,
                                        ease: orbitActive ? "linear" : "easeInOut"
                                    }}
                                >
                                    <Star
                                        space={{
                                            id: space.id,
                                            name: space.name,
                                            department_id: space.departmentId,
                                            color: parentPlanet?.planet?.color || '#60A5FA', // Match planet hue
                                            description: space.description || undefined,
                                            folder_count: (foldersBySpace[space.id] || []).length
                                        }}
                                        position={{ x: '50%', y: '50%' }} // Center within wrapper
                                        delay={delay}
                                        isActive={activeSpaceId === space.id}
                                        size={(activeSpaceId === space.id || promotedMoonIds.has(space.id)) ? 'lg' : 'md'}
                                        orbitActive={orbitActive}
                                        isPromoted={promotedMoonIds.has(space.id)}
                                        isHoveredByPlanet={hoveredPlanet === space.departmentId || heldPlanetId === space.departmentId}
                                        onHover={(hovered) => {
                                            if (hovered && parentMoon?.space.departmentId) {
                                                schedulePlanetHold(parentMoon.space.departmentId);
                                            }
                                        }}
                                        onClick={() => {
                                            setOrbState('focus');
                                            navigateToSpace(space.id);
                                            setTimeout(() => setOrbState('idle'), 2000);
                                        }}
                                    />
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* STARS (Folders) orbiting moons */}
                {viewMode !== 'owner' && visibleFolderStarPositions.length > 0 && (
                    <div className="absolute inset-0 w-full h-full pointer-events-auto">
                        {visibleFolderStarPositions.map(({ folder, x, y, delay, parentMoon }) => {
                            const moonOrbitOffsets = parentMoon?.space.id
                                ? moonOrbitOffsetMap.get(parentMoon.space.id)
                                : null;

                            return (
                                <motion.div
                                    key={folder.id}
                                    className="absolute"
                                    initial={{ scale: 0, opacity: 0 }}
                                    style={{
                                        left: `${x}vw`,
                                        top: `${y}vh`,
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                    animate={{
                                        scale: 1,
                                        opacity: 1,
                                        x: (orbitActive && moonOrbitOffsets) ? moonOrbitOffsets.map(o => o.x) : 0,
                                        y: (orbitActive && moonOrbitOffsets) ? moonOrbitOffsets.map(o => o.y) : 0
                                    }}
                                    transition={{
                                        delay,
                                        duration: orbitActive ? 18 : (orbitShiftActive ? 1.8 : 0.6),
                                        repeat: orbitActive ? Infinity : 0,
                                        ease: orbitActive ? "linear" : (orbitShiftActive ? [0.25, 0.46, 0.45, 0.94] : "easeOut")
                                    }}
                                >
                                    <Folder
                                        folder={{
                                            id: folder.id,
                                            name: folder.name,
                                            space_id: parentMoon?.space.id,
                                            description: folder.description || '',
                                            node_count: nodesByFolder.get(folder.id)?.length || 0,
                                            type: 'folder'
                                        }}
                                        position={{ x: '50%', y: '50%' }}
                                        delay={delay}
                                        size={promotedFolderIds.has(folder.id) ? 'md' : 'sm'}
                                        isActive={activeFolderId === folder.id}
                                        orbitActive={orbitActive}
                                        isPromoted={promotedFolderIds.has(folder.id)}
                                        onHover={(hover) => {
                                            if (hover && parentMoon?.space.departmentId) {
                                                schedulePlanetHold(parentMoon.space.departmentId);
                                            }
                                        }}
                                        onClick={() => {
                                            setOrbState('focus');
                                            if (parentMoon?.space.id) {
                                                setActiveSpace(parentMoon.space.id);
                                            }
                                            if (parentMoon?.space.departmentId) {
                                                setActiveDepartment(parentMoon.space.departmentId);
                                            }
                                            navigateToFolder(folder.id);
                                            setTimeout(() => setOrbState('idle'), 1600);
                                        }}
                                    />
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Node Stars - Ambient knowledge particles throughout the universe */}
                {viewMode !== 'owner' && visibleNodeStarPositions.length > 0 && (
                    <div className="absolute inset-0 pointer-events-auto z-20">
                        {visibleNodeStarPositions.map(({ node, x, y, delay }) => {
                            const nodeOrbitOffsets = node.folder_id
                                ? folderOrbitOffsetMap.get(node.folder_id)
                                : moonOrbitOffsetMap.get(node.space_id);

                            return (
                                <motion.div
                                    key={node.id}
                                    className="absolute"
                                    style={{
                                        left: `${x}vw`,
                                        top: `${y}vh`,
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                    animate={{
                                        x: (orbitActive && nodeOrbitOffsets) ? nodeOrbitOffsets.map(o => o.x) : 0,
                                        y: (orbitActive && nodeOrbitOffsets) ? nodeOrbitOffsets.map(o => o.y) : 0
                                    }}
                                    transition={{
                                        duration: orbitActive ? 18 : 0.6,
                                        repeat: orbitActive ? Infinity : 0,
                                        ease: orbitActive ? "linear" : "easeOut"
                                    }}
                                >
                                    <NodeStar
                                        node={node}
                                        position={{ x: '50%', y: '50%' }}
                                        delay={delay}
                                        size="xs"
                                        isPromoted={promotedNodeIds.has(node.id)}
                                        onClick={() => {
                                            setOrbState('thinking');
                                            loadNodeDetails(node.id).catch(console.warn);
                                            setTimeout(() => setOrbState('idle'), 1400);
                                        }}
                                        onHover={(hover) => {
                                            if (hover) {
                                                if (orbitActive) {
                                                    clearConstellation();
                                                    return;
                                                }
                                                const deptId = spaceDepartmentMap.get(node.space_id) || focusPlanetId || null;
                                                if (deptId) {
                                                    schedulePlanetHold(deptId);
                                                }
                                                // Build map of current positions for the renderer
                                                const currentPosMap = new Map<string, { x: number, y: number }>();

                                                // Add visible stars (Folders) - keep VW/VH (0-100) to match SVG viewBox
                                                visibleFolderStarPositions.forEach(s => {
                                                    currentPosMap.set(s.folder.id, {
                                                        x: s.x,
                                                        y: s.y
                                                    });
                                                });

                                                // Add visible nodes (VW/VH)
                                                visibleNodeStarPositions.forEach(n => {
                                                    currentPosMap.set(n.node.id, {
                                                        x: n.x,
                                                        y: n.y
                                                    });
                                                });

                                                fetchConstellation(node.id, currentPosMap);
                                            } else {
                                                clearConstellation();
                                            }
                                        }}
                                    />
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════ */}
                {/* ✨ SEMANTIC CLUSTER - Important Nodes Constellation (Production Version) */}
                {/* Shows semantic relationships between high-connection nodes */}
                {/* ═══════════════════════════════════════════════════════════════════════════ */}

                {/* BOOT SEQUENCE / SILENT STATE */}


                {/* Department Creation Wizard */}
                <DepartmentWizard
                    isOpen={isWizardOpen}
                    onClose={handleWizardClose}
                    companyId={activeCompanyId || ''}
                />
            </div>
        </div>
    );
};
