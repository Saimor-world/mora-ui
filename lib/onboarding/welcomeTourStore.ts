'use client';

/**
 * WelcomeTourStore — First-run welcome experience for new users.
 *
 * This is separate from the product tour (productTourStore.ts) which shows
 * feature highlights. The welcome tour is specifically for first-time users
 * after login and provides a personal introduction to Môra.
 *
 * Storage key is separate from `onboarding_complete` (which tracks the
 * company/department setup wizard) to allow independent control.
 */

export const WELCOME_TOUR_SETTINGS_KEY = 'welcomeTourDismissed';

const LOCAL_DISMISS_KEY = 'saimor_welcome_tour_v1';

export const WELCOME_TOUR_RESTART_EVENT = 'saimor:welcome-tour-restart';
export const WELCOME_TOUR_STATE_EVENT = 'saimor:welcome-tour-state-changed';

function readLocalDismissed(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(LOCAL_DISMISS_KEY) === 'done';
}

function writeLocalDismissed(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(LOCAL_DISMISS_KEY, 'done');
    } catch {
        // ignore storage failures
    }
}

function clearLocalDismissed(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(LOCAL_DISMISS_KEY);
    } catch {
        // ignore storage failures
    }
}

function readSettingsDismissed(userSettings?: Record<string, unknown> | null): boolean {
    return userSettings?.[WELCOME_TOUR_SETTINGS_KEY] === true;
}

function notifyStateChanged(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(WELCOME_TOUR_STATE_EVENT));
}

export function isWelcomeTourDismissed(userSettings?: Record<string, unknown> | null): boolean {
    if (readSettingsDismissed(userSettings)) return true;
    return readLocalDismissed();
}

export function migrateWelcomeTourDismissToServer(
    userSettings: Record<string, unknown> | null | undefined,
    syncUserSettings: (updates: Record<string, unknown>) => void,
): void {
    if (!readLocalDismissed() || readSettingsDismissed(userSettings)) return;
    syncUserSettings({ [WELCOME_TOUR_SETTINGS_KEY]: true });
}

export interface PersistWelcomeTourOptions {
    syncUserSettings?: ((updates: Record<string, unknown>) => void) | null;
}

export function markWelcomeTourDismissed(options?: PersistWelcomeTourOptions): void {
    writeLocalDismissed();
    options?.syncUserSettings?.({ [WELCOME_TOUR_SETTINGS_KEY]: true });
    notifyStateChanged();
}

export function resetWelcomeTour(options?: PersistWelcomeTourOptions): void {
    clearLocalDismissed();
    options?.syncUserSettings?.({ [WELCOME_TOUR_SETTINGS_KEY]: false });
    notifyStateChanged();
}

export function requestWelcomeTourRestart(options?: PersistWelcomeTourOptions): void {
    resetWelcomeTour(options);
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.removeItem('saimor_welcome_tour_session');
    } catch {
        // ignore
    }
    window.dispatchEvent(new Event(WELCOME_TOUR_RESTART_EVENT));
}
