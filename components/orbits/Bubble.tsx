"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

/**
 * BUBBLE COMPONENT
 * Reusable orbital bubble for Companies, Departments, Spaces, etc.
 * Designed for the MÔRA Orbit System
 */

export interface BubbleProps {
    /** Unique identifier */
    id: string;

    /** Display label */
    label: string;

    /** Icon component from lucide-react */
    icon?: LucideIcon;

    /** Position in pixels */
    position: { x: number; y: number };

    /** Bubble size in pixels (diameter) */
    size?: number;

    /** Primary color (hex) */
    color?: string;

    /** Whether this bubble is currently active/selected */
    isActive?: boolean;

    /** Click handler */
    onClick?: (id: string) => void;

    /** Optional badge/count to display */
    badge?: number | string;

    /** Animation delay for staggered entrance */
    delay?: number;
}

export const Bubble: React.FC<BubbleProps> = ({
    id,
    label,
    icon: Icon,
    position,
    size = 80,
    color = '#10b981', // Emerald-500 default
    isActive = false,
    onClick,
    badge,
    delay = 0
}) => {
    const iconSize = Math.floor(size * 0.3);
    const labelSize = Math.floor(size * 0.13);

    return (
        <motion.button
            className="absolute pointer-events-auto"
            style={{
                left: position.x,
                top: position.y,
                width: size,
                height: size,
                transform: 'translate(-50%, -50%)'
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
                duration: 0.6,
                delay,
                ease: [0.4, 0, 0.2, 1]
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onClick?.(id)}
        >
            {/* Glow Layer (Active State) */}
            {isActive && (
                <motion.div
                    className="absolute inset-0 rounded-full blur-xl"
                    style={{
                        backgroundColor: color,
                        opacity: 0.3
                    }}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                />
            )}

            {/* Main Bubble Shell */}
            <div
                className="relative w-full h-full rounded-full backdrop-blur-md flex flex-col items-center justify-center gap-1 transition-all duration-300"
                style={{
                    background: isActive
                        ? `radial-gradient(circle at 30% 30%, ${color}55, ${color}22)`
                        : 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
                    border: `1px solid ${isActive ? color + '66' : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: isActive
                        ? `0 0 30px ${color}55, inset 0 0 20px ${color}33`
                        : '0 0 20px rgba(0,0,0,0.3)'
                }}
            >
                {/* Icon */}
                {Icon && (
                    <div
                        className="transition-colors duration-300"
                        style={{
                            color: isActive ? color : 'rgba(255,255,255,0.7)'
                        }}
                    >
                        <Icon size={iconSize} />
                    </div>
                )}

                {/* Label */}
                <div
                    className="text-center uppercase tracking-wider font-medium transition-colors duration-300 px-2 leading-tight"
                    style={{
                        fontSize: `${labelSize}px`,
                        color: isActive ? color : 'rgba(255,255,255,0.8)'
                    }}
                >
                    {label}
                </div>

                {/* Badge (Optional count/indicator) */}
                {badge !== undefined && (
                    <div
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                            backgroundColor: color,
                            color: '#000',
                            boxShadow: `0 0 10px ${color}88`
                        }}
                    >
                        {badge}
                    </div>
                )}
            </div>

            {/* Hover Fill Effect */}
            <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${color}33, transparent)`,
                    opacity: 0
                }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
            />
        </motion.button>
    );
};
