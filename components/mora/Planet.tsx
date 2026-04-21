"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon, Folder, Activity, Database } from 'lucide-react';
import { getDeptStyle as _getDeptStyle } from '@/lib/utils/deptStyle';

interface PlanetProps {
    department: {
        id: string;
        name: string;
        color?: string | null;
        description?: string;
    };
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
}

export const Planet: React.FC<PlanetProps> = ({
    department,
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
    iconOverride
}) => {
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
        sm: { diameter: 60, iconSize: 20 },
        md: { diameter: 74, iconSize: 24 },
        lg: { diameter: 90, iconSize: 28 }
    };

    const planetSize = sizeMap[size];

    // Use shared util — single source of truth across all layers.
    const style = _getDeptStyle(department.name);
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
                className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[28px] w-[88px] -translate-x-1/2 translate-y-[34px] rounded-full"
                style={{
                    background: `radial-gradient(circle, ${style.glow}30 0%, rgba(0,0,0,0.32) 46%, transparent 78%)`,
                    filter: 'blur(16px)',
                }}
                animate={{
                    opacity: isHovered || isActive ? 0.72 : 0.44,
                    scaleX: isHovered ? 1.16 : 1,
                    scaleY: isHovered ? 1.08 : 1,
                }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
            />

            {/* Functional rings: capacity halo + structural orbit */}
            <div className="absolute inset-[-34px] pointer-events-none flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    <circle
                        cx="50"
                        cy="50"
                        r="35.5"
                        fill="none"
                        stroke={neutralRingTone}
                        strokeWidth={isHovered || isActive ? '1.05' : '0.85'}
                        opacity={ringBaseOpacity}
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
                animate={{
                    opacity: isActive ? 0.42 : isHovered ? 0.3 : 0.16,
                    scale: isHovered ? 1.16 : isActive ? 1.08 : 1
                }}
            />

            {/* ═ THE PLANET SPHERE (V12 Premium Glass) ═ */}
            <motion.div
                className="orb-glass flex items-center justify-center"
                style={{
                    width: planetSize.diameter,
                    height: planetSize.diameter,
                    transformOrigin: '50% 50%',
                    '--orb-glow': `${style.glow}08`,
                    '--orb-border': `${style.border}30`,
                    boxShadow: isActive || isHovered
                        ? `0 0 44px ${style.glow}28, 0 18px 44px rgba(0,0,0,0.46), inset 0 0 22px ${style.glow}14, inset 2px 2px 6px rgba(255,255,255,0.26)`
                        : `0 14px 36px rgba(0,0,0,0.42), inset 0 0 14px ${style.glow}0C, inset 1px 1px 2px rgba(255,255,255,0.14)`,
                } as React.CSSProperties}
                whileHover={{ scale: 1.08 }}
                animate={{
                    scale: isHovered || isActive ? 1.03 : 1,
                    rotateZ: isHovered ? 1.2 : 0,
                }}
                transition={{
                    scale: { type: 'spring', stiffness: 280, damping: 24 },
                    rotateZ: { duration: 0.18, ease: 'easeOut' },
                }}
            >
                {/* Subsurface scattering core */}
                <div
                    className="orb-glass-core"
                    style={{
                        '--orb-glow': style.border,
                        opacity: isHovered || isActive ? 0.95 : 0.65,
                        transform: `scale(${isHovered ? 1.04 : 1})`,
                        transition: 'opacity 180ms ease, transform 180ms ease',
                    } as React.CSSProperties}
                />

                {/* Glass caustic refraction */}
                <div className="orb-glass-caustic" />

                {/* Icon */}
                <div className="relative z-10">
                    <Icon
                        size={planetSize.iconSize}
                        className="text-white/90"
                        strokeWidth={1.2}
                    />
                </div>
            </motion.div>

            {/* ═ DATA LABELS (V10 Cinematic HUD) ═ */}
            <div className="absolute top-1/2 left-[calc(100%+32px)] -translate-y-1/2 flex flex-col pointer-events-none min-w-[120px]">
                <motion.span
                    className="text-[10px] font-medium text-white/90 tracking-[0.2em] mb-1"
                    animate={{
                        opacity: isHovered ? 1 : 0.6,
                        x: isHovered ? 4 : 0
                    }}
                >
                    {department.name.toUpperCase()}
                </motion.span>

                {/* Functional Stats (Steam Deck Vibes) */}
                <AnimatePresence>
                    {(isHovered || isActive) && (
                        <motion.div
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5 }}
                            className="flex flex-col gap-1"
                        >
                            <div className="flex items-center gap-3 text-[8px] text-cyan-400 font-medium tracking-[0.15em]">
                                <div className="flex items-center gap-1 opacity-80">
                                    <Database size={9} />
                                    <span>{activity} Docs</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-80">
                                    <Activity size={9} />
                                    <span>{health}% Health</span>
                                </div>
                            </div>
                            {hasCapacity && ringProgress > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="h-[3px] w-16 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${ringProgress}%`,
                                                background: ringProgress > 70 ? '#10B981' : ringProgress > 30 ? '#F59E0B' : '#6B7280'
                                            }}
                                        />
                                    </div>
                                    <span className="text-[7px] text-white/30 font-mono">{ringProgress}%</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.button>
    );
};
