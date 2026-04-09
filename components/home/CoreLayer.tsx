'use client';

import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMoraStore } from '@/lib/store/moraState';
import { HomeSurface } from '@/components/home/HomeSurface';
import UniverseView from '@/components/home/UniverseView';

/**
 * CoreLayer — Surface router for viewLevel='core'
 *
 * Reads coreMode from moraState and renders the appropriate surface:
 *   'home'    → HomeSurface (day-start working surface, default after login)
 *   'explore' → UniverseView (Universe planet map, explicit user action)
 *
 * This is NOT a new route — it is a surface mode switch within the shell.
 * Animation: short crossfade (200ms), no scale/blur (surface switch ≠ layer zoom).
 *
 * Entry points that set coreMode:
 *   → 'home':    Dock "Start" / Mod+H, company switch (both in moraState)
 *   → 'explore': HomeSurface "Erkunden →" button, breadcrumb root from dept/space
 *
 * @see docs/plans/2026-03-27-corelayer-home-implementation-order.md
 * @see lib/store/moraState.ts — CoreMode type + setCoreMode action
 */
export const CoreLayer: React.FC = () => {
    const coreMode = useMoraStore((s) => s.coreMode);
    const prefersReducedMotion = useReducedMotion();

    const fadeVariants = {
        initial:    { opacity: 0 },
        animate:    { opacity: 1 },
        exit:       { opacity: 0, transition: { duration: prefersReducedMotion ? 0.1 : 0.15 } },
        transition: { duration: prefersReducedMotion ? 0.1 : 0.2 },
    };

    return (
        <div className="absolute inset-0">
            <AnimatePresence mode="wait" initial={false}>
                {coreMode === 'home' ? (
                    <motion.div
                        key="home"
                        className="absolute inset-0"
                        {...fadeVariants}
                    >
                        <div className="absolute inset-0">
                            <div className="absolute inset-0 scale-[1.015] opacity-78 saturate-[0.88] [filter:blur(0.5px)]">
                                <UniverseView />
                            </div>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(20,54,66,0.18),rgba(4,12,12,0.18)_38%,rgba(3,8,10,0.42)_100%)]" />
                            <div className="absolute inset-x-[18%] top-[18%] h-[24rem] rounded-full bg-cyan-400/[0.06] blur-[120px]" />
                            <div className="absolute inset-x-[26%] bottom-[12%] h-[16rem] rounded-full bg-emerald-400/[0.05] blur-[110px]" />
                        </div>
                        <HomeSurface overlayMode />
                    </motion.div>
                ) : (
                    <motion.div
                        key="explore"
                        className="absolute inset-0"
                        {...fadeVariants}
                    >
                        <UniverseView />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
