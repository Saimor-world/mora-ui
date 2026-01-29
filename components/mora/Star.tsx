"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface StarProps {
    space: {
        id: string;
        name: string;
        department_id?: string;
        color?: string;
        description?: string;
        folder_count?: number;
    };
    position: { x: number | string; y: number | string };
    delay?: number;
    isActive?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    orbitActive?: boolean;
    onClick?: () => void;
    onHover?: (hovered: boolean) => void;
    isHoveredByPlanet?: boolean;
    isPromoted?: boolean;
}

/**
 * STAR COMPONENT (Represents a MOON / SPACE)
 * 
 * In the SAIMÔR Universe metaphor:
 * - MOON = Space (Project/Workspace)
 * - Orbiting a Planet (Department)
 * 
 * NOTE: Currently named "Star.tsx" but visually represents a MOON.
 * 
 * Visuals:
 * - Points of light orbiting the planet
 * - Minimal, elegant points of light
 * - Subtle glow, no clutter
 * - Information on hover only
 */
export const Star: React.FC<StarProps> = ({
    space,
    position,
    delay = 0,
    isActive = false,
    size = 'sm',
    orbitActive = false,
    onClick,
    onHover,
    isHoveredByPlanet = false,
    isPromoted = false
}) => {
    const sizeMap = {
        sm: { diameter: 6, iconSize: 0 },
        md: { diameter: 10, iconSize: 0 },
        lg: { diameter: 16, iconSize: 0 },
        xl: { diameter: 32, iconSize: 0 }
    };

    const starSize = sizeMap[size];
    const hasContent = (space.folder_count || 0) > 0;
    const coreColor = space.color || '#F59E0B';
    const glowColor = coreColor;

    return (
        <motion.div
            className="absolute cursor-pointer group"
            data-agency-id={space.id}
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -50%)'
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
                scale: 1,
                opacity: hasContent ? 0.8 : 0.4,
                x: orbitActive ? [0, 3] : 0,
                y: orbitActive ? [0, -2] : 0
            }}
            transition={{
                delay,
                type: orbitActive ? 'tween' : 'spring',
                duration: orbitActive ? 2.5 : undefined,
                repeat: orbitActive ? Infinity : 0,
                repeatType: orbitActive ? 'reverse' : undefined,
                ease: orbitActive ? 'easeInOut' : undefined,
                stiffness: orbitActive ? undefined : 300,
                damping: orbitActive ? undefined : 25
            }}
            whileHover={{ scale: 1.5, opacity: 1 }}
            onClick={onClick}
            onMouseEnter={() => onHover?.(true)}
            onMouseLeave={() => onHover?.(false)}
        >
            {/* Promoted Halo */}
            {isPromoted && (
                <motion.div
                    className="absolute inset-[-6px] rounded-full border border-amber-400/40"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.7, 0.35] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                />
            )}

            {/* Star Glow */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: `radial-gradient(circle, ${glowColor}55, transparent)`,
                    filter: 'blur(8px)',
                }}
                animate={isHoveredByPlanet ? {
                    scale: [1, 1.5, 1],
                    opacity: [0.4, 0.8, 0.4]
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Star Core - Generic Light Point */}
            <div
                className="relative rounded-full backdrop-blur-sm flex items-center justify-center"
                style={{
                    width: starSize.diameter,
                    height: starSize.diameter,
                    background: hasContent ? coreColor : `${coreColor}80`,
                    boxShadow: hasContent
                        ? `0 0 10px ${glowColor}CC`
                        : `0 0 5px ${glowColor}66`,
                    border: 'none'
                }}
            />

            {/* Label on Hover - TESLA Style */}
            <motion.div
                className="absolute -bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                initial={{ y: 5 }}
                animate={{ y: 0 }}
            >
                <div className="glass-panel px-3 py-1.5 whitespace-nowrap">
                    <div className="text-xs text-white/80 font-light">
                        {space.name}
                    </div>
                    {(space.folder_count || 0) > 0 && (
                        <div className="text-[10px] text-amber-400/60 mt-0.5">
                            {space.folder_count} folders
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Star;
