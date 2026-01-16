"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoraStore } from '@/lib/store/moraState';

/**
 * MÔRA CURSOR AGENT - DER VERLÄNGERTE ARM DER KI
 * 
 * Laut Masterbibel 1.2.3 (C):
 * - Der Cursor ist die körperliche Manifestation der KI
 * - Fliegt aus dem Orb heraus
 * - Zeigt Dinge, klickt, markiert
 * - Formiert sich zu einem lichtpunktähnlichen Cursor
 */

interface MoraCursorAgentProps {
    enabled?: boolean;
}

type AgentState = 'dormant' | 'emerging' | 'active' | 'pointing' | 'returning';

export const UserCursor: React.FC<MoraCursorAgentProps> = ({ enabled = true }) => {
    const orbState = useMoraStore(s => s.orbState);

    // Agent state
    const [agentState, setAgentState] = useState<AgentState>('dormant');
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [targetElement, setTargetElement] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // Calculate Orb position (bottom-right, matching MoraShell)
    const getOrbPosition = useCallback(() => {
        if (typeof window === 'undefined') return { x: 0, y: 0 };
        return {
            x: window.innerWidth - 80,
            y: window.innerHeight - 120
        };
    }, []);

    // Listen for AI commands to activate the cursor
    useEffect(() => {
        const handleAgencyCommand = (e: CustomEvent) => {
            const { action, targetId, targetPosition, message: msg } = e.detail;

            switch (action) {
                case 'point':
                case 'highlight':
                case 'navigate':
                    const orbPos = getOrbPosition();
                    setPosition(orbPos);
                    setAgentState('emerging');
                    setMessage(msg || null);

                    setTimeout(() => {
                        if (targetPosition) {
                            setPosition(targetPosition);
                        } else if (targetId) {
                            const el = document.querySelector(`[data-agency-id="${targetId}"]`) ||
                                document.getElementById(targetId);
                            if (el) {
                                const rect = el.getBoundingClientRect();
                                setPosition({
                                    x: rect.left + rect.width / 2,
                                    y: rect.top + rect.height / 2
                                });
                                setTargetElement(targetId);
                            }
                        }
                        setAgentState('pointing');
                    }, 500);

                    setTimeout(() => {
                        setAgentState('returning');
                        setPosition(getOrbPosition());
                        setTimeout(() => {
                            setAgentState('dormant');
                            setMessage(null);
                            setTargetElement(null);
                        }, 800);
                    }, 3000);
                    break;

                case 'activate':
                    const startPos = getOrbPosition();
                    setPosition({
                        x: startPos.x - 100,
                        y: startPos.y - 50
                    });
                    setAgentState('active');
                    break;

                case 'deactivate':
                case 'return':
                    setAgentState('returning');
                    setPosition(getOrbPosition());
                    setTimeout(() => setAgentState('dormant'), 800);
                    break;
            }
        };

        window.addEventListener('mora:cursor' as any, handleAgencyCommand);
        window.addEventListener('agency:cursor' as any, handleAgencyCommand);

        return () => {
            window.removeEventListener('mora:cursor' as any, handleAgencyCommand);
            window.removeEventListener('agency:cursor' as any, handleAgencyCommand);
        };
    }, [getOrbPosition]);

    // React to orbState changes
    useEffect(() => {
        if (orbState === 'thinking' && agentState === 'dormant') {
            const orbPos = getOrbPosition();
            setPosition({
                x: orbPos.x - 60,
                y: orbPos.y - 40
            });
            setAgentState('active');
        } else if (orbState === 'idle' && agentState === 'active') {
            setAgentState('returning');
            setPosition(getOrbPosition());
            setTimeout(() => setAgentState('dormant'), 1000);
        }
    }, [orbState, agentState, getOrbPosition]);

    if (!enabled || agentState === 'dormant') return null;

    const getVisualConfig = () => {
        switch (agentState) {
            case 'emerging': return { size: 16, color: '#10B981', glow: '#10B981', opacity: 0.8, trail: true };
            case 'active': return { size: 20, color: orbState === 'thinking' ? '#3B82F6' : '#10B981', glow: orbState === 'thinking' ? '#3B82F6' : '#10B981', opacity: 1, trail: true };
            case 'pointing': return { size: 24, color: '#D4AF37', glow: '#D4AF37', opacity: 1, trail: false };
            case 'returning': return { size: 12, color: '#10B981', glow: '#10B981', opacity: 0.6, trail: true };
            default: return { size: 16, color: '#10B981', glow: '#10B981', opacity: 0.8, trail: false };
        }
    };

    const config = getVisualConfig();

    return (
        <AnimatePresence>
            <motion.div
                className="fixed pointer-events-none z-[200]"
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                    x: position.x - config.size / 2,
                    y: position.y - config.size / 2,
                    opacity: config.opacity,
                    scale: 1,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                    type: 'spring',
                    damping: 25,
                    stiffness: 120,
                    mass: 0.5
                }}
            >
                {/* Floating Animation handled purely by CSS/Motion to avoid React State depth errors */}
                <motion.div
                    animate={agentState === 'active' ? {
                        y: [0, -10, 0],
                        x: [0, 5, 0]
                    } : {}}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    {/* Shadow / Glow */}
                    {config.trail && (
                        <motion.div
                            className="absolute rounded-full"
                            style={{
                                width: config.size * 3,
                                height: config.size * 3,
                                left: -config.size,
                                top: -config.size,
                                background: `radial-gradient(circle, ${config.glow}40, transparent 70%)`,
                                filter: 'blur(8px)'
                            }}
                        />
                    )}

                    {/* Core Light */}
                    <div
                        className="rounded-full"
                        style={{
                            width: config.size,
                            height: config.size,
                            background: `radial-gradient(circle at 30% 30%, ${config.color}, ${config.color}80)`,
                            boxShadow: `0 0 ${config.size}px ${config.glow}80, 0 0 ${config.size * 2}px ${config.glow}40`
                        }}
                    />
                </motion.div>

                {/* Pointing Rings */}
                {agentState === 'pointing' && (
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ left: -config.size / 2, top: -config.size / 2, width: config.size * 2, height: config.size * 2 }}
                    >
                        <motion.div
                            className="absolute inset-0 rounded-full border-2"
                            style={{ borderColor: config.color }}
                            animate={{ scale: [1, 2], opacity: [1, 0] }}
                            transition={{ duration: 1, repeat: Infinity }}
                        />
                    </motion.div>
                )}

                {/* Message Bubble */}
                {message && agentState === 'pointing' && (
                    <motion.div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-sm border border-white/20 text-xs text-white/90">
                            {message}
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default UserCursor;
