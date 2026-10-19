"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface AmbientDustProps {
    /** Number of particles to render */
    count?: number;
    /** Particle size range (min, max) in px */
    sizeRange?: [number, number];
    /** Animation duration range (min, max) in seconds */
    durationRange?: [number, number];
    /** Particle color */
    color?: string;
    /** Particle opacity */
    opacity?: number;
    /** Obey the shell motion controls. */
    paused?: boolean;
}

/**
 * AMBIENT DUST
 * 
 * Floating background particles that create depth and organic movement.
 * Used in Company Core View and other immersive screens.
 * 
 * Design:
 * - Subtle, slow-moving particles
 * - Deterministic starting positions
 * - Matte radial light with gentle drift and continuous presence
 * - Scene tint supplied by the shell
 * 
 * Performance:
 * - Optimized with useMemo (particles calculated once)
 * - CSS transforms (GPU-accelerated)
 * - Configurable count (adjust for performance)
 */
const DEFAULT_SIZE: [number, number] = [3, 8];
const DEFAULT_DURATION: [number, number] = [22, 40];
const seeded = (index: number) => { const n = Math.sin(index * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

export const AmbientDust: React.FC<AmbientDustProps> = ({
    count = 20,
    sizeRange = DEFAULT_SIZE,
    durationRange = DEFAULT_DURATION,
    color = 'rgba(190, 211, 194, 0.65)',
    opacity = 0.22,
    paused = false
}) => {
    const reduced = useReducedMotion();
    const [visible, setVisible] = useState(true);
    useEffect(() => {
        const sync = () => setVisible(!document.hidden);
        sync(); document.addEventListener('visibilitychange', sync);
        return () => document.removeEventListener('visibilitychange', sync);
    }, []);
    const moving = !paused && !reduced && visible;
    const [minSize, maxSize] = sizeRange, [minDuration, maxDuration] = durationRange;
    // Stable positions survive shell rerenders and match server/client rendering.
    const particles = useMemo(() => Array.from({ length: Math.min(40, Math.max(0, count)) }, (_, i) => ({
        id: i,
        x: seeded(i * 5 + 1) * 100, y: seeded(i * 5 + 2) * 100,
        size: minSize + seeded(i * 5 + 3) * (maxSize - minSize),
        duration: minDuration + seeded(i * 5 + 4) * (maxDuration - minDuration),
        delay: -seeded(i * 5 + 5) * maxDuration,
    })), [count, minSize, maxSize, minDuration, maxDuration]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute rounded-full"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        width: particle.size,
                        height: particle.size,
                        background: `radial-gradient(circle, ${color} 0%, transparent 72%)`,
                        filter: 'blur(0.5px)',
                        opacity: opacity
                    }}
                    initial={false}
                    animate={moving ? {
                        x: [0, 12, 0], y: [0, -28, 0], opacity: [opacity * 0.45, opacity, opacity * 0.45],
                    } : { x: 0, y: 0, opacity: opacity * 0.65 }}
                    transition={{
                        repeat: moving ? Infinity : 0,
                        duration: moving ? particle.duration : 0,
                        ease: 'easeInOut',
                        delay: moving ? particle.delay : 0
                    }}
                />
            ))}
        </div>
    );
};

// Export type
export type { AmbientDustProps };
