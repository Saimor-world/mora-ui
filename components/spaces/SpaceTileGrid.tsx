"use client";

import React from 'react';
import { SpaceTile } from './SpaceTile';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { CoreSpace } from '@/lib/types/core';

interface SpaceTileGridProps {
    spaces: CoreSpace[];
    onSpaceClick: (id: string) => void;
    onCreateSpace?: () => void;
}

/**
 * SPACE TILE GRID
 * 
 * Responsive grid layout for SpaceTiles.
 * Includes a "Create New Space" card as the last item.
 */
export const SpaceTileGrid: React.FC<SpaceTileGridProps> = ({
    spaces,
    onSpaceClick,
    onCreateSpace
}) => {
    return (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-1">
            {spaces.map((space, index) => (
                <SpaceTile
                    key={space.id}
                    space={space}
                    index={index}
                    onClick={onSpaceClick}
                />
            ))}

            {/* Create New Space Card */}
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: spaces.length * 0.05, duration: 0.4 }}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.03)' }}
                whileTap={{ scale: 0.98 }}
                onClick={onCreateSpace}
                className="group relative w-full aspect-[4/3] rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:border-emerald-500/30 transition-colors"
            >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <Plus className="w-6 h-6 text-white/30 group-hover:text-emerald-400 transition-colors" />
                </div>
                <span className="text-sm text-white/30 group-hover:text-emerald-400/80 font-medium tracking-wide">
                    Create Space
                </span>
            </motion.button>
        </div>
    );
};
