"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Point {
    id: string;
    x: number;
    y: number;
    weight?: number; // 0 to 1, determines glow intensity
}

interface SemanticConstellationProps {
    center: { x: number; y: number };
    satellites: Point[];
    isActive?: boolean;
}

/**
 * SEMANTIC CONSTELLATION RENDERER (Phase 6.1)
 * 
 * Renders intelligent connections between a parent (center) and child nodes (satellites).
 * Uses SVG for smooth curves and Framer Motion for entrance animations.
 * 
 * Mounted into: #semantic-layer-anchor (z-5)
 */
export const SemanticConstellation: React.FC<SemanticConstellationProps> = ({
    center,
    satellites,
    isActive = true
}) => {
    // Generate curved paths from center to each satellite
    const connections = useMemo(() => {
        return satellites.map(sat => {
            // Bezier Control Point: Midpoint with varying offset for "organic" curve
            // We calculate a curve that isn't just a straight line
            const midX = (center.x + sat.x) / 2;
            const midY = (center.y + sat.y) / 2;

            // Subtle curve offset based on angle
            // const angle = Math.atan2(sat.y - center.y, sat.x - center.x);
            // const curveIntensity = 0; // Straight lines for "Parent-Child" are often clearer, 
            // but we can add tension if needed. 
            // Let's stick to straight lines with "energy flow" animations for MVP.

            return {
                id: sat.id,
                path: `M ${center.x} ${center.y} L ${sat.x} ${sat.y}`,
                weight: sat.weight || 0.5
            };
        });
    }, [center, satellites]);

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
                {/* Energy Flow Gradient */}
                <linearGradient id="energyLink" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="#10B981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
                </linearGradient>

                {/* Glow Filter */}
                <filter id="glow-line" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {isActive && connections.map((conn, i) => (
                <g key={`conn-${conn.id}`}>
                    {/* Base weak connection line */}
                    <motion.path
                        d={conn.path}
                        stroke="#10B981"
                        strokeWidth="1"
                        strokeOpacity="0.1"
                        fill="none"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.2 }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                    />

                    {/* Active Pulse Line - Energy moving from Parent to Child */}
                    <motion.path
                        d={conn.path}
                        stroke="url(#energyLink)"
                        strokeWidth={1 + conn.weight * 2} // Thicker for stronger nodes
                        strokeOpacity="0.8"
                        fill="none"
                        filter="url(#glow-line)"
                        strokeDasharray="10 20"
                        initial={{ strokeDashoffset: 0, opacity: 0 }}
                        animate={{
                            strokeDashoffset: -100,
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{
                            strokeDashoffset: { duration: 3, repeat: Infinity, ease: "linear" },
                            opacity: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }
                        }}
                    />
                </g>
            ))}
        </svg>
    );
};
