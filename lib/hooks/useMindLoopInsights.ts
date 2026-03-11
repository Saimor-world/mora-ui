"use client";

/**
 * useMindLoopInsights
 *
 * Polls GET /v3/mindloop/events for new insight-class events
 * (semantic, context_shift, potential_risk, related_objects_cluster)
 * and surfaces the latest unseen event as a MoraInsight for the InsightPopup.
 *
 * Also listens to realtime `mindloop_event` messages when available,
 * using polling as the fallback/backstop path.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { coreGet, corePost } from '@/lib/api/coreClient';
import { realtime } from '@/lib/api/realtimeClient';
import type { MoraInsight } from '@/components/mora/MoraInsightPopup';

const POLL_INTERVAL_MS = 30_000;
const INITIAL_DELAY_MS = 5_000;
const INSIGHT_TYPES = ['semantic', 'context_shift', 'potential_risk', 'related_objects_cluster'] as const;

type InsightType = (typeof INSIGHT_TYPES)[number];

interface MindLoopEvent {
    id: string;
    event_type: string;
    summary?: string;
    content?: string;
    description?: string;
    confidence?: number;
    severity?: number;
    timestamp: string;
    source?: string;
    payload?: Record<string, any>;
}

interface UseMindLoopInsightsReturn {
    currentInsight: MoraInsight | null;
    confirmInsight: (id: string) => Promise<void>;
    dismissInsight: (id: string) => void;
}

const isInsightType = (eventType: string): eventType is InsightType =>
    INSIGHT_TYPES.includes(eventType as InsightType);

export function useMindLoopInsights(): UseMindLoopInsightsReturn {
    const [currentInsight, setCurrentInsight] = useState<MoraInsight | null>(null);
    const lastSeenIdRef = useRef<string | null>(null);
    const isMountedRef = useRef(true);

    const parseInsight = useCallback((event: MindLoopEvent): MoraInsight => {
        const payload = event.payload || {};
        const text =
            event.summary ||
            event.content ||
            event.description ||
            payload.summary ||
            payload.message ||
            payload.title ||
            'Mora hat etwas bemerkt...';

        const source =
            event.event_type === 'context_shift'
                ? 'context'
                : (event.event_type === 'potential_risk' || event.event_type === 'related_objects_cluster')
                    ? 'pattern'
                    : 'mindloop';

        const rawConfidence = event.confidence ?? event.severity;
        const confidence =
            typeof rawConfidence === 'number'
                ? Math.max(0, Math.min(1, rawConfidence))
                : undefined;

        return {
            id: event.id,
            content: text,
            source,
            confidence,
            timestamp: event.timestamp,
            confirmed: false,
        };
    }, []);

    const maybeSurfaceInsight = useCallback((event: MindLoopEvent | null | undefined) => {
        if (!event || !isInsightType(event.event_type)) return;
        if (event.id === lastSeenIdRef.current) return;

        lastSeenIdRef.current = event.id;
        setCurrentInsight(parseInsight(event));
    }, [parseInsight]);

    useEffect(() => {
        isMountedRef.current = true;
        let timeoutId: NodeJS.Timeout;

        const handleMindloopEvent = (data: MindLoopEvent) => {
            if (!isMountedRef.current) return;
            maybeSurfaceInsight(data);
        };

        const poll = async () => {
            try {
                const data = await coreGet('/v3/mindloop/events?limit=12', {
                    isOptional: true,
                }) as { events?: MindLoopEvent[] } | MindLoopEvent[] | null;

                if (!isMountedRef.current || !data) return;

                const events: MindLoopEvent[] = Array.isArray(data)
                    ? data
                    : (data as { events?: MindLoopEvent[] }).events ?? [];

                const latest = events.find((event) => isInsightType(event.event_type));
                maybeSurfaceInsight(latest);
            } catch {
                // best-effort: keep polling fallback silent
            }

            if (isMountedRef.current) {
                timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
            }
        };

        realtime.on('mindloop_event', handleMindloopEvent);
        timeoutId = setTimeout(poll, INITIAL_DELAY_MS);

        return () => {
            isMountedRef.current = false;
            clearTimeout(timeoutId);
            realtime.off('mindloop_event', handleMindloopEvent);
        };
    }, [maybeSurfaceInsight]);

    const confirmInsight = useCallback(async (id: string) => {
        setCurrentInsight(null);
        try {
            await corePost(`/v3/mindloop/insight/${id}/confirm`, {});
        } catch {
            // Confirmation is best-effort.
        }
    }, []);

    const dismissInsight = useCallback((_id: string) => {
        setCurrentInsight(null);
    }, []);

    return { currentInsight, confirmInsight, dismissInsight };
}
