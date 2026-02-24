/**
 * useRealtime - WebSocket Connection for Ghost Presence
 *
 * Connects to the realtime WebSocket and dispatches
 * ghost presence events to the window for GhostOverlay.
 *
 * DESIGN: The WebSocket connection is a singleton page-level resource.
 * connect() is idempotent — safe to call multiple times, only opens once.
 * We do NOT disconnect on effect cleanup because:
 *   - The effect can run/re-run during React render cycles
 *   - Disconnecting on cleanup would tear down the connection every render
 * Explicit disconnect happens only in the logout handler (MoraShell).
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
        realtime.connect(); // idempotent — safe if already connected

        return () => {
            // Only unregister the event handler.
            // Do NOT call disconnect() here — the connection is shared and
            // must persist across React render cycles.
            realtime.off('ghost_presence', handleGhostPresence);
        };
    }, [enabled]);
}
