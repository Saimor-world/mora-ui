"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Briefcase, Users, DollarSign, TrendingUp, Code, LucideIcon, Compass, Folder, ArrowRight, Activity, Database } from 'lucide-react';

interface PlanetProps {
    department: {
        id: string;
        name: string;
        color?: string | null;
        description?: string;
    };
    iconOverride?: LucideIcon;
    position: { x: number; y: number };
    delay?: number;
    isActive?: boolean;
    size?: 'sm' | 'md' | 'lg';
    orbitActive?: boolean;
    onClick?: () => void;
    onHover?: (hovered: boolean) => void;
    health?: number;
    activity?: number;
    capacity?: number; // V10: Knowledge Capacity / Storage Use
}

export const Planet: React.FC<PlanetProps> = ({
    department,
    position,
    delay = 0,
    isActive = false,
    size = 'md',
    orbitActive = false,
    onClick,
    onHover,
    health = 98,
    activity = 42,
    capacity = 65, // Default capacity
    iconOverride
}) => {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);
    const contextRef = useRef<HTMLDivElement>(null);

    const sizeMap = {
        sm: { diameter: 60, iconSize: 20 },
        md: { diameter: 74, iconSize: 24 },
        lg: { diameter: 90, iconSize: 28 }
    };

    const planetSize = sizeMap[size];

    const getDeptStyle = (name: string, customColor?: string | null) => {
        const lowerName = name.toLowerCase();

        // 1. Establish Semantic Defaults (Icon + Color)
        let style = { glow: '#64748B', border: '#94A3B8', core: '#475569', icon: Compass }; // Fallback Slate

        if (lowerName.includes('finance') || lowerName.includes('finanz') || lowerName.includes('growth'))
            style = { glow: '#F59E0B', border: '#FBBF24', core: '#D97706', icon: DollarSign }; // Gold

        else if (lowerName.includes('hr') || lowerName.includes('human') || lowerName.includes('culture') || lowerName.includes('people'))
            style = { glow: '#EC4899', border: '#F472B6', core: '#DB2777', icon: Users }; // Pink

        else if (lowerName.includes('tech') || lowerName.includes('it ') || lowerName.includes('dev') || lowerName.includes('ai') || lowerName.includes('code'))
            style = { glow: '#06B6D4', border: '#22D3EE', core: '#0891B2', icon: Code }; // Cyan

        else if (lowerName.includes('sales') || lowerName.includes('store') || lowerName.includes('shop') || lowerName.includes('retail') || lowerName.includes('commerce'))
            style = { glow: '#F97316', border: '#FB923C', core: '#EA580C', icon: ArrowRight }; // Orange

        else if (lowerName.includes('marketing') || lowerName.includes('brand') || lowerName.includes('pr') || lowerName.includes('media'))
            style = { glow: '#8B5CF6', border: '#A78BFA', core: '#7C3AED', icon: TrendingUp }; // Violet

        else if (lowerName.includes('management') || lowerName.includes('legal') || lowerName.includes('admin') || lowerName.includes('strategy') || lowerName.includes('hq'))
            style = { glow: '#10B981', border: '#34D399', core: '#059669', icon: Briefcase }; // Emerald

        else if (lowerName.includes('ops') || lowerName.includes('logis') || lowerName.includes('supply') || lowerName.includes('infrastructure'))
            style = { glow: '#6366F1', border: '#818CF8', core: '#4F46E5', icon: Activity }; // Indigo

        // 2. Apply Custom Color Override (from DB) if present
        if (customColor) {
            return {
                ...style, // Preserve Semantic Icon
                glow: customColor,
                border: `${customColor}80`,
                core: customColor
            };
        }

        return style;
    };

    const style = getDeptStyle(department.name, department.color);
    const Icon = iconOverride || style.icon;

    return (
        <motion.div
            className="absolute cursor-pointer group pointer-events-auto"
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -50%)',
            }}
            onMouseEnter={() => {
                setIsHovered(true);
                onHover?.(true);
            }}
            onMouseLeave={() => {
                setIsHovered(false);
                onHover?.(false);
            }}
            onClick={onClick}
        >
            {/* ═ V10 FUNCTIONAL RINGS (Health & Capacity) ═ */}
            <div className="absolute inset-[-40px] pointer-events-none flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    {/* 1. CAPACITY RING (Equator-Tight V10.6) */}
                    <motion.circle
                        cx="50"
                        cy="50"
                        r="34"
                        fill="none"
                        stroke={style.glow}
                        strokeWidth="2.5"
                        strokeDasharray="213"
                        strokeDashoffset={213 - (213 * (capacity / 100))}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                        initial={{ opacity: 0.1 }}
                        animate={{
                            opacity: (isActive || isHovered) ? 1 : 0.6,
                            strokeWidth: isHovered ? 4 : 2.5
                        }}
                    />

                    {/* 2. ACTIVITY PULSE (Neural Ripple) */}
                    <motion.circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={style.glow}
                        strokeWidth="0.8"
                        strokeDasharray="2 8"
                        opacity="0.4"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    />

                    {/* 3. CINEMATIC LABEL CONNECTOR */}
                    <AnimatePresence>
                        {(isHovered || isActive) && (
                            <motion.path
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                exit={{ pathLength: 0, opacity: 0 }}
                                d="M 84 50 L 92 50"
                                stroke="white"
                                strokeWidth="0.5"
                                opacity="0.6"
                            />
                        )}
                    </AnimatePresence>
                </svg>
            </div>

            {/* 0. ATMOSPHERIC HALO (Contrast Booster) */}
            <motion.div
                className="absolute inset-[-20%] rounded-full blur-[25px] z-[-1]"
                style={{
                    background: `radial-gradient(circle, ${style.glow} 0%, transparent 70%)`,
                }}
                animate={{
                    opacity: isActive ? 0.3 : isHovered ? 0.2 : 0.08,
                    scale: isHovered ? 1.1 : 1
                }}
            />

            {/* ═ THE PLANET SPHERE (V11 Ultra-Clean Glass) ═ */}
            <motion.div
                className="relative rounded-full flex items-center justify-center overflow-hidden backdrop-blur-[6px]"
                style={{
                    width: planetSize.diameter,
                    height: planetSize.diameter,
                    background: `radial-gradient(150% 150% at 30% 30%, rgba(255,255,255,0.05) 0%, ${style.glow}08 50%, rgba(0,0,0,0.3) 100%)`,

                    // Subtle Rim + Glass Edge
                    boxShadow: isActive || isHovered
                        ? `0 0 60px ${style.glow}40, inset 0 0 30px ${style.glow}20, inset 2px 2px 8px rgba(255,255,255,0.3)`
                        : `0 15px 40px rgba(0,0,0,0.4), inset 0 0 15px ${style.glow}10, inset 1px 1px 2px rgba(255,255,255,0.15)`,

                    border: `1.5px solid ${style.border}30` // More defined border
                }}
                whileHover={{ scale: 1.2, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
                {/* Specular Point (Tiny crisp reflection) */}
                <div
                    className="absolute top-[18%] left-[18%] w-[15%] h-[8%] rounded-[100%] bg-white blur-[1px] opacity-70"
                    style={{ transform: 'rotate(-45deg)' }}
                />

                {/* Internal Luminous Heart (Breathing Core) */}
                <motion.div
                    className="absolute inset-[20%] rounded-full mix-blend-overlay blur-md"
                    style={{ background: `radial-gradient(circle, ${style.border} 0%, transparent 70%)` }}
                    animate={{
                        opacity: [0.6, 1, 0.6],
                        scale: [0.9, 1.1, 0.9]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Glass Caustics */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2)_0%,transparent_50%)] pointer-events-none" />

                {/* Icon */}
                <div className="relative z-10">
                    <Icon
                        size={planetSize.iconSize}
                        className="text-white/90"
                        strokeWidth={1.2}
                    />
                </div>
            </motion.div>

            {/* ═ DATA LABELS (V10 Cinematic HUD) ═ */}
            <div className="absolute top-1/2 left-[calc(100%+32px)] -translate-y-1/2 flex flex-col pointer-events-none min-w-[120px]">
                <motion.span
                    className="text-[10px] font-medium text-white/90 tracking-[0.2em] mb-1"
                    animate={{
                        opacity: isHovered ? 1 : 0.6,
                        x: isHovered ? 4 : 0
                    }}
                >
                    {department.name.toUpperCase()}
                </motion.span>

                {/* Functional Stats (Steam Deck Vibes) */}
                <AnimatePresence>
                    {(isHovered || isActive) && (
                        <motion.div
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5 }}
                            className="flex flex-col gap-1"
                        >
                            <div className="flex items-center gap-3 text-[8px] text-cyan-400 font-medium tracking-[0.15em]">
                                <div className="flex items-center gap-1 opacity-80">
                                    <Database size={9} />
                                    <span>{activity} Docs</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-80">
                                    <Activity size={9} />
                                    <span>{health}% Health</span>
                                </div>
                            </div>
                            {capacity > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="h-[3px] w-16 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${Math.min(100, capacity)}%`,
                                                background: capacity > 70 ? '#10B981' : capacity > 30 ? '#F59E0B' : '#6B7280'
                                            }}
                                        />
                                    </div>
                                    <span className="text-[7px] text-white/30 font-mono">{capacity}%</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};
