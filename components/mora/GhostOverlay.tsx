"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, useMotionValue, useSpring } from 'framer-motion';

/**
 * GHOST OVERLAY (The Living Cursor)
 * 
 * Represents Mora's backend attention stream.
 * 
 * FEATURES:
 * - Fluid, organic movement (Spring physics)
 * - "Breathing" visualization (Expansion/Contraction based on Neural Load)
 * - Trajectory interpolation from Backend WebSocket (or mock for now)
 */

interface GhostState {
    active: boolean;
    x: number;
    y: number;
    mode: 'idle' | 'observing' | 'thinking' | 'acting';
    targetId?: string;
}

export const GhostOverlay: React.FC = () => {
    // 1. PHYSICS ENGINE
    const x = useSpring(0, { stiffness: 50, damping: 20 });
    const y = useSpring(0, { stiffness: 50, damping: 20 });
    const scale = useSpring(1, { stiffness: 100, damping: 10 });
    const opacity = useSpring(0, { stiffness: 50, damping: 20 });

    const [mode, setMode] = useState<GhostState['mode']>('idle');
    const [lastActive, setLastActive] = useState(Date.now());

    // 2. MOCK BACKEND STREAM - REMOVED (Now driven by WebSocket via MoraShell)
    // The "Soul" is no longer simulated locally; it comes from the Digital Cortex.

    // 3. LISTEN FOR EVENTS (The Bridge)
    useEffect(() => {
        const handleGhostEvent = (e: CustomEvent) => {
            const { x: tx, y: ty, mode: newMode, active, pulse } = e.detail;

            if (active !== undefined) opacity.set(active ? 1 : 0);

            // Convert Percentage (0-100) to Pixels
            if (tx !== undefined && typeof window !== 'undefined') {
                x.set((tx / 100) * window.innerWidth);
            }
            if (ty !== undefined && typeof window !== 'undefined') {
                y.set((ty / 100) * window.innerHeight);
            }

            if (newMode) setMode(newMode);

            // Pulse effect when Mora points at something
            if (pulse) {
                scale.set(1.5);
                setTimeout(() => scale.set(1), 300);
            }

            setLastActive(Date.now());
        };

        // Listen for both event names (legacy and new)
        window.addEventListener('mora:ghost-update' as any, handleGhostEvent as any);
        window.addEventListener('mora:presence-update' as any, handleGhostEvent as any);

        return () => {
            window.removeEventListener('mora:ghost-update' as any, handleGhostEvent as any);
            window.removeEventListener('mora:presence-update' as any, handleGhostEvent as any);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - spring refs are stable

    // 4. VISUALS (The Soul)
    const getColors = () => {
        switch (mode) {
            case 'thinking': return { core: '#60A5FA', glow: 'rgba(96, 165, 250, 0.6)' }; // Blue
            case 'acting': return { core: '#F59E0B', glow: 'rgba(245, 158, 11, 0.6)' }; // Amber
            case 'observing': return { core: '#7C3AED', glow: 'rgba(124, 58, 237, 0.6)' }; // Emerald
            default: return { core: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.4)' }; // White ghost
        }
    };

    const colors = getColors();

    return (
        <div className="fixed inset-0 pointer-events-none z-[9990] overflow-hidden">
            <motion.div
                style={{ x, y, opacity, scale }}
                className="absolute w-0 h-0 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
            >
                {/* 1. Core Light */}
                <motion.div
                    className="w-4 h-4 rounded-full bg-white/80 blur-[2px]"
                    style={{ backgroundColor: colors.core }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* 2. Ethereal Aura (Breathing) */}
                <motion.div
                    className="absolute w-12 h-12 rounded-full blur-[12px]"
                    style={{ backgroundColor: colors.glow }}
                    animate={{
                        scale: mode === 'thinking' ? [1, 2, 1] : [1, 1.5, 1],
                        opacity: [0.4, 0.2, 0.4]
                    }}
                    transition={{ duration: mode === 'thinking' ? 1 : 4, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* 3. Trajectory Trail (Particle Dust) */}
                {/* (To be implemented with Canvas for performance, keeping simple for now) */}

            </motion.div>
        </div>
    );
};
