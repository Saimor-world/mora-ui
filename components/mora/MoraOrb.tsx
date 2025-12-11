"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MoraOrbProps {
    /** User Role - affects base color */
    role?: 'admin' | 'member' | 'manager';
    /** Orb awareness state */
    state?: 'idle' | 'watch' | 'focus' | 'thinking' | 'alert' | 'insight' | 'demo';
    /** Demo mode flag */
    demoMode?: boolean;
    /** Click handler */
    onClick?: () => void;
    /** Is the orb interactive (clickable)? */
    interactive?: boolean;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Notification queue for micro-sparks */
    notifications?: Array<{ id: string, type: 'task' | 'email' | 'insight' | 'alert', message: string }>;
    /** Pane spawn callback */
    onPaneSpawn?: (type: string, position: { x: number, y: number }) => void;
    /** Cursor agent spawn callback */
    onCursorSpawn?: (action: string, target: { x: number, y: number }) => void;
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
export function MoraOrb({
    role = 'admin',
    state = 'idle',
    demoMode = false,
    notifications = [],
    onClick,
    onPaneSpawn,
    onCursorSpawn
}: MoraOrbProps) {
    const [mounted, setMounted] = useState(false);
    const [activeSparks, setActiveSparks] = useState<Array<{
        id: string;
        type: string;
        message: string;
        startTime: number;
        position: { x: number, y: number };
    }>>([]);
    const orbRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // UPGRADE A1: Micro-spark notifications
    useEffect(() => {
        notifications.forEach(notification => {
            const existingSpark = activeSparks.find(s => s.id === notification.id);
            if (!existingSpark) {
                // Create new spark
                const angle = Math.random() * Math.PI * 2;
                const distance = 80 + Math.random() * 40;
                const newSpark = {
                    id: notification.id,
                    type: notification.type,
                    message: notification.message,
                    startTime: Date.now(),
                    position: {
                        x: Math.cos(angle) * distance,
                        y: Math.sin(angle) * distance
                    }
                };
                setActiveSparks(prev => [...prev, newSpark]);

                // Auto-remove after 5 seconds
                setTimeout(() => {
                    setActiveSparks(prev => prev.filter(s => s.id !== notification.id));
                }, 5000);
            }
        });
    }, [notifications, activeSparks]);

    if (!mounted) return null;

    // State-based visual parameters - UPGRADE A1: Five awareness modes
    const getStateParams = () => {
        switch (state) {
            case 'alert':
                return {
                    opacity: 0.95,
                    glowIntensity: 50,
                    pulseDuration: 1.0,
                    color: '#EF4444', // Alert red
                    gradient: 'radial-gradient(circle, rgba(239, 68, 68, 0.8) 0%, rgba(239, 68, 68, 0) 70%)',
                    innerBg: 'rgba(239, 68, 68, 0.3)',
                    sparkColor: '#EF4444',
                    ringType: 'alert'
                };
            case 'insight':
                return {
                    opacity: 0.9,
                    glowIntensity: 45,
                    pulseDuration: 2.0,
                    color: '#D4AF37', // Insight gold
                    gradient: 'radial-gradient(circle, rgba(212, 175, 55, 0.7) 0%, rgba(212, 175, 55, 0) 70%)',
                    innerBg: 'rgba(212, 175, 55, 0.25)',
                    sparkColor: '#D4AF37',
                    ringType: 'insight'
                };
            case 'thinking':
                return {
                    opacity: 0.8,
                    glowIntensity: 35,
                    pulseDuration: 2.5,
                    color: '#3B82F6', // Thinking blue
                    gradient: 'radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, rgba(59, 130, 246, 0) 70%)',
                    innerBg: 'rgba(59, 130, 246, 0.2)',
                    sparkColor: '#3B82F6',
                    ringType: 'thinking'
                };
            case 'focus':
                return {
                    opacity: 0.85,
                    glowIntensity: 40,
                    pulseDuration: 1.5,
                    color: isMember ? '#60A5FA' : '#10B981', // Focus colors
                    gradient: isMember
                        ? 'radial-gradient(circle, rgba(96, 165, 250, 0.7) 0%, rgba(96, 165, 250, 0) 70%)'
                        : 'radial-gradient(circle, rgba(16, 185, 129, 0.7) 0%, rgba(16, 185, 129, 0) 70%)',
                    innerBg: isMember ? 'rgba(96, 165, 250, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                    sparkColor: isMember ? '#60A5FA' : '#10B981',
                    ringType: 'focus'
                };
            case 'watch':
                return {
                    opacity: 0.75, // Slightly less than focus
                    glowIntensity: 30,
                    pulseDuration: 2.5, // Slower than focus
                    color: '#06B6D4', // Cyan for observation
                    gradient: 'radial-gradient(circle, rgba(6, 182, 212, 0.5) 0%, rgba(6, 182, 212, 0) 70%)',
                    innerBg: 'rgba(6, 182, 212, 0.2)',
                    sparkColor: '#06B6D4',
                    ringType: 'watch'
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
                    sparkColor: isMember ? '#60A5FA' : '#CEB676',
                    ringType: 'idle'
                };
        }
    };

    // Role-based colors (unless overridden by warning/demo state)
    const isMember = role === 'member';

    // Determine final state (priority: alert > demo > focus > thinking > watch > idle)
    // Legacy maps: warning->alert, active->focus, learning->thinking
    let internalState = state;
    // @ts-ignore - Handle legacy props if passed at runtime
    if (state === 'warning') internalState = 'alert';
    // @ts-ignore
    if (state === 'active') internalState = 'focus';
    // @ts-ignore
    if (state === 'learning') internalState = 'thinking';

    const finalState = internalState === 'alert' ? 'alert'
        : (demoMode && internalState === 'idle') ? 'idle' // Demo mode logic handled by Role-based colors usually, or specific override?
            : internalState;

    // Demo override (soft pulse) happens via color if idle
    if (demoMode && finalState === 'idle') {
        // This logic was "demo" state before, but now we map states.
        // We'll trust the caller sends correct states or handle it in color selection.
    }

    const params = getStateParams();
    const { opacity, glowIntensity, pulseDuration, color, gradient, innerBg, sparkColor, ringType } = params;
    const boxShadowColor = `rgba(${finalState === 'alert' ? '239, 68, 68' : finalState === 'insight' ? '212, 175, 55' : finalState === 'thinking' ? '59, 130, 246' : finalState === 'focus' ? (isMember ? '96, 165, 250' : '16, 185, 129') : (isMember ? '96, 165, 250' : '206, 182, 118')}, ${opacity * 0.6})`;

    // MASTERBIBEL: Orb size is 68-92px, we use 80px as base
    return (
        <div className="relative select-none" ref={orbRef}>
            {/* UPGRADE A1: Micro-spark notifications */}
            <AnimatePresence>
                {activeSparks.map(spark => (
                    <motion.div
                        key={spark.id}
                        className="absolute pointer-events-none"
                        style={{
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)'
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: 1,
                            opacity: 1,
                            x: spark.position.x,
                            y: spark.position.y
                        }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                        <div className="relative">
                            <motion.div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: sparkColor }}
                                animate={{
                                    scale: [1, 1.5, 1],
                                    opacity: [1, 0.7, 1]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                <div className="text-xs text-white/70 bg-black/60 px-2 py-1 rounded border border-white/20">
                                    {spark.message}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            <motion.div
                className="relative w-20 h-20 flex items-center justify-center"
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

                {/* Core Orb - MASTERBIBEL size 68-92px, we use 56px inner */}
                <motion.div
                    className="relative w-14 h-14 rounded-full border-2 cursor-pointer"
                    animate={{
                        opacity: [opacity, opacity * 1.2, opacity],
                        scale: finalState === 'idle' ? [1, 1.02, 1] : 1, // UPGRADE B2: Breathing effect
                    }}
                    transition={{
                        duration: pulseDuration,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{
                        backgroundColor: innerBg,
                        borderColor: color,
                        boxShadow: `0 0 ${glowIntensity}px ${boxShadowColor}`,
                    }}
                    onClick={(e) => {
                        if (onClick) onClick();

                        // UPGRADE A1: Pane/Cursor Agent Origin
                        if (orbRef.current && (onPaneSpawn || onCursorSpawn)) {
                            const rect = orbRef.current.getBoundingClientRect();
                            const centerX = rect.left + rect.width / 2;
                            const centerY = rect.top + rect.height / 2;

                            // Example: Spawn different things based on click modifiers
                            if (e.ctrlKey && onPaneSpawn) {
                                onPaneSpawn('chat', { x: centerX, y: centerY });
                            } else if (e.shiftKey && onCursorSpawn) {
                                onCursorSpawn('highlight', { x: centerX + 100, y: centerY });
                            }
                        }
                    }}
                >
                    {/* Inner Nucleus */}
                    <motion.div
                        className="absolute inset-0 m-auto w-5 h-5 rounded-full"
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

                {/* UPGRADE A1: Awareness State Rings */}
                {ringType === 'thinking' && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-2"
                        style={{ borderColor: color }}
                        animate={{
                            rotate: 360,
                            scale: [1, 1.1, 1],
                            opacity: [0.4, 0.8, 0.4],
                        }}
                        transition={{
                            rotate: {
                                duration: 4,
                                repeat: Infinity,
                                ease: "linear"
                            },
                            scale: {
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            },
                            opacity: {
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }
                        }}
                    />
                )}

                {ringType === 'focus' && (
                    <motion.div
                        className="absolute inset-0 rounded-full border"
                        style={{ borderColor: color, borderWidth: 2 }}
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                )}

                {ringType === 'insight' && (
                    <motion.div
                        className="absolute inset-0 rounded-full border"
                        style={{ borderColor: color, borderWidth: 3 }}
                        animate={{
                            scale: [1, 1.3, 1],
                            rotate: [0, 180, 360],
                            opacity: [0.5, 0.9, 0.5],
                        }}
                        transition={{
                            scale: {
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            },
                            rotate: {
                                duration: 6,
                                repeat: Infinity,
                                ease: "linear"
                            },
                            opacity: {
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }
                        }}
                    />
                )}

                {ringType === 'alert' && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-2"
                        style={{ borderColor: color }}
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.9, 0.3, 0.9],
                        }}
                        transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                )}

                {/* UPGRADE 7.1: Watch Ring (Scanning Radar) */}
                {ringType === 'watch' && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-t-2 border-r-2 border-transparent"
                        style={{ borderTopColor: color, borderRightColor: color, opacity: 0.6 }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                )}
            </motion.div>

            {/* State Label (only for active/learning, subtle) */}
            {/* State Label (only for focus/thinking, subtle) */}
            {(finalState === 'focus' || finalState === 'thinking') && (
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
