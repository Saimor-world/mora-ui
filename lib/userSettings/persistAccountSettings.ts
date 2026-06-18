// lib/userSettings/persistAccountSettings.ts
// Debounced server sync for account preferences (mirrors desktop layout persistence pattern).

import { patchUserSettings } from '@/lib/api/userSettingsClient';

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPatch: Record<string, unknown> = {};

export function queueAccountSettingsSync(updates: Record<string, unknown>): void {
    pendingPatch = { ...pendingPatch, ...updates };
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
        const payload = pendingPatch;
        pendingPatch = {};
        syncTimer = null;
        void patchUserSettings(payload).catch((error) => {
            if (process.env.NODE_ENV === 'development') {
                console.warn('[AccountSettings] server sync failed:', error);
            }
        });
    }, 800);
}
