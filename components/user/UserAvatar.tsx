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
 * USER AVATAR - LICHTWESEN (Light Being) with Aura Colors
 *
 * MASTERBIBEL: Each user is a unique Lichtwesen (light fairy/being)
 * with personalized aura colors. Not a traditional avatar, but a
 * floating, glowing entity that represents the user's presence.
 *
 * Features:
 * - Floating light particles orbiting the core
 * - Multi-layer aura with breathing animation
 * - Role-based accent colors (gold for owner, emerald for member)
 * - Organic, non-circular shape using blur and gradients
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({ onClick, showLabel = true }) => {
    const { user, role, isLoading } = useUser();
    const [isHovered, setIsHovered] = useState(false);
    const viewMode = useMoraStore((s) => s.viewMode);

    // Generate floating particles for the Lichtwesen
    const floatingParticles = useMemo(() => {
        return Array.from({ length: 6 }, (_, i) => ({
            id: i,
            angle: (i * 60) * (Math.PI / 180),
            radius: 28 + (i % 2) * 8,
            size: 3 + (i % 3),
            duration: 6 + (i % 3) * 2,
            delay: i * 0.4
        }));
    }, []);

    if (isLoading || !user) {
        return null;
    }

    // Generate unique AURA COLOR from user identity
    const userColor = useMemo(() => {
        const seed = user?.email || user?.user_id || 'guest';
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash = hash & hash;
        }

        // Role-based color selection for the aura
        // Owner: Gold/Amber, Admin: Rose/Pink, Member: Emerald/Cyan
        const roleHues = {
            owner: 42 + (Math.abs(hash) % 15),    // Gold range: 42-56
            admin: 340 + (Math.abs(hash) % 20),   // Rose range: 340-360
            member: 150 + (Math.abs(hash) % 30),  // Emerald/Cyan: 150-180
        };

        const hue = roleHues[role as keyof typeof roleHues] || roleHues.member;
        const saturation = 65 + (Math.abs(hash) % 15);
        const lightness = 55 + (Math.abs(hash) % 10);

        return {
            primary: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
            glow: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.6)`,
            ring: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.3)`,
            secondary: `hsl(${(hue + 30) % 360}, ${saturation - 10}%, ${lightness + 10}%)`,
            halo: role === 'owner'
                ? 'rgba(212, 175, 55, 0.7)'  // Gold for owners
                : 'rgba(16, 185, 129, 0.5)', // Emerald for others
            hue
        };
    }, [user?.email, user?.user_id, role]);

    // Display name - derive from email
    const displayName = useMemo(() => {
        if (user?.email) {
            const localPart = user.email.split('@')[0];
            // Capitalize first letter
            return localPart.charAt(0).toUpperCase() + localPart.slice(1);
        }
        return viewMode === 'demo' ? 'Demo User' : 'User';
    }, [user, viewMode]);



    return (
        <div
            className="fixed bottom-6 left-6 z-40 pointer-events-auto"
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* LICHTWESEN Container */}
            <motion.div
                className="relative cursor-pointer group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {/* ORBITING LIGHT PARTICLES - Floating around the Lichtwesen */}
                {floatingParticles.map(particle => (
                    <motion.div
                        key={`particle-${particle.id}`}
                        className="absolute pointer-events-none"
                        style={{
                            left: '50%',
                            top: '50%',
                            width: particle.size,
                            height: particle.size,
                            marginLeft: -particle.size / 2,
                            marginTop: -particle.size / 2,
                        }}
                        animate={{
                            x: [
                                Math.cos(particle.angle) * particle.radius,
                                Math.cos(particle.angle + Math.PI * 0.5) * particle.radius,
                                Math.cos(particle.angle + Math.PI) * particle.radius,
                                Math.cos(particle.angle + Math.PI * 1.5) * particle.radius,
                                Math.cos(particle.angle + Math.PI * 2) * particle.radius
                            ],
                            y: [
                                Math.sin(particle.angle) * particle.radius,
                                Math.sin(particle.angle + Math.PI * 0.5) * particle.radius,
                                Math.sin(particle.angle + Math.PI) * particle.radius,
                                Math.sin(particle.angle + Math.PI * 1.5) * particle.radius,
                                Math.sin(particle.angle + Math.PI * 2) * particle.radius
                            ],
                            opacity: [0.4, 0.9, 0.4],
                            scale: [0.8, 1.3, 0.8]
                        }}
                        transition={{
                            duration: particle.duration,
                            repeat: Infinity,
                            ease: "linear",
                            delay: particle.delay
                        }}
                    >
                        <div
                            className="w-full h-full rounded-full"
                            style={{
                                background: `radial-gradient(circle, ${userColor.secondary} 0%, ${userColor.primary}00 70%)`,
                                boxShadow: `0 0 ${particle.size * 4}px ${userColor.glow}`
                            }}
                        />
                    </motion.div>
                ))}

                {/* MULTI-LAYER AURA - Organic breathing effect */}
                <motion.div
                    className="absolute inset-[-16px] rounded-full"
                    style={{
                        background: `
                            radial-gradient(circle at 30% 30%, ${userColor.glow} 0%, transparent 50%),
                            radial-gradient(circle at 70% 70%, ${userColor.secondary}40 0%, transparent 50%)
                        `,
                        filter: 'blur(14px)',
                    }}
                    animate={{
                        scale: [1, 1.15, 1.05, 1.2, 1],
                        opacity: [0.4, 0.65, 0.5, 0.7, 0.4],
                        rotate: [0, 45, 90, 135, 180]
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                />

                {/* SECONDARY AURA LAYER - Offset for depth */}
                <motion.div
                    className="absolute inset-[-10px] rounded-full"
                    style={{
                        background: `radial-gradient(ellipse at 60% 40%, ${userColor.halo} 0%, transparent 60%)`,
                        filter: 'blur(8px)',
                    }}
                    animate={{
                        scale: isHovered ? [1, 1.2, 1] : [1, 1.08, 1],
                        opacity: isHovered ? [0.5, 0.8, 0.5] : [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                />

                {/* LICHTWESEN CORE - Organic, glowing center */}
                <div
                    className="relative w-14 h-14 rounded-full flex items-center justify-center overflow-visible"
                    style={{
                        background: `
                            radial-gradient(circle at 30% 30%, ${userColor.primary} 0%, ${userColor.primary}99 35%, rgba(3,8,6,0.6) 100%)
                        `,
                        boxShadow: `
                            inset -4px -4px 16px rgba(0,0,0,0.4),
                            inset 4px 4px 12px rgba(255,255,255,0.25),
                            0 0 35px ${userColor.glow},
                            0 0 60px ${userColor.glow}40,
                            0 8px 24px rgba(0,0,0,0.4)
                        `,
                    }}
                >
                    {/* GOLDEN HALO RING - Role indicator */}
                    <motion.div
                        className="absolute inset-[-12px] rounded-full"
                        style={{
                            border: `2px solid ${userColor.halo}`,
                            boxShadow: `0 0 20px ${userColor.halo}, inset 0 0 10px ${userColor.halo}40`,
                        }}
                        animate={{
                            opacity: [0.6, 0.9, 0.6],
                            scale: [1, 1.02, 1]
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        }}
                    />

                    {/* INNER LIGHT - Glass highlight */}
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: '55%',
                            height: '55%',
                            top: '8%',
                            left: '8%',
                            background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 40%, transparent 70%)',
                            filter: 'blur(2px)',
                        }}
                    />

                    {/* CORE SPARK - The soul */}
                    <motion.div
                        className="absolute w-3 h-3 rounded-full"
                        style={{
                            background: `radial-gradient(circle, rgba(255,255,255,1) 0%, ${userColor.primary} 40%, transparent 100%)`,
                            boxShadow: `0 0 16px ${userColor.halo}, 0 0 30px ${userColor.primary}`,
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)'
                        }}
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.8, 1, 0.8]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        }}
                    />
                </div>

                {/* OUTER BREATHING RING */}
                <motion.div
                    className="absolute inset-[-6px] rounded-full"
                    style={{
                        border: `1px solid ${userColor.ring}`,
                        boxShadow: `0 0 8px ${userColor.ring}`
                    }}
                    animate={{
                        scale: [1, 1.08, 1],
                        opacity: [0.3, 0.15, 0.3],
                    }}
                    transition={{
                        duration: 6,
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
