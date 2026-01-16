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
    position: { x: number; y: number };
    delay?: number;
    isActive?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    orbitActive?: boolean;
    onClick?: () => void;
    onHover?: (hovered: boolean) => void;
    isHoveredByPlanet?: boolean;
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
    isHoveredByPlanet = false
}) => {
    const sizeMap = {
        sm: { diameter: 4, iconSize: 0 },
        md: { diameter: 6, iconSize: 0 },
        lg: { diameter: 16, iconSize: 0 },
        xl: { diameter: 32, iconSize: 0 }
    };

    const starSize = sizeMap[size];
    const hasContent = (space.folder_count || 0) > 0;

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
            {/* Star Glow */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(245,158,11,0.4), transparent)',
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
                    background: hasContent ? '#F59E0B' : 'rgba(245,158,11,0.5)',
                    boxShadow: hasContent
                        ? '0 0 10px rgba(245,158,11,0.8)'
                        : '0 0 5px rgba(245,158,11,0.4)',
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
