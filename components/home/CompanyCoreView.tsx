"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Planet } from '@/components/mora/Planet';
import { Star } from '@/components/mora/Star';
import { NodeStar } from '@/components/mora/NodeStar';
import { useMoraStore } from '@/lib/store/moraState';
import { fetchAwarenessPulse, type OrbState } from '@/lib/api/awarenessClient';
import { useUser } from '@/lib/hooks/useUser';
import { X, Activity, TrendingUp, Zap, Sparkles, Clock, Users, PlusCircle, Trash2, RefreshCw } from 'lucide-react';
import { MoraOrb } from '@/components/mora/MoraOrb';
import { CursorAgent } from '@/components/mora/CursorAgent'; // UPGRADE D1
import { useSemanticStore } from '@/lib/store/semanticStore'; // UPGRADE E1
import { toast } from '@/lib/toast';
import { MOCK_DATA } from '@/lib/data/mockData';
import { useOrbitalPhysics } from '@/lib/hooks/useOrbitalPhysics';
import { useSemanticConstellation } from '@/lib/hooks/useSemanticConstellation'; // UPGRADE E2
import { SemanticLinesRenderer } from '@/components/semantic/SemanticLinesRenderer'; // UPGRADE E2
import { useIntelligenceStore } from '@/lib/store/intelligenceStore'; // UPGRADE P4


/**
 * COMPANY CORE VIEW — TESLA-STYLE REDESIGN + MASTERBIBEL PREMIUM
 * 
 * CRITICAL FIXES:
 * - Max 10 Departments (prevents infinite loop)
 * - Lazy load spaces on hover/click (prevents 429)
 * - Debounced API calls
 * 
 * MASTERBIBEL + Tesla Design Language:
 * - Massive scale: Use the entire viewport
 * - Monochrome palette with emerald accents
 * - Glass morphism everywhere
 * - Minimal but impactful
 * - Orb = SUN, fixed bottom-right (48px from edges)
 */

// ⚡ MAX DEPARTMENTS LIMIT - prevents infinite loop
const MAX_DEPARTMENTS = 10;

export const CompanyCoreView: React.FC = () => {
    const {
        viewMode,
        setViewMode,
        departments,
        loadDepartments,
        navigateToDepartment,
        activeDepartmentId,
        activeCompanyId,
        spacesByDepartment,
        loadSpacesForDepartment,
        navigateToSpace,
        foldersBySpace,
        loadFoldersForSpace,
        navigateToFolder,
        addDepartment,
        deleteDepartment,
        activeSpaceId,
        nodesByCompany,
        loadNodesForCompany,
        orbState: storeOrbState,
        setOrbState,
        orbNotifications,
        companies,
        loadCompanies,
        setActiveCompany,
        isLoadingDepartments,
        isLoadingCompanies
    } = useMoraStore();

    const { role, user } = useUser();
    const { center, isReady } = useOrbitalPhysics(); // PHASE 1 FIX
    const [apiOrbState, setApiOrbState] = useState<OrbState>('idle');
    const [isHovered, setIsHovered] = useState(false);
    const [planetOrbitActive, setPlanetOrbitActive] = useState(false);
    const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
    const [showHealthPanel, setShowHealthPanel] = useState(false);
    const [orbitShiftActive, setOrbitShiftActive] = useState(false); // UPGRADE B1: Orbit shift animations
    const [cosmicMode, setCosmicMode] = useState(true); // UPGRADE F1: Cosmic passive mode
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

    const handleCreateDepartment = async () => {
        const name = window.prompt("Neuen Planeten (Department) anlegen", "New Planet");
        if (!name || !name.trim()) return;
        try {
            await (addDepartment as any)({ name: name.trim() });
            await loadDepartments(activeCompanyId || undefined);
            toast.success("Planet angelegt");
        } catch (e: any) {
            toast.error(e?.message || "Create failed");
        }
    };

    const handleDeleteDepartment = async () => {
        if (!activeDepartmentId) {
            toast.error("Kein Planet ausgewählt");
            return;
        }
        if (!window.confirm("Diesen Planeten wirklich löschen?")) return;
        try {
            await (deleteDepartment as any)(activeDepartmentId);
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

    // UPGRADE D1: Cursor Agent state
    const [cursorAgent, setCursorAgent] = useState<{
        active: boolean;
        action: 'idle' | 'highlight' | 'point' | 'roam';
        target?: { x: number; y: number };
    }>({
        active: false,
        action: 'idle'
    });

    // 🔥 FIX: Track which departments have been loaded to prevent duplicate calls
    const loadedDeptIds = useRef<Set<string>>(new Set());
    const isLoadingSpacesRef = useRef<boolean>(false);

    // 🌌 UNIVERSE INITIALIZATION PER COMPANY/USER - Tesla-Style Consistency
    // Orbital-Konfiguration basierend auf companyId + userId für konsistente Universen
    const universeSeed = useMemo(() => {
        const userId = user?.user_id || 'anonymous';
        return `${activeCompanyId}-${userId}`;
    }, [activeCompanyId, user?.user_id]);

    const isLoading = isLoadingDepartments || isLoadingCompanies;

    // 🔥 FIX: Debounced space loading - only on hover
    const handlePlanetHover = useCallback((deptId: string, hovered: boolean) => {
        setHoveredPlanet(hovered ? deptId : null);

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
    }, [spacesByDepartment, loadSpacesForDepartment]);

    // Load companies first
    useEffect(() => {
        if ((companies?.length || 0) === 0) {
            loadCompanies();
        }
    }, [companies?.length, loadCompanies]);

    // Auto-activate correct company based on viewMode
    useEffect(() => {
        console.log('🔍 CompanyCoreView State:', {
            companiesCount: companies?.length || 0,
            activeCompanyId,
            viewMode,
            companies: companies?.map(c => ({ id: c.id, name: c.name, is_demo: c.is_demo })) || []
        });

        if ((companies?.length || 0) > 0 && !activeCompanyId) {
            let targetCompany;

            if (viewMode === 'demo') {
                // DEMO: Find demo company (Simple Coffee Group)
                targetCompany = companies.find(c => c.is_demo === true);
                if (!targetCompany) {
                    targetCompany = companies.find(c => c.name.toLowerCase().includes('coffee'));
                }
                if (!targetCompany) {
                    targetCompany = companies.find(c => !c.name.toLowerCase().includes('saimor'));
                }
            } else {
                // WORKSPACE/OWNER: Find user's OWN company (NOT demo)
                // Priority: 1. Company with "saimor" in name, 2. Any non-demo company, 3. First company
                targetCompany = companies.find(c => c.name.toLowerCase().includes('saimor') && !c.is_demo);
                if (!targetCompany) {
                    targetCompany = companies.find(c => !c.is_demo);
                }
                if (!targetCompany) {
                    targetCompany = companies[0]; // Fallback to first
                }
            }

            if (targetCompany) {
                console.log('✅ AUTO-ACTIVATING COMPANY:', targetCompany.name, '(is_demo:', targetCompany.is_demo, ')');
                setActiveCompany(targetCompany.id);
            } else {
                console.error('❌ No suitable company found! Companies:', companies.map(c => c.name));
            }
        }
    }, [companies, activeCompanyId, viewMode, setActiveCompany]);

    // Load departments when company is active - FORCE RELOAD on company change
    useEffect(() => {
        console.log('📊 Department Load Check:', {
            activeCompanyId,
            departmentsCount: departments.length,
            shouldLoad: !!activeCompanyId
        });

        if (activeCompanyId) {
            console.log('📡 LOADING DEPARTMENTS for company:', activeCompanyId);
            loadDepartments(activeCompanyId);
        }
    }, [activeCompanyId, loadDepartments, departments.length]);

    // Load nodes for current company - FORCE RELOAD on company change
    useEffect(() => {
        if (activeCompanyId && !nodesByCompany[activeCompanyId]) {
            console.log('🌟 LOADING NODES for company:', activeCompanyId);
            loadNodesForCompany(activeCompanyId);
        }
    }, [activeCompanyId, nodesByCompany, loadNodesForCompany]);

    // 🔥 FIX: REMOVED auto-loading of all spaces! 
    // Spaces are now loaded on-demand (hover/click) via handlePlanetHover

    // Awareness pulse
    useEffect(() => {
        const loadAwareness = async () => {
            try {
                const pulse = await fetchAwarenessPulse();
                setApiOrbState(pulse.state);
            } catch (error) {
                console.error('Awareness fetch failed:', error);
            }
        };
        loadAwareness();
        const interval = setInterval(loadAwareness, 10000);
        return () => clearInterval(interval);
    }, []);

    const finalOrbState = storeOrbState || apiOrbState;

    // TESLA-STYLE: Minimal data, maximum impact
    // 🔥 FIX: Limit to MAX_DEPARTMENTS (10) to prevent performance issues
    // ✨ UNIQUE DEPARTMENTS: Ensure each department symbol is unique and distinguishable
    const visiblePlanets = useMemo(() => {
        if (viewMode === 'owner') {
            return companies.slice(0, 6).map(company => ({
                id: company.id,
                name: company.name,
                color: company.is_demo ? '#3B82F6' : '#10B981', // Blue for demo, green for real
                description: company.description || '',
                type: 'company' as const
            }));
        }

        // UNIQUE DEPARTMENT LOGIC: Filter for distinct, non-duplicate departments
        const uniqueDepartments = departments
            .filter((dept, index, arr) =>
                // Remove exact duplicates by name
                arr.findIndex(d => d.name.toLowerCase() === dept.name.toLowerCase()) === index
            )
            .slice(0, MAX_DEPARTMENTS); // Still limit for performance

        return uniqueDepartments.map(dept => ({
            id: dept.id,
            name: dept.name,
            color: dept.color || '#10B981',
            description: dept.name,
            type: 'department' as const
        }));
    }, [viewMode, companies, departments]);

    const visibleSpaces = useMemo(() => {
        if (viewMode === 'owner') return [];

        // Use the same unique departments filtering as planets
        const uniqueDepartments = departments
            .filter((dept, index, arr) =>
                arr.findIndex(d => d.name.toLowerCase() === dept.name.toLowerCase()) === index
            )
            .slice(0, 6); // Limit for performance

        return uniqueDepartments.flatMap(dept => {
            const deptSpaces = spacesByDepartment[dept.id] || [];
            // UNIQUE SPACES: Also filter for distinct space names
            const uniqueSpaces = deptSpaces.filter((space, index, arr) =>
                arr.findIndex(s => s.name.toLowerCase() === space.name.toLowerCase()) === index
            );
            return uniqueSpaces.slice(0, 2).map(space => ({ // Max 2 spaces per dept
                ...space,
                departmentId: dept.id
            }));
        });
    }, [viewMode, departments, spacesByDepartment]);

    // UPGRADE B1: Visible folders (stars) computation
    const visibleFolders = useMemo(() => {
        if (viewMode === 'owner') return [];

        // Get folders for visible spaces only (limited to avoid overload)
        return visibleSpaces.flatMap(space => {
            const spaceFolders = foldersBySpace[space.id] || [];
            // UNIQUE FOLDERS: Filter for distinct folder names
            const uniqueFolders = spaceFolders.filter((folder, index, arr) =>
                arr.findIndex(f => f.name.toLowerCase() === folder.name.toLowerCase()) === index
            );
            return uniqueFolders.slice(0, 3).map(folder => ({ // Max 3 folders per space
                ...folder,
                spaceId: space.id
            }));
        });
    }, [viewMode, visibleSpaces, foldersBySpace]);

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

        // VIEWPORT-BASED POSITIONING with seeded variation
        // Base center with slight variation (±5vw, ±3vh)
        const centerX = 50 + (seededRandom(1) - 0.5) * 10; // 45-55vw
        const centerY = 45 + (seededRandom(2) - 0.5) * 6;  // 42-48vh

        // Orbit radius with variation (15-22vw)
        const orbitRadiusX = 15 + seededRandom(3) * 7;
        const orbitRadiusY = 12 + seededRandom(4) * 6;

        // Start angle variation (seeded)
        const startAngle = -Math.PI / 2 + (seededRandom(5) - 0.5) * Math.PI / 4;
        const angleStep = (2 * Math.PI) / count;

        return visiblePlanets.map((planet, i) => {
            // Each planet gets a slight individual offset too
            const planetSeed = seed + planet.id.charCodeAt(0);
            const individualOffset = (Math.sin(planetSeed) * 0.5 + 0.5) * 2 - 1; // -1 to 1

            const angle = startAngle + (i * angleStep) + (individualOffset * 0.1);

            // Calculate position as VIEWPORT UNITS
            const x = centerX + Math.cos(angle) * orbitRadiusX;
            const y = centerY + Math.sin(angle) * orbitRadiusY;

            return {
                planet,
                x, // vw units
                y, // vh units
                angle,
                radius: orbitRadiusX,
                delay: i * 0.1
            };
        });
    }, [visiblePlanets, activeCompanyId]);

    // UPGRADE B1: Moons (Spaces) orbiting planets with enhanced positioning
    const moonPositions = useMemo(() => {
        if (visibleSpaces.length === 0) return [];

        return visibleSpaces.map((space, i) => {
            // Find parent planet position
            const parentPlanet = planetPositions.find(p => p.planet.id === space.departmentId);

            if (!parentPlanet) {
                return {
                    space,
                    x: (Math.random() - 0.5) * 800,
                    y: (Math.random() - 0.5) * 600,
                    delay: i * 0.05,
                    orbitRadius: 0,
                    orbitAngle: 0
                };
            }

            // UPGRADE B1: Smart moon positioning around planets
            const planetSpaceCount = visibleSpaces.filter(s => s.departmentId === space.departmentId).length;
            const moonIndex = visibleSpaces.filter(s => s.departmentId === space.departmentId)
                .findIndex(s => s.id === space.id);

            // Distribute moons evenly around the planet
            const moonAngle = (moonIndex / Math.max(planetSpaceCount, 1)) * Math.PI * 2;
            const orbitRadius = 85 + (moonIndex * 8); // Increasing orbit distance

            // Calculate moon position relative to planet
            const moonX = Math.cos(moonAngle) * orbitRadius;
            const moonY = Math.sin(moonAngle) * orbitRadius;

            return {
                space,
                x: parentPlanet.x + moonX,
                y: parentPlanet.y + moonY,
                delay: i * 0.06,
                orbitRadius,
                orbitAngle: moonAngle,
                parentPlanet: parentPlanet
            };
        });
    }, [visibleSpaces, planetPositions]);

    // UPGRADE B1: Stars (Folders) orbiting moons
    const starPositions = useMemo(() => {
        if (visibleFolders.length === 0) return [];

        return visibleFolders.map((folder, i) => {
            // Find parent moon (space) position
            const parentMoon = moonPositions.find(m => m.space.id === folder.spaceId);

            if (!parentMoon) {
                return {
                    folder,
                    x: (Math.random() - 0.5) * 600,
                    y: (Math.random() - 0.5) * 400,
                    delay: i * 0.03,
                    orbitRadius: 0,
                    orbitAngle: 0
                };
            }

            // UPGRADE B1: Stars orbit around their moons
            const moonFolderCount = visibleFolders.filter(f => f.spaceId === folder.spaceId).length;
            const starIndex = visibleFolders.filter(f => f.spaceId === folder.spaceId)
                .findIndex(f => f.id === folder.id);

            // Distribute stars around the moon
            const starAngle = (starIndex / Math.max(moonFolderCount, 1)) * Math.PI * 2;
            const orbitRadius = 35 + (starIndex * 4); // Tighter orbit around moons

            const starX = Math.cos(starAngle) * orbitRadius;
            const starY = Math.sin(starAngle) * orbitRadius;

            return {
                folder,
                x: parentMoon.x + starX,
                y: parentMoon.y + starY,
                delay: i * 0.04,
                orbitRadius,
                orbitAngle: starAngle,
                parentMoon: parentMoon
            };
        });
    }, [visibleFolders, moonPositions]);


    // Node Stars - Distributed throughout the universe (UNIQUE NODES)
    const nodeStarPositions = useMemo(() => {
        const currentNodes = activeCompanyId ? nodesByCompany[activeCompanyId] || [] : [];
        if (currentNodes.length === 0) return [];

        // UNIQUE NODES: Filter for distinct node titles to prevent duplicates
        const uniqueNodes = currentNodes.filter((node, index, arr) =>
            arr.findIndex(n => n.title?.toLowerCase() === node.title?.toLowerCase()) === index
        );

        // Generate positions based on company seed for consistency
        const seed = universeSeed;
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash = hash & hash;
        }

        return uniqueNodes.slice(0, 50).map((node, i) => { // Limit to 50 nodes for performance
            // Deterministic positioning based on node ID and company seed
            const nodeSeed = hash + node.id.charCodeAt(0) + node.id.charCodeAt(node.id.length - 1);
            const seededRandom = (offset: number) => {
                const x = Math.sin(nodeSeed + offset + i * 2.1) * 10000;
                return x - Math.floor(x);
            };

            // Distribute across the entire viewport with some clustering around planets
            const viewportWidth = 1200; // Approximate viewport width
            const viewportHeight = 800; // Approximate viewport height

            // Base position: random within viewport
            let x = seededRandom(0) * viewportWidth - viewportWidth / 2;
            let y = seededRandom(100) * viewportHeight - viewportHeight / 2;

            // Add some clustering around planets (30% chance)
            if (seededRandom(200) < 0.3 && planetPositions.length > 0) {
                const randomPlanet = planetPositions[Math.floor(seededRandom(300) * planetPositions.length)];
                const clusterDistance = 200 + seededRandom(400) * 300; // 200-500px from planet
                const clusterAngle = seededRandom(500) * Math.PI * 2;
                x = randomPlanet.x + Math.cos(clusterAngle) * clusterDistance;
                y = randomPlanet.y + Math.sin(clusterAngle) * clusterDistance;
            }

            return {
                node,
                x,
                y,
                delay: i * 0.02 // Staggered animation
            };
        });
    }, [activeCompanyId, nodesByCompany, universeSeed, planetPositions]);

    // UPGRADE E2: Semantic Constellation State
    const { connections, fetchConstellation, clearConstellation } = useSemanticConstellation();

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

    // ═══════════════════════════════════════════════════════════════════════════
    // SEMANTIC HIERARCHY SYSTEM - Star to Moon Promotion ("Nervous System")
    // ═══════════════════════════════════════════════════════════════════════════
    const MOON_PROMOTION_THRESHOLD = 5; // Nodes with 5+ connections become moons

    // Calculate connection counts for each node (simulated based on folder/space relationships)
    const nodeConnectionCounts = useMemo(() => {
        const counts = new Map<string, number>();
        const currentNodes = activeCompanyId ? nodesByCompany[activeCompanyId] || [] : [];

        currentNodes.forEach(node => {
            // Base connections from folder structure
            let connectionCount = 0;

            // Count nodes in same space (semantic siblings)
            const siblingsInSpace = currentNodes.filter(n =>
                n.space_id === node.space_id && n.id !== node.id
            ).length;
            connectionCount += Math.min(siblingsInSpace, 3); // Cap at 3 per source

            // Bonus for nodes with rich metadata/tags
            if (node.metadata?.tags && Array.isArray(node.metadata.tags)) {
                connectionCount += node.metadata.tags.length;
            }

            // Bonus for high-weight/important nodes
            if (node.metadata?.weight && node.metadata.weight > 0.5) {
                connectionCount += 2;
            }

            counts.set(node.id, connectionCount);
        });

        return counts;
    }, [activeCompanyId, nodesByCompany]);

    // Promoted Moons: Stars that have grown important enough to become moons
    // These are visible in the HOME view, orbiting their parent planets
    const promotedMoons = useMemo(() => {
        if (viewMode === 'owner') return [];

        return nodeStarPositions
            .filter(({ node }) => {
                const connectionCount = nodeConnectionCounts.get(node.id) || 0;
                return connectionCount >= MOON_PROMOTION_THRESHOLD;
            })
            .map(({ node, x, y, delay }, index) => {
                // Find the parent planet (department) for this node
                const parentDept = departments.find(d =>
                    spacesByDepartment[d.id]?.some(space => space.id === node.space_id)
                );
                const parentPlanet = planetPositions.find(p => p.planet.id === parentDept?.id);

                if (!parentPlanet) {
                    return { node, x, y, delay, connectionCount: nodeConnectionCounts.get(node.id) || 0, promotion: 'moon' as const };
                }

                // Position moon in orbit around its parent planet
                const orbitRadius = 120 + (index % 3) * 30; // Varying orbit distances
                const orbitAngle = (index / Math.max(nodeStarPositions.length, 1)) * Math.PI * 2;

                return {
                    node,
                    x: parentPlanet.x + Math.cos(orbitAngle) * (orbitRadius / 10), // Convert to vw
                    y: parentPlanet.y + Math.sin(orbitAngle) * (orbitRadius / 10), // Convert to vh
                    delay: delay + 0.2,
                    connectionCount: nodeConnectionCounts.get(node.id) || 0,
                    promotion: 'moon' as const,
                    parentPlanet
                };
            });
    }, [nodeStarPositions, nodeConnectionCounts, viewMode, departments, spacesByDepartment, planetPositions]);

    // Orb parameters - TESLA-STYLE
    const getOrbParams = () => {
        const baseSize = isHovered ? 140 : 130; // MASSIVE
        switch (finalOrbState) {
            case 'alert':
                return { size: baseSize, color: '#EF4444', glowIntensity: 80 };
            case 'focus':
                return { size: baseSize, color: '#10B981', glowIntensity: 70 };
            case 'thinking':
                return { size: baseSize, color: '#3B82F6', glowIntensity: 60 };
            case 'insight':
                return { size: baseSize, color: '#D4AF37', glowIntensity: 75 };
            default:
                return { size: baseSize, color: '#10B981', glowIntensity: 50 };
        }
    };

    const orbParams = getOrbParams();

    const currentCompany = companies.find(c => c.id === activeCompanyId);

    // Company-specific starfield generation
    const stableStars = useMemo(() => {
        // Use company-specific seed for deterministic but unique starfields
        const seed = universeSeed;
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }

        return Array.from({ length: 300 }, (_, i) => {
            // Deterministic pseudo-random based on seed + index
            const seededRandom = (seed: number) => {
                const x = Math.sin(seed + i * 7.3) * 10000;
                return x - Math.floor(x);
            };

            const cx = seededRandom(hash + i) * 100;
            const cy = seededRandom(hash + i + 100) * 100;
            const size = seededRandom(hash + i + 200) < 0.1 ? 1.8 :
                seededRandom(hash + i + 300) < 0.3 ? 1 : 0.5;
            const brightness = seededRandom(hash + i + 400) < 0.1 ? 0.7 :
                seededRandom(hash + i + 500) < 0.3 ? 0.4 : 0.25;
            const colorIndex = Math.floor(seededRandom(hash + i + 600) * 5);
            const color = colorIndex === 0 ? '#D4AF37' :
                colorIndex === 1 ? '#10B981' :
                    colorIndex === 2 ? '#3B82F6' : '#FFFFFF';
            const hasGlow = seededRandom(hash + i + 700) < 0.2;

            return {
                id: i,
                cx,
                cy,
                size,
                brightness,
                color,
                hasGlow,
                duration: 4 + (seededRandom(hash + i + 800) * 5)
            };
        });
    }, [universeSeed]);



    return (
        <div className="relative w-full h-full overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f1c18] via-[#030806] to-[#000000]">
            {/* Control Bar: Planets CRUD */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-lg">
                <button
                    onClick={handleCreateDepartment}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 text-xs uppercase tracking-wide"
                >
                    <PlusCircle size={14} />
                    Add Planet
                </button>
                <button
                    onClick={handleDeleteDepartment}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-100 text-xs uppercase tracking-wide"
                >
                    <Trash2 size={14} />
                    Delete Planet
                </button>
                <button
                    onClick={handleReloadDepartments}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 text-xs uppercase tracking-wide"
                >
                    <RefreshCw size={14} />
                    Reload
                </button>
            </div>
            {/* TESLA-STYLE: Multi-layered Nebula System with Atmospheric Depth */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Primary Nebula Layer - Deep Space Glow */}
                <motion.div
                    className="absolute top-[-15%] left-[15%] w-[900px] h-[900px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 40%, transparent 70%)',
                        filter: 'blur(120px)',
                    }}
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.15, 0.25, 0.15],
                        x: [0, 30, 0], // UPGRADE B2: Drifting atmosphere
                        y: [0, -20, 0]
                    }}
                    transition={{
                        duration: 20, // Slower for calm feel
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                />

                {/* Secondary Nebula Layer - Cosmic Dust */}
                <motion.div
                    className="absolute bottom-[-25%] right-[5%] w-[700px] h-[700px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, rgba(59,130,246,0.04) 50%, transparent 70%)',
                        filter: 'blur(100px)',
                    }}
                    animate={{
                        scale: [1.1, 1, 1.1],
                        opacity: [0.12, 0.18, 0.12],
                        x: [0, -40, 0],
                        y: [0, 30, 0]
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 2
                    }}
                />

                {/* Tertiary Layer - Subtle Energy Fields */}
                <motion.div
                    className="absolute top-[30%] right-[25%] w-[500px] h-[500px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 60%)',
                        filter: 'blur(80px)',
                    }}
                    animate={{
                        scale: [0.9, 1.2, 0.9],
                        opacity: [0.08, 0.15, 0.08],
                        x: [0, 20, 0],
                        y: [0, 20, 0]
                    }}
                    transition={{
                        duration: 30,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 4
                    }}
                />

                {/* REMOVED COSMIC PARTICLES (Safety Fix) */}

                {/* LIGHT RAYS - Tesla-Style Energy Beams */}
                <svg className="absolute inset-0 w-full h-full">
                    <defs>
                        <linearGradient id="lightRay" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(16,185,129,0.1)" stopOpacity="0" />
                            <stop offset="50%" stopColor="rgba(16,185,129,0.3)" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="rgba(16,185,129,0.1)" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Central Light Rays from Orb */}
                    <motion.line
                        x1="50%"
                        y1="50%"
                        x2="50%"
                        y2="10%"
                        stroke="url(#lightRay)"
                        strokeWidth="2"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.6, 0] }}
                        transition={{ duration: 4, repeat: Infinity, delay: 0 }}
                    />
                    <motion.line
                        x1="50%"
                        y1="50%"
                        x2="70%"
                        y2="20%"
                        stroke="url(#lightRay)"
                        strokeWidth="1.5"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.4, 0] }}
                        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                    />
                    <motion.line
                        x1="50%"
                        y1="50%"
                        x2="30%"
                        y2="25%"
                        stroke="url(#lightRay)"
                        strokeWidth="1.5"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.4, 0] }}
                        transition={{ duration: 6, repeat: Infinity, delay: 2 }}
                    />
                </svg>
            </div>
            {/* MASTERBIBEL: Premium animated starfield with constellations */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                    <radialGradient id="sunGlow" cx="90%" cy="90%" r="50%">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                    <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <rect width="100%" height="100%" fill="url(#sunGlow)" />

                {/* UPGRADE F1: Enhanced starfield with cosmic passive mode */}
                {/* STATIC STARS - 100% Hardcoded to prevent Hydration Mismatch */}
                <g opacity="0.5">
                    <circle cx="10%" cy="15%" r="1" fill="#ffffff" opacity="0.3" />
                    <circle cx="25%" cy="8%" r="0.8" fill="#D4AF37" opacity="0.4" />
                    <circle cx="40%" cy="22%" r="1.2" fill="#ffffff" opacity="0.25" />
                    <circle cx="55%" cy="5%" r="0.6" fill="#ffffff" opacity="0.35" />
                    <circle cx="70%" cy="18%" r="1" fill="#D4AF37" opacity="0.3" />
                    <circle cx="85%" cy="12%" r="0.7" fill="#ffffff" opacity="0.4" />
                    <circle cx="15%" cy="35%" r="0.9" fill="#ffffff" opacity="0.3" />
                    <circle cx="30%" cy="42%" r="1.1" fill="#D4AF37" opacity="0.25" />
                    <circle cx="50%" cy="38%" r="0.8" fill="#ffffff" opacity="0.35" />
                    <circle cx="65%" cy="45%" r="1" fill="#ffffff" opacity="0.3" />
                    <circle cx="80%" cy="32%" r="0.6" fill="#D4AF37" opacity="0.4" />
                    <circle cx="92%" cy="48%" r="0.9" fill="#ffffff" opacity="0.25" />
                    <circle cx="5%" cy="55%" r="1" fill="#ffffff" opacity="0.35" />
                    <circle cx="20%" cy="62%" r="0.7" fill="#D4AF37" opacity="0.3" />
                    <circle cx="35%" cy="58%" r="1.2" fill="#ffffff" opacity="0.25" />
                    <circle cx="48%" cy="65%" r="0.8" fill="#ffffff" opacity="0.4" />
                    <circle cx="60%" cy="52%" r="1" fill="#D4AF37" opacity="0.3" />
                    <circle cx="75%" cy="68%" r="0.6" fill="#ffffff" opacity="0.35" />
                    <circle cx="88%" cy="72%" r="0.9" fill="#ffffff" opacity="0.25" />
                    <circle cx="12%" cy="78%" r="1.1" fill="#D4AF37" opacity="0.3" />
                    <circle cx="28%" cy="85%" r="0.7" fill="#ffffff" opacity="0.4" />
                    <circle cx="42%" cy="82%" r="1" fill="#ffffff" opacity="0.25" />
                    <circle cx="58%" cy="88%" r="0.8" fill="#D4AF37" opacity="0.35" />
                    <circle cx="72%" cy="92%" r="1.2" fill="#ffffff" opacity="0.3" />
                    <circle cx="90%" cy="85%" r="0.6" fill="#ffffff" opacity="0.4" />
                </g>
            </svg>

            {/* TESLA Header - Minimal */}
            {currentCompany && viewMode !== 'owner' && (
                <motion.div
                    className="absolute top-8 left-1/2 -translate-x-1/2 z-elevated"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="glass-panel px-8 py-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-2 h-2 rounded-full ${viewMode === 'demo' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                            <h1 className="text-2xl font-light tracking-[0.3em] text-white/90">
                                {currentCompany.name.toUpperCase()}
                            </h1>
                        </div>
                        <div className="mt-2 text-xs text-white/40 font-mono tracking-widest">
                            {visiblePlanets.length} DEPARTMENTS • {visibleSpaces.length} SPACES
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Center State */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <h1 className="text-6xl font-extralight tracking-[0.5em] text-white/50 mb-4">
                        SAIMÔR
                    </h1>
                    <p className="text-sm text-white/30 font-light tracking-[0.3em]">
                        {isLoading ? 'INITIALIZING...' :
                            visiblePlanets.length > 0 ? `${visiblePlanets.length} ORBITAL SYSTEMS` :
                                'NO DATA'}
                    </p>
                </motion.div>
            </div>

            {/* ORBITAL SYSTEM - Bottom Right Origin (MASTERBIBEL) */}
            <div
                className="absolute z-floating"
                style={{
                    bottom: 100, // Increased to ensure full visibility (Orb radius ~70px + padding)
                    right: 100,
                    width: 0,
                    height: 0,
                    overflow: 'visible'
                }}
            >
                {/* MASTERBIBEL: Mycelium Connection Lines - Department to Stars */}
                {viewMode !== 'owner' && (
                    <svg
                        className="absolute pointer-events-none"
                        style={{
                            top: -600,
                            left: -600,
                            width: 1200,
                            height: 1200,
                            overflow: 'visible'
                        }}
                    >
                        <defs>
                            <linearGradient id="myceliumGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.3" />
                            </linearGradient>
                        </defs>
                        {/* UPGRADE B1: Enhanced mycelium connections - Planet to Moon to Star */}
                        {planetPositions.map(({ planet, x: px, y: py }) => {
                            if (planet.type !== 'department') return null;
                            const planetMoons = moonPositions.filter(m => m.space.departmentId === planet.id);
                            return planetMoons.map((moon, moonIdx) => (
                                <g key={`connections-${planet.id}-${moon.space.id}`}>
                                    {/* Planet to Moon connection */}
                                    <motion.line
                                        x1={600 + px}
                                        y1={600 + py}
                                        x2={600 + moon.x}
                                        y2={600 + moon.y}
                                        stroke="url(#myceliumGradient)"
                                        strokeWidth="0.8"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{
                                            pathLength: 1,
                                            opacity: hoveredPlanet === planet.id ? 0.5 : 0.15
                                        }}
                                        transition={{
                                            duration: 1.2,
                                            delay: moonIdx * 0.1
                                        }}
                                    />

                                    {/* Moon to Stars connections */}
                                    {moon.space.id && starPositions
                                        .filter(star => star.parentMoon?.space.id === moon.space.id)
                                        .map((star, starIdx) => (
                                            <motion.line
                                                key={`moon-star-${moon.space.id}-${star.folder.id}`}
                                                x1={600 + moon.x}
                                                y1={600 + moon.y}
                                                x2={600 + star.x}
                                                y2={600 + star.y}
                                                stroke="url(#myceliumGradient)"
                                                strokeWidth="0.4"
                                                initial={{ pathLength: 0, opacity: 0 }}
                                                animate={{
                                                    pathLength: 1,
                                                    opacity: hoveredPlanet === planet.id ? 0.3 : 0.08
                                                }}
                                                transition={{
                                                    duration: 0.8,
                                                    delay: moonIdx * 0.1 + starIdx * 0.05 + 0.3
                                                }}
                                            />
                                        ))}
                                </g>
                            ));
                        })}
                    </svg>
                )}

                {/* UPGRADE E1: Semantic Constellations - SVG-based connection visualization */}
                {viewMode !== 'owner' && (
                    <svg
                        className="absolute pointer-events-none"
                        style={{
                            top: -400,
                            left: -400,
                            width: 800,
                            height: 800,
                            overflow: 'visible'
                        }}
                    >
                        <defs>
                            <linearGradient id="semanticGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#10B981" stopOpacity="0.6" />
                                <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.6" />
                            </linearGradient>
                        </defs>

                        {/* Render semantic constellation lines */}
                        {(() => {
                            // UPGRADE E1: Generate semantic connections between visible entities
                            const connections: Array<{
                                id: string;
                                x1: number;
                                y1: number;
                                x2: number;
                                y2: number;
                                strength: number;
                                animated: boolean;
                            }> = [];

                            // Connect planets to their moons
                            planetPositions.forEach(planet => {
                                const planetMoons = moonPositions.filter(m => m.parentPlanet?.planet?.id === planet.planet?.id);
                                planetMoons.forEach(moon => {
                                    connections.push({
                                        id: `semantic-${planet.planet.id}-${moon.space.id}`,
                                        x1: 400 + planet.x,
                                        y1: 400 + planet.y,
                                        x2: 400 + moon.x,
                                        y2: 400 + moon.y,
                                        strength: 0.8,
                                        animated: false
                                    });
                                });
                            });

                            // Connect moons to their stars
                            moonPositions.forEach(moon => {
                                const moonStars = starPositions.filter(s => s.parentMoon?.space.id === moon.space.id);
                                moonStars.forEach(star => {
                                    connections.push({
                                        id: `semantic-${moon.space.id}-${star.folder.id}`,
                                        x1: 400 + moon.x,
                                        y1: 400 + moon.y,
                                        x2: 400 + star.x,
                                        y2: 400 + star.y,
                                        strength: 0.6,
                                        animated: false
                                    });
                                });
                            });

                            // Phase 8.4: Node-to-Node Semantic Constellations (Ambient Intelligence)
                            // Connect nearby nodes if they share type or have high weight
                            nodeStarPositions.forEach((nodeA, i) => {
                                let connectionsCount = 0;
                                const maxConnections = 3; // Clutter control

                                for (let j = i + 1; j < nodeStarPositions.length; j++) {
                                    if (connectionsCount >= maxConnections) break;

                                    const nodeB = nodeStarPositions[j];
                                    // Distance calc
                                    const dx = nodeA.x - nodeB.x;
                                    const dy = nodeA.y - nodeB.y;
                                    const dist = Math.sqrt(dx * dx + dy * dy);

                                    // Connect if close enough OR if same high-value type
                                    // Threshold: 150px
                                    if (dist < 150) {
                                        // Bonus for same type
                                        const sameType = nodeA.node.type === nodeB.node.type;
                                        const weight = sameType ? 0.7 : 0.4; // Stronger if same type

                                        connections.push({
                                            id: `constellation-${nodeA.node.id}-${nodeB.node.id}`,
                                            x1: 400 + nodeA.x,
                                            y1: 400 + nodeA.y,
                                            x2: 400 + nodeB.x,
                                            y2: 400 + nodeB.y,
                                            strength: weight,
                                            animated: finalOrbState === 'insight' || finalOrbState === 'thinking' // Animate heavily during thought
                                        });
                                        connectionsCount++;
                                    }
                                }
                            });

                            return connections.map(connection => (
                                <motion.line
                                    key={connection.id}
                                    x1={connection.x1}
                                    y1={connection.y1}
                                    x2={connection.x2}
                                    y2={connection.y2}
                                    stroke="url(#semanticGradient)"
                                    strokeWidth={connection.strength * 2}
                                    opacity={connection.strength * 0.4}
                                    animate={connection.animated ? {
                                        opacity: [connection.strength * 0.2, connection.strength * 0.6, connection.strength * 0.2],
                                        pathLength: [0.7, 1, 0.7]
                                    } : {
                                        opacity: connection.strength * 0.4
                                    }}
                                    transition={{
                                        duration: connection.animated ? 3 : 0,
                                        repeat: connection.animated ? Infinity : 0,
                                        ease: "easeInOut"
                                    }}
                                />
                            ));
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
                            const isHoveredPlanet = hoveredPlanet === planet.id;

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
                                    <Planet
                                        department={planet}
                                        position={{ x: 0, y: 0 }}
                                        delay={delay}
                                        isActive={isActive}
                                        size={isActive ? 'lg' : 'md'}
                                        orbitActive={planetOrbitActive}
                                        onClick={() => {
                                            if (planet.type === 'company') {
                                                // COMPLETE COMPANY SWITCH - Load all company data
                                                setActiveCompany(planet.id);
                                                setViewMode('demo');
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
                                            setOrbState('focus');
                                            setTimeout(() => {
                                                setOrbitShiftActive(false);
                                                setPlanetOrbitActive(false);
                                                setOrbState('idle');
                                            }, 2500);
                                        }}
                                        onHover={(hovered) => handlePlanetHover(planet.id, hovered)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>


                {viewMode !== 'owner' && moonPositions.length > 0 && (
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                        {moonPositions.map(({ space, x, y, delay, orbitRadius, orbitAngle, parentPlanet }) => (
                            <motion.div
                                key={space.id}
                                className="relative"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{
                                    scale: 1,
                                    opacity: 1,
                                    x: orbitShiftActive ? x * 1.2 : x, // UPGRADE B1: Orbit shift effect
                                    y: orbitShiftActive ? y * 1.2 : y
                                }}
                                transition={{
                                    delay,
                                    duration: orbitShiftActive ? 1.5 : 0.8,
                                    ease: orbitShiftActive ? [0.25, 0.46, 0.45, 0.94] : "easeOut"
                                }}
                            >
                                {/* UPGRADE B1: Orbital trail effect */}
                                {orbitShiftActive && parentPlanet && (
                                    <motion.div
                                        className="absolute rounded-full border border-emerald-400/30"
                                        style={{
                                            width: orbitRadius * 2,
                                            height: orbitRadius * 2,
                                            left: -orbitRadius,
                                            top: -orbitRadius,
                                            transform: `translate(${parentPlanet.x}px, ${parentPlanet.y}px)`
                                        }}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 0.3 }}
                                        transition={{ duration: 1 }}
                                    />
                                )}

                                <Star
                                    space={{
                                        id: space.id,
                                        name: space.name,
                                        department_id: space.departmentId,
                                        color: '#60A5FA', // Blue for moons (spaces)
                                        description: space.description || undefined,
                                        folder_count: (foldersBySpace[space.id] || []).length
                                    }}
                                    position={{ x: 0, y: 0 }} // Relative positioning
                                    delay={delay}
                                    isActive={activeSpaceId === space.id}
                                    orbitActive={planetOrbitActive}
                                    isHoveredByPlanet={hoveredPlanet === space.departmentId}
                                    onClick={() => {
                                        setOrbState('focus');
                                        navigateToSpace(space.id);
                                        setTimeout(() => setOrbState('idle'), 2000);
                                    }}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* UPGRADE B1: Stars (Folders) orbiting moons */}
                {viewMode !== 'owner' && starPositions.length > 0 && (
                    <div className="absolute">
                        {starPositions.map(({ folder, x, y, delay, orbitRadius, orbitAngle, parentMoon }) => (
                            <motion.div
                                key={folder.id}
                                className="relative"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{
                                    scale: 1,
                                    opacity: 1,
                                    x: orbitShiftActive ? x * 1.3 : x, // Enhanced orbit shift for stars
                                    y: orbitShiftActive ? y * 1.3 : y
                                }}
                                transition={{
                                    delay,
                                    duration: orbitShiftActive ? 1.8 : 0.6,
                                    ease: orbitShiftActive ? [0.25, 0.46, 0.45, 0.94] : "easeOut"
                                }}
                            >
                                <NodeStar
                                    node={{
                                        id: folder.id,
                                        space_id: parentMoon?.space.id || '',
                                        title: folder.name,
                                        type: 'other', // Folders are represented as 'other' type nodes
                                        content: folder.description || '',
                                        created_at: folder.created_at,
                                        updated_at: folder.created_at
                                    }}
                                    position={{ x: 0, y: 0 }}
                                    delay={delay}
                                    size="sm" // Smaller for folder stars
                                />
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════ */}
                {/* PROMOTED MOONS - Stars that grew important (5+ connections) */}
                {/* Visible in HOME view, orbiting their parent planets like a nervous system */}
                {/* ═══════════════════════════════════════════════════════════════════════════ */}
                {viewMode !== 'owner' && promotedMoons.length > 0 && (
                    <div className="pointer-events-none">
                        {promotedMoons.map(({ node, x, y, delay, connectionCount, parentPlanet }) => {
                            // Scale size based on connection count (more connections = bigger moon)
                            const moonSize = Math.min(12 + connectionCount * 1.5, 24); // 12-24px
                            const moonBrightness = Math.min(0.5 + connectionCount * 0.05, 0.9); // 50-90%

                            return (
                                <motion.div
                                    key={`moon-${node.id}`}
                                    className="fixed z-30 pointer-events-auto cursor-pointer"
                                    style={{
                                        left: `${x}vw`,
                                        top: `${y}vh`,
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay, duration: 0.8, ease: 'easeOut' }}
                                    whileHover={{ scale: 1.3 }}
                                    onClick={() => {
                                        setOrbState('focus');
                                        // Navigate to the node's space
                                        if (node.space_id) {
                                            navigateToSpace(node.space_id);
                                        }
                                        setTimeout(() => setOrbState('idle'), 2000);
                                    }}
                                >
                                    {/* Moon Glow - Larger for important nodes */}
                                    <motion.div
                                        className="absolute rounded-full"
                                        style={{
                                            width: moonSize * 3,
                                            height: moonSize * 3,
                                            left: '50%',
                                            top: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            background: `radial-gradient(circle, rgba(16,185,129,${moonBrightness * 0.3}), transparent 70%)`,
                                            filter: 'blur(8px)'
                                        }}
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            opacity: [moonBrightness * 0.5, moonBrightness * 0.8, moonBrightness * 0.5]
                                        }}
                                        transition={{ duration: 4, repeat: Infinity }}
                                    />

                                    {/* Moon Core - Brighter circle */}
                                    <div
                                        className="relative rounded-full"
                                        style={{
                                            width: moonSize,
                                            height: moonSize,
                                            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,${moonBrightness}), rgba(16,185,129,${moonBrightness * 0.7}))`,
                                            boxShadow: `0 0 ${moonSize}px rgba(16,185,129,${moonBrightness * 0.6})`,
                                        }}
                                    />

                                    {/* Connection Indicator to Parent Planet (Nervous System) */}
                                    {parentPlanet && (
                                        <motion.div
                                            className="absolute rounded-full pointer-events-none"
                                            style={{
                                                width: 4,
                                                height: 4,
                                                background: 'rgba(16,185,129,0.6)',
                                                boxShadow: '0 0 10px rgba(16,185,129,0.4)',
                                            }}
                                            animate={{
                                                scale: [1, 1.5, 1],
                                                opacity: [0.4, 0.8, 0.4]
                                            }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    )}

                                    {/* Tooltip on hover */}
                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="text-[10px] text-white/50 font-mono">
                                            {node.title || 'Node'}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Node Stars - Ambient knowledge particles throughout the universe */}
                {viewMode !== 'owner' && nodeStarPositions.length > 0 && (
                    <div className="absolute top-1/2 left-1/2"> {/* Center the container to match nodeStarPositions calculations */}

                        {/* UPGRADE E2: SEMANTIC CONSTELLATION LAYER */}
                        <div className="absolute inset-0 pointer-events-none z-0">
                            <SemanticLinesRenderer lines={connections} />
                        </div>

                        {nodeStarPositions.map(({ node, x, y, delay }) => (
                            <NodeStar
                                key={node.id}
                                node={node}
                                position={{ x, y }}
                                delay={delay}
                                size="xs"
                                onHover={(hover) => hover ? fetchConstellation(node.id, nodePosMap) : clearConstellation()} // UPGRADE E2: Interaction
                            />
                        ))}
                    </div>
                )}


            </div>
            {/* Status Bar Removed */}

            <style jsx global>{`
                .glass-panel {
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                }
            `}</style>

            {/* UPGRADE D1: Cursor Agent */}
            <CursorAgent
                active={cursorAgent.active}
                action={cursorAgent.action}
                target={cursorAgent.target}
                awareness={finalOrbState}
                onActionComplete={(action) => {
                    // Reset cursor agent after action completes
                    setCursorAgent(prev => ({ ...prev, active: false, action: 'idle' }));
                }}
            />

            {/* THE SUN - MÔRA ORB (Das Herz) */}
            <motion.button
                className="fixed bottom-[80px] right-[80px] rounded-full cursor-pointer group z-50"
                style={{
                    width: orbParams.size,
                    height: orbParams.size,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => setShowHealthPanel(!showHealthPanel)}
            >
                {/* TESLA-STYLE: Multi-layered Energy Glow System */}
                <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: `radial-gradient(circle, ${orbParams.color}30, transparent 60%)`,
                        filter: 'blur(25px)',
                    }}
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 6, repeat: Infinity }}
                />

                {/* Secondary Energy Ring */}
                <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: `conic-gradient(from 0deg, transparent, ${orbParams.color}20, transparent)`,
                        filter: 'blur(15px)',
                    }}
                    animate={{
                        rotate: [0, 360],
                        scale: [0.8, 1.1, 0.8]
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                />

                {/* Core - Ultra Sharp */}
                <motion.div
                    className="absolute inset-0 rounded-full backdrop-blur-xl border-2"
                    style={{
                        background: `radial-gradient(circle at 30% 30%, ${orbParams.color}70, ${orbParams.color}15)`,
                        borderColor: `${orbParams.color}80`,
                        boxShadow: `
                            0 0 80px ${orbParams.color}60,
                            0 0 40px ${orbParams.color}40,
                            inset 0 0 40px ${orbParams.color}25,
                            inset 0 0 20px ${orbParams.color}15
                        `
                    }}
                    animate={isHovered ? {
                        boxShadow: `
                            0 0 120px ${orbParams.color}80,
                            0 0 60px ${orbParams.color}60,
                            inset 0 0 60px ${orbParams.color}35,
                            inset 0 0 30px ${orbParams.color}25
                        `
                    } : {}}
                    transition={{ duration: 0.3 }}
                />

                {/* Glass Highlight */}
                <div className="absolute top-4 left-4 w-1/3 h-1/3 rounded-full bg-gradient-to-br from-white/30 to-transparent" />

                {/* Label */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-white/50 font-mono tracking-[0.2em]">
                        MÔRA
                    </div>
                </div>
            </motion.button>

            {/* Health Panel - TESLA Style */}
            <AnimatePresence>
                {showHealthPanel && (
                    <motion.div
                        className="fixed bottom-[220px] right-[48px] w-96 glass-panel p-6 z-50"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    >
                        <button
                            className="absolute top-4 right-4 text-white/40 hover:text-white/70"
                            onClick={() => setShowHealthPanel(false)}
                        >
                            <X size={18} />
                        </button>

                        <h3 className="text-xl font-light text-white/90 mb-6 tracking-wider">
                            SYSTEM STATUS
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-white/50 text-sm">State</span>
                                <span className="text-emerald-400 font-mono text-sm">{finalOrbState.toUpperCase()}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="glass-panel p-4">
                                    <div className="text-3xl font-light text-white/90">{visiblePlanets.length}</div>
                                    <div className="text-xs text-white/40 mt-1">SYSTEMS</div>
                                </div>
                                <div className="glass-panel p-4">
                                    <div className="text-3xl font-light text-white/90">{visibleSpaces.length}</div>
                                    <div className="text-xs text-white/40 mt-1">SPACES</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-white/40 pt-4 border-t border-white/10">
                                <Activity size={12} />
                                <span>All systems operational</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};
