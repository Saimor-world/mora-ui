"use client";

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { UniverseLens } from './OrganizationField';

interface Props {
    lens: UniverseLens;
    selected: boolean;
}

/**
 * Universe v3 – bright, airy ambient field
 *
 * Marius's direction: "brighter, airier, the background image clearly visible".
 * The nebula photo carries the scene; overlays only add warmth and subtle tints
 * without darkening. Empty space feels intentional, not unfinished.
 */
export function UniverseAmbientField({ lens, selected }: Props) {
    const reducedMotion = useReducedMotion();

    return (
        <div className="pointer-events-none absolute inset-0 z-[4] overflow-hidden" aria-hidden="true">
            {/* The nebula background – significantly brighter. Marius: "echtes
                Universum als Grundlage, in den warmen Farben". */}
            <motion.div
                className="absolute -inset-[3%] bg-cover bg-center"
                style={{
                    backgroundImage: 'url(/universe/deep-space-warm.jpg)',
                    filter: 'brightness(3.15) saturate(1.06) contrast(0.92)',
                }}
                animate={reducedMotion ? undefined : { scale: [1, 1.02, 1], x: [0, -8, 0], y: [0, 5, 0] }}
                transition={{ duration: 120, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Very light vignette for readability – no heavy darkening. */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse at 50% 48%, transparent 0%, transparent 72%, rgba(40,28,16,0.06) 100%)',
                }}
            />

            {/* Warm/cool tint based on lens – extremely subtle. */}
            <motion.div
                className="absolute inset-0"
                animate={{
                    background: lens === 'relations'
                        ? 'radial-gradient(ellipse at 55% 40%, rgba(255,225,180,0.04), transparent 50%), radial-gradient(ellipse at 20% 75%, rgba(180,220,210,0.03), transparent 50%)'
                        : 'radial-gradient(ellipse at 48% 40%, rgba(255,230,190,0.05), transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(180,215,220,0.04), transparent 50%)',
                }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
            />

            {/* Soft jade glow at center – subtle presence of light. */}
            <motion.div
                className="absolute left-1/2 top-1/2 h-[60vh] max-h-[600px] w-[60vh] max-w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
                style={{ background: 'radial-gradient(circle, rgba(150,215,190,0.08), transparent 65%)' }}
                animate={reducedMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.6, 0.8, 0.6] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Warm accents in corners – very light. */}
            <motion.div
                className="absolute -bottom-[10%] -left-[5%] h-[40%] w-[50%] rounded-full blur-[100px]"
                style={{ background: 'radial-gradient(circle, rgba(230,190,130,0.06), transparent 60%)' }}
                animate={reducedMotion ? undefined : { opacity: [0.5, 0.7, 0.5] }}
                transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Occasional meteor – calmer, less frequent. */}
            {!reducedMotion && (
                <motion.span
                    className="absolute h-px w-24 origin-left rotate-[-20deg] rounded-full bg-gradient-to-r from-transparent via-amber-50/60 to-white shadow-[0_0_8px_rgba(255,240,200,0.35)]"
                    style={{ left: '25%', top: '18%' }}
                    initial={{ x: -140, y: -60, opacity: 0 }}
                    animate={{ x: [-140, 380], y: [-60, 140], opacity: [0, 0.7, 0] }}
                    transition={{ duration: 2.2, delay: 8, repeat: Infinity, repeatDelay: 25, ease: 'easeOut' }}
                />
            )}

            {/* Selection dimmer – lighter than before. */}
            <motion.div
                className="absolute inset-0"
                animate={{ opacity: selected ? 0.25 : 0 }}
                transition={{ duration: 0.6 }}
                style={{ background: 'radial-gradient(circle at center, transparent 32%, rgba(28,22,16,0.16) 100%)' }}
            />

            {/* Very subtle grid – almost invisible, just adds structure. */}
            <div
                className="absolute inset-0 opacity-[0.015]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.25) 1px,transparent 1px)',
                    backgroundSize: '100px 100px',
                }}
            />
        </div>
    );
}
