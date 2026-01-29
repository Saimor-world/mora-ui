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

    // Generate INNER MOTES - gentle, organic movement inside the orb
    // MUST be called before any early return!
    const fireParticles = useMemo(() => {
        return Array.from({ length: 8 }, (_, i) => ({
            id: i,
            // Random starting position inside the orb (constrained to inner area)
            startX: (Math.random() - 0.5) * 20,
            startY: (Math.random() - 0.5) * 20,
            // Particle properties
            size: 2 + Math.random() * 3,
            duration: 3 + Math.random() * 2,
            delay: Math.random() * 2,
            // Gentle drift, no harsh flames
            drift: 6 + Math.random() * 10,
            wobble: (Math.random() - 0.5) * 8,
        }));
    }, []);

    const innerOrbs = useMemo(() => {
        return Array.from({ length: 3 }, (_, i) => ({
            id: i,
            size: 6 + Math.random() * 6,
            startX: (Math.random() - 0.5) * 14,
            startY: (Math.random() - 0.5) * 14,
            drift: 4 + Math.random() * 6,
            duration: 6 + Math.random() * 4,
            delay: i * 0.8,
        }));
    }, []);

    // Outer floating sparks that escape occasionally
    const escapingSparks = useMemo(() => {
        return Array.from({ length: 3 }, (_, i) => ({
            id: i,
            angle: (i * 90 + Math.random() * 30) * (Math.PI / 180),
            distance: 22 + Math.random() * 10,
            size: 2 + Math.random() * 2,
            duration: 4 + Math.random() * 2,
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

                {/* MAIN ORB - Soft organic shape containing inner light */}
                <motion.div
                    className="relative w-14 h-14 flex items-center justify-center overflow-hidden"
                    style={{
                        background: `
                            radial-gradient(circle at 50% 55%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%),
                            radial-gradient(circle at 35% 30%, rgba(255,255,255,0.15) 0%, transparent 55%)
                        `,
                        boxShadow: `
                            inset 0 0 22px rgba(0,0,0,0.4),
                            inset 2px 2px 8px rgba(255,255,255,0.1),
                            0 0 32px ${userColor.glow},
                            0 0 55px ${userColor.glow}22,
                            0 6px 18px rgba(0,0,0,0.45)
                        `,
                        border: `1px solid ${userColor.ring}`,
                    }}
                    animate={{
                        // Soft, friendly organic shape (not spiky)
                        borderRadius: [
                            '58% 42% 55% 45% / 55% 50% 50% 45%',
                            '45% 55% 50% 50% / 48% 55% 45% 52%',
                            '52% 48% 46% 54% / 58% 45% 55% 42%',
                            '55% 45% 58% 42% / 50% 52% 48% 55%',
                            '58% 42% 55% 45% / 55% 50% 50% 45%',
                        ],
                        scaleX: [1, 0.98, 1.02, 0.99, 1],
                        scaleY: [1, 1.02, 0.99, 1.01, 1],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    {/* INNER ORBS - Soft floating spheres */}
                    {innerOrbs.map(orb => (
                        <motion.div
                            key={`inner-orb-${orb.id}`}
                            className="absolute rounded-full pointer-events-none"
                            style={{
                                width: orb.size,
                                height: orb.size,
                                left: '50%',
                                top: '50%',
                                marginLeft: -orb.size / 2,
                                marginTop: -orb.size / 2,
                                background: `radial-gradient(circle, ${userColor.bright} 0%, ${userColor.primary}80 60%, transparent 100%)`,
                                filter: 'blur(0.6px)',
                                boxShadow: `0 0 ${orb.size * 2}px ${userColor.glow}`,
                            }}
                            animate={{
                                x: [orb.startX, orb.startX + orb.drift, orb.startX - orb.drift * 0.6, orb.startX],
                                y: [orb.startY, orb.startY - orb.drift * 0.6, orb.startY + orb.drift * 0.4, orb.startY],
                                opacity: [0.4, 0.8, 0.5, 0.4],
                                scale: [0.9, 1.05, 0.95, 0.9],
                            }}
                            transition={{
                                duration: orb.duration,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: orb.delay,
                            }}
                        />
                    ))}

                    {/* FACE GLINTS - subtle "eyes" hint for friendly vibe */}
                    {[
                        { id: 'left', x: -6.5, y: -2 },
                        { id: 'right', x: 6.5, y: -2 }
                    ].map(glint => (
                        <motion.div
                            key={`face-glint-${glint.id}`}
                            className="absolute rounded-full pointer-events-none"
                            style={{
                                width: 3.8,
                                height: 3.8,
                                left: '50%',
                                top: '50%',
                                marginLeft: glint.x - 1.9,
                                marginTop: glint.y - 1.9,
                                background: 'rgba(255,255,255,0.7)',
                                boxShadow: '0 0 8px rgba(255,255,255,0.35)'
                            }}
                            animate={{
                                scaleY: [1, 0.6, 1],
                                opacity: [0.55, 0.9, 0.65]
                            }}
                            transition={{
                                duration: 5,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: glint.id === 'left' ? 0.2 : 0.4
                            }}
                        />
                    ))}

                    {/* CHEEK BLUSH - soft warmth for a friendly face */}
                    {[
                        { id: 'left', x: -9, y: 2 },
                        { id: 'right', x: 9, y: 2 }
                    ].map(blush => (
                        <motion.div
                            key={`face-blush-${blush.id}`}
                            className="absolute rounded-full pointer-events-none"
                            style={{
                                width: 6,
                                height: 4.5,
                                left: '50%',
                                top: '50%',
                                marginLeft: blush.x - 3,
                                marginTop: blush.y - 2.2,
                                background: `radial-gradient(circle, ${userColor.bright}55 0%, transparent 70%)`,
                                filter: 'blur(1.5px)'
                            }}
                            animate={{ opacity: [0.2, 0.45, 0.2] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    ))}

                    {/* MOUTH - tiny curved smile */}
                    <motion.div
                        className="absolute pointer-events-none"
                        style={{
                            left: '50%',
                            top: '50%',
                            width: 10,
                            height: 6,
                            marginLeft: -5,
                            marginTop: 4,
                            borderBottom: '1.5px solid rgba(255,255,255,0.35)',
                            borderRadius: '0 0 10px 10px'
                        }}
                        animate={{ opacity: [0.25, 0.5, 0.25] }}
                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    />

                    {/* INNER MOTES - Gentle drifting particles */}
                    {fireParticles.map(particle => (
                        <motion.div
                            key={`fire-${particle.id}`}
                            className="absolute pointer-events-none"
                            style={{
                                width: particle.size,
                                height: particle.size,
                                borderRadius: '50%',
                                background: `radial-gradient(circle, ${userColor.primary} 0%, ${userColor.bright}80 60%, transparent 100%)`,
                                filter: 'blur(0.8px)',
                                boxShadow: `0 0 ${particle.size * 2}px ${userColor.glow}`,
                            }}
                            animate={{
                                x: [
                                    particle.startX,
                                    particle.startX + particle.wobble,
                                    particle.startX - particle.wobble * 0.6,
                                    particle.startX
                                ],
                                y: [
                                    particle.startY,
                                    particle.startY - particle.drift * 0.5,
                                    particle.startY + particle.drift * 0.4,
                                    particle.startY
                                ],
                                opacity: [0.2, 0.6, 0.4, 0.2],
                                scale: [0.7, 1, 0.85, 0.7],
                            }}
                            transition={{
                                duration: particle.duration,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: particle.delay,
                            }}
                        />
                    ))}

                    {/* SOFT CORE - Friendly inner glow */}
                    <motion.div
                        className="absolute"
                        style={{
                            width: 14,
                            height: 14,
                            left: '50%',
                            top: '50%',
                            marginLeft: -7,
                            marginTop: -7,
                            borderRadius: '50%',
                            background: `radial-gradient(circle, ${userColor.core} 0%, ${userColor.primary}90 55%, transparent 100%)`,
                            boxShadow: `0 0 18px ${userColor.bright}, 0 0 30px ${userColor.glow}`,
                            filter: 'blur(0.6px)',
                        }}
                        animate={{
                            scale: [0.9, 1.08, 0.95, 1.05, 0.9],
                            opacity: [0.6, 0.9, 0.7, 0.85, 0.6],
                        }}
                        transition={{
                            duration: 3,
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

                {/* HALO RING - Soft organic ring that follows the shape */}
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
                        // Match the soft blob shape
                        borderRadius: [
                            '58% 42% 55% 45% / 55% 50% 50% 45%',
                            '45% 55% 50% 50% / 48% 55% 45% 52%',
                            '52% 48% 46% 54% / 58% 45% 55% 42%',
                            '55% 45% 58% 42% / 50% 52% 48% 55%',
                            '58% 42% 55% 45% / 55% 50% 50% 45%',
                        ],
                    }}
                    transition={{
                        duration: 4,
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
