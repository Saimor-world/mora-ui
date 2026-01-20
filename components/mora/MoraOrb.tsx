"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiquidOrb, CSSFallbackOrb } from './LiquidOrb';

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
    /** Company logo URL - integrates company branding into the orb */
    companyLogo?: string;
    /** Custom accent color (from company branding) */
    accentColor?: string;
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
 * Now includes company logo integration for unified branding.
 * UPGRADE Phase 6: Liquid Intelligence Integration
 */
export function MoraOrb({
    role = 'admin',
    state = 'idle',
    demoMode = false,
    companyLogo,
    accentColor,
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
    const [gaze, setGaze] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setMounted(true);
    }, []);

    // Gazed Awareness: Subtly track mouse when in focus/watch/thinking
    useEffect(() => {
        if (!['watch', 'focus', 'thinking'].includes(state)) {
            setGaze({ x: 0, y: 0 });
            return;
        }

        const handleMouseMove = (e: MouseEvent) => {
            const centerX = window.innerWidth - 80;
            const centerY = window.innerHeight - 144;

            const dx = e.clientX - centerX;
            const dy = e.clientY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Limit the "gaze" shift to max 5px
            const maxShift = 5;
            const shiftX = (dx / (distance + 0.001)) * Math.min(distance / 100, maxShift);
            const shiftY = (dy / (distance + 0.001)) * Math.min(distance / 100, maxShift);

            setGaze({ x: shiftX, y: shiftY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [state]);

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

    // Event Listeners for System Events (Phase 8: Voice)
    useEffect(() => {
        const handleSpeak = () => {
            // Temporary pulse up
            // We can't easily change prop state here if it's passed from parent,
            // but we can override the internal params temporarily or assume
            // parent handles state change? 
            // BETTER: Dispatch visual flare directly or use internal override.
            // Since internalState maps props, we might need a local override.
            // Let's assume for now the Orb just reacts visually via CSS or we force a re-render.
            // Actually, let's just use the OrbMessageEffect for the projectile, 
            // and here maybe just a subtle scale bump?
            if (orbRef.current) {
                orbRef.current.animate([
                    { transform: 'scale(1)' },
                    { transform: 'scale(1.1) filter(brightness(1.5))' },
                    { transform: 'scale(1)' }
                ], {
                    duration: 400,
                    easing: 'ease-out'
                });
            }
        };

        window.addEventListener('mora:speak', handleSpeak);
        return () => window.removeEventListener('mora:speak', handleSpeak);
    }, []);

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
            case 'demo':
                return {
                    opacity: 0.8,
                    glowIntensity: 40,
                    pulseDuration: 3.0,
                    color: '#10B981', // Emerald for demo
                    gradient: 'radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, rgba(16, 185, 129, 0) 70%)',
                    innerBg: 'rgba(16, 185, 129, 0.2)',
                    sparkColor: '#10B981',
                    ringType: 'demo'
                };
            case 'idle':
            default:
                return {
                    opacity: 0.8,
                    glowIntensity: 45,
                    pulseDuration: 4,
                    color: '#10B981', // Emerald Green as requested
                    gradient: 'radial-gradient(circle, rgba(16, 185, 129, 0.6) 0%, rgba(16, 185, 129, 0) 70%)',
                    innerBg: 'rgba(16, 185, 129, 0.25)',
                    sparkColor: '#10B981',
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
                        scale: [1, 1.4, 1],
                        opacity: [opacity * 0.4, opacity * 0.7, opacity * 0.4],
                    }}
                    transition={{
                        duration: pulseDuration,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{
                        background: gradient,
                        filter: `blur(${glowIntensity}px)`,
                    }}
                />

                {/* UPGRADE A2: Sun Rays Effect (Light of Awareness) */}
                {ringType === 'idle' && (
                    <>
                        <motion.div
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                                background: `conic-gradient(from 0deg, transparent 0%, ${color} 5%, transparent 10%, transparent 25%, ${color} 30%, transparent 35%, transparent 60%, ${color} 65%, transparent 70%, transparent 90%, ${color} 95%, transparent 100%)`,
                                opacity: 0.3,
                                scale: 1.8,
                                filter: 'blur(20px)'
                            }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                        />
                        <motion.div
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                                background: `conic-gradient(from 45deg, transparent 0%, ${color} 5%, transparent 10%, transparent 30%, ${color} 35%, transparent 40%, transparent 70%, ${color} 75%, transparent 80%)`,
                                opacity: 0.2,
                                scale: 1.5,
                                filter: 'blur(12px)'
                            }}
                            animate={{ rotate: -360 }}
                            transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
                        />
                    </>
                )}

                {/* UPGRADE A3: Premium Liquid Light Container */}
                <motion.div
                    className="absolute inset-[-40%] rounded-full opacity-60 mix-blend-screen pointer-events-none"
                    animate={{
                        rotate: [0, 360],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    style={{
                        background: `radial-gradient(circle at 30% 30%, ${color}00 0%, ${color}20 40%, ${color}00 70%)`,
                        filter: 'blur(30px)',
                    }}
                />

                {/* Core Orb - LIQUID INTELLIGENCE ENTITY */}
                <motion.div
                    className={`relative rounded-full cursor-pointer overflow-visible z-10 ${state === 'focus' || state === 'insight' ? 'orb-glow' : ''}`}
                    animate={{
                        opacity: 1,
                        scale: finalState === 'idle' ? [1, 1.02, 1] : 1.05,
                    }}
                    transition={{
                        duration: pulseDuration * 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{
                        width: '80px',
                        height: '80px',
                        // Remove background/shadows as the Canvas handles it
                        borderRadius: '50%',
                    }}
                    onClick={(e) => {
                        if (onClick) onClick();

                        // UPGRADE A1: Pane/Cursor Agent Origin
                        if (orbRef.current && (onPaneSpawn || onCursorSpawn)) {
                            const rect = orbRef.current.getBoundingClientRect();
                            const centerX = rect.left + rect.width / 2;
                            const centerY = rect.top + rect.height / 2;

                            if (e.ctrlKey && onPaneSpawn) {
                                onPaneSpawn('chat', { x: centerX, y: centerY });
                            } else if (e.shiftKey && onCursorSpawn) {
                                onCursorSpawn('highlight', { x: centerX + 100, y: centerY });
                            }
                        }
                    }}
                >
                    {/* LIQUID INTELLIGENCE 3D MESH - With Fallback */}
                    <div
                        className="absolute inset-0 pointer-events-none overflow-hidden rounded-full"
                        style={{
                            margin: '-10%',
                            width: '120%',
                            height: '120%'
                        }}
                    >
                        <React.Suspense fallback={<CSSFallbackOrb color={color} state={finalState as any} />}>
                            <LiquidOrb
                                color={color}
                                state={finalState as any}
                                intensity={1.0}
                            />
                        </React.Suspense>
                    </div>

                    {/* Inner Nucleus - With Company Logo Integration */}
                    {companyLogo && (
                        <motion.div
                            className="absolute inset-0 m-auto w-14 h-14 rounded-full flex items-center justify-center overflow-hidden z-20 pointer-events-none"
                            animate={{
                                scale: [0.95, 1.05, 0.95],
                                x: gaze.x,
                                y: gaze.y
                            }}
                            transition={{
                                duration: pulseDuration * 0.8,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            style={{
                                background: 'rgba(0,0,0,0.6)',
                                boxShadow: `0 0 15px ${accentColor || color}40`
                            }}
                        >
                            <img
                                src={companyLogo}
                                alt="Company"
                                className="w-8 h-8 object-contain"
                                style={{
                                    filter: `drop-shadow(0 0 8px ${accentColor || color}60)`
                                }}
                            />
                        </motion.div>
                    )}
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

                {/* Demo Ring (Demo Mode Indicator) */}
                {ringType === 'demo' && (
                    <>
                        <motion.div
                            className="absolute inset-[-10px] rounded-full border border-emerald-500/20"
                            animate={{
                                rotate: 360,
                                scale: [1, 1.05, 1],
                            }}
                            transition={{
                                rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                                scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                            }}
                        />
                        <motion.div
                            className="absolute inset-[-15px] rounded-full border border-emerald-500/10"
                            animate={{
                                rotate: -360,
                                scale: [1, 1.1, 1],
                            }}
                            transition={{
                                rotate: { duration: 15, repeat: Infinity, ease: "linear" },
                                scale: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
                            }}
                        />
                    </>
                )}
            </motion.div>
        </div>
    );
}
