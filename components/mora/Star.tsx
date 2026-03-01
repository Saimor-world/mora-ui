"use client";

/**
 * STAR — Moon / Space (Layer 2)
 *
 * Full glass-sphere upgrade to match Planet.tsx quality.
 * - 3D specular highlight + inner luminous heart
 * - Portal hover card (consistent with Planet.tsx)
 * - Semantic icon per Space role
 * - No built-in text label (caller handles labeling to avoid duplication)
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Users, Briefcase, FolderOpen, Layers, Star as StarIcon, FlaskConical, BookOpen, ShoppingCart } from 'lucide-react';
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

// ── Semantic icon resolver ────────────────────────────────────────────────────
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

// ── Size map ──────────────────────────────────────────────────────────────────
const SIZE_MAP = {
    sm: { diameter: 28, iconSize: 12 },
    md: { diameter: 40, iconSize: 16 },
    lg: { diameter: 54, iconSize: 20 },
    xl: { diameter: 64, iconSize: 24 },
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
    const [isHovered, setIsHovered] = useState(false);
    const [showPortal, setShowPortal] = useState(false);
    const [portalPos, setPortalPos] = useState({ x: 0, y: 0 });
    const [isMounted, setIsMounted] = useState(false);
    const orbRef = useRef<HTMLDivElement>(null);
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { setIsMounted(true); }, []);
    useEffect(() => () => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); }, []);

    const { diameter, iconSize } = SIZE_MAP[size];
    const coreColor = space.color || '#22D3EE';
    const Icon = resolveIcon(space.name);
    const hasContent = (space.folder_count || 0) > 0;

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (leaveTimerRef.current) { clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null; }
        setIsHovered(true);
        onHover?.(true);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPortalPos({ x: rect.right + 14, y: rect.top + rect.height / 2 });
        setShowPortal(true);
    };

    const handleMouseLeave = () => {
        // Delay hide so mouse can travel the 14px gap to the portal card.
        leaveTimerRef.current = setTimeout(() => {
            setIsHovered(false);
            onHover?.(false);
            setShowPortal(false);
        }, 120);
    };

    return (
        <motion.div
            ref={orbRef}
            className="relative cursor-pointer group pointer-events-auto inline-flex items-center justify-center"
            style={{ width: diameter, height: diameter }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            animate={{
                scale: isActive ? 1.05 : 1,
                x: orbitActive ? [0, 2.5, 0] : 0,
                y: orbitActive ? [0, -1.5, 0] : 0,
            }}
            transition={{
                delay,
                duration: orbitActive ? 2.8 : undefined,
                repeat: orbitActive ? Infinity : 0,
                repeatType: 'reverse',
                ease: 'easeInOut',
                scale: { type: 'spring', stiffness: 300, damping: 25 },
            }}
            initial={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.2 }}
        >
            {/* ── Atmospheric halo ─── */}
            <motion.div
                className="absolute inset-[-35%] rounded-full blur-[20px] z-[-1]"
                style={{ background: `radial-gradient(circle, ${coreColor} 0%, transparent 70%)` }}
                animate={{
                    opacity: isActive ? 0.45 : isHovered ? 0.32 : isHoveredByPlanet ? 0.22 : 0.14,
                    scale: isHovered ? 1.15 : 1,
                }}
                transition={{ duration: 0.4 }}
            />

            {/* ── Promoted halo ─── */}
            {isPromoted && (
                <motion.div
                    className="absolute inset-[-8px] rounded-full border border-amber-400/40"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.7, 0.35] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* ── Orbit ring (active/promoted) ─── */}
            {(isActive || isPromoted) && (
                <motion.div
                    className="absolute rounded-full border border-white/15"
                    style={{
                        left: '50%', top: '50%',
                        width: diameter + 20, height: diameter + 20,
                        transform: 'translate(-50%, -50%) rotate(25deg) scaleX(1.3)',
                    }}
                    animate={{ opacity: [0.25, 0.55, 0.25], scale: [1, 1.04, 1] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* ── Glass Sphere Core ─── */}
            <motion.div
                className="relative rounded-full flex items-center justify-center overflow-hidden backdrop-blur-[4px]"
                style={{
                    width: diameter,
                    height: diameter,
                    background: `radial-gradient(140% 140% at 28% 28%, rgba(255,255,255,0.16) 0%, ${coreColor}40 50%, rgba(0,0,0,0.28) 100%)`,
                    boxShadow: isActive || isHovered
                        ? `0 0 50px ${coreColor}60, inset 0 0 24px ${coreColor}28, inset 2px 2px 7px rgba(255,255,255,0.32)`
                        : hasContent
                            ? `0 0 24px ${coreColor}55, inset 0 0 12px ${coreColor}18, inset 1px 1px 3px rgba(255,255,255,0.16)`
                            : `0 0 18px ${coreColor}45, 0 8px 24px rgba(0,0,0,0.28), inset 1px 1px 3px rgba(255,255,255,0.14)`,
                    border: `1px solid ${coreColor}55`,
                }}
                whileHover={{ scale: 1.1, rotate: 8 }}
                transition={{ type: 'spring', stiffness: 250, damping: 20 }}
            >
                {/* Specular point */}
                <div
                    className="absolute top-[16%] left-[16%] w-[18%] h-[10%] rounded-[100%] bg-white blur-[1px] opacity-65"
                    style={{ transform: 'rotate(-45deg)' }}
                />
                {/* Inner luminous heart */}
                <motion.div
                    className="absolute inset-[22%] rounded-full mix-blend-overlay blur-md"
                    style={{ background: `radial-gradient(circle, ${coreColor} 0%, transparent 70%)` }}
                    animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Glass caustic */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_28%,rgba(255,255,255,0.18)_0%,transparent_50%)] pointer-events-none" />

                {/* Icon */}
                <Icon size={iconSize} className="relative z-10 text-white/90" strokeWidth={1.3} />
            </motion.div>

            {/* ── Portal hover card ─────────────────────────────────────────── */}
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
                                boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 40px ${coreColor}18, inset 0 1px 0 rgba(255,255,255,0.08)`,
                            }}
                        >
                            {/* Accent line */}
                            <div
                                className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                                style={{ background: `linear-gradient(180deg, ${coreColor}, ${coreColor}40)` }}
                            />
                            <div className="ml-3">
                                <h4 className="text-sm font-semibold tracking-wide mb-1" style={{ color: coreColor }}>
                                    {space.name}
                                </h4>
                                <div className="flex items-center gap-3 text-xs text-white/50">
                                    <span>{space.folder_count || 0} Ordner</span>
                                    {space.description && (
                                        <span className="truncate max-w-[120px] text-white/35">{space.description}</span>
                                    )}
                                </div>
                            </div>
                            {/* Arrow */}
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
