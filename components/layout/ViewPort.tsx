"use client";

import React from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { CoreLayer } from '@/components/layers/CoreLayer';
import { DepartmentLayer } from '@/components/layers/DepartmentLayer';
import { AnimatePresence, motion } from 'framer-motion';

export const ViewPort: React.FC = () => {
    const viewLevel = useMoraStore((state) => state.viewLevel);

    return (
        <div className="w-full h-full flex items-center justify-center relative perspective-1000">
            <AnimatePresence mode="wait">
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
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <div className="text-2xl text-emerald-100/50 tracking-widest">
                            SPACE LAYER (Coming Soon)
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
