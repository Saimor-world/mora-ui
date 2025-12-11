/**
 * MÔRA Awareness Controller - UPGRADE A1
 *
 * Manages the Môra Orb state based on system activity.
 * Five awareness modes: idle > focus > thinking > alert > insight
 */

import { useMoraStore } from '@/lib/store/moraState';

export type OrbState = 'idle' | 'focus' | 'thinking' | 'alert' | 'insight';

let focusTimeout: NodeJS.Timeout | null = null;
let thinkingTimeout: NodeJS.Timeout | null = null;
let alertTimeout: NodeJS.Timeout | null = null;
let insightTimeout: NodeJS.Timeout | null = null;

/**
 * UPGRADE A1: Set Orb to focus state (user attention, navigation)
 * Auto-reverts to idle after 1.2s
 */
export function setFocus() {
    const store = useMoraStore.getState();

    // Don't override alert state
    if (store.coreError) return;

    store.setOrbState('focus');

    // Clear previous timeout
    if (focusTimeout) clearTimeout(focusTimeout);

    // Revert to idle after 1.2s
    focusTimeout = setTimeout(() => {
        const currentState = useMoraStore.getState();
        if (currentState.orbState === 'focus' && !currentState.coreError) {
            currentState.setOrbState('idle');
        }
    }, 1200);
}

/**
 * UPGRADE A1: Set Orb to thinking state (AI processing, analysis)
 * Auto-reverts to idle after 3s
 */
export function setThinking() {
    const store = useMoraStore.getState();

    // Don't override alert or focus state
    if (store.coreError || store.orbState === 'focus') return;

    store.setOrbState('thinking');

    // Clear previous timeout
    if (thinkingTimeout) clearTimeout(thinkingTimeout);

    // Revert to idle after 3s
    thinkingTimeout = setTimeout(() => {
        const currentState = useMoraStore.getState();
        if (currentState.orbState === 'thinking' && !currentState.coreError) {
            currentState.setOrbState('idle');
        }
    }, 3000);
}

/**
 * UPGRADE A1: Set Orb to alert state (critical errors, urgent issues)
 * Persists until error is cleared
 */
export function setAlert() {
    useMoraStore.getState().setOrbState('alert');
}

/**
 * UPGRADE A1: Set Orb to insight state (AI discoveries, recommendations)
 * Auto-reverts to idle after 4s
 */
export function setInsight() {
    const store = useMoraStore.getState();

    // Don't override alert state
    if (store.coreError) return;

    store.setOrbState('insight');

    // Clear previous timeout
    if (insightTimeout) clearTimeout(insightTimeout);

    // Revert to idle after 4s
    insightTimeout = setTimeout(() => {
        const currentState = useMoraStore.getState();
        if (currentState.orbState === 'insight' && !currentState.coreError) {
            currentState.setOrbState('idle');
        }
    }, 4000);
}

// UPGRADE A1: Notification system for micro-sparks
export interface OrbNotification {
    id: string;
    type: 'task' | 'email' | 'insight' | 'alert';
    message: string;
    timestamp: number;
}

let notifications: OrbNotification[] = [];

/**
 * UPGRADE A1: Add notification to spark queue
 */
export function addNotification(type: 'task' | 'email' | 'insight' | 'alert', message: string) {
    const notification: OrbNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        message,
        timestamp: Date.now()
    };

    notifications.push(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
        notifications = notifications.filter(n => n.id !== notification.id);
    }, 10000);

    // Trigger appropriate awareness state
    switch (type) {
        case 'alert':
            setAlert();
            break;
        case 'insight':
            setInsight();
            break;
        case 'task':
        case 'email':
            setFocus();
            break;
    }
}

/**
 * UPGRADE A1: Get current notifications for micro-sparks
 */
export function getNotifications(): OrbNotification[] {
    return [...notifications];
}

/**
 * Set Orb to idle state
 * Only if no error is present
 */
export function setIdle() {
    const store = useMoraStore.getState();
    if (!store.coreError) {
        store.setOrbState('idle');
    }
}

/**
 * Update Orb state based on current system state
 * Call this when coreError changes
 */
export function updateOrbFromSystemState() {
    const store = useMoraStore.getState();

    if (store.coreError) {
        setAlert(); // Changed from setWarning
    } else {
        setIdle();
    }
}

/**
 * Cleanup timeouts (call on unmount if needed)
 */
export function cleanupAwareness() {
    if (focusTimeout) clearTimeout(focusTimeout);
    if (thinkingTimeout) clearTimeout(thinkingTimeout);
    if (alertTimeout) clearTimeout(alertTimeout);
    if (insightTimeout) clearTimeout(insightTimeout);
}
