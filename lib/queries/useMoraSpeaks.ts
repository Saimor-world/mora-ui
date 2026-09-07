'use client';

/**
 * useMoraSpeaks — listen for proactive `mora.speaks` realtime events.
 *
 * Important product rule:
 * Conversation is a capability, not the product surface.
 *
 * A proactive Môra event therefore does NOT auto-open chat. Instead this hook:
 *   1. emits a shell-level `mora-speaks-message` event
 *   2. lets the mounted Môra presence surface decide how to present it
 *   3. acknowledges the speak so it does not re-appear on reconnect
 *
 * If a Môra conversation is already open, it may also listen to the same event.
 */
import { useEffect, useRef } from 'react';
import { realtime } from '@/lib/api/realtimeClient';
import { corePost, coreGet } from '@/lib/api/coreClient';
import { useSessionStore } from '@/lib/store/sessionStore';

export const MORA_SPEAKS_EVENT = 'mora-speaks-message';

export interface MoraSpeakPayload {
    id: string;
    tier: string;
    message: string;
    entity_id?: string | null;
    entity_type?: string | null;
}

function dispatchSpeakEvent(payload: MoraSpeakPayload) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<MoraSpeakPayload>(MORA_SPEAKS_EVENT, { detail: payload }));
}

function ackSpeak(id: string) {
    corePost(`/v3/mora/radar/speaks/${id}/ack`, {}).catch(() => {
        /* best-effort — server may have already cleaned up */
    });
}

export function useMoraSpeaks() {
    const user = useSessionStore((s) => s.user);
    const initialPolledRef = useRef(false);

    useEffect(() => {
        if (!user) return;

        const deliver = (payload: MoraSpeakPayload) => {
            dispatchSpeakEvent(payload);
            ackSpeak(payload.id);
        };

        // 1) WebSocket live channel
        const wsHandler = (data: any) => {
            const payload: MoraSpeakPayload = data?.payload ?? data;
            if (!payload?.id || !payload?.message) return;
            deliver(payload);
        };
        realtime.on('mora.speaks', wsHandler);

        // 2) Polling fallback on mount — catch speaks queued while user was offline
        if (!initialPolledRef.current) {
            initialPolledRef.current = true;
            coreGet('/v3/mora/radar/speaks/pending', { isOptional: true })
                .then((result: any) => {
                    const speaks: MoraSpeakPayload[] = result?.data ?? result ?? [];
                    if (Array.isArray(speaks) && speaks.length > 0) {
                        // Deliver only the most recent one to avoid interruption spam.
                        deliver(speaks[speaks.length - 1]);
                    }
                })
                .catch(() => { /* silent */ });
        }

        return () => {
            realtime.off('mora.speaks', wsHandler);
        };
    }, [user]);
}
