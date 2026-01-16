import { useState, useEffect, useRef } from 'react';
import { coreGet } from '@/lib/api/coreClient';

// Types
export interface PulseData {
    pulse: 'low' | 'medium' | 'high';
    hotspots: Array<{ node_id: string; score: number }>;
    insights: Array<{ type: string; summary: string }>;
    orbStateSuggestion?: string;
}

// Fallback Data
const MOCK_PULSE_LOW: PulseData = {
    pulse: 'low',
    hotspots: [],
    insights: [],
    orbStateSuggestion: 'idle'
};

// Polling configuration with backoff
const MIN_INTERVAL = 15000;  // 15 seconds minimum
const MAX_INTERVAL = 120000; // 2 minutes maximum when backend is down
const BACKOFF_MULTIPLIER = 1.5;

export const useIntelligencePulse = () => {
    const [data, setData] = useState<PulseData>(MOCK_PULSE_LOW);
    const [lastFetch, setLastFetch] = useState<number>(0);
    const intervalRef = useRef<number>(MIN_INTERVAL);
    const failureCountRef = useRef<number>(0);

    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;

        const fetchData = async () => {
            // Check for auth token before making request
            const hasToken = typeof window !== 'undefined' && (
                document.cookie.includes('saimor_auth') ||
                localStorage.getItem('saimor_dev_token') ||
                process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT
            );

            // Skip fetch entirely if no token - prevents browser 401 errors
            if (!hasToken) {
                if (isMounted) {
                    setData(MOCK_PULSE_LOW);
                    setLastFetch(Date.now());
                }
                // Still schedule next check but with longer interval
                timeoutId = setTimeout(fetchData, MAX_INTERVAL);
                return;
            }

            try {
                // Use coreGet to ensure Auth headers are attached!
                const jsonData = await coreGet('/v1/mindloop/synthesis', { isOptional: true });

                if (isMounted) {
                    if (jsonData) {
                        setData(jsonData);
                        // Success - reset backoff
                        failureCountRef.current = 0;
                        intervalRef.current = MIN_INTERVAL;
                    } else {
                        // Backend returned null (offline/error) - apply backoff
                        setData(MOCK_PULSE_LOW);
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
                    setData(MOCK_PULSE_LOW);
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
