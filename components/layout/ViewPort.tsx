"use client";

import React from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { CoreLayer } from '@/components/layers/CoreLayer';
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
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0"
                    >
                        <CoreLayer />
                    </motion.div>
                )}

                {viewLevel === 'department' && (
                    <motion.div
                        key="department"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        transition={{ duration: 0.5 }}
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
