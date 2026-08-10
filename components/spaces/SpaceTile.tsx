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
    const folderCount = space.folder_count ?? 0;
    const folderCountLabel = folderCount === 1 ? '1 Ordner' : `${folderCount} Ordner`;
    const updatedAt = space.updated_at
        ? new Date(space.updated_at)
        : null;
    const updatedAtLabel = updatedAt && !Number.isNaN(updatedAt.getTime())
        ? `Aktualisiert ${new Intl.DateTimeFormat('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(updatedAt)}`
        : null;

    return (
        <motion.button
            type="button"
            aria-label={`Bereich ${space.name} öffnen`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onClick(space.id)}
            className="group relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-pointer text-left"
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
                    <span aria-hidden="true" className="p-1 rounded-md text-white/30">
                        <MoreVertical size={16} />
                    </span>
                </div>

                {/* Body */}
                <div>
                    <h3 className="text-lg font-medium text-emerald-50 mb-1 group-hover:text-emerald-400 transition-colors">
                        {space.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                        {updatedAtLabel && (
                            <>
                                <span className="flex items-center gap-1">
                                    <Clock aria-hidden="true" size={12} />
                                    {updatedAtLabel}
                                </span>
                                <span aria-hidden="true">•</span>
                            </>
                        )}
                        <span>{folderCountLabel}</span>
                    </div>
                </div>

                {/* Footer / Action (Visible on Hover) */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <ArrowRight size={16} />
                    </div>
                </div>
            </div>
        </motion.button>
    );
};
