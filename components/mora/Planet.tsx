"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Briefcase, Users, DollarSign, TrendingUp, Code, LucideIcon, Compass, Folder, ArrowRight } from 'lucide-react';

interface PlanetProps {
    department: {
        id: string;
        name: string;
        color?: string;
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
    onQuickFilesAccess?: (clickPos: { x: number; y: number }) => void;  // Quick access to department files
}

/**
 * PLANET COMPONENT (Represents a DEPARTMENT)
 * 
 * In the SAIMÔR Universe metaphor:
 * - PLANET = Department (Abteilung)
 * - Orbiting the Company Center (Sun)
 * 
 * Visuals:
 * - Tesla-style monochrome with subtle color accents
 * - Glassmorphic bubble
 * - Minimal UI, maximum clarity
 * - Context menu for quick file access
 */
export const Planet: React.FC<PlanetProps> = ({
    department,
    position,
    delay = 0,
    isActive = false,
    size = 'md',
    orbitActive = false,
    onClick,
    onHover,
    onQuickFilesAccess,
    iconOverride
}) => {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
    const [isMoraHighlighted, setIsMoraHighlighted] = useState(false);
    const contextRef = useRef<HTMLDivElement>(null);
    // MASTERBIBEL: Smaller, more ethereal planets - floating bubbles
    const sizeMap = {
        sm: { diameter: 60, iconSize: 20 },
        md: { diameter: 75, iconSize: 24 },
        lg: { diameter: 90, iconSize: 28 }
    };

    const planetSize = sizeMap[size];

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
                setShowContextMenu(false);
            }
        };
        if (showContextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showContextMenu]);

    // Mora HIGHLIGHT LISTENER - When Mora points at this department
    useEffect(() => {
        const handleMoraHighlight = (e: CustomEvent) => {
            const { targetType, targetId, duration, color } = e.detail;
            if (targetType === 'department' && targetId === department.id) {
                console.log(`🔆 Mora is highlighting: ${department.name}`);
                setIsMoraHighlighted(true);

                // Auto-remove highlight after duration
                setTimeout(() => setIsMoraHighlighted(false), duration || 2000);
            }
        };

        window.addEventListener('mora:highlight' as any, handleMoraHighlight as any);
        return () => window.removeEventListener('mora:highlight' as any, handleMoraHighlight as any);
    }, [department.id, department.name]);

    // Handle right-click
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
        setShowContextMenu(true);
    };

    // Handle quick files action - pass click position for window placement
    const handleQuickFiles = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setShowContextMenu(false);
        onQuickFilesAccess?.(contextMenuPos);
    };

    // Handle open space action
    const handleOpenSpace = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowContextMenu(false);
        onClick?.();
    };

    const getDeptIcon = (name: string): LucideIcon => {
        const key = name.toLowerCase();
        if (key.includes('operation')) return Briefcase;
        if (key.includes('engineering') || key.includes('product')) return Code;
        if (key.includes('finance') || key.includes('buchhaltung')) return DollarSign;
        if (key.includes('marketing') || key.includes('brand')) return TrendingUp;
        if (key.includes('hr') || key.includes('people')) return Users;
        return Compass;
    };

    const getDeptStyle = (name: string, customColor?: string) => {
        // If department has a custom color, use it
        if (customColor) {
            return {
                gradient: `linear-gradient(135deg, ${customColor}33, ${customColor}0D)`,
                border: `${customColor}80`,
                glow: `${customColor}66`,
                iconColor: 'text-white',
                activeGradient: `linear-gradient(135deg, ${customColor}4D, ${customColor}1A)`,
            };
        }

        const key = name.toLowerCase();

        // Engineering / Tech / Development - Sky Blue
        if (key.includes('engineering') || key.includes('product') || key.includes('tech') || key.includes('dev')) {
            return {
                gradient: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(34,211,238,0.05))',
                border: 'rgba(56,189,248,0.5)',
                glow: 'rgba(14,165,233,0.4)',
                iconColor: 'text-sky-400',
                activeGradient: 'linear-gradient(135deg, rgba(14,165,233,0.3), rgba(34,211,238,0.1))',
            };
        }

        // Finance / Accounting - Amber
        if (key.includes('finance') || key.includes('accounting') || key.includes('buchhaltung')) {
            return {
                gradient: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.05))',
                border: 'rgba(251,191,36,0.5)',
                glow: 'rgba(245,158,11,0.4)',
                iconColor: 'text-amber-400',
                activeGradient: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(251,191,36,0.1))',
            };
        }

        // Marketing / Sales / Brand / Retail - Fuchsia
        if (key.includes('marketing') || key.includes('sales') || key.includes('brand') || key.includes('vertrieb') || key.includes('retail') || key.includes('growth')) {
            return {
                gradient: 'linear-gradient(135deg, rgba(217,70,239,0.2), rgba(139,92,246,0.05))',
                border: 'rgba(217,70,239,0.5)',
                glow: 'rgba(217,70,239,0.4)',
                iconColor: 'text-fuchsia-400',
                activeGradient: 'linear-gradient(135deg, rgba(217,70,239,0.3), rgba(139,92,246,0.1))',
            };
        }

        // HR / People - Rose
        if (key.includes('hr') || key.includes('people') || key.includes('personal')) {
            return {
                gradient: 'linear-gradient(135deg, rgba(244,63,94,0.2), rgba(225,29,72,0.05))',
                border: 'rgba(244,63,94,0.5)',
                glow: 'rgba(244,63,94,0.4)',
                iconColor: 'text-rose-400',
                activeGradient: 'linear-gradient(135deg, rgba(244,63,94,0.3), rgba(225,29,72,0.1))',
            };
        }

        // Design / Creative - Violet
        if (key.includes('design') || key.includes('creative')) {
            return {
                gradient: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.05))',
                border: 'rgba(139,92,246,0.5)',
                glow: 'rgba(139,92,246,0.4)',
                iconColor: 'text-violet-400',
                activeGradient: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.1))',
            };
        }

        // Café / Coffee / Food - Warm Orange
        if (key.includes('café') || key.includes('cafe') || key.includes('coffee') || key.includes('roast') || key.includes('kitchen')) {
            return {
                gradient: 'linear-gradient(135deg, rgba(251,146,60,0.2), rgba(234,88,12,0.05))',
                border: 'rgba(251,146,60,0.5)',
                glow: 'rgba(251,146,60,0.4)',
                iconColor: 'text-orange-400',
                activeGradient: 'linear-gradient(135deg, rgba(251,146,60,0.3), rgba(234,88,12,0.1))',
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

    const style = getDeptStyle(department.name, department.color);
    const Icon = iconOverride || getDeptIcon(department.name);

    // Generate a consistent float duration based on department id
    const floatDuration = 5 + (department.id.charCodeAt(0) % 4);
    const floatDelay = (department.id.charCodeAt(1) || 0) % 3;

    return (
        <motion.div
            className="absolute cursor-pointer group"
            data-agency-id={department.id}
            style={{
                // Position is now handled by parent via CSS (no motion wrapper overhead)
                ...(position.x !== 0 || position.y !== 0 ? {
                    position: 'absolute' as const,
                    left: position.x,
                    top: position.y,
                    transform: 'translate(-50%, -50%)'
                } : {})
            }}
            // Subtle floating animation
            animate={{
                y: [0, -4, 0, 3, 0],
            }}
            transition={{
                duration: floatDuration,
                repeat: Infinity,
                delay: floatDelay,
                ease: "easeInOut"
            }}
            onClick={onClick}
            onContextMenu={handleContextMenu}
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

                {/* Atmospheric Glow - Galaxy Core Aesthetic */}
                <motion.div
                    className="absolute inset-0 rounded-full opacity-20"
                    style={{
                        background: `radial-gradient(circle, ${style.glow}, transparent 70%)`,
                        filter: 'blur(8px)',
                    }}
                    animate={{
                        scale: [0.8, 1.2, 0.8],
                        opacity: [0.1, 0.3, 0.1]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
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

            {/* Context Menu - via Portal for correct positioning */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showContextMenu && (
                        <motion.div
                            ref={contextRef}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="fixed z-[9999] pointer-events-auto"
                            style={{
                                left: contextMenuPos.x,
                                top: contextMenuPos.y
                            }}
                        >
                            <div className="bg-[#0a0f0d]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[180px]">
                                {/* Header */}
                                <div className="px-3 py-2 border-b border-white/5 text-xs text-white/40 truncate">
                                    {department.name}
                                </div>

                                {/* Actions */}
                                <div className="py-1">
                                    {onQuickFilesAccess && (
                                        <button
                                            onClick={handleQuickFiles}
                                            className="w-full px-3 py-2 flex items-center gap-3 hover:bg-emerald-500/10 transition-colors text-left"
                                        >
                                            <Folder size={16} className="text-emerald-400" />
                                            <span className="text-sm text-white/90">Dateien anzeigen</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={handleOpenSpace}
                                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-500/10 transition-colors text-left"
                                    >
                                        <ArrowRight size={16} className="text-blue-400" />
                                        <span className="text-sm text-white/90">In Space öffnen</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </motion.div>
    );
};

export default Planet;
