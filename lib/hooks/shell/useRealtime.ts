/**
 * useRealtime - WebSocket Connection for Ghost Presence
 *
 * Connects to the realtime WebSocket and dispatches
 * ghost presence events to the window for GhostOverlay.
 *
 * NOTE: Static import (not dynamic) ensures the same singleton instance
 * is used as in usePresence / TeamPane — preventing duplicate connections
 * from separate module evaluations.
 */

import { useEffect } from 'react';
import { realtime } from '@/lib/api/realtimeClient';

export function useRealtime(enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;

        const handleGhostPresence = (data: any) => {
            window.dispatchEvent(new CustomEvent('mora:ghost-update', { detail: data }));
        };

        realtime.on('ghost_presence', handleGhostPresence);
        realtime.connect();

        return () => {
            realtime.off('ghost_presence', handleGhostPresence);
            realtime.disconnect();
        };
    }, [enabled]);
}
