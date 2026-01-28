"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Planet } from '@/components/mora/Planet';
import { Star } from '@/components/mora/Star';
import { NodeStar } from '@/components/mora/NodeStar';
import { StarField } from '@/components/home/StarField';
import { UniverseControls } from '@/components/home/UniverseControls';

import { useMoraStore } from '@/lib/store/moraState';
import { fetchAwarenessPulse, type OrbState } from '@/lib/api/awarenessClient';
import { useUser } from '@/lib/hooks/useUser';
import { X, Activity, TrendingUp, Zap, Sparkles, Clock, Users, PlusCircle, Trash2, RefreshCw, Minimize2 } from 'lucide-react';
import { MoraOrb } from '@/components/mora/MoraOrb';
import { CursorAgent } from '@/components/mora/CursorAgent'; // UPGRADE D1
import { MoraCommand } from '@/components/mora/MoraCommand'; // UPGRADE B2
import { useSemanticStore } from '@/lib/store/semanticStore'; // UPGRADE E1
import { toast } from '@/lib/toast';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { isDemoTenant } from '@/lib/constants/tenants';

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

export const UniverseView: React.FC = () => {
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
        isLoadingCompanies,
        hasBooted,
        setHasBooted,
        // DATA CONSISTENCY FIX: Also load tree for Finder consistency
        loadTree
    } = useMoraStore();

    const { openPane } = usePaneStore();

    const { role, user } = useUser();
    const { accentColor } = useAccentColor(); // Global accent color
    const { center, isReady } = useOrbitalPhysics(); // PHASE 1 FIX
    const [apiOrbState, setApiOrbState] = useState<OrbState>('idle');
    const [isHovered, setIsHovered] = useState(false);
    const [planetOrbitActive, setPlanetOrbitActive] = useState(false);
    const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
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

        console.log('[UniverseDebug] Calculating Orbit:', { count, companyId, radiusX: orbitRadiusX, radiusY: orbitRadiusY });

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
    }, [activeCompanyId, nodesByCompany, universeSeed, planetPositions]);

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
                const parentDept = (departments || []).find(d =>
                    spacesByDepartment[d.id]?.some(space => space.id === node.space_id)
                );
                const parentPlanet = (planetPositions || []).find(p => p.planet && p.planet.id === parentDept?.id);

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
                companies={(role === 'system_owner' && user?.tenant_id)
                    ? (viewMode === 'demo'
                        ? companies.filter(c => c.is_demo)
                        : companies.filter(c => c.tenant_id === user.tenant_id)
                    ).map(c => ({ id: c.id, name: c.name }))
                    : companies.map(c => ({ id: c.id, name: c.name }))}
                onSwitchCompany={(id) => {
                    console.log('[ContextSwitch] Manual switch to:', id);
                    const chosen = companies.find(c => c.id === id);
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
                    toast.success("Context Switched");
                }}
                visibleModes={
                    role === 'system_owner'
                        ? ['owner', 'workspace', 'demo']
                        : (isDemoTenant(user?.tenant_id) ? ['owner', 'workspace', 'demo'] : ['workspace'])
                }
                workspaceLabel={role === 'system_owner' ? 'HQ' : 'Space'}
            />

            {/* DEBUG INFO REMOVED - Clean interface per user request */}


            {/* Control Bar removed - Department management now in Settings > Admin */}

            {/* Atmosphere and starfield removed to use universal MoraShell background */}

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
                            (currentCompany?.is_demo ? '/images/simple_coffee_logo.png' : null)
                        }
                        companyName={currentCompany?.name || 'Workspace'}
                        size="lg"
                        animated={true}
                        accentColor={accentColor}
                        className="mx-auto mb-8"
                    />

                    {/* Company Name */}
                    <h1 className="text-4xl md:text-5xl font-extralight tracking-[0.4em] text-white/80 mb-2">
                        {currentCompany?.name?.toUpperCase() || 'WORKSPACE'}
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
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '300vmax', // Covers largest dimension
                            height: '300vmax',
                            overflow: 'visible'
                        }}
                        viewBox="-1500 -1500 3000 3000" // Centered coordinate system
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
                                    {moon.space.id && folderStarPositions
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

                            // Connect planets to their moons (INTELLIGENCE-BASED ONLY)
                            // "Colored strokes around planets... only if important"
                            planetPositions.forEach(planet => {
                                const planetMoons = moonPositions.filter(m => m.parentPlanet?.planet?.id === planet.planet?.id);
                                planetMoons.forEach((moon, idx) => {
                                    // MOCK INTELLIGENCE: Deterministic importance based on ID
                                    // In a real system, this comes from the backend cognition layer
                                    const seed = (moon.space.id.charCodeAt(0) + moon.space.id.charCodeAt(moon.space.id.length - 1)) % 100;
                                    const importance = seed / 100; // 0.0 to 1.0

                                    // Only show connection if important (>0.6) OR active/hovered
                                    // This creates the "strokes" effect only for relevant items
                                    const isRelevant = importance > 0.6 || moon.space.id === activeSpaceId;

                                    if (isRelevant) {
                                        connections.push({
                                            id: `semantic-${planet.planet.id}-${moon.space.id}`,
                                            x1: planet.x,
                                            y1: planet.y,
                                            x2: moon.x,
                                            y2: moon.y,
                                            strength: Math.max(0.4, importance), // Minimum visibility
                                            animated: importance > 0.8 // Pulse for very important items
                                        });
                                    }
                                });
                            });

                            // Connect moons to their stars (Folders)
                            moonPositions.forEach(moon => {
                                const moonStars = folderStarPositions.filter(s => s.parentMoon?.space.id === moon.space.id);
                                moonStars.forEach((star, idx) => {
                                    // Mock importance for stars
                                    const seed = (star.folder.id.charCodeAt(0) + idx) % 100;
                                    const importance = seed / 100;

                                    // Stars often have connections to their Moon parent
                                    connections.push({
                                        id: `semantic-${moon.space.id}-${star.folder.id}`,
                                        x1: moon.x,
                                        y1: moon.y,
                                        x2: star.x,
                                        y2: star.y,
                                        strength: importance * 0.5,
                                        animated: false
                                    });
                                });
                            });

                            return connections.map(connection => {
                                const isSunConnection = connection.id.startsWith('sun-');
                                const baseOpacity = connection.strength * 0.4;

                                // Organic Curve Calculation (Bezier)
                                const dx = connection.x2 - connection.x1;
                                const dy = connection.y2 - connection.y1;
                                const distance = Math.sqrt(dx * dx + dy * dy);

                                // Curvature based on distance (subtle arc)
                                const curvature = 0.1;
                                const midX = (connection.x1 + connection.x2) / 2;
                                const midY = (connection.y1 + connection.y2) / 2;

                                // Orthogonal offset for control point
                                // Deterministic direction based on ID hash or coordinates to keep it stable
                                const angle = Math.atan2(dy, dx);
                                const offset = distance * curvature;
                                const ctrlX = midX - Math.sin(angle) * offset;
                                const ctrlY = midY + Math.cos(angle) * offset;

                                const pathData = `M ${connection.x1} ${connection.y1} Q ${ctrlX} ${ctrlY} ${connection.x2} ${connection.y2}`;

                                return (
                                    <g key={connection.id}>
                                        {/* Organic Path Stroke */}
                                        <motion.path
                                            d={pathData}
                                            stroke={isSunConnection ? "url(#sunRayGradient)" : "url(#semanticGradient)"}
                                            strokeWidth={isSunConnection ? 2 : connection.strength * 2.5}
                                            strokeLinecap="round"
                                            fill="none"
                                            filter="url(#neuralGlow)"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={connection.animated ? {
                                                pathLength: [0.9, 1, 0.9],
                                                opacity: [baseOpacity, baseOpacity * 1.5, baseOpacity],
                                                strokeWidth: [connection.strength * 2.5, connection.strength * 3.5, connection.strength * 2.5]
                                            } : {
                                                pathLength: 1,
                                                opacity: baseOpacity
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
                                    {/* 2. Intelligence Overlays (Subtle) */}
                                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10" />
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

                {/* STARS (Folders) orbiting moons */}
                {viewMode !== 'owner' && folderStarPositions.length > 0 && (
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                        {folderStarPositions.map(({ folder, x, y, delay, parentMoon }) => (
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

                {/* PROMOTED MOONS removed - important nodes now shown only in Semantic Cluster (top-left) */}
                {/* This prevents duplicate moon-like elements around planets */}

                {/* Node Stars - Ambient knowledge particles throughout the universe */}
                {/* IMPORTANT: Exclude nodes already rendered as promotedMoons to prevent duplicate keys */}
                {viewMode !== 'owner' && nodeStarPositions.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none z-20">
                        {/* UPGRADE E2: SEMANTIC CONSTELLATION LAYER - Light Connections */}
                        <div className="absolute inset-0 pointer-events-none z-0">
                            <SemanticLinesRenderer lines={connections} />
                        </div>

                        {nodeStarPositions
                            .filter(({ node }) => !promotedMoons.some(pm => pm.node.id === node.id))
                            .map(({ node, x, y, delay }) => (
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
                                            folderStarPositions.forEach(s => {
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
