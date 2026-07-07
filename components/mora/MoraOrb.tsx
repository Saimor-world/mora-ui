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
 * THE ORB (V11) — unified Glas + Plasma-Herz
 *
 * The single canonical orb. One luminous body: a liquid-morphing glass hub
 * breathing in sync with its PlasmaOrb heart, both driven by one state→colour
 * palette. Replaces the old 3D/WebGL LiquidOrb (removed) — the liquid feel now
 * lives in the 2D hub morph, so no WebGL cost and no preview crash.
 */
const SIZE_CLASSES: Record<NonNullable<MoraOrbProps['size']>, { wrapper: string; hub: string; plasma: number }> = {
    sm: { wrapper: 'w-[80px] h-[80px]',  hub: 'w-16 h-16', plasma: 66 },
    md: { wrapper: 'w-[140px] h-[140px]', hub: 'w-28 h-28', plasma: 116 },
    lg: { wrapper: 'w-[220px] h-[220px]', hub: 'w-44 h-44', plasma: 182 },
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
            {/* Soft presence field. Keep it atmospheric, not a second orb body. */}
            <motion.div
                className="absolute inset-[-38%] rounded-full mix-blend-screen pointer-events-none"
                style={{
                    background: `radial-gradient(circle, ${color}30 0%, ${color}12 34%, transparent 68%)`,
                    filter: 'blur(54px)',
                }}
                animate={isHovered
                    ? { opacity: 0.22, scale: 1.08 }
                    : { opacity: [0.08, 0.15, 0.08], scale: [1, 1.035, 1] }}
                transition={isHovered
                    ? { duration: 0.18, ease: 'easeOut' }
                    : { duration: pulse * 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* V10 STEAM DECK GLASS BORDER - THE HUB */}
                <motion.div
                    className={`relative ${sz.hub} flex items-center justify-center overflow-hidden cursor-pointer`}
                style={{
                        background: 'transparent',
                        boxShadow: `0 18px 54px rgba(0,0,0,0.34), 0 0 46px ${color}32`,
                }}
                animate={{
                    borderRadius: [
                        '48% 52% 50% 50% / 52% 48% 50% 50%',
                        '53% 47% 52% 48% / 47% 53% 49% 51%',
                        '47% 53% 48% 52% / 52% 48% 53% 47%',
                        '50% 50% 53% 47% / 48% 52% 47% 53%',
                        '48% 52% 50% 50% / 52% 48% 50% 50%',
                    ],
                }}
                transition={{ borderRadius: { duration: pulse * 2.2, repeat: Infinity, ease: 'easeInOut' } }}
                whileHover={{ scale: 1.1, boxShadow: `0 20px 80px rgba(0,0,0,0.9), 0 0 70px ${color}90, inset 0 0 40px ${color}40` }}
                whileTap={{ scale: 0.95 }}
            >
                {/* PLASMA CONTENT — MORA'S HEART. Fills + centred; the hub's
                    overflow-hidden + morphing borderRadius clip it into the liquid blob. */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-100 saturate-[1.24] contrast-[1.06]">
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

                {/* GLASS SHEEN — crisp top-left glint (the "Glas" in Glas + Plasma-Herz) */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'radial-gradient(38% 30% at 36% 30%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.045) 28%, transparent 54%)',
                        mixBlendMode: 'screen',
                        opacity: 0.55,
                    }}
                />
                {/* DEPTH — soft inner shadow lower-right gives the body sphere volume */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'radial-gradient(62% 62% at 70% 76%, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.05) 34%, transparent 58%)',
                        mixBlendMode: 'multiply',
                        opacity: 0.42,
                    }}
                />
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
