"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Folder as FolderIcon, File, Image, Video, Music, Archive } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface FolderProps {
    /** Folder data */
    folder: {
        id: string;
        name: string;
        space_id?: string;
        color?: string;
        description?: string;
        node_count?: number;
        type?: 'folder' | 'document' | 'image' | 'video' | 'audio' | 'archive';
    };
    /** Folder position relative to Orb */
    position: { x: number | string; y: number | string };
    /** Animation delay */
    delay?: number;
    /** Is this folder currently active/selected */
    isActive?: boolean;
    /** Folder size variation */
    size?: 'sm' | 'md';
    /** Enable orbital animation */
    orbitActive?: boolean;
    /** Click handler */
    onClick?: () => void;
    /** Hover handler */
    onHover?: (hovered: boolean) => void;
    /** Promoted highlight */
    isPromoted?: boolean;
}

/**
 * FOLDER COMPONENT — MASTERBIBEL COMPLIANT
 *
 * Folders as structured containers orbiting in the knowledge sphere.
 * Visual indicators show content type and activity level.
 *
 * MASTERBIBEL 4.1.1: "Folders appear as organized containers in orbital patterns"
 */
export const Folder: React.FC<FolderProps> = ({
    folder,
    position,
    delay = 0,
    isActive = false,
    size = 'sm',
    orbitActive = false,
    onClick,
    onHover,
    isPromoted = false
}) => {
    // Folder size mapping
    const sizeMap = {
        sm: { diameter: 24, iconSize: 14 },
        md: { diameter: 32, iconSize: 16 }
    };

    const folderSize = sizeMap[size];

    // Folder type icon mapping
    const getFolderIcon = (type?: string): LucideIcon => {
        switch (type) {
            case 'document': return File;
            case 'image': return Image;
            case 'video': return Video;
            case 'audio': return Music;
            case 'archive': return Archive;
            default: return FolderIcon;
        }
    };

    const Icon = getFolderIcon(folder.type);

    // Folder visual properties
    const folderColor = folder.color || '#6366F1'; // Default indigo
    const glowColor = isActive ? '#6366F1' : folderColor;

    // Activity glow based on node count
    const activityIntensity = Math.min((folder.node_count || 0) / 20, 1);

    return (
        <motion.div
            className="absolute cursor-pointer group pointer-events-auto"
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -50%)'
            }}
            initial={{ scale: 0, opacity: 0, rotate: -90 }}
            animate={{
                scale: 1,
                opacity: 1,
                rotate: 0,
                x: orbitActive ? [0, 3, 0, -3, 0] : 0,
                y: orbitActive ? [0, -1.5, 0, 1.5, 0] : 0
            }}
            transition={{
                delay,
                type: 'spring',
                stiffness: 400,
                damping: 30,
                x: orbitActive ? {
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                } : undefined,
                y: orbitActive ? {
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.4
                } : undefined
            }}
            whileHover={{ scale: 1.4, rotate: 5 }}
            whileTap={{ scale: 0.7 }}
            onClick={onClick}
            onMouseEnter={() => onHover?.(true)}
            onMouseLeave={() => onHover?.(false)}
        >
            {/* Invisible Hit Area expansion for easier hovering */}
            <div className="absolute inset-0 -m-3 rounded-full" />
            {/* Promoted Halo */}
            {isPromoted && (
                <motion.div
                    className="absolute inset-[-6px] rounded-md border border-amber-400/50"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.85, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
            )}

            {/* Folder Core */}
            <motion.div
                className="relative rounded-md flex items-center justify-center backdrop-blur-sm border"
                style={{
                    width: folderSize.diameter,
                    height: folderSize.diameter,
                    backgroundColor: `${folderColor}20`,
                    borderColor: isActive ? `${glowColor}80` : `${folderColor}60`
                }}
                animate={isActive ? {
                    boxShadow: [
                        `0 0 16px ${glowColor}60`,
                        `0 0 32px ${glowColor}80`,
                        `0 0 16px ${glowColor}60`
                    ]
                } : {}}
                transition={{
                    duration: 2,
                    repeat: isActive ? Infinity : 0,
                    ease: 'easeInOut'
                }}
            >
                {/* Folder Icon */}
                <Icon
                    size={folderSize.iconSize}
                    className={`relative z-10 transition-colors ${isActive ? 'text-white' : 'text-indigo-400'}`}
                    style={{ color: isActive ? undefined : folderColor }}
                />

                {/* Activity Indicator (subtle pulse for active folders) */}
                {activityIntensity > 0 && (
                    <motion.div
                        className="absolute inset-0 rounded-md"
                        animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.2, 0.4, 0.2]
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: delay
                        }}
                        style={{
                            background: `radial-gradient(circle, ${folderColor}${Math.round(activityIntensity * 30)}, transparent)`
                        }}
                    />
                )}
            </motion.div>

            {/* Folder Label (appears on hover, subtle by default) */}
            <motion.div
                className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-20 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 pointer-events-none"
                initial={{ y: 5 }}
                animate={{ y: 0 }}
            >
                <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 max-w-[140px] shadow-lg">
                    <div className="text-[10px] text-white font-medium whitespace-nowrap truncate group-hover:text-indigo-300">
                        {folder.name}
                    </div>
                </div>
            </motion.div>

            {/* Content Type Indicator (colored corner) */}
            {folder.type && folder.type !== 'folder' && (
                <motion.div
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white/50"
                    style={{
                        backgroundColor: folderColor,
                        boxShadow: `0 0 4px ${folderColor}80`
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: delay + 0.5 }}
                />
            )}
        </motion.div>
    );
};

export default Folder;
