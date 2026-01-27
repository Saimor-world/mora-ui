"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface CursorAgentProps {
    /** Whether the agent is active */
    active?: boolean;
    /** Current action type */
    action?: 'idle' | 'highlight' | 'point' | 'roam';
    /** Target position for actions */
    target?: { x: number; y: number };
    /** Callback when action completes */
    onActionComplete?: (action: string) => void;
    /** Movement speed multiplier */
    speed?: number;
}

/**
 * UPGRADE D1: Cursor Agent - Living AI assistant with Bezier movement
 * Emerges from Orb, highlights elements, points at locations, roams naturally
 */
export function CursorAgent({
    active = false,
    action = 'idle',
    target,
    onActionComplete,
    speed = 1,
    awareness = 'idle'
}: CursorAgentProps & { awareness?: 'idle' | 'watch' | 'focus' | 'thinking' | 'alert' | 'insight' | 'demo' }) {
    const controls = useAnimation();
    // Start in center of viewport
    const [currentPosition, setCurrentPosition] = useState(() => ({
        x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400
    }));
    const [isMoving, setIsMoving] = useState(false);
    const agentRef = useRef<HTMLDivElement>(null);

    // Phase 8.3: Awareness Visuals
    const getVisuals = () => {
        switch (awareness) {
            case 'alert': return { color: '#EF4444', glow: 'rgba(239, 68, 68, 0.6)', border: '#EF4444' };
            case 'insight': return { color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.6)', border: '#F59E0B' };
            case 'watch': return { color: '#06B6D4', glow: 'rgba(6, 182, 212, 0.6)', border: '#06B6D4' };
            case 'thinking': return { color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.6)', border: '#3B82F6' };
            case 'focus':
            default: return { color: '#10B981', glow: 'rgba(16, 185, 129, 0.6)', border: '#10B981' };
        }
    };

    const visuals = getVisuals();

    // UPGRADE D1: Bezier curve movement engine
    const moveToTarget = async (start: { x: number, y: number }, end: { x: number, y: number }) => {
        // Don't interrupt ongoing movement
        if (isMoving) return;

        setIsMoving(true);

        // Calculate control points for smooth Bezier curve
        const distance = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
        const controlOffset = Math.min(distance * 0.3, 100); // Adaptive curve

        // Create curved path with control points
        const cp1 = {
            x: start.x + (end.x - start.x) * 0.3 + Math.sin(Date.now() * 0.001) * controlOffset,
            y: start.y + (end.y - start.y) * 0.3 + Math.cos(Date.now() * 0.001) * controlOffset
        };
        const cp2 = {
            x: start.x + (end.x - start.x) * 0.7 + Math.sin(Date.now() * 0.001 + Math.PI) * controlOffset,
            y: start.y + (end.y - start.y) * 0.7 + Math.cos(Date.now() * 0.001 + Math.PI) * controlOffset
        };

        // Animate along Bezier curve
        await controls.start({
            x: [start.x, cp1.x, cp2.x, end.x],
            y: [start.y, cp1.y, cp2.y, end.y],
            scale: 1,
            opacity: 1,
            transition: {
                duration: Math.max(0.8, distance / 300) / speed,
                ease: [0.25, 0.46, 0.45, 0.94], // Custom bezier for natural movement
                times: [0, 0.3, 0.7, 1]
            }
        });

        setCurrentPosition(end);
        setIsMoving(false);
        onActionComplete?.(action);
    };

    // Entry animation when becoming active
    useEffect(() => {
        if (active) {
            controls.start({
                x: currentPosition.x,
                y: currentPosition.y,
                scale: 1,
                opacity: 1,
                transition: { duration: 0.3, ease: 'easeOut' }
            });
        }
    }, [active]);

    // UPGRADE D1: Action handlers
    useEffect(() => {
        if (!active || !target) return;

        switch (action) {
            case 'highlight':
                // Move to target and pulse
                moveToTarget(currentPosition, target).then(() => {
                    // Pulse animation for highlighting
                    controls.start({
                        scale: [1, 1.3, 1],
                        opacity: [0.8, 1, 0.8],
                        transition: { duration: 0.6, repeat: 2 }
                    });
                });
                break;

            case 'point':
                // Move to target and point with extended arm
                moveToTarget(currentPosition, target);
                break;

            case 'roam':
                // Natural roaming behavior
                const roamTarget = {
                    x: target.x + (Math.random() - 0.5) * 200,
                    y: target.y + (Math.random() - 0.5) * 200
                };
                moveToTarget(currentPosition, roamTarget);
                break;

            default:
                break;
        }
    }, [action, target, active]);

    // DISABLED: Autonomous roaming (Môra only moves when user actively interacts)
    // User wants Môra as Disney fairy companion - only moves when HELPING, not idle
    /* useEffect(() => {
        // Roam if active and either 'roam' explicit action OR 'idle' state
        if (active && (action === 'idle' || action === 'roam')) {
            const roamInterval = setInterval(() => {
                if (!isMoving) {
                    const randomTarget = {
                        x: currentPosition.x + (Math.random() - 0.5) * 100,
                        y: currentPosition.y + (Math.random() - 0.5) * 100
                    };
                    moveToTarget(currentPosition, randomTarget);
                }
            }, 8000); // Roam every 8 seconds

            return () => clearInterval(roamInterval);
        }
    }, [active, isMoving, currentPosition]); */

    if (!active && !isMoving) {
        return null;
    }

    return (
        <motion.div
            ref={agentRef}
            className="fixed pointer-events-none z-[9999]"
            style={{
                left: 0,
                top: 0,
                transform: 'translate(-50%, -50%)'
            }}
            initial={{ scale: 1, opacity: 1, x: currentPosition.x, y: currentPosition.y }}
            animate={controls}
            exit={{ scale: 0, opacity: 0 }}
        >
            {/* MASTERBIBEL: Lichtfee (Light Fairy) - emerges from Orb */}
            <div className="relative">
                {/* LICHTFEE: Outer Aura Glow - Multi-layer */}
                <motion.div
                    className="absolute -inset-4 rounded-full"
                    style={{
                        background: `
                            radial-gradient(circle at 30% 30%, ${visuals.glow} 0%, transparent 50%),
                            radial-gradient(circle at 70% 70%, ${visuals.color}40 0%, transparent 50%)
                        `,
                        filter: 'blur(12px)'
                    }}
                    animate={{
                        scale: isMoving ? [1, 1.4, 1] : [1, 1.2, 1],
                        opacity: isMoving ? [0.5, 0.8, 0.5] : [0.3, 0.5, 0.3],
                        rotate: [0, 180, 360]
                    }}
                    transition={{
                        duration: isMoving ? 1.5 : 6,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* LICHTFEE: Wing-like light extensions */}
                <motion.div
                    className="absolute -inset-2"
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.4, 0.7, 0.4]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    {/* Left Wing */}
                    <motion.div
                        className="absolute left-0 top-1/2 w-4 h-6 -translate-y-1/2 -translate-x-3"
                        style={{
                            background: `linear-gradient(135deg, ${visuals.color}60 0%, transparent 80%)`,
                            borderRadius: '50% 0 50% 50%',
                            filter: 'blur(2px)'
                        }}
                        animate={{
                            rotate: isMoving ? [-15, 15, -15] : [-5, 5, -5],
                            scaleX: isMoving ? [1, 1.3, 1] : [1, 1.1, 1]
                        }}
                        transition={{
                            duration: isMoving ? 0.3 : 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                    {/* Right Wing */}
                    <motion.div
                        className="absolute right-0 top-1/2 w-4 h-6 -translate-y-1/2 translate-x-3"
                        style={{
                            background: `linear-gradient(-135deg, ${visuals.color}60 0%, transparent 80%)`,
                            borderRadius: '0 50% 50% 50%',
                            filter: 'blur(2px)'
                        }}
                        animate={{
                            rotate: isMoving ? [15, -15, 15] : [5, -5, 5],
                            scaleX: isMoving ? [1, 1.3, 1] : [1, 1.1, 1]
                        }}
                        transition={{
                            duration: isMoving ? 0.3 : 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </motion.div>

                {/* LICHTFEE: Core Body - Organic glowing center */}
                <motion.div
                    className="relative w-7 h-7 rounded-full flex items-center justify-center overflow-visible"
                    style={{
                        background: `radial-gradient(circle at 35% 35%, ${visuals.color} 0%, ${visuals.color}90 40%, rgba(0,0,0,0.3) 100%)`,
                        boxShadow: `
                            0 0 25px ${visuals.glow},
                            0 0 50px ${visuals.glow}40,
                            inset 2px 2px 6px rgba(255,255,255,0.3),
                            inset -2px -2px 6px rgba(0,0,0,0.2)
                        `
                    }}
                    animate={{
                        scale: action === 'highlight' ? [1, 1.3, 1] : [1, 1.05, 1],
                    }}
                    transition={{
                        scale: { duration: action === 'highlight' ? 0.4 : 3, repeat: Infinity, ease: "easeInOut" }
                    }}
                >
                    {/* Glass highlight */}
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: '50%',
                            height: '50%',
                            top: '12%',
                            left: '12%',
                            background: 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 60%, transparent 100%)',
                            filter: 'blur(1px)'
                        }}
                    />

                    {/* Core Soul Spark */}
                    <motion.div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                            background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.3) 60%, transparent 100%)',
                            boxShadow: `0 0 12px white, 0 0 20px ${visuals.color}`
                        }}
                        animate={{
                            scale: [0.9, 1.2, 0.9],
                            opacity: [0.8, 1, 0.8]
                        }}
                        transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </motion.div>

                {/* LICHTFEE: Pointing Light Beam for 'point' action */}
                {action === 'point' && (
                    <motion.div
                        className="absolute top-1/2 left-1/2 origin-left"
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
                    >
                        <div
                            className="w-10 h-1 rounded-full"
                            style={{
                                background: `linear-gradient(90deg, ${visuals.color} 0%, ${visuals.color}00 100%)`,
                                transform: 'translateY(-50%)',
                                boxShadow: `0 0 10px ${visuals.glow}`
                            }}
                        />
                        <motion.div
                            className="absolute right-0 top-1/2 w-2 h-2 rounded-full transform -translate-y-1/2"
                            style={{
                                backgroundColor: 'white',
                                boxShadow: `0 0 8px ${visuals.color}, 0 0 16px white`
                            }}
                            animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.8, 1, 0.8]
                            }}
                            transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                    </motion.div>
                )}

                {/* LICHTFEE: Stardust Trail - Magical particle wake */}
                {isMoving && Array.from({ length: 6 }).map((_, i) => (
                    <motion.div
                        key={`trail-${i}`}
                        className="absolute rounded-full"
                        style={{
                            width: 3 + (i % 3),
                            height: 3 + (i % 3),
                            left: '50%',
                            top: '50%',
                            marginLeft: -(3 + (i % 3)) / 2,
                            marginTop: -(3 + (i % 3)) / 2,
                            background: `radial-gradient(circle, ${visuals.color} 0%, ${visuals.color}00 70%)`,
                            boxShadow: `0 0 4px ${visuals.glow}`
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [1, 0],
                            opacity: [0.8, 0],
                            x: (Math.random() - 0.5) * 40 - 15, // Trail behind
                            y: (Math.random() - 0.5) * 30
                        }}
                        transition={{
                            duration: 0.6 + i * 0.1,
                            ease: "easeOut",
                            repeat: Infinity,
                            delay: i * 0.08
                        }}
                    />
                ))}

                {/* Ambient floating sparkles when idle */}
                {!isMoving && Array.from({ length: 4 }).map((_, i) => (
                    <motion.div
                        key={`sparkle-${i}`}
                        className="absolute rounded-full"
                        style={{
                            width: 2,
                            height: 2,
                            background: 'white',
                            boxShadow: `0 0 4px ${visuals.color}`
                        }}
                        animate={{
                            x: [0, Math.cos(i * Math.PI / 2) * 20, 0],
                            y: [0, Math.sin(i * Math.PI / 2) * 20, 0],
                            opacity: [0, 0.8, 0],
                            scale: [0.5, 1, 0.5]
                        }}
                        transition={{
                            duration: 3 + i,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.5
                        }}
                    />
                ))}
            </div>

            {/* Action label - more elegant */}
            {action !== 'idle' && (
                <motion.div
                    className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                >
                    <div
                        className="text-[10px] px-2 py-1 rounded-full backdrop-blur-sm"
                        style={{
                            color: 'white',
                            background: `linear-gradient(135deg, ${visuals.color}40 0%, rgba(0,0,0,0.6) 100%)`,
                            border: `1px solid ${visuals.color}30`,
                            boxShadow: `0 0 10px ${visuals.glow}30`
                        }}
                    >
                        {action === 'highlight' ? '✨ Highlighting' :
                            action === 'point' ? '👆 Pointing' :
                                action === 'roam' ? '🔮 Exploring' : '💫 Active'}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}