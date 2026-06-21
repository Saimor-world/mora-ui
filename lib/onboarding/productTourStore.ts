'use client';

/** Server-persisted key in users.settings JSON (via /v3/users/me/settings). */
export const PRODUCT_TOUR_SETTINGS_KEY = 'productTourDismissed';

/** Legacy localStorage flag from first-run tour v1. */
const LEGACY_LOCAL_KEY = 'saimor_first_run_tour_v1';

/** Anonymous / pre-auth dismiss (visitors, website scan before login). */
const LOCAL_DISMISS_KEY = 'saimor_product_tour_dismissed';

export const PRODUCT_TOUR_RESTART_EVENT = 'saimor:product-tour-restart';
export const PRODUCT_TOUR_STATE_EVENT = 'saimor:product-tour-state-changed';

function readLegacyLocalDismissed(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(LEGACY_LOCAL_KEY) === 'done';
}

function readLocalDismissed(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        window.localStorage.getItem(LOCAL_DISMISS_KEY) === '1'
        || readLegacyLocalDismissed()
    );
}

function writeLocalDismissed(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(LOCAL_DISMISS_KEY, '1');
        window.localStorage.setItem(LEGACY_LOCAL_KEY, 'done');
    } catch {
        // ignore storage failures
    }
}

function clearLocalDismissed(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(LOCAL_DISMISS_KEY);
        window.localStorage.removeItem(LEGACY_LOCAL_KEY);
    } catch {
        // ignore storage failures
    }
}

function readSettingsDismissed(userSettings?: Record<string, unknown> | null): boolean {
    return userSettings?.[PRODUCT_TOUR_SETTINGS_KEY] === true;
}

function notifyStateChanged(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(PRODUCT_TOUR_STATE_EVENT));
}

export function isProductTourDismissed(userSettings?: Record<string, unknown> | null): boolean {
    if (readSettingsDismissed(userSettings)) return true;
    return readLocalDismissed();
}

/** Migrate legacy local dismiss into server settings once per authenticated user. */
export function migrateProductTourDismissToServer(
    userSettings: Record<string, unknown> | null | undefined,
    syncUserSettings: (updates: Record<string, unknown>) => void,
): void {
    if (!readLocalDismissed() || readSettingsDismissed(userSettings)) return;
    syncUserSettings({ [PRODUCT_TOUR_SETTINGS_KEY]: true });
}

export interface PersistProductTourOptions {
    syncUserSettings?: ((updates: Record<string, unknown>) => void) | null;
}

export function markProductTourDismissed(options?: PersistProductTourOptions): void {
    writeLocalDismissed();
    options?.syncUserSettings?.({ [PRODUCT_TOUR_SETTINGS_KEY]: true });
    notifyStateChanged();
}

export function resetProductTour(options?: PersistProductTourOptions): void {
    clearLocalDismissed();
    options?.syncUserSettings?.({ [PRODUCT_TOUR_SETTINGS_KEY]: false });
    notifyStateChanged();
}

/** Immediately re-open the tour on Home (used from Settings / dev testing). */
export function requestProductTourRestart(options?: PersistProductTourOptions): void {
    resetProductTour(options);
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.removeItem('saimor_product_tour_session');
    } catch {
        // ignore
    }
    window.dispatchEvent(new Event(PRODUCT_TOUR_RESTART_EVENT));
}

// ─── Back-compat aliases (FirstRunTour tests / imports) ─────────────────────

export function isFirstRunTourDone(userSettings?: Record<string, unknown> | null): boolean {
    return isProductTourDismissed(userSettings);
}

export function markFirstRunTourDone(options?: PersistProductTourOptions): void {
    markProductTourDismissed(options);
}
