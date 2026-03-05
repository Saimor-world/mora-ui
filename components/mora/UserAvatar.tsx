"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface UserAvatarProps {
    role?: string;
    size?: number;
    showAura?: boolean;
    name?: string;
    imageUrl?: string;
}

/**
 * MASTERBIBEL UserAvatar
 *
 * Clean, minimal avatar with subtle role-based accent ring.
 * - Simple circular design
 * - Thin accent ring (not chunky)
 * - Optional profile image or initials
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
    role = 'member',
    size = 40,
    showAura = false,
    name,
    imageUrl
}) => {
    // Subtle colors based on role
    const getColors = () => {
        switch (role) {
            case 'owner':
            case 'system_owner':
                return { core: '#d4af37', glow: 'rgba(212, 175, 55, 0.4)', ring: 'rgba(212, 175, 55, 0.6)' }; // Subtle gold
            case 'admin':
                return { core: '#10b981', glow: 'rgba(16, 185, 129, 0.3)', ring: 'rgba(16, 185, 129, 0.5)' }; // Emerald
            case 'member':
                return { core: '#06b6d4', glow: 'rgba(6, 182, 212, 0.3)', ring: 'rgba(6, 182, 212, 0.5)' }; // Cyan
            default:
                return { core: '#10b981', glow: 'rgba(16, 185, 129, 0.3)', ring: 'rgba(16, 185, 129, 0.5)' }; // Emerald default
        }
    };

    const colors = getColors();
    const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';

    return (
        <div
            className="relative flex items-center justify-center cursor-pointer group"
            style={{ width: size, height: size }}
            title={name || role}
        >
            {/* Subtle Aura (optional, very subtle) */}
            {showAura && (
                <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        width: size + 12,
                        height: size + 12,
                        background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
                        animation: 'avatarAura 4s ease-in-out infinite'
                    }}
                />
            )}

            {/* Outer Ring - Thin and elegant */}
            <div
                className="absolute rounded-full"
                style={{
                    width: size,
                    height: size,
                    border: `1.5px solid ${colors.ring}`,
                    boxShadow: `0 0 8px ${colors.glow}`
                }}
            />

            {/* Avatar Circle */}
            <div
                className="rounded-full overflow-hidden flex items-center justify-center"
                style={{
                    width: size - 6,
                    height: size - 6,
                    background: imageUrl ? 'transparent' : 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={name || 'User'}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span
                        className="text-white/80 font-medium"
                        style={{ fontSize: size * 0.35 }}
                    >
                        {initials}
                    </span>
                )}
            </div>

            {/* Online indicator (small dot) */}
            <div
                className="absolute rounded-full"
                style={{
                    width: size * 0.2,
                    height: size * 0.2,
                    bottom: 0,
                    right: 0,
                    backgroundColor: colors.core,
                    border: '1.5px solid rgba(0, 0, 0, 0.8)',
                    boxShadow: `0 0 6px ${colors.core}`,
                    animation: 'onlinePulse 2s ease-in-out infinite'
                }}
            />
        </div>
    );
};
