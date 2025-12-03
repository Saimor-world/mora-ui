"use client";

import React from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { CompanyCoreView } from '@/components/home/CompanyCoreView';
import { DepartmentLayer } from '@/components/layers/DepartmentLayer';
import { SpaceLayer } from '@/components/layers/SpaceLayer';
import { FolderLayer } from '@/components/layers/FolderLayer';
import { OwnerHome } from '@/components/home/OwnerHome';
import { AnimatePresence, motion } from 'framer-motion';

export const ViewPort: React.FC = () => {
    const viewLevel = useMoraStore((state) => state.viewLevel);

    return (
        <div className="w-full h-full flex items-center justify-center relative perspective-1000">
            <AnimatePresence mode="wait">
                {viewLevel === 'company' && (
                    <motion.div
                        key="company"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0"
                    >
                        <OwnerHome />
                    </motion.div>
                )}

                {viewLevel === 'core' && (
                    <motion.div
                        key="core"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{
                            opacity: 0,
                            scale: 1.5,  // Zoom in when leaving (diving into department)
                            filter: 'blur(10px)'
                        }}
                        transition={{
                            duration: 0.8,
                            ease: [0.4, 0, 0.2, 1]  // Smooth easing
                        }}
                        className="absolute inset-0"
                    >
                        <CompanyCoreView />
                    </motion.div>
                )}

                {viewLevel === 'department' && (
                    <motion.div
                        key="department"
                        initial={{
                            opacity: 0,
                            scale: 0.5,  // Zoom from small (diving effect)
                            filter: 'blur(10px)'
                        }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            filter: 'blur(0px)'
                        }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        transition={{
                            duration: 0.8,
                            ease: [0.4, 0, 0.2, 1]
                        }}
                        className="absolute inset-0"
                    >
                        <DepartmentLayer />
                    </motion.div>
                )}

                {viewLevel === 'space' && (
                    <motion.div
                        key="space"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0"
                    >
                        <SpaceLayer />
                    </motion.div>
                )}

                {viewLevel === 'folder' && (
                    <motion.div
                        key="folder"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0"
                    >
                        <FolderLayer />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
