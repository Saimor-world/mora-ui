"use client";

/**
 * useMindLoopInsights
 *
 * Polls GET /v1/mindloop/events for new insight-class events (semantic, context_shift)
 * and surfaces the latest unseen event as a MoraInsight for the InsightPopup.
 *
 * Key design decision: tracks `lastSeenId` in a ref so the popup fires only ONCE
 * per truly new event — not every 30s poll interval.
 *
 * Backend endpoint: GET /v1/mindloop/events?limit=5&type=semantic
 * Confirm endpoint: POST /v1/mindloop/insight/{id}/confirm
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { coreGet, corePost } from '@/lib/api/coreClient';
import type { MoraInsight } from '@/components/mora/MoraInsightPopup';

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const INSIGHT_TYPES = ['semantic', 'context_shift'] as const;

interface MindLoopEvent {
    id: string;
    event_type: string;
    summary?: string;
    content?: string;
    description?: string;
    confidence?: number;
    timestamp: string;
    source?: string;
}

interface UseMindLoopInsightsReturn {
    /** The current insight to show in the popup (null = nothing to show) */
    currentInsight: MoraInsight | null;
    /** Call when user confirms the insight */
    confirmInsight: (id: string) => Promise<void>;
    /** Call when user dismisses without confirming */
    dismissInsight: (id: string) => void;
}

export function useMindLoopInsights(): UseMindLoopInsightsReturn {
    const [currentInsight, setCurrentInsight] = useState<MoraInsight | null>(null);
    const lastSeenIdRef = useRef<string | null>(null);
    const isMountedRef = useRef(true);

    const parseInsight = (event: MindLoopEvent): MoraInsight => ({
        id: event.id,
        content: event.summary || event.content || event.description || 'Mora hat etwas bemerkt...',
        source: event.event_type === 'context_shift' ? 'context' : 'mindloop',
        confidence: event.confidence,
        timestamp: event.timestamp,
        confirmed: false,
    });

    useEffect(() => {
        isMountedRef.current = true;
        let timeoutId: NodeJS.Timeout;

        const poll = async () => {
            try {
                // Fetch most recent insight-class events (newest first)
                const data = await coreGet('/v1/mindloop/events?limit=5&type=semantic', {
                    isOptional: true,
                }) as { events?: MindLoopEvent[] } | MindLoopEvent[] | null;

                if (!isMountedRef.current || !data) return;

                // Backend returns {events: [...]} or directly [...]
                const events: MindLoopEvent[] = Array.isArray(data)
                    ? data
                    : (data as { events?: MindLoopEvent[] }).events ?? [];

                if (events.length === 0) return;

                const latest = events[0]; // newest first (reverse-chron)

                // Only fire popup if this is genuinely new
                if (latest.id !== lastSeenIdRef.current) {
                    lastSeenIdRef.current = latest.id;
                    setCurrentInsight(parseInsight(latest));
                }
            } catch {
                // Backend might be unavailable — fail silently, try again next poll
            }

            if (isMountedRef.current) {
                timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
            }
        };

        // Start after a short delay (don't compete with page load)
        timeoutId = setTimeout(poll, 5000);

        return () => {
            isMountedRef.current = false;
            clearTimeout(timeoutId);
        };
    }, []);

    const confirmInsight = useCallback(async (id: string) => {
        setCurrentInsight(null);
        try {
            await corePost(`/v1/mindloop/insight/${id}/confirm`, {});
        } catch {
            // Confirmation is best-effort — UI already dismissed the popup
        }
    }, []);

    const dismissInsight = useCallback((_id: string) => {
        setCurrentInsight(null);
    }, []);

    return { currentInsight, confirmInsight, dismissInsight };
}
