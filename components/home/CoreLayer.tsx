'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavStore } from '@/lib/store/navStore';
import { HomeSurfaceNext } from '@/components/home/HomeSurfaceNext';
import { VisitorHomeSurface } from '@/components/home/VisitorHomeSurface';

/**
 * CoreLayer — Surface router for viewLevel='core'.
 *
 * Authenticated OS users land on the new command field. Public/preview visitors
 * keep the purpose-built visitor surface. Universe remains an explicit explore
 * mode so the Saimôr spatial identity stays intact without owning the daily path.
 */
const UniverseView = dynamic(() => import('@/components/home/UniverseView'), {
    ssr: false,
    loading: () => (
        <div
            className="absolute inset-0 bg-[#05080e]"
            aria-hidden
            data-testid="universe-view-loading"
        />
    ),
});

export const CoreLayer: React.FC = () => {
    const coreMode = useNavStore((s) => s.coreMode);
    const activeMode = useNavStore((s) => s.activeMode);
    const prefersReducedMotion = useReducedMotion();

    const homeVariants = {
        initial: {
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 1.008,
        },
        animate: {
            opacity: 1,
            scale: 1,
            transition: { duration: prefersReducedMotion ? 0.16 : 0.48, ease: [0.22, 0.9, 0.18, 1] as const },
        },
        exit: {
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 0.985,
            transition: { duration: prefersReducedMotion ? 0.14 : 0.42, ease: [0.32, 0.02, 0.16, 1] as const },
        },
    };

    const exploreVariants = {
        initial: {
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 1.045,
            filter: prefersReducedMotion ? 'blur(0px)' : 'blur(8px)',
        },
        animate: {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            transition: { duration: prefersReducedMotion ? 0.16 : 0.72, ease: [0.16, 0.84, 0.2, 1] as const },
        },
        exit: {
            opacity: 0,
            transition: { duration: prefersReducedMotion ? 0.12 : 0.22 },
        },
    };

    return (
        <div className="absolute inset-0">
            <AnimatePresence initial={false} mode="wait">
                {coreMode === 'home' ? (
                    <motion.div
                        key="home"
                        className="absolute inset-0 z-10 pointer-events-none"
                        variants={homeVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        {activeMode === 'visitor' || activeMode === 'private_preview'
                            ? <VisitorHomeSurface />
                            : <HomeSurfaceNext />}
                    </motion.div>
                ) : (
                    <motion.div
                        key="universe"
                        className="absolute inset-0 z-10"
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
