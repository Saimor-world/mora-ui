"use client";

import React from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import UniverseView from '@/components/home/UniverseView';
import { DepartmentLayer } from '@/components/layers/DepartmentLayer';
import { SpaceLayer } from '@/components/layers/SpaceLayer';
import { FolderLayer } from '@/components/layers/FolderLayer';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/**
 * ViewPort - Main Content Area Router
 * 
 * Routes based on:
 * - viewLevel: company | core | department | space | folder
 * - viewMode: owner | demo | workspace
 * 
 * 
 * DEMO/WORKSPACE VIEW:
 * - 🏠 Home = "core" level = UniverseView with active company's structure
 * - ⚡ Demo = "core" level with Simple Coffee Group
 */
export const ViewPort: React.FC = () => {
    const viewLevel = useMoraStore((state) => state.viewLevel);
    const viewMode = useMoraStore((state) => state.viewMode);
    const prefersReducedMotion = useReducedMotion();

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

                {/* CORE VIEW - UniverseView (Orbital Universe) */}
                {viewLevel === 'core' && (
                    <motion.div
                        key="core"
                        initial={rmVariants?.initial    ?? { opacity: 0, scale: 0.95 }}
                        animate={rmVariants?.animate    ?? { opacity: 1, scale: 1 }}
                        exit={rmVariants?.exit          ?? { opacity: 0, scale: 2.85, filter: 'blur(16px)', transition: { duration: 0.35, ease: [0.6, 0.05, 0, 0.9] } }}
                        transition={rmVariants?.transition ?? { duration: 0.8, ease: [0.6, 0.05, 0, 0.9] }}
                        className="absolute inset-0"
                    >
                        <UniverseView />
                    </motion.div>
                )}

                {/* DEPARTMENT VIEW */}
                {viewLevel === 'department' && (
                    <motion.div
                        key="department"
                        initial={rmVariants?.initial    ?? { opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                        animate={rmVariants?.animate    ?? { opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={rmVariants?.exit          ?? { opacity: 0, scale: 2.85, filter: 'blur(16px)', transition: { duration: 0.35, ease: [0.6, 0.05, 0, 0.9] } }}
                        transition={rmVariants?.transition ?? { duration: 0.8, ease: [0.6, 0.05, 0, 0.9] }}
                        className="absolute inset-0 preserve-3d"
                    >
                        <DepartmentLayer />
                    </motion.div>
                )}

                {/* SPACE VIEW */}
                {viewLevel === 'space' && (
                    <motion.div
                        key="space"
                        initial={rmVariants?.initial    ?? { opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                        animate={rmVariants?.animate    ?? { opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={rmVariants?.exit          ?? { opacity: 0, scale: 2.85, filter: 'blur(16px)', transition: { duration: 0.35, ease: [0.6, 0.05, 0, 0.9] } }}
                        transition={rmVariants?.transition ?? { duration: 0.8, ease: [0.6, 0.05, 0, 0.9] }}
                        className="absolute inset-0 preserve-3d"
                    >
                        <SpaceLayer />
                    </motion.div>
                )}

                {/* FOLDER VIEW */}
                {viewLevel === 'folder' && (
                    <motion.div
                        key="folder"
                        initial={rmVariants?.initial    ?? { opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                        animate={rmVariants?.animate    ?? { opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={rmVariants?.exit          ?? { opacity: 0, scale: 1.1, filter: 'blur(0px)' }}
                        transition={rmVariants?.transition ?? { duration: 0.8, ease: [0.6, 0.05, 0, 0.9] }}
                        className="absolute inset-0 preserve-3d"
                    >
                        <FolderLayer />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
