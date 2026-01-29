"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMoraStore } from "@/lib/store/moraState";
import { useUser } from "@/lib/hooks/useUser";

interface UserAvatarProps {
    onClick?: () => void;
    showLabel?: boolean;
}

/**
 * USER AVATAR - PULSIERENDE FLAMME (Pulsating Flame)
 *
 * Inspired by Gemini Variante 4: "Organisch & Lebendig"
 * - Pulsierender Energiekern wie ein Herz aus Licht
 * - Verästelte Flammenzungen die sich nach oben auflösen
 * - Wild, leidenschaftlich, lebendig
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({ onClick, showLabel = true }) => {
    const { user, role, isLoading } = useUser();
    const [isHovered, setIsHovered] = useState(false);
    const viewMode = useMoraStore((s) => s.viewMode);

    // MAIN FLAME TONGUES - Wild, branching flames rising upward
    const flameTongues = useMemo(() => {
        return Array.from({ length: 8 }, (_, i) => ({
            id: i,
            // Spread across the width
            offsetX: (i - 3.5) * 4 + (Math.random() - 0.5) * 6,
            // Each tongue has different height and behavior
            height: 20 + Math.random() * 25,
            width: 3 + Math.random() * 4,
            duration: 0.8 + Math.random() * 0.6,
            delay: i * 0.1 + Math.random() * 0.2,
            // Wobble intensity
            wobble: 3 + Math.random() * 5,
        }));
    }, []);

    // BRANCHING SPARKS - Small particles that branch off from flames
    const branchingSparks = useMemo(() => {
        return Array.from({ length: 16 }, (_, i) => ({
            id: i,
            startX: (Math.random() - 0.5) * 30,
            startY: -5 - Math.random() * 20,
            // Sparks drift outward and up
            driftX: (Math.random() - 0.5) * 25,
            driftY: -15 - Math.random() * 20,
            size: 1.5 + Math.random() * 2.5,
            duration: 1 + Math.random() * 1.5,
            delay: Math.random() * 2,
        }));
    }, []);

    // CORE PULSES - The beating heart effect
    const corePulses = useMemo(() => {
        return Array.from({ length: 3 }, (_, i) => ({
            id: i,
            delay: i * 0.3,
            scale: 1 + i * 0.15,
        }));
    }, []);

    // Generate unique AURA COLOR from user identity
    const userColor = useMemo(() => {
        const seed = user?.email || user?.user_id || 'guest';
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash = hash & hash;
        }

        // Role-based color selection
        const roleHues = {
            owner: 35 + (Math.abs(hash) % 15),    // Deep Gold/Orange
            admin: 340 + (Math.abs(hash) % 20),   // Rose
            member: 45 + (Math.abs(hash) % 20),   // Warm Amber
        };

        const hue = roleHues[role as keyof typeof roleHues] || roleHues.member;

        return {
            base: `hsl(${hue}, 90%, 45%)`,           // Deep base
            mid: `hsl(${hue}, 95%, 55%)`,            // Mid tone
            bright: `hsl(${hue}, 100%, 65%)`,        // Bright
            core: `hsl(${hue - 5}, 100%, 85%)`,      // Near white core
            glow: `hsla(${hue}, 100%, 60%, 0.7)`,    // Glow
            halo: role === 'owner'
                ? 'rgba(255, 180, 50, 0.6)'
                : 'rgba(255, 200, 100, 0.4)',
        };
    }, [user?.email, user?.user_id, role]);

    // Display name
    const displayName = useMemo(() => {
        if (user?.email) {
            const localPart = user.email.split('@')[0];
            return localPart.charAt(0).toUpperCase() + localPart.slice(1);
        }
        return viewMode === 'demo' ? 'Demo User' : 'User';
    }, [user?.email, viewMode]);

    if (isLoading || !user) {
        return null;
    }

    return (
        <div
            className="fixed bottom-8 left-8 z-40 pointer-events-auto"
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <motion.div
                className="relative cursor-pointer"
                style={{ width: 56, height: 80 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
            >
                {/* OUTER GLOW - Warm ambient light */}
                <motion.div
                    className="absolute"
                    style={{
                        left: -20,
                        top: 0,
                        right: -20,
                        bottom: -10,
                        background: `radial-gradient(ellipse 60% 80% at 50% 70%, ${userColor.glow}, transparent 70%)`,
                        filter: 'blur(12px)',
                    }}
                    animate={{
                        opacity: isHovered ? [0.6, 0.9, 0.7] : [0.4, 0.6, 0.4],
                        scale: isHovered ? [1, 1.15, 1.05] : [1, 1.1, 1],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* BRANCHING SPARKS - Float up and outward */}
                {branchingSparks.map(spark => (
                    <motion.div
                        key={`spark-${spark.id}`}
                        className="absolute pointer-events-none"
                        style={{
                            left: '50%',
                            bottom: '25%',
                            width: spark.size,
                            height: spark.size,
                            marginLeft: -spark.size / 2,
                            borderRadius: '50%',
                            background: userColor.bright,
                            boxShadow: `0 0 ${spark.size * 2}px ${userColor.glow}`,
                        }}
                        animate={{
                            x: [spark.startX, spark.startX + spark.driftX * 0.5, spark.startX + spark.driftX],
                            y: [spark.startY, spark.startY + spark.driftY * 0.6, spark.startY + spark.driftY],
                            opacity: [0, 0.9, 0],
                            scale: [0.5, 1, 0.2],
                        }}
                        transition={{
                            duration: spark.duration,
                            repeat: Infinity,
                            ease: 'easeOut',
                            delay: spark.delay,
                        }}
                    />
                ))}

                {/* FLAME TONGUES - Wild, licking upward */}
                {flameTongues.map(tongue => (
                    <motion.div
                        key={`tongue-${tongue.id}`}
                        className="absolute pointer-events-none"
                        style={{
                            left: '50%',
                            bottom: '20%',
                            marginLeft: tongue.offsetX - tongue.width / 2,
                            width: tongue.width,
                            height: tongue.height,
                            background: `linear-gradient(to top,
                                ${userColor.base} 0%,
                                ${userColor.mid} 30%,
                                ${userColor.bright} 60%,
                                ${userColor.core} 85%,
                                transparent 100%)`,
                            borderRadius: '50% 50% 40% 40% / 100% 100% 0% 0%',
                            filter: 'blur(1px)',
                            transformOrigin: 'bottom center',
                        }}
                        animate={{
                            scaleY: [0.7, 1.2, 0.9, 1.1, 0.7],
                            scaleX: [1, 0.8, 1.1, 0.9, 1],
                            x: [0, tongue.wobble, -tongue.wobble * 0.7, tongue.wobble * 0.5, 0],
                            rotate: [0, tongue.wobble * 0.8, -tongue.wobble * 0.6, tongue.wobble * 0.4, 0],
                            opacity: [0.7, 1, 0.85, 0.95, 0.7],
                        }}
                        transition={{
                            duration: tongue.duration,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: tongue.delay,
                        }}
                    />
                ))}

                {/* CORE BASE - The solid glowing heart */}
                <motion.div
                    className="absolute"
                    style={{
                        left: '50%',
                        bottom: '15%',
                        width: 28,
                        height: 32,
                        marginLeft: -14,
                        background: `radial-gradient(ellipse 100% 120% at 50% 80%,
                            ${userColor.core} 0%,
                            ${userColor.bright} 30%,
                            ${userColor.mid} 60%,
                            ${userColor.base} 100%)`,
                        borderRadius: '50% 50% 45% 45% / 60% 60% 40% 40%',
                        boxShadow: `
                            0 0 20px ${userColor.glow},
                            0 0 40px ${userColor.glow},
                            inset 0 -5px 15px ${userColor.base}
                        `,
                    }}
                    animate={{
                        scale: [1, 1.08, 0.95, 1.05, 1],
                        opacity: [0.9, 1, 0.92, 1, 0.9],
                    }}
                    transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />

                {/* PULSING RINGS - Heartbeat effect */}
                {corePulses.map(pulse => (
                    <motion.div
                        key={`pulse-${pulse.id}`}
                        className="absolute pointer-events-none"
                        style={{
                            left: '50%',
                            bottom: '18%',
                            width: 24,
                            height: 28,
                            marginLeft: -12,
                            border: `1px solid ${userColor.bright}`,
                            borderRadius: '50% 50% 45% 45% / 60% 60% 40% 40%',
                        }}
                        animate={{
                            scale: [1, pulse.scale + 0.3, pulse.scale + 0.5],
                            opacity: [0.6, 0.3, 0],
                        }}
                        transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            ease: 'easeOut',
                            delay: pulse.delay,
                        }}
                    />
                ))}

                {/* INNER CORE - Brightest point */}
                <motion.div
                    className="absolute"
                    style={{
                        left: '50%',
                        bottom: '28%',
                        width: 8,
                        height: 12,
                        marginLeft: -4,
                        background: `radial-gradient(ellipse at 50% 60%,
                            white 0%,
                            ${userColor.core} 40%,
                            transparent 100%)`,
                        borderRadius: '50%',
                        filter: 'blur(1px)',
                    }}
                    animate={{
                        opacity: [0.8, 1, 0.85, 1, 0.8],
                        scale: [1, 1.3, 0.9, 1.2, 1],
                    }}
                    transition={{
                        duration: 0.4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />

                {/* HALO - Subtle outer ring */}
                <motion.div
                    className="absolute pointer-events-none"
                    style={{
                        left: -4,
                        right: -4,
                        bottom: '10%',
                        height: 50,
                        border: `1px solid ${userColor.halo}`,
                        borderRadius: '50% 50% 45% 45% / 55% 55% 45% 45%',
                        boxShadow: `0 0 15px ${userColor.halo}`,
                    }}
                    animate={{
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.02, 1],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            </motion.div>

            {/* Name Label */}
            <AnimatePresence>
                {isHovered && showLabel && (
                    <motion.div
                        initial={{ opacity: 0, x: -10, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -10, scale: 0.9 }}
                        className="absolute left-full ml-4 bottom-4 whitespace-nowrap"
                    >
                        <div
                            className="bg-black/90 backdrop-blur-xl border rounded-xl px-4 py-2.5"
                            style={{
                                borderColor: `${userColor.mid}50`,
                                boxShadow: `0 0 20px ${userColor.glow}30, 0 8px 32px rgba(0,0,0,0.5)`
                            }}
                        >
                            <div className="text-sm text-white font-medium">{displayName}</div>
                            <div className="text-xs capitalize" style={{ color: userColor.bright }}>{role}</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserAvatar;
