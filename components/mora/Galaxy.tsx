"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface GalaxyProps {
    space: {
        id: string;
        name: string;
        description?: string;
    };
    position?: { x: number | string; y: number | string };
    delay?: number;
    onClick?: () => void;
}

/**
 * GALAXY COMPONENT
 * 
 * Represents a Space (Workspace) as a spiral galaxy.
 * Masterbibel: "kleine eingene galaxien"
 */
export const Galaxy: React.FC<GalaxyProps> = ({ space, position, delay = 0, onClick }) => {
    return (
        <motion.div
            className="absolute cursor-pointer group"
            style={{
                left: position?.x || '50%',
                top: position?.y || '50%',
                transform: 'translate(-50%, -50%)'
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay, duration: 0.8, type: 'spring' }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
        >
            {/* Galaxy Container */}
            <div className="relative w-32 h-32 flex items-center justify-center">

                {/* Core Glow */}
                <motion.div
                    className="absolute w-12 h-12 bg-amber-200/30 rounded-full blur-xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity }}
                />

                {/* Bright Center */}
                <div className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)] z-10" />

                {/* Spiral Arms - Layer 1 */}
                <motion.div
                    className="absolute inset-0 rounded-full opacity-40 mix-blend-screen"
                    style={{
                        background: 'conic-gradient(from 0deg, transparent 0%, rgba(245, 158, 11, 0.1) 20%, rgba(245, 158, 11, 0.4) 40%, transparent 60%, rgba(245, 158, 11, 0.1) 80%, transparent 100%)',
                        filter: 'blur(8px)'
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                />

                {/* Spiral Arms - Layer 2 (Counter-rotation or faster) */}
                <motion.div
                    className="absolute inset-2 rounded-full opacity-30 mix-blend-screen"
                    style={{
                        background: 'conic-gradient(from 180deg, transparent 0%, rgba(251, 191, 36, 0.2) 30%, transparent 60%, rgba(251, 191, 36, 0.1) 90%, transparent 100%)',
                        filter: 'blur(5px)'
                    }}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                />

                {/* Star Dust Particles */}
                <div className="absolute inset-0 rounded-full border border-white/5 opacity-20" />
            </div>

            {/* Label */}
            <motion.div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-center whitespace-nowrap z-20"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + 0.3 }}
            >
                <div className="glass-panel px-3 py-1.5 rounded-lg border border-white/10 bg-black/40 backdrop-blur-md">
                    <div className="text-xs text-amber-100/90 font-light tracking-widest uppercase">
                        {space.name}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
