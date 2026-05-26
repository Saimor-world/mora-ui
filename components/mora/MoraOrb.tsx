"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlasmaOrb } from './PlasmaOrb';

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
 * V10 "RESONATING" MORA ORB
 * 
 * Now breathes in sync with the ForestLightCanopy.
 * Enhanced Steam Deck x Organic aesthetics.
 */
const SIZE_CLASSES: Record<NonNullable<MoraOrbProps['size']>, { wrapper: string; hub: string; plasma: number }> = {
    sm: { wrapper: 'w-[80px] h-[80px]',  hub: 'w-16 h-16 p-1.5', plasma: 52 },
    md: { wrapper: 'w-[140px] h-[140px]', hub: 'w-28 h-28 p-2',   plasma: 92 },
    lg: { wrapper: 'w-[220px] h-[220px]', hub: 'w-44 h-44 p-3',   plasma: 148 },
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
    const [activeSparks, setActiveSparks] = useState<any[]>([]);
    const orbRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const getStateParams = () => {
        // Use custom accentColor if provided (e.g. from company branding)
        // while maintaining the characteristic glow for specific states.
        const baseColor = accentColor || '#7C3AED';

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
                return { color: accentColor || '#7C3AED', glowIntensity: 40, pulse: 1.5 };
            case 'watch':
                return { color: accentColor || '#06B6D4', glowIntensity: 35, pulse: 2.5 };
            case 'demo':
                return { color: baseColor, glowIntensity: 40, pulse: 3.0 };
            case 'idle':
            default:
                return { color: baseColor, glowIntensity: 50, pulse: 4.0 };
        }
    };

    const params = getStateParams();
    const { color, glowIntensity, pulse } = params;
    const sz = SIZE_CLASSES[size ?? 'md'];

    if (!mounted) return null;

    return (
        <div
            className={`relative select-none pointer-events-auto ${sz.wrapper} flex items-center justify-center`}
            ref={orbRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            {/* V10 CORONA RESONANCE */}
            <div
                className="absolute inset-[-60%] rounded-full mix-blend-screen pointer-events-none"
                style={{
                    background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
                    filter: 'blur(60px)',
                    opacity: isHovered ? 0.3 : 0.18,
                    transform: `scale(${isHovered ? 1.15 : 1})`,
                    transition: 'opacity 180ms ease, transform 180ms ease',
                }}
            />

            {/* V10 STEAM DECK GLASS BORDER - THE HUB */}
                <motion.div
                    className={`relative ${sz.hub} flex items-center justify-center rounded-full border border-white/10 backdrop-blur-[40px] cursor-pointer`}
                style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,20,15,0.8) 100%)',
                        boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 50px ${color}60, inset 0 0 30px ${color}30`,
                }}
                animate={{ borderRadius: '48% 52% 50% 50% / 52% 48% 50% 50%' }}
                whileHover={{ scale: 1.1, boxShadow: `0 20px 80px rgba(0,0,0,0.9), 0 0 70px ${color}90, inset 0 0 40px ${color}40` }}
                whileTap={{ scale: 0.95 }}
            >
                {/* PLASMA CONTENT - MORA'S HEART */}
                <div className="absolute inset-2 rounded-full overflow-hidden pointer-events-none opacity-90 saturate-[1.2]">
                    <PlasmaOrb
                        color={color}
                        state={state as any}
                        size={sz.plasma}
                    />
                </div>

                {/* Hover Focus Ring */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            className="absolute inset-[-16px] rounded-full border border-emerald-300/40 pointer-events-none"
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
                                Mora: {{ idle: 'Bereit', thinking: 'Denkt nach', watch: 'Beobachtet', focus: 'Fokussiert', alert: 'Alarm', insight: 'Erkenntnis', demo: 'Demo', curious: 'Neugierig', learning: 'Lernt', watching: 'Beobachtet', listening: 'Hört zu' }[state ?? ''] || state}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Company Logo Overlay */}
                {companyLogo && (
                    <motion.div
                        className="relative z-20 w-12 h-12 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-xl border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                        style={{ borderBottomColor: `${color}40` }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element -- company logos can come from arbitrary upload URLs */}
                        <img src={companyLogo} alt="Logo" className="w-7 h-7 object-contain opacity-90" />
                    </motion.div>
                )}

                {/* HIGHLIGHT REFLECTION */}
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2)_0%,transparent_50%)] pointer-events-none" />
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
