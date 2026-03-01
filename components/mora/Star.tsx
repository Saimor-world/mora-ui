"use client";

/**
 * STAR — Moon / Space (Layer 2)
 *
 * Visual recipe aligned with Planet.tsx:
 * - Strong atmospheric halo (was invisible at 0.14 → now 0.30+ always)
 * - Sphere fill opaque: ${color}CC (80%) instead of ${color}40 (25%)
 * - SVG orbit rings matching Planet's capacity+activity ring pattern
 * - Base opacity always 1.0 — never fades to 0.55 (was invisible when no content)
 * - 120ms leave delay on hover portal
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Users, Briefcase, FolderOpen, Layers, Star as StarIcon, FlaskConical, BookOpen, ShoppingCart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

function resolveIcon(name: string): LucideIcon {
    const n = name.toLowerCase();
    if (n.includes('team') || n.includes('hr') || n.includes('people') || n.includes('kultur')) return Users;
    if (n.includes('ops') || n.includes('manage') || n.includes('admin') || n.includes('strateg')) return Briefcase;
    if (n.includes('product') || n.includes('dev') || n.includes('tech') || n.includes('lab')) return FlaskConical;
    if (n.includes('learn') || n.includes('wiki') || n.includes('doc') || n.includes('book')) return BookOpen;
    if (n.includes('store') || n.includes('sales') || n.includes('shop') || n.includes('commerce')) return ShoppingCart;
    if (n.includes('project') || n.includes('board') || n.includes('sprint') || n.includes('planning')) return Layers;
    if (n.includes('general') || n.includes('main') || n.includes('inbox')) return StarIcon;
    return FolderOpen;
}

const SIZE_MAP = {
    sm: { diameter: 32,  iconSize: 13, ring: 10 },
    md: { diameter: 44,  iconSize: 17, ring: 14 },
    lg: { diameter: 58,  iconSize: 21, ring: 18 },
    xl: { diameter: 72,  iconSize: 26, ring: 24 },
};

export const Star: React.FC<StarProps> = ({
    space,
    position,
    delay = 0,
    isActive = false,
    size = 'md',
    orbitActive = false,
    onClick,
    onHover,
    isHoveredByPlanet = false,
    isPromoted = false,
}) => {
    const prefersReducedMotion = useReducedMotion();
    const [isHovered, setIsHovered] = useState(false);
    const [showPortal, setShowPortal] = useState(false);
    const [portalPos, setPortalPos] = useState({ x: 0, y: 0 });
    const [isMounted, setIsMounted] = useState(false);
    const orbRef = useRef<HTMLDivElement>(null);
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { setIsMounted(true); }, []);
    useEffect(() => () => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); }, []);

    const { diameter, iconSize, ring } = SIZE_MAP[size];
    const coreColor = space.color || '#22D3EE';
    const Icon = resolveIcon(space.name);
    const folderCount = space.folder_count || 0;

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (leaveTimerRef.current) { clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null; }
        setIsHovered(true);
        onHover?.(true);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPortalPos({ x: rect.right + 14, y: rect.top + rect.height / 2 });
        setShowPortal(true);
    };

    const handleMouseLeave = () => {
        leaveTimerRef.current = setTimeout(() => {
            setIsHovered(false);
            onHover?.(false);
            setShowPortal(false);
        }, 120);
    };

    // SVG canvas is diameter + 2*ring on each side
    const svgSize = diameter + ring * 2;
    const cx = svgSize / 2;
    const cy = svgSize / 2;
    const capR = diameter / 2 + ring * 0.42;
    const actR = diameter / 2 + ring * 0.82;
    const circ = 2 * Math.PI * capR;
    // Fill ratio: at least 0.25 so ring is always partially visible
    const fillRatio = Math.max(0.25, Math.min(1, folderCount / 8));

    return (
        <motion.div
            ref={orbRef}
            className="relative cursor-pointer group pointer-events-auto inline-flex items-center justify-center"
            style={{ width: svgSize, height: svgSize }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: isActive ? 1.08 : 1, opacity: 1 }}
            transition={{ delay, scale: { type: 'spring', stiffness: 300, damping: 25 } }}
            whileHover={{ scale: 1.15 }}
        >
            {/* SVG rings — capacity fill + activity pulse (mirrors Planet.tsx) */}
            <svg
                className="absolute inset-0 pointer-events-none overflow-visible"
                width={svgSize} height={svgSize}
                viewBox={`0 0 ${svgSize} ${svgSize}`}
            >
                {/* Capacity ring */}
                <motion.circle
                    cx={cx} cy={cy} r={capR}
                    fill="none" stroke={coreColor}
                    strokeWidth={isHovered ? 2.8 : 2.0}
                    strokeDasharray={circ}
                    strokeDashoffset={circ - circ * fillRatio}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`}
                    animate={{ opacity: (isActive || isHovered) ? 1.0 : 0.70 }}
                    transition={{ duration: 0.3 }}
                />
                {/* Activity dashed ring — slow rotation */}
                <motion.circle
                    cx={cx} cy={cy} r={actR}
                    fill="none" stroke={coreColor}
                    strokeWidth="0.7"
                    strokeDasharray="2 7"
                    opacity={isHovered ? 0.55 : 0.25}
                    animate={prefersReducedMotion ? {} : { rotate: 360 }}
                    transition={{ duration: 28, repeat: prefersReducedMotion ? 0 : Infinity, ease: 'linear' }}
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                />
            </svg>

            {/* Atmospheric halo — was 0.14, now 0.30 baseline */}
            <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                    inset: -(ring * 1.5),
                    background: `radial-gradient(circle, ${coreColor} 0%, transparent 65%)`,
                    filter: 'blur(24px)',
                    zIndex: -1,
                }}
                animate={{
                    opacity: isActive ? 0.55 : isHovered ? 0.48 : isHoveredByPlanet ? 0.35 : 0.30,
                    scale: isHovered ? 1.12 : 1,
                }}
                transition={{ duration: 0.35 }}
            />

            {/* Promoted pulse ring */}
            {isPromoted && (
                <motion.div
                    className="absolute rounded-full border border-amber-400/50"
                    style={{ inset: -(ring * 0.4) }}
                    animate={prefersReducedMotion ? { scale: 1, opacity: 0.55 } : { scale: [1, 1.2, 1], opacity: [0.4, 0.75, 0.4] }}
                    transition={{ duration: 3.2, repeat: prefersReducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* Glass sphere core — centred within SVG canvas */}
            <motion.div
                className="absolute rounded-full flex items-center justify-center overflow-hidden backdrop-blur-[6px]"
                style={{
                    width: diameter, height: diameter,
                    left: '50%', top: '50%',
                    transform: 'translate(-50%, -50%)',
                    // Key fix: ${coreColor}CC = 80% alpha (was 40 = 25%)
                    background: `radial-gradient(145% 145% at 28% 26%, rgba(255,255,255,0.26) 0%, ${coreColor}CC 42%, rgba(0,0,0,0.28) 100%)`,
                    boxShadow: isActive || isHovered
                        ? `0 0 55px ${coreColor}90, inset 0 0 26px ${coreColor}55, inset 2px 2px 8px rgba(255,255,255,0.38)`
                        : `0 0 30px ${coreColor}72, 0 6px 18px rgba(0,0,0,0.28), inset 1px 1px 4px rgba(255,255,255,0.24)`,
                    border: `1.5px solid ${coreColor}99`,
                }}
                whileHover={{ scale: 1.08, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 250, damping: 20 }}
            >
                {/* Specular point */}
                <div
                    className="absolute top-[15%] left-[15%] w-[20%] h-[11%] rounded-[100%] bg-white opacity-80"
                    style={{ transform: 'rotate(-45deg)', filter: 'blur(0.8px)' }}
                />
                {/* Inner luminous heart */}
                <motion.div
                    className="absolute inset-[22%] rounded-full mix-blend-overlay"
                    style={{ background: `radial-gradient(circle, ${coreColor} 0%, transparent 70%)`, filter: 'blur(6px)' }}
                    animate={prefersReducedMotion ? { opacity: 0.8, scale: 1 } : { opacity: [0.65, 1.0, 0.65], scale: [0.88, 1.12, 0.88] }}
                    transition={{ duration: 3.5, repeat: prefersReducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
                />
                {/* Glass caustic */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_26%,rgba(255,255,255,0.20)_0%,transparent_52%)] pointer-events-none" />

                <Icon size={iconSize} className="relative z-10 text-white" strokeWidth={1.2} />
            </motion.div>

            {/* Portal hover card */}
            {isMounted && showPortal && createPortal(
                <AnimatePresence>
                    <motion.div
                        key={`star-portal-${space.id}`}
                        initial={{ opacity: 0, x: -8, scale: 0.94 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -8, scale: 0.94 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                        className="fixed z-[9999] pointer-events-none"
                        style={{ left: portalPos.x, top: portalPos.y, transform: 'translateY(-50%)' }}
                    >
                        <div
                            className="relative px-4 py-3 rounded-xl backdrop-blur-xl border border-white/20 shadow-2xl min-w-[160px]"
                            style={{
                                background: 'linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(15,20,28,0.84) 100%)',
                                boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 40px ${coreColor}20, inset 0 1px 0 rgba(255,255,255,0.08)`,
                            }}
                        >
                            <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                                style={{ background: `linear-gradient(180deg, ${coreColor}, ${coreColor}40)` }} />
                            <div className="ml-3">
                                <h4 className="text-sm font-semibold tracking-wide mb-1" style={{ color: coreColor }}>
                                    {space.name}
                                </h4>
                                <div className="flex items-center gap-3 text-xs text-white/50">
                                    <span>{folderCount} Ordner</span>
                                    {space.description && (
                                        <span className="truncate max-w-[120px] text-white/35">{space.description}</span>
                                    )}
                                </div>
                            </div>
                            <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2"
                                style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '5px solid rgba(255,255,255,0.12)' }}
                            />
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </motion.div>
    );
};

export default Star;
