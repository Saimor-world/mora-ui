"use client";

import React, { useEffect, useMemo } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { motion, AnimatePresence } from 'framer-motion';
import { SemanticConstellation } from '@/components/visual/SemanticConstellation';
import { Star } from '@/components/mora/Star';
import { ArrowLeft, Plus } from 'lucide-react';
import { LoadingState } from '@/components/ui/LoadingState';

/**
 * DEPARTMENT LAYER - GALAXY VIEW
 * 
 * Visualizes a Department as a sector of the universe.
 * Spaces are rendered as "Galaxies" (Spiral Systems).
 * 
 * Masterbibel: "Spaces sind kleine eigene Galaxien"
 */
export const DepartmentLayer: React.FC = () => {
    const {
        activeDepartmentId,
        departments,
        spacesByDepartment,
        isLoadingSpaces,
        loadSpacesForDepartment,
        navigateToCore,
        navigateToSpace,
        addSpace,
        setActiveSpace // Need to set active space so the pane finds data? Actually pane can take data directly.
    } = useMoraStore();
    const { addPane } = usePaneStore();

    const currentDepartment = departments.find(d => d.id === activeDepartmentId);
    const spaces = activeDepartmentId ? (spacesByDepartment[activeDepartmentId] || []) : [];

    useEffect(() => {
        if (activeDepartmentId && !spacesByDepartment[activeDepartmentId]) {
            loadSpacesForDepartment(activeDepartmentId);
        }
    }, [activeDepartmentId, spacesByDepartment, loadSpacesForDepartment]);

    // Calculate Orbital Positions (Moons around Planet)
    const moonPositions = useMemo(() => {
        if (spaces.length === 0) return [];

        // PHASE 6.4: Organic Orbital Physics
        const count = spaces.length; // Show all spaces
        const baseRadius = 250;

        return spaces.map((space, i) => {
            // Golden Angle distribution for organic clustering
            const goldenAngle = Math.PI * (3 - Math.sqrt(5));
            const angle = i * goldenAngle;

            // Spiral out slightly
            const radius = baseRadius + (i * 20);

            return {
                space,
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                angle,
                radius,
                delay: i * 0.1
            };
        });
    }, [spaces]);

    // Background Stars
    const stars = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1
    })), []);

    if (!activeDepartmentId) return null;

    return (
        <div className="relative w-full h-full overflow-hidden bg-transparent">

            {/* Background Atmosphere removed to use universal MoraShell background */}

            {/* Back Button */}
            <motion.button
                onClick={navigateToCore}
                className="absolute top-8 left-8 z-50 flex items-center gap-2 text-white/50 hover:text-white transition-colors group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: -5 }}
            >
                <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 border border-white/5 transition-colors">
                    <ArrowLeft size={20} />
                </div>
                <span className="text-sm tracking-widest font-light">BACK TO ORBIT</span>
            </motion.button>

            {/* Department Title (Center) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
                <motion.h1
                    className="text-[140px] font-thin text-white/[0.12] tracking-[0.25em] whitespace-nowrap select-none font-sans"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                >
                    {currentDepartment?.name.toUpperCase()}
                </motion.h1>
            </div>

            {/* SEMANTIC LAYER ANCHOR (Phase 5.2) */}
            {/* Phase 6.1: Active Constellation Renderer */}
            <div
                id="semantic-layer-anchor"
                className="absolute inset-0 z-5 pointer-events-none overflow-visible"
                aria-hidden="true"
            >
                <div className="absolute top-1/2 left-1/2 w-0 h-0 overflow-visible">
                    <SemanticConstellation
                        center={{ x: 0, y: 0 }}
                        satellites={moonPositions.map(m => ({
                            id: m.space.id,
                            x: m.x,
                            y: m.y,
                            weight: 0.6
                        }))}
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                {isLoadingSpaces ? (
                    <LoadingState message="Scanning Sector..." />
                ) : (
                    <div className="relative w-full h-full max-w-6xl max-h-[800px] mx-auto">
                        {/* Center Point (Department Core) */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 rounded-full blur-md opacity-50" />

                        {/* Moons (Spaces) orbiting Department */}
                        {moonPositions.map(({ space, x, y, delay }) => (
                            <motion.div
                                key={space.id}
                                className="absolute cursor-pointer group"
                                style={{
                                    left: `calc(50% + ${x}px)`,
                                    top: `calc(50% + ${y}px)`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay, duration: 0.5 }}
                                whileHover={{ scale: 1.15 }}
                                onClick={() => {
                                    addPane({
                                        id: `space-${space.id}`,
                                        type: 'space',
                                        title: space.name,
                                        data: {
                                            spaceId: space.id,
                                            departmentId: activeDepartmentId  // Pass parent for context
                                        },
                                        position: { x: 100, y: 100 },
                                        size: { width: 1000, height: 700 },
                                        minimized: false
                                    });
                                }}

                            >
                                <Star
                                    space={{
                                        id: space.id,
                                        name: space.name,
                                        department_id: activeDepartmentId, // Explicitly pass activeDepartmentId
                                        description: space.description || undefined,
                                        folder_count: 0 // Keep as 0 for now as 'space' type might not have it yet, avoiding redundant find()
                                    }}
                                    position={{ x: 0, y: 0 }}
                                    size="xl"
                                    isActive={false}
                                />
                                {/* Label for Space - ALWAYS VISIBLE */}
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                    <span className="text-[11px] text-white/60 group-hover:text-emerald-300 font-medium tracking-wide transition-colors duration-200">
                                        {space.name}
                                    </span>
                                </div>
                                {/* Enhanced Hover Info */}
                                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                                    <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-emerald-500/30 shadow-lg">
                                        <span className="text-[10px] text-emerald-400/80 uppercase tracking-wider">Click to open</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Empty State / Create Button */}
                        {spaces.length === 0 && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
                                <div className="text-white/30 font-light tracking-wider">NO SPACES FOUND</div>
                                <button className="px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 text-emerald-400 transition-colors flex items-center gap-2">
                                    <Plus size={16} />
                                    <span>Create Space</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
