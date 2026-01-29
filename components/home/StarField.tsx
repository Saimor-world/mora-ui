import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface StarFieldProps {
    seed: string;
}

// Helper for deterministic random numbers
function seededRandom(seed: number) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// Constellation templates (relative positions 0-1)
const CONSTELLATIONS = [
    // Orion-like
    { points: [[0.3, 0.2], [0.5, 0.15], [0.7, 0.2], [0.5, 0.35], [0.3, 0.5], [0.5, 0.55], [0.7, 0.5]] },
    // Big Dipper-like
    { points: [[0.1, 0.3], [0.2, 0.25], [0.35, 0.28], [0.45, 0.35], [0.55, 0.4], [0.65, 0.35], [0.7, 0.25]] },
    // Triangle
    { points: [[0.4, 0.1], [0.6, 0.1], [0.5, 0.3]] },
    // Cross
    { points: [[0.5, 0.1], [0.5, 0.4], [0.3, 0.25], [0.7, 0.25]] },
    // W-shape (Cassiopeia)
    { points: [[0.1, 0.3], [0.25, 0.15], [0.4, 0.3], [0.55, 0.15], [0.7, 0.3]] },
];

// Constellation lines (indices into points)
const CONSTELLATION_LINES = [
    [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5], [5, 6]], // Orion
    [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]], // Big Dipper
    [[0, 1], [1, 2], [2, 0]], // Triangle
    [[0, 1], [2, 3]], // Cross
    [[0, 1], [1, 2], [2, 3], [3, 4]], // W
];

export const StarField: React.FC<StarFieldProps> = ({ seed: universeSeed }) => {
    // Generate hash from seed
    const seedHash = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < universeSeed.length; i++) {
            hash = ((hash << 5) - hash) + universeSeed.charCodeAt(i);
            hash = hash & hash;
        }
        return hash;
    }, [universeSeed]);

    // Generate stable stars
    const stableStars = useMemo(() => {
        return Array.from({ length: 400 }, (_, i) => {
            const getSeededRandom = (offset: number) => {
                const x = Math.sin(seedHash + i + offset * 7.3) * 10000;
                return x - Math.floor(x);
            };

            const cx = getSeededRandom(0) * 100;
            const cy = getSeededRandom(100) * 100;

            // Varied sizes
            const size = getSeededRandom(200) < 0.1 ? 3 :
                getSeededRandom(300) < 0.3 ? 2 : 1.2;

            // Higher brightness
            const brightness = getSeededRandom(400) < 0.15 ? 1.0 :
                getSeededRandom(500) < 0.4 ? 0.75 : 0.5;

            const colorIndex = Math.floor(getSeededRandom(600) * 6);
            const color = colorIndex === 0 ? '#E8D5B7' : // Warm white
                colorIndex === 1 ? '#B8D4E8' : // Cool blue
                    colorIndex === 2 ? '#D4AF37' : // Gold
                        colorIndex === 3 ? '#10B981' : // Emerald
                            colorIndex === 4 ? '#A78BFA' : // Purple
                                '#FFFFFF'; // Pure white

            const twinkle = getSeededRandom(700) < 0.25;

            return { id: i, cx, cy, size, brightness, color, twinkle };
        });
    }, [seedHash]);

    // Generate constellations in different regions
    const constellations = useMemo(() => {
        const regions = [
            { x: 5, y: 5, scale: 12 },   // Top-left
            { x: 75, y: 8, scale: 15 },  // Top-right
            { x: 10, y: 70, scale: 14 }, // Bottom-left
            { x: 80, y: 65, scale: 12 }, // Bottom-right
            { x: 45, y: 85, scale: 10 }, // Bottom-center
        ];

        return regions.map((region, idx) => {
            const templateIdx = (seedHash + idx) % CONSTELLATIONS.length;
            const template = CONSTELLATIONS[templateIdx];
            const lines = CONSTELLATION_LINES[templateIdx];

            // Transform points to region
            const points = template.points.map(([x, y]) => ({
                x: region.x + x * region.scale,
                y: region.y + y * region.scale,
            }));

            return { id: idx, points, lines, region };
        });
    }, [seedHash]);

    return (
        <>
            {/* Deep space gradient - more variation */}
            <div
                className="absolute inset-0 z-[-2] pointer-events-none"
                style={{
                    background: `
                        radial-gradient(ellipse 120% 80% at 20% 90%, rgba(16, 185, 129, 0.08) 0%, transparent 50%),
                        radial-gradient(ellipse 100% 60% at 80% 10%, rgba(59, 130, 246, 0.06) 0%, transparent 40%),
                        radial-gradient(ellipse 80% 80% at 50% 50%, rgba(10, 30, 20, 1) 0%, rgba(5, 15, 10, 1) 50%, rgba(0, 5, 3, 1) 100%)
                    `
                }}
            />

            {/* Nebula clouds - subtle color variation */}
            <div
                className="absolute inset-0 z-[-1] pointer-events-none opacity-30"
                style={{
                    background: `
                        radial-gradient(ellipse 40% 30% at 15% 25%, rgba(16, 185, 129, 0.15) 0%, transparent 70%),
                        radial-gradient(ellipse 35% 25% at 85% 75%, rgba(139, 92, 246, 0.12) 0%, transparent 70%),
                        radial-gradient(ellipse 50% 40% at 50% 90%, rgba(212, 175, 55, 0.08) 0%, transparent 60%)
                    `
                }}
            />

            {/* CONSTELLATION LINES - subtle but visible */}
            <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                <defs>
                    <linearGradient id="constellationLine" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.25)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                    </linearGradient>
                </defs>

                {constellations.map((constellation) => (
                    <g key={`constellation-${constellation.id}`}>
                        {/* Lines */}
                        {constellation.lines.map(([from, to], lineIdx) => {
                            const p1 = constellation.points[from];
                            const p2 = constellation.points[to];
                            if (!p1 || !p2) return null;

                            return (
                                <motion.line
                                    key={`line-${constellation.id}-${lineIdx}`}
                                    x1={`${p1.x}%`}
                                    y1={`${p1.y}%`}
                                    x2={`${p2.x}%`}
                                    y2={`${p2.y}%`}
                                    stroke="url(#constellationLine)"
                                    strokeWidth="0.5"
                                    strokeLinecap="round"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0.15, 0.3, 0.15] }}
                                    transition={{
                                        duration: 8 + constellation.id * 2,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                    }}
                                />
                            );
                        })}

                        {/* Constellation stars (brighter) */}
                        {constellation.points.map((point, pIdx) => (
                            <motion.circle
                                key={`cstar-${constellation.id}-${pIdx}`}
                                cx={`${point.x}%`}
                                cy={`${point.y}%`}
                                r="2"
                                fill="white"
                                initial={{ opacity: 0.4 }}
                                animate={{ opacity: [0.4, 0.9, 0.4] }}
                                transition={{
                                    duration: 4 + pIdx * 0.5,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                            />
                        ))}
                    </g>
                ))}
            </svg>

            {/* BACKGROUND STARS */}
            {stableStars.map((star) => (
                <motion.div
                    key={star.id}
                    className="absolute rounded-full pointer-events-none z-0"
                    style={{
                        left: `${star.cx}%`,
                        top: `${star.cy}%`,
                        width: star.size,
                        height: star.size,
                        backgroundColor: star.color,
                    }}
                    animate={star.twinkle ? {
                        opacity: [star.brightness * 0.5, star.brightness, star.brightness * 0.6],
                        scale: [0.9, 1.1, 0.9],
                    } : {
                        opacity: star.brightness
                    }}
                    transition={star.twinkle ? {
                        duration: 2 + (star.id % 3),
                        repeat: Infinity,
                        ease: 'easeInOut',
                    } : undefined}
                />
            ))}
        </>
    );
};
