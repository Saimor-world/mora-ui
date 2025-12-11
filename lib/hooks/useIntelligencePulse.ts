import { useState, useEffect } from 'react';

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

export const useIntelligencePulse = () => {
    const [data, setData] = useState<PulseData>(MOCK_PULSE_LOW);
    const [lastFetch, setLastFetch] = useState<number>(0);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                // Poll every 10s
                const response = await fetch('/api/core/v1/mindloop/synthesis');

                if (isMounted) {
                    if (response.ok) {
                        const jsonData = await response.json();
                        setData(jsonData || MOCK_PULSE_LOW);
                    } else {
                        // Silent fail to low pulse
                        setData(MOCK_PULSE_LOW);
                    }
                    setLastFetch(Date.now());
                }
            } catch (error) {
                if (isMounted) {
                    // Network error - silent fallback
                    setData(MOCK_PULSE_LOW);
                    setLastFetch(Date.now());
                }
            }
        };

        // Initial fetch
        fetchData();

        // Interval
        const intervalId = setInterval(fetchData, 10000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    return data;
};
