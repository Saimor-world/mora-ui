'use client';

import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavStore } from '@/lib/store/navStore';
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
    const coreMode = useNavStore((s) => s.coreMode);
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
                        <div className="absolute inset-0">
                            <div className="pointer-events-none absolute inset-0 scale-[1.06] opacity-[0.34] saturate-[0.78] [filter:blur(2px)]">
                                <UniverseView />
                            </div>
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(124,58,237,0.18),rgba(13,9,33,0.50)_34%,rgba(5,3,18,0.86)_100%)]" />
                            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,3,18,0.84)_0%,rgba(13,9,33,0.56)_18%,rgba(13,9,33,0.12)_38%,rgba(13,9,33,0.12)_62%,rgba(13,9,33,0.56)_82%,rgba(5,3,18,0.84)_100%)]" />
                            <div className="pointer-events-none absolute inset-x-[18%] top-[14%] h-[24rem] rounded-full bg-violet-300/[0.10] blur-[160px]" />
                            <div className="pointer-events-none absolute inset-x-[24%] bottom-[9%] h-[18rem] rounded-full bg-indigo-300/[0.07] blur-[150px]" />
                            <motion.div
                                className="absolute inset-y-0 left-0 w-[23%] pointer-events-none"
                                initial={false}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: '-12%', transition: { duration: prefersReducedMotion ? 0.14 : 0.7, ease: [0.24, 0.96, 0.16, 1] as const } }}
                                style={{
                                    background: 'linear-gradient(90deg, rgba(2, 8, 9, 0.78) 0%, rgba(2, 8, 9, 0.54) 52%, rgba(2, 8, 9, 0) 100%)',
                                    backdropFilter: 'blur(1px)',
                                }}
                            />
                            <motion.div
                                className="absolute inset-y-0 right-0 w-[23%] pointer-events-none"
                                initial={false}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: '12%', transition: { duration: prefersReducedMotion ? 0.14 : 0.7, ease: [0.24, 0.96, 0.16, 1] as const } }}
                                style={{
                                    background: 'linear-gradient(270deg, rgba(2, 8, 9, 0.78) 0%, rgba(2, 8, 9, 0.54) 52%, rgba(2, 8, 9, 0) 100%)',
                                    backdropFilter: 'blur(1px)',
                                }}
                            />
                            <motion.div
                                className="absolute inset-0 pointer-events-none"
                                initial={false}
                                animate={{ opacity: 1 }}
                                exit={{
                                    opacity: 0,
                                    clipPath: prefersReducedMotion ? undefined : 'inset(0 48% 0 48% round 56px)',
                                    transition: { duration: prefersReducedMotion ? 0.14 : 0.72, ease: [0.24, 0.96, 0.16, 1] as const },
                                }}
                                style={{
                                    background: 'linear-gradient(90deg, rgba(2, 10, 8, 0.72) 0%, rgba(2, 18, 14, 0.38) 18%, rgba(2, 18, 14, 0.08) 50%, rgba(2, 18, 14, 0.38) 82%, rgba(2, 10, 8, 0.72) 100%)',
                                }}
                            />
                        </div>
                        <HomeSurface />
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
