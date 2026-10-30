import { useState, useEffect, useRef } from 'react';
import { coreGet } from '@/lib/api/coreClient';

// Types
export interface PulseData {
    pulse: 'unknown' | 'low' | 'medium' | 'high';
    hotspots: Array<{ node_id: string; score: number }>;
    insights: Array<{ type: string; summary: string }>;
    orbStateSuggestion?: string;
}

// Fallback Data
const UNKNOWN_PULSE: PulseData = {
    pulse: 'unknown',
    hotspots: [],
    insights: [],
    orbStateSuggestion: 'unknown'
};

// Polling configuration with backoff
// PERFORMANCE: Increased intervals to reduce network load
const MIN_INTERVAL = 45000;  // 45 seconds minimum (was 15s)
const MAX_INTERVAL = 180000; // 3 minutes maximum when backend is down
const BACKOFF_MULTIPLIER = 1.5;

export const useIntelligencePulse = () => {
    const [data, setData] = useState<PulseData>(UNKNOWN_PULSE);
    const [lastFetch, setLastFetch] = useState<number>(0);
    const intervalRef = useRef<number>(MIN_INTERVAL);
    const failureCountRef = useRef<number>(0);

    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;

        const fetchData = async () => {
            // Check for auth token before making request
            const isLocalhost =
                typeof window !== 'undefined' &&
                ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
            const hasToken = typeof window !== 'undefined' && (
                document.cookie.includes('saimor_auth') ||
                (isLocalhost ? localStorage.getItem('saimor_dev_token') : null) ||
                process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT
            );

            // Skip fetch entirely if no token - prevents browser 401 errors
            if (!hasToken) {
                if (isMounted) {
                    setData(UNKNOWN_PULSE);
                    setLastFetch(Date.now());
                }
                // Still schedule next check but with longer interval
                timeoutId = setTimeout(fetchData, MAX_INTERVAL);
                return;
            }

            try {
                // Use coreGet to ensure Auth headers are attached!
                const jsonData = await coreGet('/v3/mindloop/synthesis', { isOptional: true });

                if (isMounted) {
                    if (jsonData && ['low', 'medium', 'high'].includes(jsonData.pulse) && Array.isArray(jsonData.hotspots) && Array.isArray(jsonData.insights)) {
                        setData(jsonData);
                        // Success - reset backoff
                        failureCountRef.current = 0;
                        intervalRef.current = MIN_INTERVAL;
                    } else {
                        // Backend returned null (offline/error) - apply backoff
                        setData(UNKNOWN_PULSE);
                        failureCountRef.current++;
                        intervalRef.current = Math.min(
                            intervalRef.current * BACKOFF_MULTIPLIER,
                            MAX_INTERVAL
                        );
                    }
                    setLastFetch(Date.now());
                }
            } catch (error) {
                if (isMounted) {
                    setData(UNKNOWN_PULSE);
                    setLastFetch(Date.now());
                    // Apply backoff on error
                    failureCountRef.current++;
                    intervalRef.current = Math.min(
                        intervalRef.current * BACKOFF_MULTIPLIER,
                        MAX_INTERVAL
                    );
                }
            }

            // Schedule next fetch with current interval
            if (isMounted) {
                timeoutId = setTimeout(fetchData, intervalRef.current);
            }
        };

        // Initial fetch with small delay to let page load
        timeoutId = setTimeout(fetchData, 2000);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, []);

    return data;
};
