"use client";

import React from 'react';
import { motion } from 'framer-motion';
import type { CoreNode } from '@/lib/types/core';

interface NodeStarProps {
    node: CoreNode;
    position: { x: number | string; y: number | string };
    delay?: number;
    size?: 'xs' | 'sm';
    onHover?: (active: boolean) => void;
}

/**
 * NODE STAR COMPONENT — TESLA-STYLE NODE VISUALIZATION
 *
 * - Tiny, subtle background stars representing knowledge nodes
 * - Different colors based on node type
 * - Gentle twinkling animation
 * - No interaction, just ambient presence
 */
export const NodeStar: React.FC<NodeStarProps> = ({
    node,
    position,
    delay = 0,
    size = 'xs',
    onHover
}) => {
    const sizeMap = {
        xs: { diameter: 2, glowSize: 6 },
        sm: { diameter: 3, glowSize: 8 }
    };

    const starSize = sizeMap[size];

    // Color based on node type
    const getNodeColor = (type?: string) => {
        switch (type?.toLowerCase()) {
            case 'document': return '#10B981'; // Emerald
            case 'note': return '#3B82F6'; // Blue
            case 'link': return '#8B5CF6'; // Purple
            case 'image': return '#F59E0B'; // Amber
            case 'video': return '#EF4444'; // Red
            default: return '#6B7280'; // Gray
        }
    };

    const color = getNodeColor(node.type);

    return (
        <motion.div
            className="absolute pointer-events-auto cursor-pointer" // Enable pointer events for hover
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -50%)',
                width: 20, // Hitbox size
                height: 20
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
                scale: 1,
                opacity: [0.3, 0.8, 0.3]
            }}
            transition={{
                delay,
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                ease: 'easeInOut'
            }}
            onMouseEnter={() => onHover?.(true)}
            onMouseLeave={() => onHover?.(false)}
        >
            {/* Subtle Glow */}
            <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                    width: starSize.glowSize,
                    height: starSize.glowSize,
                    background: `radial-gradient(circle, ${color}20, transparent)`,
                    filter: 'blur(2px)',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                }}
                animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.2, 0.4, 0.2]
                }}
                transition={{
                    duration: 4 + Math.random() * 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: Math.random() * 2
                }}
            />

            {/* Node Star Core */}
            <div
                className="relative rounded-full pointer-events-none"
                style={{
                    width: starSize.diameter,
                    height: starSize.diameter,
                    background: color,
                    boxShadow: `0 0 ${starSize.diameter * 2}px ${color}60`,
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                }}
            />
        </motion.div>
    );
};

export default NodeStar;


