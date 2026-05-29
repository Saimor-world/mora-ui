'use client';

import { useEffect } from 'react';
import { useActiveRitualScene } from '@/lib/hooks/useActiveRitualScene';

/**
 * RitualSceneStyler — the global color pipeline that was always missing.
 *
 * Mounted once in the shell. Writes the active ritual scene's colors to the
 * document root as CSS variables, so ANY surface can re-tint with the scene
 * via var(--scene-accent) / var(--scene-aura) / var(--scene-accent-hex).
 * Re-applies reactively whenever the scene changes (the hook listens to
 * RITUAL_MODE_UPDATED_EVENT). Renders nothing.
 */
export function RitualSceneStyler() {
    const scene = useActiveRitualScene();

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement.style;
        root.setProperty('--scene-accent', scene.accent);
        root.setProperty('--scene-accent-hex', scene.accentHex);
        root.setProperty('--scene-aura', scene.aura);
        root.setProperty('--scene-glow', `0 0 28px ${scene.accent}`);
    }, [scene.accent, scene.accentHex, scene.aura]);

    return null;
}

export default RitualSceneStyler;
