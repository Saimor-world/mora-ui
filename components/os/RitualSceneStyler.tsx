'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveRitualScene } from '@/lib/hooks/useActiveRitualScene';

/**
 * RitualSceneStyler — the global color pipeline.
 *
 * Two jobs:
 * 1. Writes CSS vars to documentElement (scene-accent, aura, hex, glow).
 * 2. Renders a VISIBLE full-screen scene overlay — the reason the color
 *    change was always "too subtle": the atmosphere layers were too dim.
 *    This overlay IS the dominant scene color. Radically opaque by design.
 */
export function RitualSceneStyler() {
    const scene = useActiveRitualScene();

    // CSS vars — consumed by any component via var(--scene-accent) etc.
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement.style;
        root.setProperty('--scene-accent', scene.accent);
        root.setProperty('--scene-accent-hex', scene.accentHex);
        root.setProperty('--scene-aura', scene.aura);
        root.setProperty('--scene-glow', `0 0 60px ${scene.accent}`);
        root.setProperty('--scene-border', `${scene.accentHex}55`);
    }, [scene.accent, scene.accentHex, scene.aura]);

    // Visible overlay — the actual dramatic re-tint
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={scene.id}
                className="pointer-events-none fixed inset-0 z-[4]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                style={{
                    background: [
                        `radial-gradient(ellipse 90% 60% at 50% 0%, ${scene.accent} 0%, transparent 65%)`,
                        `radial-gradient(ellipse 60% 40% at 15% 80%, ${scene.aura} 0%, transparent 55%)`,
                        `radial-gradient(ellipse 40% 30% at 85% 70%, ${scene.accent.replace(/[\d.]+\)$/, '0.4)')} 0%, transparent 50%)`,
                    ].join(', '),
                    mixBlendMode: 'screen',
                }}
            />
        </AnimatePresence>
    );
}

export default RitualSceneStyler;
