"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';

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
    // MASTERBIBEL: Smaller, more ethereal planets - floating bubbles
    const sizeMap = {
        sm: { diameter: 14, iconSize: 8 },
        md: { diameter: 20, iconSize: 10 },
        lg: { diameter: 26, iconSize: 14 },
        xl: { diameter: 40, iconSize: 20 }
    };

    const starSize = sizeMap[size];
    const hasContent = (space.folder_count || 0) > 0;
    const coreColor = space.color || '#60A5FA';
    const glowColor = coreColor;
    const Icon = LayoutGrid;

    return (
        <motion.div
            className="absolute cursor-pointer group pointer-events-auto"
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
            {/* Hit area extension - MUST have auto to capture hover */}
            <div className="absolute inset-0 -m-4 rounded-full pointer-events-auto" />

            {/* Promoted Halo */}
            {isPromoted && (
                <motion.div
                    className="absolute inset-[-8px] rounded-full border border-amber-400/40"
                    animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.7, 0.35] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                />
            )}

            {/* Moon Glow */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: `radial-gradient(circle, ${glowColor}66 0%, ${glowColor}20 45%, transparent 70%)`,
                    filter: 'blur(8px)',
                }}
                animate={isHoveredByPlanet ? {
                    scale: [1, 1.5, 1],
                    opacity: [0.4, 0.8, 0.4]
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Moon Core */}
            <div
                className="relative rounded-full flex items-center justify-center"
                style={{
                    width: starSize.diameter,
                    height: starSize.diameter,
                    background: `radial-gradient(circle at 30% 30%, ${coreColor}BB 0%, ${coreColor}66 50%, rgba(0,0,0,0.4) 100%)`,
                    boxShadow: hasContent
                        ? `0 0 12px ${glowColor}AA, inset 0 0 6px rgba(255,255,255,0.2)`
                        : `0 0 6px ${glowColor}66`,
                    border: `1px solid ${coreColor}55`
                }}
            >
                {/* Subtle crater highlight */}
                <div
                    className="absolute rounded-full"
                    style={{
                        width: '40%',
                        height: '40%',
                        top: '15%',
                        left: '15%',
                        background: 'radial-gradient(circle at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
                        filter: 'blur(0.5px)'
                    }}
                />
            </div>

            {/* Orbit ring for active/hovered moons */}
            {(isActive || isPromoted) && (
                <motion.div
                    className="absolute rounded-full border border-white/20"
                    style={{
                        left: '50%',
                        top: '50%',
                        width: 'calc(100% + 20px)',
                        height: 'calc(100% + 20px)',
                        transform: 'translate(-50%, -50%) rotate(25deg) scaleX(1.35)',
                        transformOrigin: '50% 50%'
                    }}
                    animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.03, 1] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                />
            )}

            {/* Label - Always visible (dimmed), bright on hover */}
            {/* Label - Visible on hover, subtle by default */}
            <motion.div
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
                initial={{ y: 5 }}
                animate={{ y: 0 }}
            >
                <div className="text-[10px] text-cyan-300/90 font-medium tracking-wide group-hover:text-white">
                    {space.name}
                </div>
            </motion.div>

            {/* Extended info on hover */}
            <motion.div
                className="absolute -bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                initial={{ y: 5 }}
                animate={{ y: 0 }}
            >
                {(space.folder_count || 0) > 0 && (
                    <div className="text-[9px] text-emerald-400/70 bg-black/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {space.folder_count} folders
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default Star;
