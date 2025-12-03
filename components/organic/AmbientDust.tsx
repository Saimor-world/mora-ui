"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

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
}

/**
 * AMBIENT DUST
 * 
 * Floating background particles that create depth and organic movement.
 * Used in Company Core View and other immersive screens.
 * 
 * Design:
 * - Subtle, slow-moving particles
 * - Random starting positions
 * - Vertical drift animation (float up + fade)
 * - Emerald-tinted for brand consistency
 * 
 * Performance:
 * - Optimized with useMemo (particles calculated once)
 * - CSS transforms (GPU-accelerated)
 * - Configurable count (adjust for performance)
 */
export const AmbientDust: React.FC<AmbientDustProps> = ({
    count = 20,
    sizeRange = [0.5, 2],
    durationRange = [15, 30],
    color = 'rgba(16, 185, 129, 0.1)', // emerald-500/10
    opacity = 0.2
}) => {
    // Generate particle data (memoized for performance)
    const particles = useMemo(() => {
        return Array.from({ length: count }).map((_, i) => ({
            id: i,
            x: Math.random() * 100, // 0-100%
            y: Math.random() * 100, // 0-100%
            size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
            duration: durationRange[0] + Math.random() * (durationRange[1] - durationRange[0]),
            delay: Math.random() * 5 // stagger start times
        }));
    }, [count, sizeRange, durationRange]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute rounded-full"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        width: particle.size,
                        height: particle.size,
                        backgroundColor: color,
                        opacity: opacity
                    }}
                    animate={{
                        y: [0, -120, 0], // drift up 120px, return
                        opacity: [0, opacity, 0] // fade in/out
                    }}
                    transition={{
                        duration: particle.duration,
                        repeat: Infinity,
                        ease: 'linear',
                        delay: particle.delay
                    }}
                />
            ))}
        </div>
    );
};

// Export type
export type { AmbientDustProps };
