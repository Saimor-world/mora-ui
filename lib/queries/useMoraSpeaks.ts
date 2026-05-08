'use client';

/**
 * useMoraSpeaks — listen for `mora.speaks` realtime events from urgent-tier
 * KAIROS signals. When fired:
 *   1. Open (or focus) the Mora chat pane
 *   2. Dispatch a window CustomEvent `mora-speaks-message` that the chat pane
 *      listens to, injecting the message as if Mora spoke it
 *   3. Ack the speak via REST so it doesn't re-appear on poll/reconnect
 *
 * This hook should be mounted exactly once at the shell level (MoraShell).
 */
import { useEffect, useRef } from 'react';
import { realtime } from '@/lib/api/realtimeClient';
import { usePaneStore } from '@/lib/store/paneStore';
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
    const openPane = usePaneStore((s) => s.openPane);
    const focusPane = usePaneStore((s) => s.focusPane);
    const getPane = usePaneStore((s) => s.getPane);
    const initialPolledRef = useRef(false);

    useEffect(() => {
        if (!user) return;

        // Helper: ensure chat pane is open + foreground, then deliver
        const deliver = (payload: MoraSpeakPayload) => {
            const existing = getPane('mora-chat');
            if (existing) {
                focusPane('mora-chat');
            } else {
                openPane({
                    id: 'mora-chat',
                    type: 'chat',
                    title: 'Mora',
                    size: { width: 460, height: 620 },
                    data: { autoOpened: true, initialMoraMessage: payload.message },
                });
            }
            // Give the pane a tick to mount its event listener before dispatching
            setTimeout(() => dispatchSpeakEvent(payload), 80);
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
                        // Deliver only the most recent one to avoid spam
                        deliver(speaks[speaks.length - 1]);
                    }
                })
                .catch(() => { /* silent */ });
        }

        return () => {
            realtime.off('mora.speaks', wsHandler);
        };
    }, [user, openPane, focusPane, getPane]);
}
