"use client";

/**
 * FOLDER — Star / Folder node (Layer 3)
 *
 * Glass sphere upgrade matching Planet.tsx / Star.tsx visual language.
 * Folders appear as small glowing orbs orbiting the Space core.
 * Color from folder.color → determines glow signature.
 * No built-in persistent label — caller handles to avoid duplication.
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder as FolderIcon, File, Image, Video, Music, Archive, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface FolderProps {
    folder: {
        id: string;
        name: string;
        space_id?: string;
        color?: string;
        description?: string;
        node_count?: number;
        type?: 'folder' | 'document' | 'image' | 'video' | 'audio' | 'archive';
    };
    position: { x: number | string; y: number | string };
    delay?: number;
    isActive?: boolean;
    size?: 'sm' | 'md' | 'lg';
    orbitActive?: boolean;
    onClick?: () => void;
    onHover?: (hovered: boolean) => void;
    isPromoted?: boolean;
}

const SIZE_MAP = {
    sm: { diameter: 32, iconSize: 13 },
    md: { diameter: 44, iconSize: 17 },
    lg: { diameter: 56, iconSize: 21 },
};

function getTypeIcon(type?: string): LucideIcon {
    switch (type) {
        case 'document': return File;
        case 'image': return Image;
        case 'video': return Video;
        case 'audio': return Music;
        case 'archive': return Archive;
        default: return FolderIcon;
    }
}

export const Folder: React.FC<FolderProps> = ({
    folder,
    position,
    delay = 0,
    isActive = false,
    size = 'sm',
    orbitActive = false,
    onClick,
    onHover,
    isPromoted = false,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showPortal, setShowPortal] = useState(false);
    const [portalPos, setPortalPos] = useState({ x: 0, y: 0 });
    const [isMounted, setIsMounted] = useState(false);
    const orbRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setIsMounted(true); }, []);

    const { diameter, iconSize } = SIZE_MAP[size];
    const coreColor = folder.color || '#6366F1';
    const Icon = getTypeIcon(folder.type);
    const hasContent = (folder.node_count || 0) > 0;

    const handleMouseEnter = (e: React.MouseEvent) => {
        setIsHovered(true);
        onHover?.(true);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPortalPos({ x: rect.right + 12, y: rect.top + rect.height / 2 });
        setShowPortal(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        onHover?.(false);
        setShowPortal(false);
    };

    return (
        <motion.div
            ref={orbRef}
            className="relative cursor-pointer group pointer-events-auto inline-flex items-center justify-center"
            style={{ width: diameter, height: diameter }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
                scale: 1,
                opacity: hasContent ? 0.9 : 0.55,
                x: orbitActive ? [0, 2, 0, -2, 0] : 0,
                y: orbitActive ? [0, -1.2, 0, 1.2, 0] : 0,
            }}
            transition={{
                delay,
                type: 'spring',
                stiffness: 380,
                damping: 28,
                x: orbitActive ? { duration: 3.4, repeat: Infinity, ease: 'easeInOut' } : undefined,
                y: orbitActive ? { duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 } : undefined,
            }}
            whileHover={{ scale: 1.35, rotate: 6 }}
            whileTap={{ scale: 0.85 }}
        >
            {/* Atmospheric halo */}
            <motion.div
                className="absolute inset-[-40%] rounded-full blur-[18px] z-[-1]"
                style={{ background: `radial-gradient(circle, ${coreColor} 0%, transparent 70%)` }}
                animate={{
                    opacity: isActive ? 0.4 : isHovered ? 0.3 : hasContent ? 0.08 : 0.04,
                    scale: isHovered ? 1.2 : 1,
                }}
                transition={{ duration: 0.35 }}
            />

            {/* Promoted halo ring */}
            {isPromoted && (
                <motion.div
                    className="absolute inset-[-6px] rounded-full border border-amber-400/40"
                    animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0.65, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* Glass sphere */}
            <motion.div
                className="relative rounded-full flex items-center justify-center overflow-hidden backdrop-blur-[3px]"
                style={{
                    width: diameter,
                    height: diameter,
                    background: `radial-gradient(140% 140% at 30% 28%, rgba(255,255,255,0.06) 0%, ${coreColor}08 55%, rgba(0,0,0,0.3) 100%)`,
                    boxShadow: isActive || isHovered
                        ? `0 0 32px ${coreColor}50, inset 0 0 16px ${coreColor}20, inset 2px 2px 5px rgba(255,255,255,0.22)`
                        : hasContent
                            ? `0 0 14px ${coreColor}35, inset 0 0 8px ${coreColor}10, inset 1px 1px 2px rgba(255,255,255,0.10)`
                            : `0 6px 18px rgba(0,0,0,0.3), inset 1px 1px 1px rgba(255,255,255,0.06)`,
                    border: `1px solid ${coreColor}28`,
                }}
                animate={isActive ? {
                    boxShadow: [
                        `0 0 20px ${coreColor}45`,
                        `0 0 36px ${coreColor}65`,
                        `0 0 20px ${coreColor}45`,
                    ],
                } : {}}
                transition={{ duration: 2, repeat: isActive ? Infinity : 0, ease: 'easeInOut' }}
            >
                {/* Specular point */}
                <div
                    className="absolute top-[18%] left-[18%] w-[20%] h-[10%] rounded-[100%] bg-white blur-[0.8px] opacity-60"
                    style={{ transform: 'rotate(-45deg)' }}
                />
                {/* Inner glow */}
                <motion.div
                    className="absolute inset-[24%] rounded-full mix-blend-overlay blur-md"
                    style={{ background: `radial-gradient(circle, ${coreColor} 0%, transparent 70%)` }}
                    animate={{ opacity: [0.45, 0.85, 0.45], scale: [0.88, 1.12, 0.88] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: delay }}
                />
                {/* Glass caustic */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.16)_0%,transparent_50%)] pointer-events-none" />

                {/* Content count badge */}
                {hasContent && (
                    <div
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold z-20"
                        style={{
                            background: `linear-gradient(135deg, ${coreColor}ee, ${coreColor}99)`,
                            border: '1px solid rgba(255,255,255,0.3)',
                            boxShadow: `0 0 6px ${coreColor}80`,
                        }}
                    >
                        {folder.node_count! > 9 ? '9+' : folder.node_count}
                    </div>
                )}

                {/* Icon */}
                <Icon size={iconSize} className="relative z-10 text-white/88" strokeWidth={1.3} />
            </motion.div>

            {/* Portal hover tooltip */}
            {isMounted && showPortal && createPortal(
                <AnimatePresence>
                    <motion.div
                        key={`folder-portal-${folder.id}`}
                        initial={{ opacity: 0, x: -8, scale: 0.94 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -8, scale: 0.94 }}
                        transition={{ type: 'spring', stiffness: 440, damping: 26 }}
                        className="fixed z-[9999] pointer-events-none"
                        style={{ left: portalPos.x, top: portalPos.y, transform: 'translateY(-50%)' }}
                    >
                        <div
                            className="relative px-3.5 py-2.5 rounded-xl backdrop-blur-xl border border-white/15 shadow-xl min-w-[140px]"
                            style={{
                                background: 'linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(12,16,24,0.88) 100%)',
                                boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 0 30px ${coreColor}15, inset 0 1px 0 rgba(255,255,255,0.07)`,
                            }}
                        >
                            <div
                                className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                                style={{ background: `linear-gradient(180deg, ${coreColor}, ${coreColor}35)` }}
                            />
                            <div className="ml-3">
                                <h4 className="text-xs font-semibold mb-1 truncate max-w-[160px]" style={{ color: coreColor }}>
                                    {folder.name}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[10px] text-white/45">
                                    <FileText size={9} />
                                    <span>{folder.node_count || 0} Dateien</span>
                                </div>
                            </div>
                            <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2"
                                style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderRight: '4px solid rgba(255,255,255,0.10)' }}
                            />
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </motion.div>
    );
};

export default Folder;
