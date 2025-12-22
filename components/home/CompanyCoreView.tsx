"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Planet } from '@/components/mora/Planet';
import { Star } from '@/components/mora/Star';
import { NodeStar } from '@/components/mora/NodeStar';
import { useMoraStore } from '@/lib/store/moraState';
import { fetchAwarenessPulse, type OrbState } from '@/lib/api/awarenessClient';
import { useUser } from '@/lib/hooks/useUser';
import { X, Activity, TrendingUp, Zap, Sparkles, Clock, Users, PlusCircle, Trash2, RefreshCw, Mic, Minimize2 } from 'lucide-react';
import { MoraOrb } from '@/components/mora/MoraOrb';
import { CursorAgent } from '@/components/mora/CursorAgent'; // UPGRADE D1
import { MoraCommand } from '@/components/mora/MoraCommand'; // UPGRADE B2
import { useSemanticStore } from '@/lib/store/semanticStore'; // UPGRADE E1
import { toast } from '@/lib/toast';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { MOCK_DATA } from '@/lib/data/mockData';
import { useOrbitalPhysics } from '@/lib/hooks/useOrbitalPhysics';
import { useSemanticConstellation } from '@/lib/hooks/useSemanticConstellation'; // UPGRADE E2
import { SemanticLinesRenderer } from '@/components/semantic/SemanticLinesRenderer'; // UPGRADE E2
import { useIntelligenceStore } from '@/lib/store/intelligenceStore'; // UPGRADE P4
import { useIntelligencePulse } from '@/lib/hooks/useIntelligencePulse'; // UPGRADE B3
import { usePaneStore } from '@/lib/store/paneStore'; // Window Management
import { useAccentColor } from '@/lib/hooks/useAccentColor'; // Global accent color
import { DepartmentWizard } from '@/components/wizards/DepartmentWizard'; // Department creation wizard



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

    const { addPane, focusPane } = usePaneStore();

    const { role, user } = useUser();
    const { accentColor } = useAccentColor(); // Global accent color
    const { center, isReady } = useOrbitalPhysics(); // PHASE 1 FIX
    const [apiOrbState, setApiOrbState] = useState<OrbState>('idle');
    const [isHovered, setIsHovered] = useState(false);
    const [planetOrbitActive, setPlanetOrbitActive] = useState(false);
    const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
    const [showHealthPanel, setShowHealthPanel] = useState(false);
    const [orbitShiftActive, setOrbitShiftActive] = useState(false); // UPGRADE B1: Orbit shift animations
    const [cosmicMode, setCosmicMode] = useState(true); // UPGRADE F1: Cosmic passive mode

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

    // ACTIVATE CURSOR AGENT: Always active in Universe Mode (roaming)
    useEffect(() => {
        if (viewMode !== 'owner') {
            // Slight delay to let things load
            const timer = setTimeout(() => {
                setCursorAgent(prev => ({ ...prev, active: true, action: 'roam' }));
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [viewMode]);

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
        const init = async () => {
            if ((companies?.length || 0) === 0) {
                await loadCompanies();
            }
        };
        init();
    }, [companies?.length, loadCompanies]);

    // Auto-activate correct company based on viewMode AND persistence
    useEffect(() => {
        // Wait for companies to load
        if ((companies?.length || 0) === 0) return;

        // If we already have an active company, we are good.
        if (activeCompanyId) return;

        let targetCompany;

        // 1. Try to restore from localStorage
        const lastWorkspace = localStorage.getItem('last_workspace');
        if (lastWorkspace) {
            targetCompany = companies.find(c => c.name === lastWorkspace);
            if (targetCompany) {
                console.log('[CompanyCoreView] Restored last workspace:', targetCompany.name);
            }
        }

        // 2. If not found, use logic based on ViewMode
        if (!targetCompany) {
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
            }
        }

        // 3. Fallback to first available if absolutely nothing found
        if (!targetCompany) {
            targetCompany = companies[0];
        }

        if (targetCompany) {
            setActiveCompany(targetCompany.id);
        }
    }, [companies, activeCompanyId, viewMode, setActiveCompany]);

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

    // Load departments when company is active - FORCE RELOAD on company change
    useEffect(() => {
        if (activeCompanyId) {
            loadDepartments(activeCompanyId);
        }
    }, [activeCompanyId, loadDepartments]);

    // Load nodes for current company - FORCE RELOAD on company change
    useEffect(() => {
        if (activeCompanyId && !nodesByCompany[activeCompanyId]) {
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
            return uniqueSpaces.slice(0, 5).map(space => ({ // Max 5 spaces per dept
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
            return uniqueFolders.slice(0, 5).map(folder => ({ // Max 5 folders per space
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

        // CENTER-BASED POSITIONING (Restored to fix "Broken/Empty" look)
        // Planets orbit the Central Sun (Company Logo/Text) at 50,50
        const orbX = 50; // Center VW
        const orbY = 50; // Center VH

        // Orbit radius (Wide orbit to clear the central text)
        const orbitRadiusX = 35 + seededRandom(3) * 5; // 35-40vw
        const orbitRadiusY = 25 + seededRandom(4) * 5; // 25-30vh

        // Full 360 orbit
        const arcStart = 0;
        const arcEnd = Math.PI * 2;
        const arcSpan = arcEnd - arcStart;
        const angleStep = arcSpan / Math.max(count, 1); // Divide by count for full circle

        return visiblePlanets.map((planet, i) => {
            // Each planet gets a slight individual offset too
            const planetSeed = seed + planet.id.charCodeAt(0);
            const individualOffset = (Math.sin(planetSeed) * 0.5 + 0.5) * 2 - 1; // -1 to 1

            const angle = arcStart + (i * angleStep) + (individualOffset * 0.1);

            // Calculate position as VIEWPORT UNITS (relative to Center)
            const x = orbX + Math.cos(angle) * orbitRadiusX;
            const y = orbY + Math.sin(angle) * orbitRadiusY;

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
                    x: 50 + (Math.random() - 0.5) * 20, // Random near center
                    y: 50 + (Math.random() - 0.5) * 20,
                    delay: i * 0.05,
                    orbitRadiusX: 0,
                    orbitRadiusY: 0,
                    orbitAngle: 0
                };
            }

            // UPGRADE B1: Smart moon positioning around planets
            const planetSpaceCount = visibleSpaces.filter(s => s.departmentId === space.departmentId).length;
            const moonIndex = visibleSpaces.filter(s => s.departmentId === space.departmentId)
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
                    x: 50 + (Math.random() - 0.5) * 20,
                    y: 50 + (Math.random() - 0.5) * 20,
                    delay: i * 0.03,
                    orbitRadiusX: 0,
                    orbitRadiusY: 0,
                    orbitAngle: 0
                };
            }

            // UPGRADE B1: Stars orbit around their moons
            const moonFolderCount = visibleFolders.filter(f => f.spaceId === folder.spaceId).length;
            const starIndex = visibleFolders.filter(f => f.spaceId === folder.spaceId)
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

            // Distribute across the entire viewport (0-100 VW/VH)
            // Base position: random within viewport
            let x = seededRandom(0) * 100;
            let y = seededRandom(100) * 100;

            // Add some clustering around planets (30% chance)
            if (seededRandom(200) < 0.3 && planetPositions.length > 0) {
                const randomPlanet = planetPositions[Math.floor(seededRandom(300) * planetPositions.length)];
                const clusterDistanceX = 10 + seededRandom(400) * 10; // 10-20vw
                const clusterDistanceY = 10 + seededRandom(410) * 10; // 10-20vh
                const clusterAngle = seededRandom(500) * Math.PI * 2;

                x = randomPlanet.x + Math.cos(clusterAngle) * clusterDistanceX;
                y = randomPlanet.y + Math.sin(clusterAngle) * clusterDistanceY;
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

    // UPGRADE E2: Fetch Semantic Constellations
    useEffect(() => {
        if (nodePosMap.size > 0) {
            // Trigger fetch with a "global" key to ensure we get lines for the current view
            fetchConstellation('global-view', nodePosMap);
        }
    }, [nodePosMap, fetchConstellation]);

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
                                setCursorAgent(prev => ({ ...prev, action: 'roam', target: undefined }));
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
                const orbitRadiusX = 8 + (index % 3) * 2; // VW
                const orbitRadiusY = 12 + (index % 3) * 3; // VH
                const orbitAngle = (index / Math.max(nodeStarPositions.length, 1)) * Math.PI * 2;

                return {
                    node,
                    x: parentPlanet.x + Math.cos(orbitAngle) * orbitRadiusX,
                    y: parentPlanet.y + Math.sin(orbitAngle) * orbitRadiusY,
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

            {/* EMPTY STATE - Minimal Hint for New Universes */}
            {departments.length === 0 && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none z-30">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="space-y-4"
                    >
                        <h2 className="text-3xl text-emerald-500/30 font-extralight tracking-[0.5em] uppercase">Universe Silent</h2>
                        <div className="w-px h-12 bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent mx-auto" />
                        <p className="text-xs text-emerald-100/40 tracking-widest uppercase">
                            Create your first Planet to begin
                        </p>
                    </motion.div>

                    {/* Subtle pointer to top bar */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5, duration: 1 }}
                        className="absolute top-24 left-1/2 -translate-x-1/2 text-emerald-500/20"
                    >
                        <div className="w-px h-8 bg-emerald-500/20 mx-auto mb-2" />
                        <div className="text-[10px] tracking-widest uppercase">Controls</div>
                    </motion.div>
                </div>
            )}

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
                        background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 40%, transparent 70%)',
                        filter: 'blur(100px)',
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
                        background: 'radial-gradient(circle, rgba(212,175,55,0.09) 0%, rgba(59,130,246,0.06) 50%, transparent 70%)',
                        filter: 'blur(80px)',
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
                {/* DYNAMIC STARS - "Cave of Light" Aesthetic */}
                <g opacity="0.9">
                    {isMounted && Array.from({ length: 200 }).map((_, i) => {
                        const seed = i * 937.11; // Deterministic seed
                        const x = (Math.sin(seed) * 0.5 + 0.5) * 100;
                        const y = (Math.cos(seed * 0.73) * 0.5 + 0.5) * 100;
                        const r = (Math.sin(seed * 3.1) + 1.8) * 0.6; // 0.5 to 1.7px
                        const opacity = (Math.sin(seed * 1.5) * 0.3 + 0.5); // 0.2 to 0.8
                        const color = i % 8 === 0 ? "#D4AF37" : (i % 12 === 0 ? "#10B981" : "#FFFFFF");

                        return (
                            <circle
                                key={i}
                                cx={`${x}%`}
                                cy={`${y}%`}
                                r={r}
                                fill={color}
                                opacity={opacity}
                                style={{
                                    filter: i % 15 === 0 ? 'drop-shadow(0 0 2px white)' : 'none'
                                }}
                            />
                        );
                    })}
                </g>
            </svg>

            {/* Header removed - now using Center Universe Hub */}

            {/* CENTER UNIVERSE HUB - Premium Glass Design */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-24">
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                >
                    {/* Company Logo - Universal Component */}
                    <CompanyLogo
                        src={
                            currentCompany?.logo_url ||
                            (currentCompany?.is_demo || currentCompany?.name?.toLowerCase().includes('coffee')
                                ? '/images/simple_coffee_logo.png'
                                : null)
                        }
                        companyName={currentCompany?.name || 'SAIMÔR'}
                        size="lg"
                        animated={true}
                        accentColor={accentColor}
                        className="mx-auto mb-8"
                    />

                    {/* Company Name */}
                    <h1 className="text-4xl md:text-5xl font-extralight tracking-[0.4em] text-white/80 mb-2">
                        {currentCompany?.name?.toUpperCase() || 'SAIMÔR'}
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
                            {/* PREMIUM LIGHT THREADS - Ethereal Glow */}
                            <linearGradient id="myceliumGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#10B981" stopOpacity="0.15" />
                                <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.15" />
                            </linearGradient>

                            {/* Light Thread Glow Filter */}
                            <filter id="lightThreadGlow" x="-100%" y="-100%" width="300%" height="300%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        {/* UPGRADE B1: Enhanced mycelium connections - Planet to Moon to Star */}
                        {planetPositions.map(({ planet, x: px, y: py }) => {
                            if (planet.type !== 'department') return null;
                            const planetMoons = moonPositions.filter(m => m.space.departmentId === planet.id);
                            return planetMoons.map((moon, moonIdx) => (
                                <g key={`connections-${planet.id}-${moon.space.id}`}>
                                    {/* Planet to Moon - LIGHT THREAD */}
                                    <motion.line
                                        x1={600 + px}
                                        y1={600 + py}
                                        x2={600 + moon.x}
                                        y2={600 + moon.y}
                                        stroke="url(#myceliumGradient)"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        filter="url(#lightThreadGlow)"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{
                                            pathLength: 1,
                                            opacity: hoveredPlanet === planet.id ? [0.3, 0.6, 0.3] : 0.12
                                        }}
                                        transition={{
                                            duration: hoveredPlanet === planet.id ? 2 : 1.2,
                                            repeat: hoveredPlanet === planet.id ? Infinity : 0,
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
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        viewBox="0 0 100 100" // Normalize coordinate system to 0-100 (VW/VH)
                        preserveAspectRatio="none"
                        style={{ overflow: 'visible' }}
                    >
                        <defs>
                            {/* NEURAL PATHWAY GRADIENT - Premium Light */}
                            <linearGradient id="semanticGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                                <stop offset="30%" stopColor="#60A5FA" stopOpacity="0.3" />
                                <stop offset="70%" stopColor="#8B5CF6" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.4" />
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

                            // REMOVED: Sun-to-Planet connections
                            // Planets are now STATIC - no permanent lines to center
                            // The "Sun" is the ORB (bottom-right), not the center logo

                            // Only show connections between related entities (moons, stars, nodes)
                            // NOT from the center logo to planets

                            // Connect planets to their moons
                            planetPositions.forEach(planet => {
                                const planetMoons = moonPositions.filter(m => m.parentPlanet?.planet?.id === planet.planet?.id);
                                planetMoons.forEach(moon => {
                                    connections.push({
                                        id: `semantic-${planet.planet.id}-${moon.space.id}`,
                                        x1: planet.x,
                                        y1: planet.y,
                                        x2: moon.x,
                                        y2: moon.y,
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
                                        x1: moon.x,
                                        y1: moon.y,
                                        x2: star.x,
                                        y2: star.y,
                                        strength: 0.6,
                                        animated: false
                                    });
                                });
                            });

                            // Phase 8.4: Node-to-Node Semantic Constellations (Ambient Intelligence)
                            // Connect nearby nodes if they share type or have high weight
                            // FILIGRAN: Sehr feine, dezente Verbindungen
                            nodeStarPositions.forEach((nodeA, i) => {
                                let connectionsCount = 0;
                                const maxConnections = 1; // REDUCED: Only 1 connection per node for clarity

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
                                            x1: nodeA.x,
                                            y1: nodeA.y,
                                            x2: nodeB.x,
                                            y2: nodeB.y,
                                            strength: weight,
                                            animated: finalOrbState === 'insight' || finalOrbState === 'thinking' // Animate heavily during thought
                                        });
                                        connectionsCount++;
                                    }
                                }
                            });

                            return connections.map(connection => {
                                const isSunConnection = connection.id.startsWith('sun-');
                                const glowIntensity = isSunConnection ? 0.4 : connection.strength * 0.25;

                                return (
                                    <g key={connection.id}>
                                        {/* Glow Layer */}
                                        <motion.line
                                            x1={connection.x1}
                                            y1={connection.y1}
                                            x2={connection.x2}
                                            y2={connection.y2}
                                            stroke={isSunConnection ? "url(#sunRayGradient)" : "url(#semanticGradient)"}
                                            strokeWidth={isSunConnection ? 3 : connection.strength * 4}
                                            strokeLinecap="round"
                                            filter="url(#neuralGlow)"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={connection.animated ? {
                                                pathLength: [0.8, 1, 0.8],
                                                opacity: [glowIntensity * 0.5, glowIntensity, glowIntensity * 0.5]
                                            } : {
                                                pathLength: 1,
                                                opacity: glowIntensity
                                            }}
                                            transition={{
                                                duration: connection.animated ? 4 : 1,
                                                repeat: connection.animated ? Infinity : 0,
                                                ease: "easeInOut"
                                            }}
                                        />

                                        {/* Core Light Thread */}
                                        <motion.line
                                            x1={connection.x1}
                                            y1={connection.y1}
                                            x2={connection.x2}
                                            y2={connection.y2}
                                            stroke={isSunConnection ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)"}
                                            strokeWidth={isSunConnection ? 0.8 : 0.4}
                                            strokeLinecap="round"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{
                                                pathLength: 1,
                                                opacity: isSunConnection ? [0.3, 0.6, 0.3] : connection.strength * 0.3
                                            }}
                                            transition={{
                                                duration: isSunConnection ? 3 : 0.8,
                                                repeat: isSunConnection ? Infinity : 0,
                                                ease: "easeInOut"
                                            }}
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
                                            setOrbState('focus');
                                            setTimeout(() => {
                                                setOrbitShiftActive(false);
                                                setPlanetOrbitActive(false);
                                                setOrbState('idle');
                                            }, 2500);
                                        }}
                                        onHover={(hovered) => handlePlanetHover(planet.id, hovered)}
                                        onQuickFilesAccess={(clickPos) => {
                                            // Open FinderPane near the click position (native context menu style)
                                            const paneId = `finder-${planet.id}`;
                                            // Position window near click, but ensure it stays on screen
                                            const paneWidth = 900;
                                            const paneHeight = 600;
                                            let posX = clickPos.x + 10; // 10px offset from click
                                            let posY = clickPos.y - 50;
                                            // Keep on screen
                                            if (posX + paneWidth > window.innerWidth) {
                                                posX = clickPos.x - paneWidth - 10;
                                            }
                                            if (posY + paneHeight > window.innerHeight) {
                                                posY = window.innerHeight - paneHeight - 50;
                                            }
                                            if (posY < 50) posY = 50;

                                            addPane({
                                                id: paneId,
                                                type: 'finder',
                                                title: `Dateien — ${planet.name}`,
                                                data: { departmentId: planet.id, departmentName: planet.name },
                                                minimized: false,
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


                {viewMode !== 'owner' && moonPositions.length > 0 && (
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                        {moonPositions.map(({ space, x, y, delay, parentPlanet }) => (
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
                                    // x/y offsets would need px calibration if used with left/top %, skipping orbitShift for complexity reduction or use transform
                                }}
                                transition={{
                                    delay,
                                    duration: orbitShiftActive ? 1.5 : 0.8,
                                    ease: orbitShiftActive ? [0.25, 0.46, 0.45, 0.94] : "easeOut"
                                }}
                            >
                                {/* Orbit trail removed for complexity reduction on VW/VH scale */}

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
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                        {starPositions.map(({ folder, x, y, delay, parentMoon }) => (
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
                                    opacity: 1
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
                {/* PROMOTED MOONS - Important Spaces shown as "watchers" around planets */}
                {/* These show REAL Space names like "Espresso Bar" from the data */}
                {/* ═══════════════════════════════════════════════════════════════════════════ */}
                {viewMode !== 'owner' && promotedMoons.length > 0 && (
                    <div className="pointer-events-none">
                        {promotedMoons.map(({ node, x, y, delay, connectionCount, parentPlanet }) => {
                            // Find the REAL Space name for this node
                            const parentSpace = Object.values(spacesByDepartment)
                                .flat()
                                .find(space => space.id === node.space_id);

                            // Get display name: Space name > Node title > fallback
                            const displayName = parentSpace?.name || node.title || 'Space';

                            // Scale size based on connection count (more connections = bigger moon)
                            const moonSize = Math.min(14 + connectionCount * 1.5, 28); // 14-28px
                            const moonBrightness = Math.min(0.5 + connectionCount * 0.05, 0.9); // 50-90%

                            return (
                                <motion.div
                                    key={`moon-${node.id}`}
                                    className="fixed z-30 pointer-events-auto cursor-pointer group"
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
                                        // Navigate to the node's space by opening a window
                                        if (node.space_id) {
                                            const paneId = `space-${node.space_id}`;
                                            addPane({
                                                id: paneId,
                                                type: 'space',
                                                title: displayName,
                                                data: { spaceId: node.space_id },
                                                minimized: false,
                                                size: { width: 1000, height: 700 },
                                                // Center position with upward bias
                                                position: { x: window.innerWidth / 2 - 500, y: window.innerHeight / 2 - 450 }
                                            });
                                            focusPane(paneId);
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
                                                left: '50%',
                                                top: '50%',
                                                transform: 'translate(-50%, -50%)',
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

                                    {/* REAL Space Name Label (Visible on Hover) */}
                                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-emerald-500/20">
                                            <div className="text-[10px] text-emerald-400 font-mono tracking-wide">
                                                {displayName}
                                            </div>
                                            <div className="text-[8px] text-white/40 font-mono">
                                                {connectionCount}+ Verbindungen
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Node Stars - Ambient knowledge particles throughout the universe */}
                {viewMode !== 'owner' && nodeStarPositions.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none">
                        {/* UPGRADE E2: SEMANTIC CONSTELLATION LAYER - Light Connections */}
                        <div className="absolute inset-0 pointer-events-none z-0">
                            <SemanticLinesRenderer lines={connections} />
                        </div>

                        {nodeStarPositions.map(({ node, x, y, delay }) => (
                            <NodeStar
                                key={node.id}
                                node={node}
                                position={{ x: `${x}vw`, y: `${y}vh` }}
                                delay={delay}
                                size="xs"
                                onHover={(hover) => {
                                    if (hover) {
                                        // Build map of current positions for the renderer
                                        const currentPosMap = new Map<string, { x: number, y: number }>();

                                        // Add visible stars (Folders)
                                        starPositions.forEach(s => {
                                            // Convert VW/VH to pixels roughly for the line renderer
                                            // Note: The renderer needs pixels. 
                                            // This is a simplification. Ideally we track refs.
                                            currentPosMap.set(s.folder.id, {
                                                x: (s.x / 100) * window.innerWidth,
                                                y: (s.y / 100) * window.innerHeight
                                            });
                                        });

                                        // Add visible nodes
                                        nodeStarPositions.forEach(n => {
                                            currentPosMap.set(n.node.id, {
                                                x: (n.x / 100) * window.innerWidth,
                                                y: (n.y / 100) * window.innerHeight
                                            });
                                        });

                                        fetchConstellation(node.id, currentPosMap);
                                    } else {
                                        clearConstellation();
                                    }
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════ */}
                {/* ✨ MINI GALAXY - Important Nodes Constellation (Top-Left Corner) */}
                {/* A beautiful cluster showing the most connected/important nodes */}
                {/* ═══════════════════════════════════════════════════════════════════════════ */}
                {viewMode !== 'owner' && promotedMoons.length > 0 && (
                    <div className="fixed top-20 left-8 z-40 pointer-events-none">
                        {/* Galaxy Container */}
                        <motion.div
                            className="relative"
                            style={{ width: 200, height: 200 }}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1, duration: 0.8 }}
                        >
                            {/* Galaxy Glow Background */}
                            <motion.div
                                className="absolute inset-0 rounded-full"
                                style={{
                                    background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, rgba(59,130,246,0.04) 50%, transparent 70%)',
                                    filter: 'blur(20px)'
                                }}
                                animate={{
                                    scale: [1, 1.1, 1],
                                    opacity: [0.5, 0.8, 0.5]
                                }}
                                transition={{ duration: 6, repeat: Infinity }}
                            />

                            {/* Galaxy Title */}
                            <div className="absolute -top-6 left-0 text-[10px] text-white/30 font-mono tracking-widest uppercase">
                                Wichtige Nodes
                            </div>

                            {/* Constellation Lines - Connect Important Nodes */}
                            <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                                <defs>
                                    <linearGradient id="miniGalaxyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                                        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.4" />
                                    </linearGradient>
                                    <filter id="miniGalaxyGlow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation="2" result="blur" />
                                        <feMerge>
                                            <feMergeNode in="blur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>

                                {/* Draw constellation lines between nearby important nodes */}
                                {promotedMoons.slice(0, 8).map((nodeA, i) => {
                                    // Position in mini galaxy (circular arrangement)
                                    const angleA = (i / Math.min(promotedMoons.length, 8)) * Math.PI * 2;
                                    const radiusA = 60 + (i % 2) * 20;
                                    const xA = 100 + Math.cos(angleA) * radiusA;
                                    const yA = 100 + Math.sin(angleA) * radiusA;

                                    // Connect to next node
                                    const nextIdx = (i + 1) % Math.min(promotedMoons.length, 8);
                                    const angleB = (nextIdx / Math.min(promotedMoons.length, 8)) * Math.PI * 2;
                                    const radiusB = 60 + (nextIdx % 2) * 20;
                                    const xB = 100 + Math.cos(angleB) * radiusB;
                                    const yB = 100 + Math.sin(angleB) * radiusB;

                                    return (
                                        <motion.line
                                            key={`mini-galaxy-line-${i}`}
                                            x1={xA}
                                            y1={yA}
                                            x2={xB}
                                            y2={yB}
                                            stroke="url(#miniGalaxyGradient)"
                                            strokeWidth="1"
                                            strokeLinecap="round"
                                            filter="url(#miniGalaxyGlow)"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{
                                                pathLength: 1,
                                                opacity: [0.2, 0.4, 0.2]
                                            }}
                                            transition={{
                                                duration: 3,
                                                delay: i * 0.2,
                                                repeat: Infinity
                                            }}
                                        />
                                    );
                                })}

                                {/* Center core connection lines */}
                                {promotedMoons.slice(0, 8).map((node, i) => {
                                    const angle = (i / Math.min(promotedMoons.length, 8)) * Math.PI * 2;
                                    const radius = 60 + (i % 2) * 20;
                                    const x = 100 + Math.cos(angle) * radius;
                                    const y = 100 + Math.sin(angle) * radius;

                                    return (
                                        <motion.line
                                            key={`mini-galaxy-center-${i}`}
                                            x1={100}
                                            y1={100}
                                            x2={x}
                                            y2={y}
                                            stroke="rgba(255,255,255,0.15)"
                                            strokeWidth="0.5"
                                            strokeLinecap="round"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 0.15 }}
                                            transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                                        />
                                    );
                                })}
                            </svg>

                            {/* Galaxy Center Core */}
                            <motion.div
                                className="absolute rounded-full"
                                style={{
                                    left: 92,
                                    top: 92,
                                    width: 16,
                                    height: 16,
                                    background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), rgba(16,185,129,0.4))',
                                    boxShadow: '0 0 20px rgba(16,185,129,0.4)'
                                }}
                                animate={{
                                    scale: [1, 1.2, 1],
                                    boxShadow: [
                                        '0 0 20px rgba(16,185,129,0.4)',
                                        '0 0 30px rgba(16,185,129,0.6)',
                                        '0 0 20px rgba(16,185,129,0.4)'
                                    ]
                                }}
                                transition={{ duration: 4, repeat: Infinity }}
                            />

                            {/* Galaxy Stars (Important Nodes) */}
                            {promotedMoons.slice(0, 8).map((moonData, i) => {
                                const angle = (i / Math.min(promotedMoons.length, 8)) * Math.PI * 2;
                                const radius = 60 + (i % 2) * 20;
                                const x = 100 + Math.cos(angle) * radius - 4;
                                const y = 100 + Math.sin(angle) * radius - 4;
                                const size = 6 + (moonData.connectionCount || 0) * 0.5;

                                return (
                                    <motion.div
                                        key={`mini-star-${moonData.node.id}`}
                                        className="absolute rounded-full cursor-pointer pointer-events-auto"
                                        style={{
                                            left: x,
                                            top: y,
                                            width: size,
                                            height: size,
                                            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(212,175,55,0.6))`,
                                            boxShadow: `0 0 ${size * 2}px rgba(212,175,55,0.5)`
                                        }}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{
                                            scale: 1,
                                            opacity: 1,
                                            boxShadow: [
                                                `0 0 ${size * 2}px rgba(212,175,55,0.4)`,
                                                `0 0 ${size * 3}px rgba(212,175,55,0.6)`,
                                                `0 0 ${size * 2}px rgba(212,175,55,0.4)`
                                            ]
                                        }}
                                        whileHover={{ scale: 1.5 }}
                                        transition={{
                                            delay: 1.2 + i * 0.1,
                                            duration: 3,
                                            repeat: Infinity,
                                            repeatType: 'reverse'
                                        }}
                                        title={moonData.node.title || 'Node'}
                                    />
                                );
                            })}
                        </motion.div>
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
                className="fixed bottom-8 right-8 rounded-full cursor-pointer group z-[200]"
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
                onClick={() => {
                    const willOpen = !showHealthPanel;
                    setShowHealthPanel(willOpen);
                    // Trigger AI Cursor Demo on open
                    if (willOpen) {
                        // @ts-ignore
                        window.moraAI?.demo?.();
                    }
                }}
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

            {/* MÔRA INTELLIGENCE DASHBOARD */}
            <AnimatePresence>
                {showHealthPanel && (
                    <motion.div
                        className="fixed bottom-[220px] right-[48px] w-[420px] glass-panel p-0 z-50 overflow-hidden"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full ${finalOrbState === 'idle' ? 'bg-emerald-400' : finalOrbState === 'thinking' ? 'bg-blue-400 animate-pulse' : 'bg-amber-400'}`} />
                                <h3 className="text-lg font-light text-white/90 tracking-wider">
                                    MÔRA INTELLIGENCE
                                </h3>
                            </div>
                            <button
                                className="p-1.5 rounded-full hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
                                onClick={() => setShowHealthPanel(false)}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Agency Input */}
                        <div className="px-4 py-2 border-b border-white/5 bg-black/20">
                            <MoraCommand onSuccess={() => setShowHealthPanel(false)} />
                        </div>

                        {/* Status Section */}
                        <div className="p-4 space-y-4">
                            {/* Universe Stats */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                    <div className="text-2xl font-light text-emerald-400">{visiblePlanets.length}</div>
                                    <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Planets</div>
                                    <div className="text-[8px] text-white/20">(Departments)</div>
                                </div>
                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                    <div className="text-2xl font-light text-blue-400">{visibleSpaces.length}</div>
                                    <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Moons</div>
                                    <div className="text-[8px] text-white/20">(Spaces)</div>
                                </div>
                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                    <div className="text-2xl font-light text-amber-400">{visibleFolders.length}</div>
                                    <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Stars</div>
                                    <div className="text-[8px] text-white/20">(Folders)</div>
                                </div>
                            </div>

                            {/* AI State */}
                            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl p-4 border border-emerald-500/20">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-white/50 uppercase tracking-wider">Current State</span>
                                    <span className="text-sm font-mono text-emerald-400">{finalOrbState.toUpperCase()}</span>
                                </div>
                                <div className="text-sm text-white/70">
                                    {finalOrbState === 'idle' && 'Awaiting your commands. Navigate the universe or ask Môra anything.'}
                                    {finalOrbState === 'thinking' && 'Processing intelligence from your workspace...'}
                                    {finalOrbState === 'focus' && 'Focused on the current task. Ready for deep work.'}
                                    {finalOrbState === 'alert' && 'Something requires your attention!'}
                                    {finalOrbState === 'insight' && 'New insights discovered in your data.'}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="space-y-2">
                                <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Quick Actions</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            setOrbState('thinking');
                                            setTimeout(() => setOrbState('idle'), 3000);
                                        }}
                                        className="flex items-center gap-2 p-2.5 bg-black/20 rounded-lg border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-all text-left"
                                    >
                                        <Sparkles size={14} className="text-emerald-400" />
                                        <span className="text-xs text-white/70">Analyze Workspace</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            toast.info('Opening voice mode...');
                                        }}
                                        className="flex items-center gap-2 p-2.5 bg-black/20 rounded-lg border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/10 transition-all text-left"
                                    >
                                        <Mic size={14} className="text-blue-400" />
                                        <span className="text-xs text-white/70">Voice Mode</span>
                                    </button>
                                    <button
                                        onClick={handleReloadDepartments}
                                        className="flex items-center gap-2 p-2.5 bg-black/20 rounded-lg border border-white/5 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all text-left"
                                    >
                                        <RefreshCw size={14} className="text-amber-400" />
                                        <span className="text-xs text-white/70">Refresh Data</span>
                                    </button>
                                    <button
                                        onClick={() => setShowHealthPanel(false)}
                                        className="flex items-center gap-2 p-2.5 bg-black/20 rounded-lg border border-white/5 hover:border-white/20 transition-all text-left"
                                    >
                                        <Minimize2 size={14} className="text-white/40" />
                                        <span className="text-xs text-white/70">Minimize</span>
                                    </button>
                                </div>
                            </div>

                            {/* System Status */}
                            <div className="flex items-center gap-2 text-xs text-white/40 pt-3 border-t border-white/5">
                                <Activity size={12} className="text-emerald-400" />
                                <span>All systems operational</span>
                                <span className="ml-auto text-[10px] font-mono text-white/20">v1.5-beta</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Department Creation Wizard */}
            <DepartmentWizard
                isOpen={isWizardOpen}
                onClose={handleWizardClose}
                companyId={activeCompanyId || ''}
            />
        </div >
    );
};
