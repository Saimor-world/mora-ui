/**
 * useAwareness - MÔRA Awareness Pulse Polling
 *
 * Polls the awareness API with exponential backoff on errors.
 * Returns the current orb state.
 */

import { useState, useEffect } from 'react';
import { fetchAwarenessPulse, type OrbState } from '@/lib/api/awarenessClient';

const INITIAL_INTERVAL = 15000; // 15 seconds
const MAX_INTERVAL = 120000; // 2 minutes

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
                timeoutId = setTimeout(loadAwareness, interval);
            }
        };

        // Initial delay before first fetch
        timeoutId = setTimeout(loadAwareness, 2000);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, []);

    return orbState;
}
