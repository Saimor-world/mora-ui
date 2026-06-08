"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon, Folder, Activity, Database } from 'lucide-react';
import { getDeptStyle as _getDeptStyle } from '@/lib/utils/deptStyle';
import { useNavStore } from '@/lib/store/navStore';

interface PlanetProps {
    department: {
        id: string;
        name: string;
        color?: string | null;
        description?: string;
    };
    spaces?: any[];
    iconOverride?: LucideIcon;
    position: { x: number; y: number };
    delay?: number;
    isActive?: boolean;
    size?: 'sm' | 'md' | 'lg';
    orbitActive?: boolean;
    onClick?: () => void;
    onHover?: (hovered: boolean) => void;
    health?: number;
    activity?: number;
    capacity?: number | null; // V10: Knowledge Capacity / Storage Use
    showLabel?: boolean;
    labelSide?: 'left' | 'right';
}

export const Planet: React.FC<PlanetProps> = ({
    department,
    spaces = [],
    position,
    delay = 0,
    isActive = false,
    size = 'md',
    orbitActive = false,
    onClick,
    onHover,
    health = 98,
    activity = 42,
    capacity = null,
    iconOverride,
    showLabel = true,
    labelSide = 'right'
}) => {
    const isStandardMode = useNavStore((s) => s.isStandardMode);
    const [isHovered, setIsHovered] = useState(false);
    const planetRef = useRef<HTMLButtonElement>(null);
    // Dwell timer: prevent blink when cursor briefly leaves the planet
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = useCallback(() => {
        if (leaveTimerRef.current) { clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null; }
        setIsHovered(true);
        onHover?.(true);
    }, [onHover]);

    const handleMouseLeave = useCallback(() => {
        leaveTimerRef.current = setTimeout(() => {
            setIsHovered(false);
            onHover?.(false);
        }, 220);
    }, [onHover]);

    // Cleanup dwell timer on unmount
    useEffect(() => () => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); }, []);

    const sizeMap = {
        sm: { diameter: 74, iconSize: 23 },
        md: { diameter: 96, iconSize: 29 },
        lg: { diameter: 118, iconSize: 35 }
    };

    const planetSize = sizeMap[size];

    // Use shared util — single source of truth across all layers.
    const style = _getDeptStyle(department.name, department.color);
    const Icon = iconOverride || style.icon;

    const hasCapacity = typeof capacity === 'number' && Number.isFinite(capacity);
    const ringProgress = hasCapacity ? Math.max(0, Math.min(100, capacity)) : 0;
    const ringBaseOpacity = isHovered || isActive ? 0.24 : 0.09;
    const ringProgressOpacity = isHovered || isActive ? 0.72 : 0.22;
    const capacityTone = style.border;
    const neutralRingTone = 'rgba(226, 232, 240, 0.16)';
    const orbitTone = 'rgba(148, 163, 184, 0.18)';

    return (
        <motion.button
            ref={planetRef}
            type="button"
            aria-label={`${department.name} öffnen`}
            data-testid={`planet-${department.id}`}
            data-planet-name={department.name}
            className="absolute group pointer-events-auto border-0 bg-transparent p-6 -m-6 text-left cursor-pointer touch-manipulation"
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -50%)',
            }}
            onPointerEnter={handleMouseEnter}
            onPointerLeave={handleMouseLeave}
            onFocus={handleMouseEnter}
            onBlur={handleMouseLeave}
            onClick={onClick}
            animate={{
                y: isHovered || isActive ? [0, -4, 0] : [0, -2, 0],
            }}
            transition={{
                y: {
                    duration: isHovered || isActive ? 3.4 : 5.6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay,
                },
            }}
        >
            <motion.div
                className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[40px] w-[110px] -translate-x-1/2 translate-y-[38px] rounded-full"
                style={{
                    background: `radial-gradient(circle, ${style.glow}88 0%, ${style.glow}33 50%, transparent 78%)`,
                    filter: 'blur(22px)',
                }}
                animate={{
                    opacity: isHovered || isActive ? 1.0 : 0.75,
                    scaleX: isHovered || isActive ? 1.35 : 1.15,
                    scaleY: isHovered || isActive ? 1.25 : 1.08,
                }}
                initial={{ opacity: 0.75, scaleX: 1.15, scaleY: 1.08 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
            />

            {/* Functional rings: capacity halo + structural orbit */}
            <div className="absolute inset-[-34px] pointer-events-none flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    <motion.circle
                        cx="50"
                        cy="50"
                        r="35.5"
                        fill="none"
                        stroke={isActive ? 'rgba(52, 211, 153, 0.55)' : neutralRingTone}
                        strokeWidth={isHovered || isActive ? '1.05' : '0.85'}
                        animate={isActive ? {
                            opacity: [ringBaseOpacity, ringBaseOpacity * 3.2, ringBaseOpacity],
                            strokeWidth: ['1.05', '1.45', '1.05'],
                        } : { opacity: ringBaseOpacity }}
                        transition={isActive ? {
                            duration: 2.8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        } : { duration: 0.22 }}
                    />
                    {hasCapacity && ringProgress > 0 && (
                        <motion.circle
                            cx="50"
                            cy="50"
                            r="35.5"
                            fill="none"
                            stroke={capacityTone}
                            strokeWidth={isHovered || isActive ? 1.35 : 0.95}
                            strokeDasharray="223"
                            strokeDashoffset={223 - (223 * (ringProgress / 100))}
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                            initial={{ opacity: ringProgressOpacity }}
                            animate={{
                                opacity: ringProgressOpacity,
                            }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                        />
                    )}

                    <motion.circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke={orbitTone}
                        strokeWidth="0.65"
                        strokeDasharray="2 8"
                        initial={{ opacity: 0.035, scale: 1 }}
                        animate={{
                            opacity: isHovered || isActive ? 0.12 : 0.035,
                            scale: isHovered ? 1.03 : 1,
                        }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        style={{ transformOrigin: '50px 50px' }}
                    />

                    <motion.circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill="none"
                        stroke="rgba(226, 232, 240, 0.1)"
                        strokeWidth="0.45"
                        initial={{ opacity: 0.018, scale: 1 }}
                        animate={{
                            opacity: isHovered || isActive ? 0.06 : 0.018,
                            scale: isHovered || isActive ? 1.02 : 1,
                        }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        style={{ transformOrigin: '50px 50px' }}
                    />
                </svg>
            </div>

            {/* 0. ATMOSPHERIC HALO (Premium Depth) */}
            <motion.div
                className="orb-glass-halo"
                style={{ '--orb-glow': style.glow } as React.CSSProperties}
                initial={{ opacity: 0.22, scale: 1.04 }}
                animate={{
                    opacity: isActive ? 0.52 : isHovered ? 0.38 : 0.22,
                    scale: isHovered ? 1.18 : isActive ? 1.12 : 1.04
                }}
            />

            {/* ═ PLANET SPHERE — Solid energy node, no more glass ═ */}
            <div className="relative flex items-center justify-center pointer-events-none">
                {/* Saturn-like Tilted Rings */}
                <motion.div
                    className="absolute pointer-events-none rounded-full"
                    style={{
                        width: planetSize.diameter * 1.8,
                        height: planetSize.diameter * 0.45,
                        border: `2px solid ${style.border}77`,
                        background: `radial-gradient(ellipse at center, transparent 40%, ${style.border}33 70%, transparent 100%)`,
                        boxShadow: `0 0 15px ${style.glow}44, inset 0 0 15px ${style.glow}33`,
                        transform: 'rotate(-15deg) rotateX(75deg)',
                        top: '50%',
                        left: '50%',
                        x: '-50%',
                        y: '-50%',
                        transformStyle: 'preserve-3d',
                    }}
                    animate={{
                        scale: [1, 1.04, 1],
                        rotate: [-15, -12, -15],
                    }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />

                {/* Orbiting Moons */}
                {(isHovered || isActive) && (
                    <>
                        {/* Moon 1 */}
                        <motion.div
                            className="absolute border border-dashed border-white/5"
                            style={{
                                width: planetSize.diameter * 1.4,
                                height: planetSize.diameter * 1.4,
                                top: '50%',
                                left: '50%',
                                x: '-50%',
                                y: '-50%',
                                borderRadius: '50%',
                            }}
                            animate={{ rotate: 360 }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                        >
                            <div
                                className="absolute rounded-full"
                                style={{
                                    width: 6,
                                    height: 6,
                                    top: 0,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: '#ffffff',
                                    boxShadow: `0 0 8px #ffffff, 0 0 12px ${style.glow}`,
                                }}
                            />
                        </motion.div>
                        {/* Moon 2 */}
                        <motion.div
                            className="absolute border border-dashed border-white/5"
                            style={{
                                width: planetSize.diameter * 1.8,
                                height: planetSize.diameter * 1.8,
                                top: '50%',
                                left: '50%',
                                x: '-50%',
                                y: '-50%',
                                borderRadius: '50%',
                            }}
                            animate={{ rotate: -360 }}
                            transition={{
                                duration: 12,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                        >
                            <div
                                className="absolute rounded-full"
                                style={{
                                    width: 4,
                                    height: 4,
                                    bottom: 0,
                                    right: '50%',
                                    transform: 'translateX(50%)',
                                    background: style.border,
                                    boxShadow: `0 0 6px ${style.border}, 0 0 10px ${style.glow}`,
                                }}
                            />
                        </motion.div>
                    </>
                )}

                <motion.div
                    className="flex items-center justify-center relative z-10 pointer-events-auto overflow-hidden"
                    style={{
                        width: planetSize.diameter,
                        height: planetSize.diameter,
                        borderRadius: '9999px',
                        transformOrigin: '50% 50%',
                        // Semi-transparent holographic glass sphere with refraction
                        background: isStandardMode
                            ? 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 60%, rgba(0,0,0,0.05) 100%)'
                            : `
                                radial-gradient(ellipse 55% 45% at 30% 20%, rgba(255,255,255,0.20) 0%, transparent 60%),
                                radial-gradient(circle at 50% 50%, ${style.border}15 0%, ${style.glow}08 40%, rgba(13, 9, 33, 0.45) 85%, ${style.core}22 100%)
                            `,
                        backdropFilter: isStandardMode ? 'none' : 'blur(12px) saturate(1.4)',
                        WebkitBackdropFilter: isStandardMode ? 'none' : 'blur(12px) saturate(1.4)',
                        border: `2.5px solid ${style.border}`,
                        boxShadow: isActive || isHovered
                            ? `0 0 35px ${style.glow}88, 0 0 70px ${style.glow}55, inset 0 0 25px ${style.glow}44`
                            : `0 0 20px ${style.glow}44, 0 0 45px ${style.glow}22, inset 0 0 15px ${style.glow}22`,
                    } as React.CSSProperties}
                    whileHover={{ scale: 1.1 }}
                    initial={{ scale: 1 }}
                    animate={{ scale: isHovered || isActive ? 1.06 : 1 }}
                    transition={{ scale: { type: 'spring', stiffness: 320, damping: 22 } }}
                >
                    {/* Bottom rim light */}
                    <div style={{
                        position: 'absolute', inset: 0, borderRadius: '9999px', pointerEvents: 'none',
                        background: `radial-gradient(ellipse 60% 30% at 50% 88%, ${style.border}44 0%, transparent 60%)`,
                    }} />

                    {/* Holographic Scanlines / Grid overlay */}
                    {!isStandardMode && (
                        <div
                            className="absolute inset-0 rounded-full overflow-hidden pointer-events-none opacity-[0.14] mix-blend-overlay"
                            style={{
                                background: `
                                    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                                `,
                                backgroundSize: '8px 8px',
                            }}
                        />
                    )}

                    {/* Scanline sweep effect */}
                    {!isStandardMode && (isHovered || isActive) && (
                        <motion.div
                            className="absolute inset-x-0 h-0.5 pointer-events-none opacity-[0.25]"
                            style={{
                                background: `linear-gradient(90deg, transparent, ${style.border}, transparent)`,
                            }}
                            animate={{ y: [0, planetSize.diameter, 0] }}
                            transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                        />
                    )}

                    {/* Icon */}
                    <div className="relative z-10">
                        <Icon
                            size={planetSize.iconSize}
                            className="text-white"
                            strokeWidth={1.4}
                        />
                    </div>
                </motion.div>
            </div>

            {/* ═ DATA LABELS (V10 Cinematic HUD & Glassmorphic Hover Card) ═ */}
            {showLabel && (
            <div
                className={`absolute top-1/2 -translate-y-1/2 flex flex-col pointer-events-none min-w-[240px] z-50 ${
                    labelSide === 'left'
                        ? 'right-[calc(100%+22px)] items-end'
                        : 'left-[calc(100%+22px)] items-start'
                }`}
            >
                <motion.span
                    className="flex items-center gap-1 mb-1"
                    initial={{ opacity: 0.68, x: 0 }}
                    animate={{
                        opacity: isHovered || isActive ? 1 : 0.68,
                        x: isHovered ? (labelSide === 'left' ? -3 : 3) : 0
                    }}
                >
                    {isActive && (
                        <span
                            className="inline-block shrink-0 rounded-full animate-pulse"
                            style={{ width: 5, height: 5, background: 'rgba(52, 211, 153, 0.90)', boxShadow: '0 0 6px rgba(52,211,153,0.7)' }}
                        />
                    )}
                    <span className={`text-[9px] tracking-[0.2em] uppercase font-semibold ${isStandardMode ? 'text-gray-700' : 'text-cyan-400'}`}>
                        {department.name}
                    </span>
                </motion.span>

                <AnimatePresence>
                    {(isHovered || isActive) && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10, x: labelSide === 'left' ? 10 : -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10, x: labelSide === 'left' ? 10 : -10 }}
                            className={`flex flex-col gap-3 p-4 rounded-2xl border backdrop-blur-[24px] shadow-[0_16px_50px_rgba(0,0,0,0.65)] min-w-[240px] max-w-[280px] ${
                                isStandardMode
                                    ? 'bg-white/92 border-gray-200/80 text-gray-800'
                                    : 'glass-card text-white'
                            }`}
                        >
                            {/* Department Info & Badge */}
                            <div className="flex items-start justify-between gap-3 w-full">
                                <div className="flex flex-col min-w-0">
                                    <span className={`text-[7px] font-bold uppercase tracking-[0.2em] ${isStandardMode ? 'text-gray-400' : 'text-white/40'}`}>
                                        Abteilung
                                    </span>
                                    <span className="text-xs font-semibold mt-0.5 truncate">
                                        {department.name}
                                    </span>
                                </div>
                                <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border shrink-0 ${
                                    isStandardMode 
                                        ? 'border-gray-200 bg-gray-100 text-gray-500' 
                                        : 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300'
                                }`}>
                                    Aktiv
                                </span>
                            </div>

                            {/* Description / Summary */}
                            <div className={`text-[10px] leading-relaxed font-normal ${isStandardMode ? 'text-gray-500' : 'text-white/60'}`}>
                                {department.description || `${department.name} department workspace and organizational center.`}
                            </div>

                            {/* Child Spaces List */}
                            {spaces && spaces.length > 0 && (
                                <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-2.5">
                                    <span className={`text-[8px] font-bold uppercase tracking-[0.15em] ${isStandardMode ? 'text-gray-400' : 'text-white/35'}`}>
                                        Bereiche ({spaces.length})
                                    </span>
                                    <div className="flex flex-col gap-1">
                                        {spaces.slice(0, 3).map((space) => (
                                            <div key={space.id} className="flex items-center gap-1.5 text-[9px]">
                                                <Folder size={10} className={`shrink-0 ${isStandardMode ? 'text-gray-500' : 'text-cyan-400/80'}`} />
                                                <span className={`truncate ${isStandardMode ? 'text-gray-700' : 'text-white/80'}`}>{space.name}</span>
                                            </div>
                                        ))}
                                        {spaces.length > 3 && (
                                            <span className={`text-[8px] italic pl-3.5 ${isStandardMode ? 'text-gray-400' : 'text-white/30'}`}>
                                                + {spaces.length - 3} weitere...
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-2.5">
                                <div className={`flex flex-col p-2 rounded-xl border ${
                                    isStandardMode ? 'border-gray-100 bg-gray-50' : 'border-white/[0.04] bg-white/[0.02]'
                                }`}>
                                    <span className={`text-[7px] uppercase tracking-[0.1em] ${isStandardMode ? 'text-gray-400' : 'text-white/30'}`}>Dokumente</span>
                                    <span className={`text-[10px] font-semibold mt-0.5 ${isStandardMode ? 'text-gray-800' : 'text-cyan-300'}`}>{activity} Docs</span>
                                </div>
                                <div className={`flex flex-col p-2 rounded-xl border ${
                                    isStandardMode ? 'border-gray-100 bg-gray-50' : 'border-white/[0.04] bg-white/[0.02]'
                                }`}>
                                    <span className={`text-[7px] uppercase tracking-[0.1em] ${isStandardMode ? 'text-gray-400' : 'text-white/30'}`}>Health-Score</span>
                                    <span className="text-[10px] font-semibold mt-0.5 text-emerald-400">{health}%</span>
                                </div>
                            </div>

                            {/* Capacity Progress Bar */}
                            {hasCapacity && ringProgress > 0 && (
                                <div className="flex flex-col gap-1 border-t border-white/[0.06] pt-2.5">
                                    <div className="flex justify-between items-center text-[7px] uppercase tracking-[0.1em]">
                                        <span className={isStandardMode ? 'text-gray-400' : 'text-white/30'}>Kapazität</span>
                                        <span className={`font-mono ${isStandardMode ? 'text-gray-800' : 'text-cyan-300'}`}>{ringProgress}%</span>
                                    </div>
                                    <div className={`h-[4px] w-full rounded-full overflow-hidden ${
                                        isStandardMode ? 'bg-gray-100' : 'bg-white/10'
                                    }`}>
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${ringProgress}%`,
                                                background: ringProgress > 70 ? '#10B981' : ringProgress > 30 ? '#F59E0B' : '#6B7280'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            )}
        </motion.button>
    );
};
