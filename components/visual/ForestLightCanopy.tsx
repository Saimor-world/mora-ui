"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { OrbState } from '@/lib/api/awarenessClient';

interface ForestLightCanopyProps {
    orbState: OrbState;
    demoMode?: boolean;
}

const stateColors: Record<OrbState, { core: string; glow: string; secondary: string; accent: string }> = {
    idle: { core: '#10B981', glow: 'rgba(16,185,129,0.35)', secondary: 'rgba(6,182,212,0.25)', accent: 'rgba(139,92,246,0.15)' },
    watch: { core: '#06B6D4', glow: 'rgba(6,182,212,0.4)', secondary: 'rgba(16,185,129,0.3)', accent: 'rgba(236,72,153,0.15)' },
    focus: { core: '#10B981', glow: 'rgba(16,185,129,0.5)', secondary: 'rgba(13,148,136,0.4)', accent: 'rgba(16,185,129,0.2)' },
    thinking: { core: '#3B82F6', glow: 'rgba(59,130,246,0.4)', secondary: 'rgba(168,85,247,0.35)', accent: 'rgba(6,182,212,0.2)' },
    alert: { core: '#EF4444', glow: 'rgba(239,68,68,0.4)', secondary: 'rgba(245,158,11,0.2)', accent: 'rgba(127,29,29,0.3)' },
    insight: { core: '#F59E0B', glow: 'rgba(245,158,11,0.4)', secondary: 'rgba(251,191,36,0.3)', accent: 'rgba(255,255,255,0.2)' },
    demo: { core: '#0D9488', glow: 'rgba(13,148,136,0.3)', secondary: 'rgba(20,184,166,0.2)', accent: 'rgba(16,185,129,0.15)' },
    curious: { core: '#06B6D4', glow: 'rgba(6,182,212,0.35)', secondary: 'rgba(16,185,129,0.25)', accent: 'rgba(139,92,246,0.15)' },
    learning: { core: '#8B5CF6', glow: 'rgba(139,92,246,0.4)', secondary: 'rgba(6,182,212,0.3)', accent: 'rgba(16,185,129,0.2)' },
    watching: { core: '#10B981', glow: 'rgba(16,185,129,0.3)', secondary: 'rgba(6,182,212,0.2)', accent: 'rgba(139,92,246,0.12)' }
};

export const ForestLightCanopy: React.FC<ForestLightCanopyProps> = ({ orbState, demoMode }) => {
    const palette = useMemo(() => stateColors[orbState] || stateColors.idle, [orbState]);
    const prefersReducedMotion = useReducedMotion();
    const [isDocumentVisible, setIsDocumentVisible] = useState(
        typeof document === 'undefined' ? true : !document.hidden
    );
    const animateAmbient =
        !prefersReducedMotion &&
        isDocumentVisible &&
        (demoMode ||
            orbState === 'thinking' ||
            orbState === 'focus' ||
            orbState === 'insight' ||
            orbState === 'learning' ||
            orbState === 'alert');

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const handleVisibilityChange = () => {
            setIsDocumentVisible(!document.hidden);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    return (
        <div className="fixed inset-0 z-[-10] pointer-events-none overflow-hidden bg-[#000102]">
            {/* 1. DEEP STARFIELD (The "Universe" Layer) */}
            {/* V10.7: Mixed density to match user request: "Bisschen Sterne und Universum" */}
            <div className="absolute inset-0 opacity-50">
                {/* Distant Micro-Stars */}
                <div className="absolute inset-0 bg-[radial-gradient(white_1px,transparent_1px)] [background-size:60px_60px] opacity-[0.1]" />
                {/* Mid-Range Stars */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.4)_1.5px,transparent_1px)] bg-[length:250px_250px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.3)_1.5px,transparent_1px)] bg-[length:350px_350px]" />
                {/* Bright Pilot Stars */}
                <div
                    className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,230,200,0.8)_2px,rgba(255,255,255,0)_4px)] bg-[length:600px_600px] ${animateAmbient ? 'animate-pulse' : ''}`}
                    style={animateAmbient ? { animationDuration: '8s' } : undefined}
                />
            </div>

            {/* 1.5 CONSTELLATIONS (Sternbilder - Enhanced with Green Glow) */}
            <div className="absolute inset-0 opacity-60">
                {/* Green Glow Filter */}
                <svg className="w-0 h-0 absolute">
                    <filter id="greenGlow">
                        <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#10b981" floodOpacity="0.5" />
                    </filter>
                </svg>
                <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                    {/* Slow floating constellation lines */}
                    {animateAmbient ? (
                        <>
                            <path
                                d="M 100 100 L 300 250 L 500 150"
                                stroke="rgba(255,255,255,0.8)"
                                strokeWidth="1"
                                fill="none"
                                filter="url(#greenGlow)"
                                className="forest-canopy-constellation forest-canopy-constellation-a"
                            />
                            <path
                                d="M 800 200 L 700 400 L 850 600 L 900 300 Z"
                                stroke="rgba(255,255,255,0.8)"
                                strokeWidth="1"
                                fill="none"
                                filter="url(#greenGlow)"
                                className="forest-canopy-constellation forest-canopy-constellation-b"
                            />
                        </>
                    ) : (
                        <>
                            <path
                                d="M 100 100 L 300 250 L 500 150"
                                stroke="rgba(255,255,255,0.28)"
                                strokeWidth="1"
                                fill="none"
                                filter="url(#greenGlow)"
                            />
                            <path
                                d="M 800 200 L 700 400 L 850 600 L 900 300 Z"
                                stroke="rgba(255,255,255,0.24)"
                                strokeWidth="1"
                                fill="none"
                                filter="url(#greenGlow)"
                            />
                        </>
                    )}
                </svg>
            </div>

            {/* 2. NEBULA PILLARS (The "Deep Galaxy" Layer) */}
            {/* Reduced Green, More Deep Space/Void Blue/Indigo */}
            <div className="absolute inset-0 opacity-20 mix-blend-screen">
                {/* Pillar 1: Golden/Red Cosmic Dust (Warmer contrast) */}
                <div
                    className={`absolute bottom-[-20%] left-[10%] w-[60vw] h-[80vh] rounded-full blur-[100px] ${
                        animateAmbient ? 'forest-canopy-nebula-a' : ''
                    }`}
                    style={{ background: 'conic-gradient(from 180deg, #7c2d12, #ea580c, transparent)', opacity: animateAmbient ? undefined : 0.18 }}
                />
                {/* Pillar 2: Deep Indigo/Cyan (Less Green) */}
                <div
                    className={`absolute top-[-10%] right-[10%] w-[70vw] h-[70vh] rounded-full blur-[120px] ${
                        animateAmbient ? 'forest-canopy-nebula-b' : ''
                    }`}
                    style={{ background: 'radial-gradient(circle, #1e3a8a, #4338ca, transparent)', opacity: animateAmbient ? undefined : 0.16 }}
                />
            </div>

            {/* 3. MORA FLOW (Silk Currents - Calmed & Bluer) */}
            <div
                className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-[60vh] opacity-15 mix-blend-screen ${
                    animateAmbient ? 'forest-canopy-flow' : ''
                }`}
                style={{
                    background: 'linear-gradient(90deg, transparent 0%, #1e40af 20%, #7c3aed 50%, #0891b2 80%, transparent 100%)',
                    filter: 'blur(120px)',
                    opacity: animateAmbient ? undefined : 0.16,
                }}
            />

            {/* 4. CHROMATIC CLOUDS (Weightlessness - Deep) */}
            <div
                className={`absolute -left-[10%] top-[10%] w-[80vw] h-[80vw] rounded-full opacity-10 mix-blend-color-dodge ${
                    animateAmbient ? 'forest-canopy-cloud' : ''
                }`}
                style={{
                    background: 'radial-gradient(circle, #1e3a8a 0%, transparent 70%)',
                    filter: 'blur(180px)',
                    opacity: animateAmbient ? undefined : 0.08,
                }}
            />

            {/* 5. GHOST GALAXY CLUSTERS (Very faint) */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div
                    className={`absolute top-[20%] left-[30%] w-64 h-32 rounded-full border border-white/5 blur-xl rotate-[15deg] ${
                        animateAmbient ? 'forest-canopy-ghost' : ''
                    }`}
                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 80%)', opacity: animateAmbient ? undefined : 0.22 }}
                />
            </div>

            {/* 6. GRAIN & VIGNETTE */}
            <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none bg-noise" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_40%,rgba(0,0,0,0.7)_100%)]" />
        </div>
    );
};
