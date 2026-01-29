"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { OrbState } from '@/lib/api/awarenessClient';

interface ForestLightCanopyProps {
    orbState: OrbState;
    demoMode?: boolean;
}

const stateColors: Record<OrbState, { core: string; glow: string; beam: string }> = {
    idle: { core: '#10B981', glow: 'rgba(16,185,129,0.35)', beam: 'rgba(16,185,129,0.18)' },
    watch: { core: '#06B6D4', glow: 'rgba(6,182,212,0.35)', beam: 'rgba(6,182,212,0.18)' },
    focus: { core: '#10B981', glow: 'rgba(16,185,129,0.45)', beam: 'rgba(16,185,129,0.22)' },
    thinking: { core: '#3B82F6', glow: 'rgba(59,130,246,0.45)', beam: 'rgba(59,130,246,0.22)' },
    alert: { core: '#EF4444', glow: 'rgba(239,68,68,0.4)', beam: 'rgba(239,68,68,0.18)' },
    insight: { core: '#F59E0B', glow: 'rgba(245,158,11,0.45)', beam: 'rgba(245,158,11,0.22)' },
    demo: { core: '#3B82F6', glow: 'rgba(59,130,246,0.35)', beam: 'rgba(59,130,246,0.16)' }
};

export const ForestLightCanopy: React.FC<ForestLightCanopyProps> = ({ orbState, demoMode }) => {
    const palette = stateColors[orbState] || stateColors.idle;

    const rays = useMemo(() => {
        const count = demoMode ? 5 : 7;
        return Array.from({ length: count }, (_, idx) => ({
            id: `ray-${idx}`,
            rotation: (360 / count) * idx + (idx % 2 === 0 ? 8 : -6),
            delay: idx * 0.3
        }));
    }, [demoMode]);

    return (
        <div className="fixed inset-0 z-[1] pointer-events-none">
            {/* Ambient forest glow */}
            <motion.div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(circle at 30% 10%, rgba(16,185,129,0.22) 0%, transparent 45%),
                                 radial-gradient(circle at 70% 25%, rgba(234,179,8,0.18) 0%, transparent 40%),
                                 radial-gradient(circle at 50% 80%, ${palette.glow} 0%, transparent 55%)`
                }}
                animate={{ opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Orb sunlight bloom (bottom-right) */}
            <motion.div
                className="absolute -right-40 -bottom-40 w-[800px] h-[800px] rounded-full"
                style={{
                    background: `radial-gradient(circle at 40% 40%, ${palette.glow} 0%, transparent 60%)`,
                    filter: 'blur(12px)'
                }}
                animate={{ scale: [0.9, 1.05, 0.9], opacity: [0.6, 0.85, 0.6] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Sunbeams */}
            {rays.map((ray) => (
                <motion.div
                    key={ray.id}
                    className="absolute inset-0"
                    style={{
                        background: `linear-gradient(120deg, transparent 20%, ${palette.beam} 50%, transparent 80%)`,
                        mixBlendMode: 'screen',
                        transform: `rotate(${ray.rotation}deg)`
                    }}
                    animate={{ opacity: [0.08, 0.22, 0.08] }}
                    transition={{ duration: 6, delay: ray.delay, repeat: Infinity, ease: "easeInOut" }}
                />
            ))}
        </div>
    );
};
