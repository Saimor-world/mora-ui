"use client";

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface NeuralGridProps {
    active?: boolean;
    state?: string;
}

/**
 * NEURAL GRID - Tesla/SpaceX Style Decorative Overlay
 * 
 * Provides a subtle technological "texture" to the background.
 * Reacts to the AI's pulse state.
 */
export const NeuralGrid: React.FC<NeuralGridProps> = ({
    active = true,
    state = 'idle'
}) => {
    const prefersReducedMotion = useReducedMotion();
    const [isDocumentVisible, setIsDocumentVisible] = useState(
        typeof document === 'undefined' ? true : !document.hidden
    );
    const animateGrid =
        active &&
        !prefersReducedMotion &&
        isDocumentVisible &&
        (state === 'thinking' || state === 'focus' || state === 'alert');
    const showScanLine = animateGrid && state === 'thinking';

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const handleVisibilityChange = () => {
            setIsDocumentVisible(!document.hidden);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Primary Grid Lines */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: '100px 100px',
                    maskImage: 'radial-gradient(circle at 50% 50%, black 30%, transparent 80%)'
                }}
            />

            {/* Micro Grid (Tesla Style) */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(255,255,255,0.01) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.01) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px',
                    maskImage: 'radial-gradient(circle at 50% 50%, black 20%, transparent 60%)'
                }}
            />

            {/* Neural Pulse Effect */}
            {animateGrid && (
                <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-emerald-500/[0.02] to-transparent"
                    animate={{
                        opacity: state === 'thinking' ? [0.2, 0.4, 0.2] : [0.05, 0.1, 0.05],
                        y: ['-10%', '10%', '-10%']
                    }}
                    transition={{
                        duration: state === 'thinking' ? 4 : 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            )}

            {/* Decorative Corner Markers */}
            <div className="absolute top-8 left-8 w-16 h-16 border-t border-l border-white/5 opacity-40" />
            <div className="absolute top-8 right-8 w-16 h-16 border-t border-r border-white/5 opacity-40" />
            <div className="absolute bottom-8 left-8 w-16 h-16 border-b border-l border-white/5 opacity-40" />
            <div className="absolute bottom-8 right-8 w-16 h-16 border-b border-r border-white/5 opacity-40" />

            {/* Scanning Line (only when thinking) */}
            {showScanLine && (
                <motion.div
                    className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent"
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
            )}
        </div>
    );
};
