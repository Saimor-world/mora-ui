"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Folder, Clock, MoreVertical, ArrowRight } from 'lucide-react';
import type { CoreSpace } from '@/lib/types/core';

interface SpaceTileProps {
    space: CoreSpace;
    onClick: (id: string) => void;
    index?: number;
}

/**
 * SPACE TILE
 * 
 * Glass-morphism card representing a Space within a Department.
 * 
 * Features:
 * - Glass background with blur
 * - Hover effects (lift, glow, border highlight)
 * - Folder count visualization (dots or number)
 * - Activity indicator
 * - "Enter" action button on hover
 */
export const SpaceTile: React.FC<SpaceTileProps> = ({ space, onClick, index = 0 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onClick(space.id)}
            className="group relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-pointer"
            style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}
        >
            {/* Hover Glow Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.2), transparent 70%)'
                }}
            />

            {/* Content Container */}
            <div className="absolute inset-0 p-5 flex flex-col justify-between">

                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:border-emerald-500/50 transition-colors">
                        <Folder className="w-5 h-5 text-emerald-400" />
                    </div>
                    <button className="p-1 rounded-md hover:bg-white/5 text-white/30 hover:text-white/70 transition-colors">
                        <MoreVertical size={16} />
                    </button>
                </div>

                {/* Body */}
                <div>
                    <h3 className="text-lg font-medium text-emerald-50 mb-1 group-hover:text-emerald-400 transition-colors">
                        {space.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                        <span className="flex items-center gap-1">
                            <Clock size={12} />
                            2h ago
                        </span>
                        <span>•</span>
                        <span>{(space as any).folder_count || 0} folders</span>
                    </div>
                </div>

                {/* Footer / Action (Visible on Hover) */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <ArrowRight size={16} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
