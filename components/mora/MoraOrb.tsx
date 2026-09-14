"use client";

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface MoraOrbProps {
    role?: 'admin' | 'member' | 'manager';
    state?: 'idle' | 'watch' | 'focus' | 'thinking' | 'alert' | 'insight' | 'demo' | 'curious' | 'learning' | 'watching' | 'listening';
    demoMode?: boolean;
    onClick?: () => void;
    interactive?: boolean;
    size?: 'sm' | 'md' | 'lg';
    companyLogo?: string;
    accentColor?: string;
    notifications?: Array<{ id: string, type: 'task' | 'email' | 'insight' | 'alert', message: string }>;
    onPaneSpawn?: (type: string, position: { x: number, y: number }) => void;
    onCursorSpawn?: (action: string, target: { x: number, y: number }) => void;
}

/**
 * THE ORB (V12) — MÔRA is the jade stone from the Saimôr sigil.
 *
 * Decided 2026-09-14: MÔRA is shown as the exact stone cut from the approved brand
 * artwork (public/brand/mora-stone-v1.png), the same image as on saimor.world. The
 * stone is never redrawn; state only changes the light around it (colour, breath,
 * resonance ring). Replaces the plasma heart (PlasmaOrb) of V11.
 */
const SIZE_CLASSES: Record<NonNullable<MoraOrbProps['size']>, { wrapper: string; stone: number }> = {
    sm: { wrapper: 'w-[80px] h-[80px]', stone: 64 },
    md: { wrapper: 'w-[140px] h-[140px]', stone: 112 },
    lg: { wrapper: 'w-[220px] h-[220px]', stone: 176 },
};

const STATE_LABELS: Record<string, string> = {
    idle: 'Bereit', thinking: 'Denkt nach', watch: 'Beobachtet', focus: 'Fokussiert', alert: 'Alarm',
    insight: 'Erkenntnis', demo: 'Demo', curious: 'Neugierig', learning: 'Lernt', watching: 'Beobachtet', listening: 'Hört zu',
};

export function MoraOrb({
    role = 'admin',
    state = 'idle',
    demoMode = false,
    size = 'md',
    companyLogo,
    accentColor,
    notifications = [],
    onClick,
    onPaneSpawn,
    onCursorSpawn
}: MoraOrbProps) {
    const [mounted, setMounted] = useState(false);
    const orbRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const getStateParams = () => {
        // Jade is MÔRA's own colour; states tint only the light around the stone.
        const baseColor = accentColor || '#10B981';

        switch (state) {
            case 'alert':
                return { color: '#EF4444', glowIntensity: 60, pulse: 1.0 };
            case 'insight':
                return { color: '#F59E0B', glowIntensity: 50, pulse: 2.0 };
            case 'listening':
                return { color: '#10B981', glowIntensity: 55, pulse: 1.2 };
            case 'thinking':
                return { color: '#3B82F6', glowIntensity: 45, pulse: 2.5 };
            case 'focus':
                return { color: accentColor || '#10B981', glowIntensity: 40, pulse: 1.5 };
            case 'watch':
                return { color: accentColor || '#06B6D4', glowIntensity: 35, pulse: 2.5 };
            case 'demo':
                return { color: baseColor, glowIntensity: 40, pulse: 3.0 };
            case 'idle':
            default:
                return { color: baseColor, glowIntensity: 50, pulse: 4.0 };
        }
    };

    const { color, glowIntensity, pulse } = getStateParams();
    const sz = SIZE_CLASSES[size ?? 'md'];

    if (!mounted) return null;

    return (
        <div
            className={`relative select-none pointer-events-auto ${sz.wrapper} flex items-center justify-center`}
            ref={orbRef}
            data-mora-state={state}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            {/* Soft presence field around the stone. */}
            <motion.div
                className="absolute inset-[-30%] rounded-full mix-blend-screen pointer-events-none"
                style={{
                    background: `radial-gradient(circle, ${color}40 0%, ${color}14 36%, transparent 66%)`,
                    filter: 'blur(28px)',
                }}
                animate={isHovered
                    ? { opacity: 0.55, scale: 1.08 }
                    : { opacity: [0.28, 0.48, 0.28], scale: [1, 1.04, 1] }}
                transition={isHovered
                    ? { duration: 0.18, ease: 'easeOut' }
                    : { duration: pulse * 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* THE STONE — exact brand artwork, gently breathing. */}
            <motion.div
                className="relative flex items-center justify-center rounded-full cursor-pointer"
                style={{
                    width: sz.stone,
                    height: sz.stone,
                    boxShadow: `0 18px 54px rgba(0,0,0,0.38), 0 0 ${glowIntensity}px ${color}40`,
                }}
                animate={{ scale: [1, 1.022, 1] }}
                transition={{ duration: pulse * 1.6, repeat: Infinity, ease: 'easeInOut' }}
                whileHover={{ scale: 1.06, boxShadow: `0 20px 70px rgba(0,0,0,0.6), 0 0 ${glowIntensity + 26}px ${color}80` }}
                whileTap={{ scale: 0.96 }}
            >
                <Image
                    src="/brand/mora-stone-v1.png"
                    alt="MÔRA"
                    width={504}
                    height={504}
                    sizes={`${sz.stone}px`}
                    priority={size === 'lg'}
                    draggable={false}
                    className="h-full w-full select-none pointer-events-none"
                />

                {/* State tint inside the gold ring (not for idle - pure jade). */}
                {state !== 'idle' && (
                    <motion.div
                        className="absolute inset-[9%] rounded-full pointer-events-none mix-blend-soft-light"
                        style={{ backgroundColor: color }}
                        animate={{ opacity: [0.18, 0.32, 0.18] }}
                        transition={{ duration: pulse * 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                )}

                {/* Hover Focus Ring */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            className="absolute inset-[-12px] rounded-full border border-emerald-300/30 pointer-events-none"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 0.65, scale: 1.03 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                        />
                    )}
                </AnimatePresence>

                {/* Status Indicator Label (Floating) */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
                            initial={{ y: 6, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 6, opacity: 0 }}
                        >
                            <div className="px-4 py-1.5 rounded-full bg-black/80 backdrop-blur-xl border border-white/10 text-[9px] tracking-[0.3em] uppercase font-bold text-white shadow-2xl flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                                Mora: {STATE_LABELS[state ?? ''] || state}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Company Logo Overlay */}
                {companyLogo && (
                    <motion.div
                        className="absolute z-20 w-12 h-12 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-xl border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                        style={{ borderBottomColor: `${color}40` }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element -- company logos can come from arbitrary upload URLs */}
                        <img src={companyLogo} alt="Logo" className="w-7 h-7 object-contain opacity-90" />
                    </motion.div>
                )}
            </motion.div>

            {/* RESONANCE STATE RINGS */}
            <AnimatePresence>
                {state !== 'idle' && (
                    <motion.div
                        className="absolute inset-[-10px] rounded-full border-2 border-white/5"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                            opacity: 0.4,
                            scale: 1,
                            borderColor: `${color}40`
                        }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        style={{ filter: 'blur(1px)' }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
