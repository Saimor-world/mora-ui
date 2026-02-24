/**
 * useRealtime - WebSocket Connection for Ghost Presence
 *
 * Connects to the realtime WebSocket and dispatches
 * ghost presence events to the window for GhostOverlay.
 */

import { useEffect } from 'react';

export function useRealtime(enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;

        let isMounted = true;
        let cleanup: (() => void) | undefined;

        const initRealtime = async () => {
            try {
                const { realtime } = await import('@/lib/api/realtimeClient');

                if (!isMounted) return; // effect was cleaned up before import resolved

                const handleGhostPresence = (data: any) => {
                    const event = new CustomEvent('mora:ghost-update', {
                        detail: data
                    });
                    window.dispatchEvent(event);
                };

                realtime.on('ghost_presence', handleGhostPresence);
                realtime.connect();

                cleanup = () => {
                    realtime.off('ghost_presence', handleGhostPresence);
                    realtime.disconnect();
                };
            } catch (error) {
                console.warn('[useRealtime] Failed to initialize:', error);
            }
        };

        initRealtime();

        return () => {
            isMounted = false;
            cleanup?.();
        };
    }, [enabled]);
}
