'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveRitualScene } from '@/lib/hooks/useActiveRitualScene';
import type { RitualSceneId } from '@/lib/os/ritualMode';

const SCENE_PANEL_BG: Record<RitualSceneId, string> = {
    flow:   'rgba(6, 22, 14, 0.82)',
    build:  'rgba(5, 14, 28, 0.82)',
    lounge: 'rgba(26, 12, 5, 0.82)',
    night:  'rgba(10, 8, 28, 0.82)',
};

/**
 * RitualSceneStyler — the global color pipeline.
 *
 * Two jobs:
 * 1. Writes CSS vars to documentElement (scene-accent, aura, hex, glow, panel-bg).
 * 2. Renders a VISIBLE full-screen scene overlay for dramatic scene color changes.
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
        root.setProperty('--scene-panel-bg', SCENE_PANEL_BG[scene.id]);
    }, [scene.accent, scene.accentHex, scene.aura, scene.id]);

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
