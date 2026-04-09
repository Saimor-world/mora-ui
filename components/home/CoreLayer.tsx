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

    const homeVariants = {
        initial: {
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 1.015,
        },
        animate: {
            opacity: 1,
            scale: 1,
            transition: { duration: prefersReducedMotion ? 0.16 : 0.42, ease: [0.22, 0.9, 0.18, 1] as const },
        },
        exit: {
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 0.985,
            transition: { duration: prefersReducedMotion ? 0.14 : 0.52, ease: [0.32, 0.02, 0.16, 1] as const },
        },
    };

    const exploreVariants = {
        initial: {
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 1.045,
            filter: prefersReducedMotion ? 'blur(0px)' : 'blur(7px)',
        },
        animate: {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            transition: { duration: prefersReducedMotion ? 0.16 : 0.62, ease: [0.16, 0.84, 0.2, 1] as const },
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
                        <div className="absolute inset-0">
                            <div className="absolute inset-0 scale-[1.018] opacity-[0.72] saturate-[0.8] [filter:blur(0.55px)]">
                                <UniverseView />
                            </div>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(19,55,76,0.12),rgba(5,12,16,0.22)_32%,rgba(2,7,10,0.48)_100%)]" />
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,10,10,0.46)_0%,rgba(3,10,10,0.2)_23%,rgba(3,10,10,0.06)_44%,rgba(3,10,10,0.06)_56%,rgba(3,10,10,0.2)_77%,rgba(3,10,10,0.46)_100%)]" />
                            <div className="absolute inset-x-[22%] top-[16%] h-[21rem] rounded-full bg-cyan-400/[0.032] blur-[128px]" />
                            <div className="absolute inset-x-[28%] bottom-[10%] h-[14rem] rounded-full bg-emerald-400/[0.022] blur-[122px]" />
                            <motion.div
                                className="absolute inset-0 pointer-events-none"
                                initial={false}
                                animate={{ opacity: 1 }}
                                exit={{
                                    opacity: 0,
                                    clipPath: prefersReducedMotion ? undefined : 'inset(0 49% 0 49% round 48px)',
                                    transition: { duration: prefersReducedMotion ? 0.14 : 0.56, ease: [0.24, 0.96, 0.16, 1] as const },
                                }}
                                style={{
                                    background: 'linear-gradient(90deg, rgba(3, 10, 11, 0.78) 0%, rgba(3, 10, 11, 0.32) 22%, rgba(3, 10, 11, 0) 50%, rgba(3, 10, 11, 0.32) 78%, rgba(3, 10, 11, 0.78) 100%)',
                                }}
                            />
                        </div>
                        <HomeSurface overlayMode />
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
