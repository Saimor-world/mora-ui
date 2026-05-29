'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import {
    RITUAL_SCENES,
    RITUAL_MODE_UPDATED_EVENT,
    resolveRitualSettings,
    getEffectiveRitualScene,
    type RitualSceneDefinition,
} from '@/lib/os/ritualMode';

/**
 * useActiveRitualScene — the SINGLE reactive source for the current ritual scene.
 *
 * Why this exists: scene changes fire RITUAL_MODE_UPDATED_EVENT, but consumers
 * (atmosphere, orb) never listened to it — so the OS never re-tinted on switch
 * ("Farbwechsel klappt nicht, noch nie"). This hook subscribes to that event
 * (same-tab), to cross-tab storage changes, AND ticks each minute so autoTime
 * scenes cross their time boundaries. Returns the effective scene definition.
 */
export function useActiveRitualScene(): RitualSceneDefinition {
    const userSettings = useSessionStore((state) => state.user?.settings);
    // Bump counter forces a re-resolve when the scene is changed elsewhere.
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const bump = () => setTick((t) => t + 1);

        // Same-tab: scene changed in the Command Center.
        window.addEventListener(RITUAL_MODE_UPDATED_EVENT, bump);
        // Cross-tab: localStorage write from another tab.
        window.addEventListener('storage', bump);
        // autoTime: re-resolve every minute so time-band boundaries take effect.
        const interval = window.setInterval(bump, 60_000);

        return () => {
            window.removeEventListener(RITUAL_MODE_UPDATED_EVENT, bump);
            window.removeEventListener('storage', bump);
            window.clearInterval(interval);
        };
    }, []);

    return useMemo(() => {
        const settings = resolveRitualSettings(userSettings);
        const sceneId = getEffectiveRitualScene(settings, new Date());
        return RITUAL_SCENES[sceneId];
        // tick is intentionally a dependency: it forces re-resolution on events.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userSettings, tick]);
}

export default useActiveRitualScene;
