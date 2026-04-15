/**
 * Mora Awareness Controller - UPGRADE A1
 *
 * Manages the Môra Orb state based on system activity.
 * Five awareness modes: idle > focus > thinking > alert > insight
 */

import { useOrbStore } from '@/lib/store/orbStore';

export type OrbState = 'idle' | 'focus' | 'thinking' | 'alert' | 'insight' | 'curious' | 'learning' | 'watching';

// P1-B: Timeouts now handled by store's speculativeUntil logic
// We keep these for legacy cleanup if needed, but primary logic moves to store.
let legacyTimeout: NodeJS.Timeout | null = null;

/**
 * UPGRADE A1: Set Orb to focus state (user attention, navigation)
 * P1-B: Uses speculative state for instant 0ms reaction
 */
export function setFocus() {
    useOrbStore.getState().setSpeculativeState('focus', 1200);
}

/**
 * UPGRADE A1: Set Orb to thinking state (AI processing, analysis)
 * P1-B: Uses speculative state for instant 0ms reaction
 */
export function setThinking() {
    useOrbStore.getState().setSpeculativeState('thinking', 3000);
}

/**
 * UPGRADE A1: Set Orb to alert state (critical errors, urgent issues)
 * Persists via local state override
 */
export function setAlert() {
    // Alerts are critical, so we use a long TTL or manual clear logic
    useOrbStore.getState().setSpeculativeState('alert', 10000);
}

/**
 * UPGRADE A1: Set Orb to insight state (AI discoveries, recommendations)
 * P1-B: Uses speculative state for instant 0ms reaction
 */
export function setInsight() {
    useOrbStore.getState().setSpeculativeState('insight', 4000);
}

/**
 * Set Orb to curious state — Mora has noticed something interesting
 */
export function setCurious() {
    useOrbStore.getState().setSpeculativeState('curious', 3000);
}

/**
 * Set Orb to learning state — Mora is processing/absorbing new context
 */
export function setLearning() {
    useOrbStore.getState().setSpeculativeState('learning', 3500);
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
    const store = useOrbStore.getState();
    store.clearSpeculativeState();
    store.setOrbState('idle');
}

/**
 * Update Orb state based on current system state
 * Call this when coreError changes
 */
export function updateOrbFromSystemState() {
    setIdle();
}

/**
 * Cleanup timeouts (call on unmount if needed)
 */
export function cleanupAwareness() {
    // P1-B: No listeners to clean up
}
