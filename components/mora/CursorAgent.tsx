"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';

interface CursorAgentProps {
    active?: boolean;
    action?: 'idle' | 'highlight' | 'point' | 'navigate' | 'return' | 'roam';
    target?: { x: number; y: number };
    message?: string | null;
    onActionComplete?: (action: string) => void;
    speed?: number;
}

export function CursorAgent({
    active = false,
    action = 'idle',
    target,
    message = null,
    onActionComplete,
    speed = 1,
    awareness = 'idle'
}: CursorAgentProps & { awareness?: 'idle' | 'watch' | 'focus' | 'thinking' | 'alert' | 'insight' | 'demo' | 'curious' | 'learning' | 'watching' }) {
    const controls = useAnimation();
    const prefersReducedMotion = useReducedMotion();
    const agentRef = useRef<HTMLDivElement>(null);

    const getHomePosition = () => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return { x: 500, y: 400 };
        }
        const homeEl = document.querySelector('[data-mora-home="true"]');
        if (homeEl instanceof HTMLElement) {
            const rect = homeEl.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
        return { x: window.innerWidth - 96, y: window.innerHeight - 88 };
    };

    const [homePosition, setHomePosition] = useState(getHomePosition);
    const [currentPosition, setCurrentPosition] = useState(getHomePosition);
    const [isMoving, setIsMoving] = useState(false);
    const [isDocumentVisible, setIsDocumentVisible] = useState(true);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const syncVisibility = () => setIsDocumentVisible(!document.hidden);
        syncVisibility();
        document.addEventListener('visibilitychange', syncVisibility);
        return () => document.removeEventListener('visibilitychange', syncVisibility);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const syncHome = () => {
            const next = getHomePosition();
            setHomePosition(next);
            if (!active && !isMoving) {
                setCurrentPosition(next);
            }
        };
        syncHome();
        window.addEventListener('resize', syncHome);
        return () => window.removeEventListener('resize', syncHome);
    }, [active, isMoving]);

    const getVisuals = () => {
        switch (awareness) {
            case 'alert': return { color: '#EF4444', glow: 'rgba(239, 68, 68, 0.6)' };
            case 'insight': return { color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.6)' };
            case 'watch': return { color: '#06B6D4', glow: 'rgba(6, 182, 212, 0.6)' };
            case 'thinking': return { color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.6)' };
            case 'focus':
            default: return { color: '#10B981', glow: 'rgba(16, 185, 129, 0.6)' };
        }
    };

    const visuals = getVisuals();
    const animateAmbient =
        !prefersReducedMotion &&
        isDocumentVisible &&
        (isMoving || action === 'point' || action === 'navigate' || awareness === 'thinking' || awareness === 'alert' || awareness === 'insight');

    const moveToTarget = useCallback(async (start: { x: number; y: number }, end: { x: number; y: number }) => {
        if (isMoving) return;

        setIsMoving(true);
        const distance = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
        const controlOffset = Math.min(distance * 0.3, 100);
        const now = Date.now() * 0.001;

        const cp1 = {
            x: start.x + (end.x - start.x) * 0.3 + Math.sin(now) * controlOffset,
            y: start.y + (end.y - start.y) * 0.3 + Math.cos(now) * controlOffset
        };
        const cp2 = {
            x: start.x + (end.x - start.x) * 0.7 + Math.sin(now + Math.PI) * controlOffset,
            y: start.y + (end.y - start.y) * 0.7 + Math.cos(now + Math.PI) * controlOffset
        };

        await controls.start({
            x: [start.x, cp1.x, cp2.x, end.x],
            y: [start.y, cp1.y, cp2.y, end.y],
            scale: 1,
            opacity: 1,
            transition: {
                duration: Math.max(0.8, distance / 300) / speed,
                ease: [0.25, 0.46, 0.45, 0.94],
                times: [0, 0.3, 0.7, 1]
            }
        });

        setCurrentPosition(end);
        setIsMoving(false);
    }, [controls, isMoving, speed]);

    useEffect(() => {
        if (!active) return;
        controls.start({
            x: currentPosition.x,
            y: currentPosition.y,
            scale: 1,
            opacity: 1,
            transition: { duration: 0.25, ease: 'easeOut' }
        });
    }, [active, currentPosition.x, currentPosition.y, controls]);

    useEffect(() => {
        if (!active) return;

        if (action === 'return') {
            moveToTarget(currentPosition, homePosition).then(() => onActionComplete?.('return'));
            return;
        }

        if ((action === 'highlight' || action === 'point' || action === 'navigate' || action === 'roam') && !target) {
            return;
        }

        switch (action) {
            case 'highlight':
                moveToTarget(currentPosition, target!).then(() => {
                    controls.start({
                        scale: [1, 1.3, 1],
                        opacity: [0.82, 1, 0.82],
                        transition: { duration: 0.6, repeat: 2 }
                    });
                });
                break;
            case 'point':
            case 'navigate':
                moveToTarget(currentPosition, target!);
                break;
            case 'roam': {
                const roamTarget = {
                    x: target!.x + (Math.random() - 0.5) * 200,
                    y: target!.y + (Math.random() - 0.5) * 200
                };
                moveToTarget(currentPosition, roamTarget);
                break;
            }
            default:
                break;
        }
    }, [action, target, active, currentPosition, homePosition, controls, moveToTarget, onActionComplete]);

    if (!active && !isMoving) {
        return null;
    }

    const showBeam = action === 'point' || action === 'navigate';
    const showTether = active && action !== 'idle';

    const actionLabel =
        action === 'highlight' ? 'Highlight' :
        action === 'point' ? 'Hinweis' :
        action === 'navigate' ? 'Navigation' :
        action === 'return' ? 'Rueckkehr' :
        action === 'roam' ? 'Exploring' : 'Aktiv';

    return (
        <>
            {showTether && (
                <svg className="fixed inset-0 pointer-events-none z-[9997]" width="100%" height="100%">
                    <defs>
                        <filter id="mora-tether-glow">
                            <feGaussianBlur stdDeviation="1.8" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <line
                        x1={homePosition.x}
                        y1={homePosition.y}
                        x2={currentPosition.x}
                        y2={currentPosition.y}
                        stroke={visuals.color}
                        strokeOpacity="0.32"
                        strokeWidth="1.5"
                        strokeDasharray={action === 'navigate' ? '6 6' : '0'}
                        filter="url(#mora-tether-glow)"
                    />
                </svg>
            )}
            <motion.div
                ref={agentRef}
                className="fixed pointer-events-none z-[9999]"
                style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
                initial={{ scale: 1, opacity: 1, x: currentPosition.x, y: currentPosition.y }}
                animate={controls}
                exit={{ scale: 0, opacity: 0 }}
            >
                <div className="relative">
                    <motion.div
                        className="absolute -inset-4 rounded-full"
                        style={{
                            background: `radial-gradient(circle at 30% 30%, ${visuals.glow} 0%, transparent 50%), radial-gradient(circle at 70% 70%, ${visuals.color}40 0%, transparent 50%)`,
                            filter: 'blur(12px)'
                        }}
                        animate={animateAmbient ? {
                            scale: isMoving ? [1, 1.35, 1] : [1, 1.14, 1],
                            opacity: isMoving ? [0.5, 0.78, 0.5] : [0.32, 0.46, 0.32],
                            rotate: [0, 180, 360]
                        } : { scale: 1.05, opacity: 0.36, rotate: 0 }}
                        transition={animateAmbient ? {
                            duration: isMoving ? 1.4 : 6.5,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        } : { duration: 0.35 }}
                    />

                    <motion.div
                        className="absolute -inset-4"
                        animate={animateAmbient ? {
                            scale: [1, 1.12, 1],
                            opacity: [0.58, 0.84, 0.58]
                        } : { scale: 1.04, opacity: 0.68 }}
                        transition={animateAmbient ? {
                            duration: isMoving ? 0.9 : 1.8,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        } : { duration: 0.3 }}
                    >
                        <motion.div
                            className="absolute left-0 top-1/2 w-6 h-8 -translate-y-[80%] -translate-x-4 blur-[2px]"
                            style={{
                                background: `radial-gradient(ellipse at center, ${visuals.color}80 0%, transparent 80%)`,
                                borderRadius: '100% 10% 80% 80%'
                            }}
                            animate={animateAmbient ? {
                                rotate: isMoving ? [-28, 28, -28] : [-8, 8, -8],
                                scaleY: isMoving ? [1, 1.32, 1] : [1, 1.08, 1]
                            } : { rotate: -6, scaleY: 1.02 }}
                            transition={animateAmbient ? { duration: isMoving ? 0.22 : 1.7, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
                        />
                        <motion.div
                            className="absolute right-0 top-1/2 w-6 h-8 -translate-y-[80%] translate-x-4 blur-[2px]"
                            style={{
                                background: `radial-gradient(ellipse at center, ${visuals.color}80 0%, transparent 80%)`,
                                borderRadius: '10% 100% 80% 80%'
                            }}
                            animate={animateAmbient ? {
                                rotate: isMoving ? [28, -28, 28] : [8, -8, 8],
                                scaleY: isMoving ? [1, 1.32, 1] : [1, 1.08, 1]
                            } : { rotate: 6, scaleY: 1.02 }}
                            transition={animateAmbient ? { duration: isMoving ? 0.22 : 1.7, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
                        />
                    </motion.div>

                    <motion.div
                        className="relative w-8 h-8 rounded-full flex items-center justify-center overflow-visible"
                        style={{
                            background: `radial-gradient(circle at 35% 35%, white 0%, ${visuals.color} 40%, rgba(0,0,0,0.4) 100%)`,
                            boxShadow: `0 0 35px ${visuals.glow}, 0 0 70px ${visuals.glow}60, inset 0 0 10px white`
                        }}
                        animate={animateAmbient || action === 'highlight' ? {
                            scale: action === 'highlight' ? [1, 1.35, 1] : [1, 1.08, 1]
                        } : { scale: 1 }}
                        transition={{
                            scale: animateAmbient || action === 'highlight'
                                ? { duration: action === 'highlight' ? 0.3 : 2.2, repeat: Infinity, ease: 'easeInOut' }
                                : { duration: 0.25 }
                        }}
                    >
                        <motion.div
                            className="w-3 h-3 rounded-full"
                            style={{ background: 'white', boxShadow: `0 0 15px white, 0 0 25px ${visuals.color}` }}
                            animate={animateAmbient ? {
                                scale: [0.85, 1.45, 0.85],
                                opacity: [0.9, 1, 0.9],
                                filter: ['brightness(1)', 'brightness(1.8)', 'brightness(1)']
                            } : { scale: 1, opacity: 0.96, filter: 'brightness(1.15)' }}
                            transition={animateAmbient ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.25 }}
                        />
                    </motion.div>

                    {showBeam && (
                        <motion.div
                            className="absolute top-1/2 left-1/2 origin-left"
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
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
                                className="absolute right-0 top-1/2 w-2 h-2 rounded-full -translate-y-1/2"
                                style={{ backgroundColor: 'white', boxShadow: `0 0 8px ${visuals.color}, 0 0 16px white` }}
                                animate={animateAmbient ? { scale: [1, 1.45, 1], opacity: [0.82, 1, 0.82] } : { scale: 1.12, opacity: 0.92 }}
                                transition={animateAmbient ? { duration: 0.65, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
                            />
                        </motion.div>
                    )}

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
                                x: (Math.random() - 0.5) * 40 - 15,
                                y: (Math.random() - 0.5) * 30
                            }}
                            transition={{ duration: 0.55 + i * 0.08, ease: 'easeOut', delay: i * 0.06 }}
                        />
                    ))}

                    {animateAmbient && !isMoving && Array.from({ length: 3 }).map((_, i) => (
                        <motion.div
                            key={`sparkle-${i}`}
                            className="absolute rounded-full"
                            style={{ width: 2, height: 2, background: 'white', boxShadow: `0 0 4px ${visuals.color}` }}
                            animate={{
                                x: [0, Math.cos(i * Math.PI / 2) * 20, 0],
                                y: [0, Math.sin(i * Math.PI / 2) * 20, 0],
                                opacity: [0, 0.8, 0],
                                scale: [0.5, 1, 0.5]
                            }}
                            transition={{ duration: 3.2 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
                        />
                    ))}

                    {message && action !== 'return' && (
                        <motion.div
                            className="absolute left-1/2 top-[-56px] -translate-x-1/2 max-w-[220px]"
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            <div
                                className="rounded-xl px-3 py-2 text-[11px] leading-snug text-white/90 backdrop-blur-xl border shadow-2xl"
                                style={{
                                    background: 'linear-gradient(180deg, rgba(4,10,8,0.90) 0%, rgba(2,6,5,0.96) 100%)',
                                    borderColor: `${visuals.color}40`,
                                    boxShadow: `0 0 24px ${visuals.glow}30`
                                }}
                            >
                                {message}
                            </div>
                        </motion.div>
                    )}

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
                                {actionLabel}
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </>
    );
}
