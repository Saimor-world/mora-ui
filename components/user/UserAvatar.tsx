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
 * USER AVATAR - Light Being Representation
 * 
 * Each user is represented as a unique colored light being.
 * In team rooms, these colors distinguish who is who.
 * 
 * Color is generated from user email/id for consistency.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({ onClick, showLabel = true }) => {
    const { user, role, isLoading } = useUser();
    const [isHovered, setIsHovered] = useState(false);
    const viewMode = useMoraStore((s) => s.viewMode);

    if (isLoading || !user) {
        return null;
    }

    // Generate unique color from user identity
    const userColor = useMemo(() => {
        const seed = user?.email || user?.user_id || 'guest';
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash = hash & hash;
        }

        // Keep hue in the emerald range with subtle variation
        const hue = 140 + (Math.abs(hash) % 12); // 140-151
        const saturation = 55;
        const lightness = 52;

        return {
            primary: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
            glow: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.55)`,
            ring: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.25)`,
            halo: 'rgba(206, 182, 118, 0.55)',
            hue
        };
    }, [user?.email, user?.user_id]);

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
            {/* Main Avatar Container */}
            <motion.div
                className="relative cursor-pointer group"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
            >
                {/* Outer Glow Ring */}
                <motion.div
                    className="absolute inset-[-8px] rounded-full"
                    style={{
                        background: `radial-gradient(circle at center, ${userColor.glow} 0%, transparent 70%)`,
                        filter: 'blur(10px)',
                    }}
                    animate={{
                        scale: isHovered ? [1, 1.12, 1] : 1,
                        opacity: isHovered ? [0.45, 0.7, 0.45] : 0.35,
                    }}
                    transition={{
                        duration: isHovered ? 2.8 : 0.4,
                        repeat: isHovered ? Infinity : 0,
                        ease: 'easeInOut'
                    }}
                />

                {/* Avatar Core - Light Being */}
                <div
                    className="relative w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
                    style={{
                        background: `
                            radial-gradient(circle at 35% 35%, ${userColor.primary} 0%, ${userColor.primary}CC 40%, rgba(3,8,6,0.35) 100%)
                        `,
                        boxShadow: `
                            inset -3px -3px 12px rgba(0,0,0,0.35),
                            inset 3px 3px 10px rgba(255,255,255,0.18),
                            0 0 26px ${userColor.glow},
                            0 6px 18px rgba(0,0,0,0.35)
                        `,
                    }}
                >
                    {/* Golden Halo */}
                    <div
                        className="absolute inset-[-8px] rounded-full"
                        style={{
                            border: `1px solid ${userColor.halo}`,
                            boxShadow: `0 0 16px ${userColor.halo}`,
                            opacity: 0.7
                        }}
                    />

                    {/* Glass Highlight */}
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: '50%',
                            height: '50%',
                            top: '10%',
                            left: '10%',
                            background: 'radial-gradient(circle at center, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                            filter: 'blur(3px)',
                        }}
                    />

                    {/* Core Spark */}
                    <div
                        className="absolute w-2.5 h-2.5 rounded-full"
                        style={{
                            background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.2) 60%, transparent 100%)',
                            boxShadow: `0 0 12px ${userColor.halo}`,
                            top: '55%',
                            left: '52%',
                            transform: 'translate(-50%, -50%)'
                        }}
                    />
                </div>

                {/* Breathing Ring */}
                <motion.div
                    className="absolute inset-[-4px] rounded-full border-2"
                    style={{ borderColor: userColor.ring }}
                    animate={{
                        scale: isHovered ? [1, 1.05, 1] : [1, 1.02, 1],
                        opacity: isHovered ? [0.35, 0.2, 0.35] : [0.25, 0.15, 0.25],
                    }}
                    transition={{
                        duration: isHovered ? 4 : 10,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                />
            </motion.div>

            {/* Name Label (on hover) */}
            <AnimatePresence>
                {isHovered && showLabel && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="absolute left-full ml-4 top-1/2 -translate-y-1/2 whitespace-nowrap"
                    >
                        <div
                            className="bg-black/80 backdrop-blur-xl border rounded-lg px-3 py-2"
                            style={{ borderColor: userColor.ring }}
                        >
                            <div className="text-sm text-white font-medium">{displayName}</div>
                            <div className="text-xs text-white/50 capitalize">{role}</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserAvatar;
