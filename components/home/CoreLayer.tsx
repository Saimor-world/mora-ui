'use client';

import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavStore } from '@/lib/store/navStore';
import { HomeSurface } from '@/components/home/HomeSurface';
import { VisitorHomeSurface } from '@/components/home/VisitorHomeSurface';
import UniverseView from '@/components/home/UniverseView';

/**
 * CoreLayer — Surface router for viewLevel='core'
 *
 * Reads coreMode from navStore and renders the appropriate surface:
 *   'home'    → HomeSurface (day-start working surface, default after login)
 *   'explore' → UniverseView (Universe planet map, explicit user action)
 *
 * This is NOT a new route — it is a surface mode switch within the shell.
 * Animation: short crossfade (200ms), no scale/blur (surface switch ≠ layer zoom).
 *
 * Entry points that set coreMode:
 *   → 'home':    Dock "Start" / Mod+H, company switch (both via navStore)
 *   → 'explore': HomeSurface "Erkunden →" button, breadcrumb root from dept/space
 *
 * @see docs/plans/2026-03-27-corelayer-home-implementation-order.md
 * @see lib/store/navStore.ts — setCoreMode action
 * @see lib/types/mora.ts — CoreMode type
 */
export const CoreLayer: React.FC = () => {
    const coreMode = useNavStore((s) => s.coreMode);
    const activeMode = useNavStore((s) => s.activeMode);
    const prefersReducedMotion = useReducedMotion();

    const homeVariants = {
        initial: {
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 1.01,
        },
        animate: {
            opacity: 1,
            scale: 1,
            transition: { duration: prefersReducedMotion ? 0.16 : 0.5, ease: [0.22, 0.9, 0.18, 1] as const },
        },
        exit: {
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 0.975,
            transition: { duration: prefersReducedMotion ? 0.14 : 0.7, ease: [0.32, 0.02, 0.16, 1] as const },
        },
    };

    const exploreVariants = {
        initial: {
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 1.07,
            filter: prefersReducedMotion ? 'blur(0px)' : 'blur(10px)',
        },
        animate: {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            transition: { duration: prefersReducedMotion ? 0.16 : 0.82, ease: [0.16, 0.84, 0.2, 1] as const },
        },
        exit: {
            opacity: 0,
            transition: { duration: prefersReducedMotion ? 0.12 : 0.24 },
        },
    };

    return (
        <div className="absolute inset-0">
            <AnimatePresence initial={false}>
                {coreMode === 'home' ? (
                    <motion.div
                        key="home"
                        className="absolute inset-0"
                        variants={homeVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        {/* No blurred UniverseView duplicate here — MoraLivingBackground
                            (z-0, scene-reactive) already provides the cosmic depth behind
                            Home. The old duplicate drifted with mouse parallax (the "ramp")
                            and washed the panels out. Home and Universe now share ONE
                            background truth. */}
                        {activeMode === 'visitor' || activeMode === 'private_preview'
                            ? <VisitorHomeSurface />
                            : <HomeSurface />}
                    </motion.div>
                ) : (
                    <motion.div
                        key="explore"
                        className="absolute inset-0"
                        variants={exploreVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <UniverseView />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
