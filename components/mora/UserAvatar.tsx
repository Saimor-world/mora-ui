"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface UserAvatarProps {
    role?: string;
    size?: number;
    showAura?: boolean;
    name?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
    role = 'member',
    size = 40,
    showAura = true,
    name
}) => {
    // Colors based on role
    const getColors = () => {
        switch (role) {
            case 'owner': return { core: '#ceb676', glow: 'rgba(206, 182, 118, 0.6)' }; // Gold
            case 'admin': return { core: '#f43f5e', glow: 'rgba(244, 63, 94, 0.6)' }; // Rose
            case 'member': return { core: '#10b981', glow: 'rgba(16, 185, 129, 0.6)' }; // Emerald
            default: return { core: '#3b82f6', glow: 'rgba(59, 130, 246, 0.6)' }; // Blue
        }
    };

    const colors = getColors();
    const halfSize = size / 2;

    return (
        <div
            className="relative flex items-center justify-center cursor-pointer group"
            style={{ width: size, height: size }}
            title={name || role}
        >
            {/* Aura Ring */}
            {showAura && (
                <motion.div
                    className="absolute inset-0 rounded-full blur-[2px]"
                    style={{
                        border: `1px solid ${colors.glow}`,
                        boxShadow: `0 0 10px ${colors.glow}`
                    }}
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 0.8, 0.5],
                        rotate: [0, 90, 180]
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />
            )}

            {/* Quantum Spark (CSS 3D Crystal) */}
            <div className="relative w-1/2 h-1/2" style={{ perspective: '200px' }}>
                <motion.div
                    className="w-full h-full relative preserve-3d"
                    style={{ transformStyle: 'preserve-3d' }}
                    animate={{
                        rotateY: [0, 360],
                        rotateX: [10, 30, 10]
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                >
                    {/* Diamond Shape using borders */}
                    {/* We simulate a crystal with a rotated square and gradients */}
                    <div
                        className="absolute inset-0 rotate-45"
                        style={{
                            background: `linear-gradient(135deg, ${colors.core}, transparent)`,
                            border: `1px solid ${colors.core}`,
                            boxShadow: `0 0 5px ${colors.glow}`,
                            opacity: 0.8
                        }}
                    />
                    <div
                        className="absolute inset-0 rotate-45 scale-75"
                        style={{
                            border: `1px solid ${colors.core}`,
                            opacity: 0.5
                        }}
                    />

                    {/* Inner Spark */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1 h-1 bg-white rounded-full blur-[1px]" />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
