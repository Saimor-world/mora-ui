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

    // UPGRADE D1: Ambient roaming (Living Behavior)
    useEffect(() => {
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
    }, [active, isMoving, currentPosition]);

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
            {/* UPGRADE D1: Agent body - glowing orb with intelligence */}
            <div className="relative">
                {/* Outer glow */}
                <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: `radial-gradient(circle, ${visuals.glow} 0%, transparent 70%)`,
                        filter: 'blur(8px)'
                    }}
                    animate={{
                        scale: isMoving ? [1, 1.2, 1] : [1, 1.1, 1],
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{
                        duration: isMoving ? 0.6 : 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Core agent */}
                <motion.div
                    className="relative w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    style={{
                        backgroundColor: visuals.color + 'CC', // Add some transparency
                        borderColor: visuals.border,
                        boxShadow: `0 0 20px ${visuals.glow}`
                    }}
                    animate={{
                        scale: action === 'highlight' ? [1, 1.2, 1] : 1,
                        rotate: isMoving ? [0, 360] : 0
                    }}
                    transition={{
                        scale: { duration: 0.3, repeat: action === 'highlight' ? 2 : 0 },
                        rotate: { duration: 2, repeat: Infinity, ease: "linear" }
                    }}
                >
                    {/* Intelligence indicator */}
                    <motion.div
                        className="w-2 h-2 rounded-full bg-white"
                        animate={{
                            scale: [0.8, 1.2, 0.8],
                            opacity: [0.7, 1, 0.7]
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </motion.div>

                {/* UPGRADE D1: Pointing arm for 'point' action */}
                {action === 'point' && (
                    <motion.div
                        className="absolute top-1/2 left-1/2 origin-left"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.5, duration: 0.3 }}
                    >
                        <div
                            className="w-8 h-0.5 rounded-full"
                            style={{
                                backgroundColor: visuals.color,
                                transform: 'translateY(-50%)',
                                boxShadow: `0 0 8px ${visuals.glow}`
                            }}
                        />
                        <div
                            className="absolute right-0 top-1/2 w-2 h-2 rounded-full transform -translate-y-1/2"
                            style={{
                                backgroundColor: visuals.color,
                                boxShadow: `0 0 6px ${visuals.color}`
                            }}
                        />
                    </motion.div>
                )}

                {/* Stardust Trail - UPGRADE D4: Subtle particle wake */}
                {isMoving && [0, 1, 2, 3].map((i) => (
                    <motion.div
                        key={`trail-${i}`}
                        className="absolute inset-0 rounded-full blur-[1px]"
                        style={{ backgroundColor: visuals.color + '66' }}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{
                            scale: [0.8, 0],
                            opacity: [0.6, 0],
                            x: (Math.random() - 0.5) * 20,
                            y: (Math.random() - 0.5) * 20
                        }}
                        transition={{
                            duration: 0.8,
                            ease: "easeOut",
                            repeat: Infinity,
                            delay: i * 0.1
                        }}
                    />
                ))}
            </div>

            {/* Action label */}
            {action !== 'idle' && (
                <motion.div
                    className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                >
                    <div
                        className="text-xs px-2 py-1 rounded border"
                        style={{
                            color: visuals.color,
                            borderColor: visuals.color + '33',
                            backgroundColor: 'rgba(0,0,0,0.6)'
                        }}
                    >
                        {action === 'highlight' ? 'Highlighting' :
                            action === 'point' ? 'Pointing' :
                                action === 'roam' ? 'Exploring' : 'Active'}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}