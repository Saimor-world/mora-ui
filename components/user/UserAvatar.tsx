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
 * USER AVATAR - LICHTWESEN (Light Being) with Organic Fire Effect
 *
 * MASTERBIBEL: Each user is a unique Lichtwesen (light fairy/being)
 * with personalized aura colors. The inner particles move chaotically
 * like flames trapped inside a glass sphere - organic, alive, not geometric.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({ onClick, showLabel = true }) => {
    const { user, role, isLoading } = useUser();
    const [isHovered, setIsHovered] = useState(false);
    const viewMode = useMoraStore((s) => s.viewMode);

    // Generate FIRE PARTICLES - chaotic, organic movement inside the orb
    // MUST be called before any early return!
    const fireParticles = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => ({
            id: i,
            // Random starting position inside the orb (constrained to inner area)
            startX: (Math.random() - 0.5) * 20,
            startY: (Math.random() - 0.5) * 20,
            // Particle properties
            size: 2 + Math.random() * 4,
            duration: 1.5 + Math.random() * 2,
            delay: Math.random() * 2,
            // Fire rises - particles drift upward with random horizontal wobble
            riseHeight: 8 + Math.random() * 16,
            wobble: (Math.random() - 0.5) * 12,
        }));
    }, []);

    // Outer floating sparks that escape occasionally
    const escapingSparks = useMemo(() => {
        return Array.from({ length: 4 }, (_, i) => ({
            id: i,
            angle: (i * 90 + Math.random() * 30) * (Math.PI / 180),
            distance: 32 + Math.random() * 12,
            size: 2 + Math.random() * 2,
            duration: 3 + Math.random() * 2,
            delay: i * 0.8 + Math.random(),
        }));
    }, []);

    // Generate unique AURA COLOR from user identity
    // MUST be called before any early return!
    const userColor = useMemo(() => {
        const seed = user?.email || user?.user_id || 'guest';
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash = hash & hash;
        }

        // Role-based color selection for the aura
        const roleHues = {
            owner: 42 + (Math.abs(hash) % 15),    // Gold/Amber
            admin: 340 + (Math.abs(hash) % 20),   // Rose
            member: 150 + (Math.abs(hash) % 30),  // Emerald
        };

        const hue = roleHues[role as keyof typeof roleHues] || roleHues.member;
        const saturation = 70 + (Math.abs(hash) % 15);
        const lightness = 55 + (Math.abs(hash) % 10);

        return {
            primary: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
            bright: `hsl(${hue}, ${saturation + 10}%, ${lightness + 15}%)`,
            glow: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.6)`,
            ring: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.3)`,
            core: `hsl(${hue}, ${saturation - 20}%, ${lightness + 25}%)`, // Bright core
            halo: role === 'owner'
                ? 'rgba(212, 175, 55, 0.7)'
                : 'rgba(16, 185, 129, 0.5)',
            hue
        };
    }, [user?.email, user?.user_id, role]);

    // Display name - derive from email
    // MUST be called before any early return!
    const displayName = useMemo(() => {
        if (user?.email) {
            const localPart = user.email.split('@')[0];
            return localPart.charAt(0).toUpperCase() + localPart.slice(1);
        }
        return viewMode === 'demo' ? 'Demo User' : 'User';
    }, [user?.email, viewMode]);

    // NOW we can do early return after all hooks are called
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
            {/* LICHTWESEN Container */}
            <motion.div
                className="relative cursor-pointer group"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
            >
                {/* OUTER AURA - Soft breathing glow */}
                <motion.div
                    className="absolute inset-[-20px] rounded-full"
                    style={{
                        background: `radial-gradient(circle, ${userColor.glow} 0%, transparent 70%)`,
                        filter: 'blur(16px)',
                    }}
                    animate={{
                        scale: isHovered ? [1, 1.3, 1.15, 1.35, 1] : [1, 1.15, 1.08, 1.2, 1],
                        opacity: isHovered ? [0.5, 0.8, 0.6, 0.85, 0.5] : [0.3, 0.5, 0.4, 0.55, 0.3],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                />

                {/* ESCAPING SPARKS - Occasional particles that drift outward */}
                {escapingSparks.map(spark => (
                    <motion.div
                        key={`spark-${spark.id}`}
                        className="absolute pointer-events-none"
                        style={{
                            left: '50%',
                            top: '50%',
                            width: spark.size,
                            height: spark.size,
                            marginLeft: -spark.size / 2,
                            marginTop: -spark.size / 2,
                            borderRadius: '50%',
                            background: userColor.bright,
                            boxShadow: `0 0 ${spark.size * 3}px ${userColor.glow}`,
                        }}
                        animate={{
                            x: [0, Math.cos(spark.angle) * spark.distance * 0.5, Math.cos(spark.angle) * spark.distance],
                            y: [0, Math.sin(spark.angle) * spark.distance * 0.5 - 8, Math.sin(spark.angle) * spark.distance - 12],
                            opacity: [0, 0.9, 0],
                            scale: [0.5, 1, 0.3],
                        }}
                        transition={{
                            duration: spark.duration,
                            repeat: Infinity,
                            ease: 'easeOut',
                            delay: spark.delay,
                        }}
                    />
                ))}

                {/* MAIN ORB - Wild organic flame-like shape containing fire */}
                <motion.div
                    className="relative w-14 h-20 flex items-center justify-center overflow-hidden"
                    style={{
                        background: `
                            radial-gradient(ellipse 80% 100% at 50% 60%, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%),
                            radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12) 0%, transparent 50%)
                        `,
                        boxShadow: `
                            inset 0 0 25px rgba(0,0,0,0.4),
                            inset 2px 2px 10px rgba(255,255,255,0.08),
                            0 0 35px ${userColor.glow},
                            0 0 60px ${userColor.glow}25,
                            0 6px 20px rgba(0,0,0,0.5)
                        `,
                        border: `1px solid ${userColor.ring}`,
                    }}
                    animate={{
                        // WILD flame-like shape - spiky top, round bottom
                        borderRadius: [
                            '50% 50% 55% 45% / 30% 30% 60% 60%',  // Pointy top
                            '45% 55% 50% 50% / 35% 25% 55% 65%',  // Lean right
                            '55% 45% 45% 55% / 25% 35% 65% 55%',  // Lean left
                            '48% 52% 52% 48% / 32% 28% 58% 62%',  // Wobble
                            '50% 50% 55% 45% / 30% 30% 60% 60%',  // Back to pointy
                        ],
                        scaleX: [1, 0.95, 1.05, 0.97, 1],
                        scaleY: [1, 1.03, 0.98, 1.02, 1],
                    }}
                    transition={{
                        duration: 3,  // Faster morphing
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    {/* FIRE PARTICLES - Chaotic flames inside the orb */}
                    {fireParticles.map(particle => (
                        <motion.div
                            key={`fire-${particle.id}`}
                            className="absolute pointer-events-none"
                            style={{
                                width: particle.size,
                                height: particle.size * 1.5, // Flames are taller than wide
                                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', // Teardrop shape
                                background: `linear-gradient(to top, ${userColor.primary}, ${userColor.bright}, ${userColor.core})`,
                                filter: 'blur(0.5px)',
                                boxShadow: `0 0 ${particle.size * 2}px ${userColor.glow}`,
                            }}
                            animate={{
                                // Fire rises and wobbles chaotically
                                x: [
                                    particle.startX,
                                    particle.startX + particle.wobble * 0.5,
                                    particle.startX - particle.wobble * 0.3,
                                    particle.startX + particle.wobble,
                                    particle.startX
                                ],
                                y: [
                                    particle.startY + 5,
                                    particle.startY - particle.riseHeight * 0.3,
                                    particle.startY - particle.riseHeight * 0.6,
                                    particle.startY - particle.riseHeight,
                                    particle.startY + 5
                                ],
                                opacity: [0, 0.9, 0.95, 0.7, 0],
                                scale: [0.3, 1, 1.1, 0.8, 0.2],
                                rotate: [0, -15, 10, -20, 0],
                            }}
                            transition={{
                                duration: particle.duration,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: particle.delay,
                            }}
                        />
                    ))}

                    {/* CENTRAL FLAME CORE - The brightest point */}
                    <motion.div
                        className="absolute"
                        style={{
                            width: 10,
                            height: 14,
                            bottom: '30%',
                            left: '50%',
                            marginLeft: -5,
                            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                            background: `linear-gradient(to top, ${userColor.primary}, ${userColor.core}, white)`,
                            boxShadow: `0 0 20px ${userColor.bright}, 0 0 40px ${userColor.glow}`,
                            filter: 'blur(1px)',
                        }}
                        animate={{
                            scaleX: [1, 1.2, 0.9, 1.15, 1],
                            scaleY: [1, 1.3, 1.1, 1.25, 1],
                            x: [-1, 2, -2, 1, -1],
                            opacity: [0.9, 1, 0.85, 1, 0.9],
                        }}
                        transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />

                    {/* GLASS HIGHLIGHT - Top reflection */}
                    <div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            width: '45%',
                            height: '25%',
                            top: '8%',
                            left: '15%',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 100%)',
                            borderRadius: '50%',
                            filter: 'blur(1px)',
                        }}
                    />
                </motion.div>

                {/* HALO RING - Wild organic ring that follows the flame shape */}
                <motion.div
                    className="absolute pointer-events-none"
                    style={{
                        left: -6,
                        right: -6,
                        top: -4,
                        bottom: -8,
                        border: `1px solid ${userColor.halo}`,
                        boxShadow: `0 0 15px ${userColor.halo}`,
                    }}
                    animate={{
                        opacity: [0.4, 0.7, 0.4],
                        scale: [1, 1.04, 1],
                        // Match the wild flame shape
                        borderRadius: [
                            '50% 50% 55% 45% / 35% 35% 55% 55%',
                            '45% 55% 50% 50% / 40% 30% 50% 60%',
                            '55% 45% 45% 55% / 30% 40% 60% 50%',
                            '48% 52% 52% 48% / 37% 33% 53% 57%',
                            '50% 50% 55% 45% / 35% 35% 55% 55%',
                        ],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                />
            </motion.div>

            {/* Name Label (on hover) */}
            <AnimatePresence>
                {isHovered && showLabel && (
                    <motion.div
                        initial={{ opacity: 0, x: -10, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -10, scale: 0.9 }}
                        className="absolute left-full ml-4 top-1/2 -translate-y-1/2 whitespace-nowrap"
                    >
                        <div
                            className="bg-black/85 backdrop-blur-xl border rounded-xl px-4 py-2.5"
                            style={{
                                borderColor: userColor.ring,
                                boxShadow: `0 0 20px ${userColor.glow}30, 0 8px 32px rgba(0,0,0,0.4)`
                            }}
                        >
                            <div className="text-sm text-white font-medium">{displayName}</div>
                            <div className="text-xs capitalize" style={{ color: userColor.primary }}>{role}</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserAvatar;
