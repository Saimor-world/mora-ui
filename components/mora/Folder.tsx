"use client";

/**
 * FOLDER — Orbiting node (Layer 3)
 *
 * Visual recipe mirrors Star.tsx / Planet.tsx:
 * - Sphere fill opaque: ${color}BB (73%) instead of ${color}38 (22%) — was nearly invisible
 * - Halo opacity 0.28 baseline (was 0.12 — invisible against dark background)
 * - Base opacity always 1.0 (was 0.55 when no content)
 * - SVG orbit rings: capacity (node_count fill) + activity pulse
 * - 120ms leave delay on hover portal
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
    sm: { diameter: 36, iconSize: 14, ring: 10 },
    md: { diameter: 48, iconSize: 18, ring: 13 },
    lg: { diameter: 60, iconSize: 22, ring: 16 },
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
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { setIsMounted(true); }, []);
    useEffect(() => () => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); }, []);

    const { diameter, iconSize, ring } = SIZE_MAP[size];
    const coreColor = folder.color || '#6366F1';
    const Icon = getTypeIcon(folder.type);
    const nodeCount = folder.node_count || 0;

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (leaveTimerRef.current) { clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null; }
        setIsHovered(true);
        onHover?.(true);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPortalPos({ x: rect.right + 12, y: rect.top + rect.height / 2 });
        setShowPortal(true);
    };

    const handleMouseLeave = () => {
        leaveTimerRef.current = setTimeout(() => {
            setIsHovered(false);
            onHover?.(false);
            setShowPortal(false);
        }, 120);
    };

    const svgSize = diameter + ring * 2;
    const cx = svgSize / 2;
    const cy = svgSize / 2;
    const capR = diameter / 2 + ring * 0.40;
    const actR = diameter / 2 + ring * 0.80;
    const circ = 2 * Math.PI * capR;
    // Fill: at least 0.2 so ring always shows; max at 20 files = full
    const fillRatio = Math.max(0.20, Math.min(1, nodeCount / 20));

    return (
        <motion.div
            ref={orbRef}
            className="relative cursor-pointer group pointer-events-auto inline-flex items-center justify-center"
            style={{ width: svgSize, height: svgSize }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
                scale: 1,
                opacity: 1,
                x: orbitActive ? [0, 2, 0, -2, 0] : 0,
                y: orbitActive ? [0, -1.2, 0, 1.2, 0] : 0,
            }}
            transition={{
                delay,
                type: 'spring', stiffness: 380, damping: 28,
                x: orbitActive ? { duration: 3.4, repeat: Infinity, ease: 'easeInOut' } : undefined,
                y: orbitActive ? { duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 } : undefined,
            }}
            whileHover={{ scale: 1.28, rotate: 5 }}
            whileTap={{ scale: 0.88 }}
        >
            {/* SVG rings — capacity fill + activity pulse */}
            <svg
                className="absolute inset-0 pointer-events-none overflow-visible"
                width={svgSize} height={svgSize}
                viewBox={`0 0 ${svgSize} ${svgSize}`}
            >
                <motion.circle
                    cx={cx} cy={cy} r={capR}
                    fill="none" stroke={coreColor}
                    strokeWidth={isHovered ? 2.4 : 1.8}
                    strokeDasharray={circ}
                    strokeDashoffset={circ - circ * fillRatio}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`}
                    animate={{ opacity: (isActive || isHovered) ? 1.0 : 0.65 }}
                    transition={{ duration: 0.3 }}
                />
                <motion.circle
                    cx={cx} cy={cy} r={actR}
                    fill="none" stroke={coreColor}
                    strokeWidth="0.6"
                    strokeDasharray="2 6"
                    opacity={isHovered ? 0.50 : 0.22}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                />
            </svg>

            {/* Atmospheric halo — was 0.12, now 0.28 baseline */}
            <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                    inset: -(ring * 1.4),
                    background: `radial-gradient(circle, ${coreColor} 0%, transparent 65%)`,
                    filter: 'blur(20px)',
                    zIndex: -1,
                }}
                animate={{
                    opacity: isActive ? 0.50 : isHovered ? 0.42 : 0.28,
                    scale: isHovered ? 1.15 : 1,
                }}
                transition={{ duration: 0.35 }}
            />

            {/* Promoted pulse */}
            {isPromoted && (
                <motion.div
                    className="absolute rounded-full border border-amber-400/50"
                    style={{ inset: -(ring * 0.35) }}
                    animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.68, 0.35] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* Glass sphere — centred in SVG canvas */}
            <motion.div
                className="relative rounded-full flex items-center justify-center overflow-hidden backdrop-blur-[5px]"
                style={{
                    width: diameter, height: diameter,
                    position: 'absolute',
                    left: '50%', top: '50%',
                    transform: 'translate(-50%, -50%)',
                    // Key fix: ${coreColor}BB = 73% alpha (was ${coreColor}38 = 22%)
                    background: `radial-gradient(145% 145% at 30% 26%, rgba(255,255,255,0.24) 0%, ${coreColor}BB 42%, rgba(0,0,0,0.26) 100%)`,
                    boxShadow: isActive || isHovered
                        ? `0 0 45px ${coreColor}88, inset 0 0 22px ${coreColor}50, inset 2px 2px 7px rgba(255,255,255,0.35)`
                        : `0 0 26px ${coreColor}70, 0 5px 16px rgba(0,0,0,0.26), inset 1px 1px 4px rgba(255,255,255,0.22)`,
                    border: `1.5px solid ${coreColor}88`,
                }}
                animate={isActive ? {
                    boxShadow: [
                        `0 0 24px ${coreColor}55`,
                        `0 0 42px ${coreColor}80`,
                        `0 0 24px ${coreColor}55`,
                    ],
                } : {}}
                transition={{ duration: 2, repeat: isActive ? Infinity : 0, ease: 'easeInOut' }}
            >
                {/* Specular */}
                <div
                    className="absolute top-[17%] left-[17%] w-[20%] h-[10%] rounded-[100%] bg-white opacity-75"
                    style={{ transform: 'rotate(-45deg)', filter: 'blur(0.7px)' }}
                />
                {/* Inner glow */}
                <motion.div
                    className="absolute inset-[24%] rounded-full mix-blend-overlay"
                    style={{ background: `radial-gradient(circle, ${coreColor} 0%, transparent 70%)`, filter: 'blur(5px)' }}
                    animate={{ opacity: [0.55, 0.90, 0.55], scale: [0.88, 1.12, 0.88] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay }}
                />
                {/* Glass caustic */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_26%,rgba(255,255,255,0.18)_0%,transparent_52%)] pointer-events-none" />

                {/* Node count badge */}
                {nodeCount > 0 && (
                    <div
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold z-20"
                        style={{
                            background: `linear-gradient(135deg, ${coreColor}ee, ${coreColor}99)`,
                            border: '1px solid rgba(255,255,255,0.3)',
                            boxShadow: `0 0 6px ${coreColor}80`,
                        }}
                    >
                        {nodeCount > 9 ? '9+' : nodeCount}
                    </div>
                )}

                <Icon size={iconSize} className="relative z-10 text-white" strokeWidth={1.3} />
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
                                boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 0 30px ${coreColor}18, inset 0 1px 0 rgba(255,255,255,0.07)`,
                            }}
                        >
                            <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                                style={{ background: `linear-gradient(180deg, ${coreColor}, ${coreColor}35)` }} />
                            <div className="ml-3">
                                <h4 className="text-xs font-semibold mb-1 truncate max-w-[160px]" style={{ color: coreColor }}>
                                    {folder.name}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[10px] text-white/45">
                                    <FileText size={9} />
                                    <span>{nodeCount} Dateien</span>
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
