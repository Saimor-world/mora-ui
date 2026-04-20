'use client';

export const COMMUNICATION_SYNC_EVENT = 'saimor:communication-sync';
const COMMUNICATION_SYNC_STORAGE_KEY = 'saimor:communication-sync-at';

export function broadcastCommunicationSync(source: string = 'runtime') {
    if (typeof window === 'undefined') return;

    const detail = {
        source,
        at: new Date().toISOString(),
    };

    try {
        window.localStorage.setItem(COMMUNICATION_SYNC_STORAGE_KEY, JSON.stringify(detail));
    } catch {
        // ignore storage issues
    }

    window.dispatchEvent(new CustomEvent(COMMUNICATION_SYNC_EVENT, { detail }));
}

export function getCommunicationSyncStorageKey() {
    return COMMUNICATION_SYNC_STORAGE_KEY;
}
