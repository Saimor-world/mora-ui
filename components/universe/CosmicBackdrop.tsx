'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useActiveRitualScene } from '@/lib/hooks/useActiveRitualScene';
import { ACCENT_STARS, UNIVERSE_BASE, UNIVERSE_NEBULA } from '@/lib/universe/backdrop';

interface CosmicBackdropProps {
    /** Optional department tint merged into nebula (hex). */
    deptTint?: string;
    calmFactor?: number;
    parallax?: { x: number; y: number };
}

/**
 * Shared starfield + nebula ambient layer for Universe and Department surfaces.
 * Shell StarField remains visible underneath — this adds the cinematic depth field.
 */
export function CosmicBackdrop({ deptTint, calmFactor = 1, parallax = { x: 0, y: 0 } }: CosmicBackdropProps) {
    const ritualScene = useActiveRitualScene();

    const deptNebula = useMemo(() => {
        if (!deptTint) return null;
        const g = deptTint;
        return `
            radial-gradient(900px 520px at 50% 48%, ${g}28 0%, transparent 62%),
            radial-gradient(640px 380px at 22% 68%, ${g}14 0%, transparent 58%)`;
    }, [deptTint]);

    return (
        <>
            <motion.div
                key={`base-${ritualScene.id}`}
                className="absolute inset-0 z-[-10] pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                style={{ background: UNIVERSE_BASE[ritualScene.id] }}
            />
            <motion.div
                key={`nebula-${ritualScene.id}`}
                className="absolute inset-0 z-[-9] pointer-events-none"
                animate={{
                    x: parallax.x * 0.2,
                    y: parallax.y * 0.14,
                    opacity: 0.72 * calmFactor,
                }}
                transition={{ type: 'spring', stiffness: 28, damping: 18 }}
                style={{ background: UNIVERSE_NEBULA[ritualScene.id], mixBlendMode: 'screen' }}
            />
            {deptNebula && (
                <div
                    className="absolute inset-0 z-[-9] pointer-events-none"
                    style={{ background: deptNebula, mixBlendMode: 'screen', opacity: 0.55 * calmFactor }}
                />
            )}
            <div
                className="absolute inset-0 z-[-7] pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at 50% 48%, rgba(255,255,255,0.024) 0%, rgba(255,255,255,0.010) 24%, rgba(0,0,0,0.18) 64%, rgba(0,0,0,0.48) 100%)',
                }}
            />
            <motion.div
                className="absolute inset-0 z-[-6] pointer-events-none"
                animate={{ x: parallax.x * 0.5, y: parallax.y * 0.3, opacity: calmFactor }}
                transition={{ type: 'spring', stiffness: 24, damping: 18 }}
            >
                {ACCENT_STARS.map((star) => (
                    <div
                        key={star.id}
                        className="absolute rounded-full"
                        style={{
                            left: `${star.left}%`,
                            top: `${star.top}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            background: star.color,
                            boxShadow: `0 0 ${Math.max(8, star.size * 10)}px ${star.color}`,
                            opacity: star.opacity,
                        }}
                    />
                ))}
            </motion.div>
        </>
    );
}
