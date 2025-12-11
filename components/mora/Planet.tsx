"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Briefcase, Users, DollarSign, TrendingUp, Code, LucideIcon, Compass } from 'lucide-react';

interface PlanetProps {
    department: {
        id: string;
        name: string;
        color?: string;
        description?: string;
    };
    position: { x: number; y: number };
    delay?: number;
    isActive?: boolean;
    size?: 'sm' | 'md' | 'lg';
    orbitActive?: boolean;
    onClick?: () => void;
    onHover?: (hovered: boolean) => void;
}

/**
 * PLANET COMPONENT — TESLA-STYLE REDESIGN
 * 
 * - Monochrome with subtle color accents
 * - Glass morphism
 * - Large, impactful presence
 * - Minimal UI, maximum clarity
 */
export const Planet: React.FC<PlanetProps> = ({
    department,
    position,
    delay = 0,
    isActive = false,
    size = 'md',
    orbitActive = false,
    onClick,
    onHover
}) => {
    // MASTERBIBEL: Smaller, more ethereal planets - floating bubbles
    const sizeMap = {
        sm: { diameter: 60, iconSize: 20 },
        md: { diameter: 75, iconSize: 24 },
        lg: { diameter: 90, iconSize: 28 }
    };

    const planetSize = sizeMap[size];

    const getDeptIcon = (name: string): LucideIcon => {
        const key = name.toLowerCase();
        if (key.includes('operation')) return Briefcase;
        if (key.includes('engineering') || key.includes('product')) return Code;
        if (key.includes('finance') || key.includes('buchhaltung')) return DollarSign;
        if (key.includes('marketing') || key.includes('brand')) return TrendingUp;
        if (key.includes('hr') || key.includes('people')) return Users;
        return Compass;
    };

    const getDeptStyle = (name: string) => {
        const key = name.toLowerCase();
        if (key.includes('engineering') || key.includes('product') || key.includes('tech') || key.includes('dev')) {
            return {
                gradient: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(34,211,238,0.05))',
                border: 'rgba(56,189,248,0.5)',
                glow: 'rgba(14,165,233,0.4)',
                iconColor: 'text-sky-400',
                activeGradient: 'linear-gradient(135deg, rgba(14,165,233,0.3), rgba(34,211,238,0.1))',
            };
        }
        if (key.includes('finance') || key.includes('accounting') || key.includes('buchhaltung')) {
            return {
                gradient: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.05))',
                border: 'rgba(251,191,36,0.5)',
                glow: 'rgba(245,158,11,0.4)',
                iconColor: 'text-amber-400',
                activeGradient: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(251,191,36,0.1))',
            };
        }
        if (key.includes('marketing') || key.includes('sales') || key.includes('brand') || key.includes('vertrieb')) {
            return {
                gradient: 'linear-gradient(135deg, rgba(217,70,239,0.2), rgba(139,92,246,0.05))',
                border: 'rgba(217,70,239,0.5)',
                glow: 'rgba(217,70,239,0.4)',
                iconColor: 'text-fuchsia-400',
                activeGradient: 'linear-gradient(135deg, rgba(217,70,239,0.3), rgba(139,92,246,0.1))',
            };
        }
        if (key.includes('hr') || key.includes('people') || key.includes('personal')) {
            return {
                gradient: 'linear-gradient(135deg, rgba(244,63,94,0.2), rgba(225,29,72,0.05))',
                border: 'rgba(244,63,94,0.5)',
                glow: 'rgba(244,63,94,0.4)',
                iconColor: 'text-rose-400',
                activeGradient: 'linear-gradient(135deg, rgba(244,63,94,0.3), rgba(225,29,72,0.1))',
            };
        }
        if (key.includes('design') || key.includes('creative')) {
            return {
                gradient: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.05))',
                border: 'rgba(139,92,246,0.5)',
                glow: 'rgba(139,92,246,0.4)',
                iconColor: 'text-violet-400',
                activeGradient: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.1))',
            };
        }
        // Default (Operations/Admin/Other) - Emerald
        return {
            gradient: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))',
            border: 'rgba(16,185,129,0.5)',
            glow: 'rgba(16,185,129,0.4)',
            iconColor: 'text-emerald-400',
            activeGradient: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(16,185,129,0.1))',
        };
    };

    const style = getDeptStyle(department.name);
    const Icon = getDeptIcon(department.name);

    return (
        <motion.div
            className="cursor-pointer group"
            style={{
                // Only apply position if provided (non-zero)
                // When parent handles positioning, position should be (0,0)
                ...(position.x !== 0 || position.y !== 0 ? {
                    position: 'absolute' as const,
                    left: position.x,
                    top: position.y,
                    transform: 'translate(-50%, -50%)'
                } : {})
            }}
            initial={{ scale: 1, opacity: 1 }} // FORCE VISIBLE - DEBUG
            animate={{
                scale: 1,
                opacity: 1,
                x: orbitActive ? [0, 8] : 0,
                y: orbitActive ? [0, -4] : 0
            }}
            transition={{
                delay,
                type: orbitActive ? 'tween' : 'spring',
                duration: orbitActive ? 2 : undefined,
                repeat: orbitActive ? Infinity : 0,
                repeatType: orbitActive ? 'reverse' : undefined,
                ease: orbitActive ? 'easeInOut' : undefined,
                stiffness: orbitActive ? undefined : 150,
                damping: orbitActive ? undefined : 20
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            onMouseEnter={() => onHover?.(true)}
            onMouseLeave={() => onHover?.(false)}
        >
            {/* Outer Glow Ring */}
            {isActive && (
                <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: `radial-gradient(circle, ${style.glow}, transparent 70%)`,
                        filter: 'blur(20px)',
                    }}
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                />
            )}

            {/* Planet Core - Unique Style */}
            <div
                className="relative rounded-full backdrop-blur-2xl border flex items-center justify-center overflow-hidden"
                style={{
                    width: planetSize.diameter,
                    height: planetSize.diameter,
                    background: isActive ? style.activeGradient : style.gradient,
                    borderColor: isActive ? style.border : 'rgba(255,255,255,0.1)',
                    boxShadow: isActive
                        ? `0 0 50px ${style.glow}, inset 0 0 40px ${style.glow}`
                        : `0 0 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.05)`
                }}
            >
                {/* Atmospheric Noise Texture */}
                <div
                    className="absolute inset-0 opacity-20 mix-blend-overlay bg-noise"
                    style={{ backgroundSize: '200px 200px' }}
                />

                {/* Rotating Cloud Layer */}
                <motion.div
                    className="absolute inset-0 rounded-full opacity-30"
                    style={{
                        background: `conic-gradient(from 0deg, transparent 0%, ${style.iconColor.replace('text-', 'bg-').replace('-400', '-200')} 20%, transparent 40%, transparent 100%)`,
                        filter: 'blur(10px)',
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                />

                {/* Glass Highlight - Top Left (3D Effect) */}
                <div
                    className="absolute top-0 left-0 w-full h-full rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 20%, transparent 100%)'
                    }}
                />

                {/* Rim Light - Bottom Right */}
                <div
                    className="absolute bottom-0 right-0 w-full h-full rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 30%, transparent 100%)'
                    }}
                />

                {/* Icon */}
                <div className="relative z-10">
                    <Icon
                        size={planetSize.iconSize}
                        className={isActive ? style.iconColor : 'text-white/70'}
                        strokeWidth={1.5}
                    />
                </div>

                {/* Active Ring */}
                {isActive && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-2"
                        style={{ borderColor: style.border }}
                        animate={{
                            scale: [1, 1.15, 1],
                            opacity: [0.6, 0.3, 0.6]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                )}
            </div>

            {/* Label - TESLA Style */}
            <motion.div
                className="absolute -bottom-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                initial={{ y: 5 }}
                animate={{ y: 0 }}
            >
                <div className="glass-panel px-4 py-2 whitespace-nowrap">
                    <div className="text-sm text-white/90 font-light tracking-wider">
                        {department.name}
                    </div>
                    {department.description && (
                        <div className="text-xs text-white/40 mt-1">
                            {department.description}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Planet;
