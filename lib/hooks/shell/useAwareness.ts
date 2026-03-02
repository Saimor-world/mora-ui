/**
 * useAwareness - Mora Awareness Pulse Polling
 *
 * Polls the awareness API with exponential backoff on errors.
 * Returns the current orb state.
 *
 * PERFORMANCE: Lightweight polling with immediate first fetch + backoff on errors.
 */

import { useState, useEffect } from 'react';
import { fetchAwarenessPulse, type OrbState } from '@/lib/api/awarenessClient';

const INITIAL_INTERVAL = 15000; // 15 seconds
const MAX_INTERVAL = 180000; // 3 minutes

export function useAwareness(): OrbState {
    const [orbState, setOrbState] = useState<OrbState>('idle');

    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;
        let interval = INITIAL_INTERVAL;

        const loadAwareness = async () => {
            try {
                const pulse = await fetchAwarenessPulse();
                if (isMounted) {
                    setOrbState(pulse.state);
                    interval = INITIAL_INTERVAL; // Reset on success
                }
            } catch (error) {
                // Apply exponential backoff on error
                interval = Math.min(interval * 1.5, MAX_INTERVAL);
            }
            if (isMounted) {
                // Small jitter avoids synchronized polling spikes across clients.
                timeoutId = setTimeout(loadAwareness, interval + Math.floor(Math.random() * 1500));
            }
        };

        // Fetch immediately on mount so the Orb can pick up live awareness quickly.
        void loadAwareness();

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, []);

    return orbState;
}
