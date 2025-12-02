"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface MoraOrbProps {
    /** User Role - affects base color */
    role?: 'admin' | 'member' | 'manager';
    /** Orb awareness state */
    state?: 'idle' | 'active' | 'learning' | 'warning' | 'demo';
    /** Demo mode flag */
    demoMode?: boolean;
}

/**
 * MÔRA PRESENCE ORB
 * 
 * Living system indicator with awareness states.
 * States (priority): warning > active > learning > demo > idle
 * 
 * - idle: Calm breathing
 * - active: User interaction (navigation, folder switch)
 * - learning: Mycelium rendering, relations loading
 * - warning: Core error present
 * - demo: Demo mode active (soft lavender pulse)
 */
export function MoraOrb({ role = 'admin', state = 'idle', demoMode = false }: MoraOrbProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    // State-based visual parameters
    const getStateParams = () => {
        switch (state) {
            case 'warning':
                return {
                    opacity: 0.9,
                    glowIntensity: 35,
                    pulseDuration: 2,
                    color: '#EF4444', // Muted red
                    gradient: 'radial-gradient(circle, rgba(239, 68, 68, 0.5) 0%, rgba(239, 68, 68, 0) 70%)',
                    innerBg: 'rgba(239, 68, 68, 0.2)',
                };
            case 'active':
                return {
                    opacity: 0.95,
                    glowIntensity: 45,
                    pulseDuration: 1.2,
                    color: isMember ? '#60A5FA' : '#CEB676',
                    gradient: isMember
                        ? 'radial-gradient(circle, rgba(96, 165, 250, 0.6) 0%, rgba(96, 165, 250, 0) 70%)'
                        : 'radial-gradient(circle, rgba(206, 182, 118, 0.6) 0%, rgba(206, 182, 118, 0) 70%)',
                    innerBg: isMember ? 'rgba(96, 165, 250, 0.25)' : 'rgba(206, 182, 118, 0.25)',
                };
            case 'learning':
                return {
                    opacity: 0.75,
                    glowIntensity: 30,
                    pulseDuration: 2.5,
                    color: isMember ? '#60A5FA' : '#CEB676',
                    gradient: isMember
                        ? 'radial-gradient(circle, rgba(96, 165, 250, 0.4) 0%, rgba(96, 165, 250, 0) 70%)'
                        : 'radial-gradient(circle, rgba(206, 182, 118, 0.4) 0%, rgba(206, 182, 118, 0) 70%)',
                    innerBg: isMember ? 'rgba(96, 165, 250, 0.15)' : 'rgba(206, 182, 118, 0.15)',
                };
            case 'demo':
                return {
                    opacity: 0.65,
                    glowIntensity: 25,
                    pulseDuration: 3.5,
                    color: '#C4B5FD', // Lavender
                    gradient: 'radial-gradient(circle, rgba(196, 181, 253, 0.4) 0%, rgba(196, 181, 253, 0) 70%)',
                    innerBg: 'rgba(196, 181, 253, 0.15)',
                };
            case 'idle':
            default:
                return {
                    opacity: 0.5,
                    glowIntensity: 20,
                    pulseDuration: 4,
                    color: isMember ? '#60A5FA' : '#CEB676',
                    gradient: isMember
                        ? 'radial-gradient(circle, rgba(96, 165, 250, 0.4) 0%, rgba(96, 165, 250, 0) 70%)'
                        : 'radial-gradient(circle, rgba(206, 182, 118, 0.4) 0%, rgba(206, 182, 118, 0) 70%)',
                    innerBg: isMember ? 'rgba(96, 165, 250, 0.15)' : 'rgba(206, 182, 118, 0.15)',
                };
        }
    };

    // Role-based colors (unless overridden by warning/demo state)
    const isMember = role === 'member';

    // Determine final state (priority: warning > demo > active > learning > idle)
    const finalState = state === 'warning' ? 'warning'
        : (demoMode && state === 'idle') ? 'demo'
            : state;

    const params = getStateParams();
    const { opacity, glowIntensity, pulseDuration, color, gradient, innerBg } = params;
    const boxShadowColor = `rgba(${finalState === 'warning' ? '239, 68, 68' : isMember ? '96, 165, 250' : '206, 182, 118'}, ${opacity * 0.6})`;

    return (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none select-none">
            <motion.div
                className="relative w-12 h-12 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* Outer Glow Ring */}
                <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [opacity * 0.3, opacity * 0.5, opacity * 0.3],
                    }}
                    transition={{
                        duration: pulseDuration,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{
                        background: gradient,
                        filter: `blur(${glowIntensity / 2}px)`,
                    }}
                />

                {/* Core Orb */}
                <motion.div
                    className="relative w-8 h-8 rounded-full border"
                    animate={{
                        opacity: [opacity, opacity * 1.2, opacity],
                    }}
                    transition={{
                        duration: pulseDuration,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{
                        backgroundColor: innerBg,
                        borderColor: color,
                        borderWidth: 1,
                        boxShadow: `0 0 ${glowIntensity}px ${boxShadowColor}`,
                    }}
                >
                    {/* Inner Nucleus */}
                    <motion.div
                        className="absolute inset-0 m-auto w-3 h-3 rounded-full"
                        animate={{
                            scale: [0.8, 1, 0.8],
                        }}
                        transition={{
                            duration: pulseDuration * 0.8,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{
                            backgroundColor: color,
                            opacity: opacity,
                        }}
                    />
                </motion.div>

                {/* Learning Indicator - Orbital Ring */}
                {finalState === 'learning' && (
                    <motion.div
                        className="absolute inset-0 rounded-full border"
                        style={{ borderColor: color, borderWidth: 1 }}
                        animate={{
                            rotate: 360,
                            opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                            rotate: {
                                duration: 3,
                                repeat: Infinity,
                                ease: "linear"
                            },
                            opacity: {
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }
                        }}
                    />
                )}

                {/* Warning Indicator - Pulsing Ring */}
                {finalState === 'warning' && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-2"
                        style={{ borderColor: color }}
                        animate={{
                            scale: [1, 1.4],
                            opacity: [0.8, 0],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeOut"
                        }}
                    />
                )}
            </motion.div>

            {/* State Label (only for active/learning, subtle) */}
            {(finalState === 'active' || finalState === 'learning') && (
                <motion.div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                >
                    <span className="text-[9px] text-emerald-400/40 font-mono uppercase tracking-widest">
                        MÔRA
                    </span>
                </motion.div>
            )}
        </div>
    );
}
