"use client";

import React from 'react';
import { useNavStore } from '@/lib/store/navStore';
import { CoreLayer } from '@/components/home/CoreLayer';
import { DepartmentSurface } from '@/components/layers/DepartmentSurface';
import { SpaceLayer } from '@/components/layers/SpaceLayer';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/**
 * ViewPort - Main Content Area Router
 * 
 * Routes based on:
 * - viewLevel: company | core | department | space | folder
 * - viewMode: owner | demo | workspace
 *
 * core → CoreLayer → coreMode='home' → HomeSurface (day-start working surface)
 *                  → coreMode='explore' → UniverseView (planet map)
 *
 * ambient → AmbientRoomOverlay (portaled in MoraShell at z-880, above panes; does not change viewLevel)
 *
 * CoreLayer owns the Home/Explore split so ViewPort stays a pure hierarchy router.
 */
export const ViewPort: React.FC = () => {
    const viewLevel = useNavStore((state) => state.viewLevel);
    const departmentEntryOrigin = useNavStore((state) => state.departmentEntryOrigin);
    const prefersReducedMotion = useReducedMotion();
    // folder → renders inside SpaceLayer; ambient → fullscreen takeover
    const effectiveViewLevel = viewLevel === 'folder' ? 'space' : viewLevel;

    // Transform-origin for the core↔department zoom. Anchored to the clicked
    // planet (viewport %) so entering a department reads as flying *into* that
    // planet, and backing out zooms back out from the same point. Falls back to
    // the cosmos core point (UNIVERSE_CORE_POINT ≈ 50% / 46%).
    const planetOrigin = departmentEntryOrigin
        ? `${departmentEntryOrigin.x}% ${departmentEntryOrigin.y}%`
        : '50% 46%';

    // Shared reduced-motion fallback variants (opacity-only, short duration)
    const rmVariants = prefersReducedMotion
        ? {
              initial:    { opacity: 0 as const },
              animate:    { opacity: 1 as const },
              exit:       { opacity: 0 as const, transition: { duration: 0.15 } },
              transition: { duration: 0.2 },
          }
        : null;

    return (
        <div className="w-full h-full relative">
            <AnimatePresence mode="wait" initial={false}>

                {/* CORE VIEW — CoreLayer routes to HomeSurface or UniverseView via coreMode.
                    Exit scales UP toward the clicked planet (camera flies in); entry on
                    back-nav starts zoomed-in and settles (camera pulls back out). */}
                {effectiveViewLevel === 'core' && (
                    <motion.div
                        key="core"
                        initial={rmVariants?.initial    ?? { opacity: 0, scale: 1.16, filter: 'blur(10px)' }}
                        animate={rmVariants?.animate    ?? { opacity: 1, scale: 1, filter: 'none' }}
                        exit={rmVariants?.exit          ?? { opacity: 0, scale: 1.55, filter: 'blur(16px)', transition: { duration: 0.42, ease: [0.4, 0, 0.2, 1] } }}
                        transition={rmVariants?.transition ?? { duration: 0.62, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute inset-0"
                        style={{ transformOrigin: planetOrigin }}
                    >
                        <CoreLayer />
                    </motion.div>
                )}

                {/* DEPARTMENT VIEW — interior unfolds from the planet entry point. */}
                {effectiveViewLevel === 'department' && (
                    <motion.div
                        key="department"
                        initial={rmVariants?.initial    ?? { opacity: 0, scale: 0.86, filter: 'blur(10px)' }}
                        animate={rmVariants?.animate    ?? { opacity: 1, scale: 1, filter: 'none' }}
                        exit={rmVariants?.exit          ?? { opacity: 0, scale: 1.12, filter: 'blur(12px)', transition: { duration: 0.34, ease: [0.4, 0, 0.2, 1] } }}
                        transition={rmVariants?.transition ?? { duration: 0.62, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute inset-0 preserve-3d"
                        style={{ transformOrigin: planetOrigin }}
                    >
                        <DepartmentSurface />
                    </motion.div>
                )}

                {/* SPACE VIEW */}
                {effectiveViewLevel === 'space' && (
                    <motion.div
                        key="space"
                        initial={rmVariants?.initial    ?? { opacity: 0, scale: 0.94, filter: 'blur(6px)' }}
                        animate={rmVariants?.animate    ?? { opacity: 1, scale: 1, filter: 'none' }}
                        exit={rmVariants?.exit          ?? { opacity: 0, scale: 1.08, filter: 'blur(10px)', transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } }}
                        transition={rmVariants?.transition ?? { duration: 0.56, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute inset-0 preserve-3d"
                    >
                        <SpaceLayer />
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
};
