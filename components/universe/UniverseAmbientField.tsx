"use client";

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { UniverseLens } from './OrganizationField';
import type { UniverseTheme } from '@/lib/universe/universeTheme';

interface Props {
    lens: UniverseLens;
    selected: boolean;
}

/**
 * Shared field atmosphere. Dark follows saimor.world (deep black-green, jade nebula, gold).
 * Light is a soft Aero sky. Layout stays the same; only the air changes.
 */
export function UniverseAmbientField({ lens, selected }: Props) {
    const reducedMotion = useReducedMotion();
    const [theme, setTheme] = useState<UniverseTheme>('dark');
    useEffect(() => {
        const read = () => setTheme(document.documentElement.dataset.uv2Theme === 'light' ? 'light' : 'dark');
        read();
        const mo = new MutationObserver(read);
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-uv2-theme'] });
        return () => mo.disconnect();
    }, []);
    const light = theme === 'light';

    return (
        <div className="pointer-events-none absolute inset-0 z-[4] overflow-hidden" aria-hidden="true" data-uv2-ambient={theme}>
            {light ? (
                <>
                    <div className="absolute inset-0" style={{
                        background: selected
                            ? 'radial-gradient(circle at 33% 50%, #fff8dc 0, #fdeec0 22%, transparent 55%), radial-gradient(ellipse at 80% 20%, #eaf6ff, transparent 60%), linear-gradient(160deg, #fbf6ea, #e9f3fb)'
                            : 'radial-gradient(ellipse at 30% 20%, #ffffff 0, #e6f6ff 30%, transparent 60%), radial-gradient(ellipse at 75% 70%, #f3e8ff 0, transparent 55%), radial-gradient(ellipse at 15% 85%, #dff7ef 0, transparent 50%), linear-gradient(160deg, #eaf7ff, #cfeafb 50%, #e9f3ff)',
                    }} />
                </>
            ) : (
                <>
                    <motion.div
                        className="absolute -inset-[3%] bg-cover bg-center"
                        style={{
                            backgroundImage: 'url(/universe/deep-space-warm.jpg)',
                            filter: 'brightness(0.72) saturate(1.15) hue-rotate(-12deg) contrast(1.08)',
                        }}
                        animate={reducedMotion ? undefined : { scale: [1, 1.02, 1], x: [0, -8, 0], y: [0, 5, 0] }}
                        transition={{ duration: 120, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div className="absolute inset-0" style={{
                        background: 'radial-gradient(ellipse at 50% 48%, rgba(8,18,16,0.18) 0%, rgba(5,7,6,0.42) 58%, rgba(5,7,6,0.72) 100%)',
                    }} />
                    <motion.div
                        className="absolute left-1/2 top-1/2 h-[58vh] max-h-[560px] w-[58vh] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[110px]"
                        style={{ background: 'radial-gradient(circle, rgba(46,140,110,0.22), rgba(214,168,72,0.08) 46%, transparent 68%)' }}
                        animate={reducedMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.55, 0.85, 0.55] }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div className="absolute inset-0" style={{
                        background: lens === 'relations'
                            ? 'radial-gradient(ellipse at 55% 40%, rgba(214,168,72,0.06), transparent 50%)'
                            : 'radial-gradient(ellipse at 80% 18%, rgba(64,160,130,0.08), transparent 48%)',
                    }} />
                </>
            )}

            <motion.div
                className="absolute inset-0"
                animate={{ opacity: selected ? (light ? 0.18 : 0.28) : 0 }}
                transition={{ duration: 0.6 }}
                style={{ background: light
                    ? 'radial-gradient(circle at center, transparent 42%, rgba(80,110,140,0.08) 100%)'
                    : 'radial-gradient(circle at center, transparent 32%, rgba(5,7,6,0.38) 100%)' }}
            />
        </div>
    );
}
