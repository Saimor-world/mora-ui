/**
 * MÔRA Awareness Controller
 * 
 * Manages the Môra Orb state based on system activity.
 * Priority: warning > active > learning > demo > idle
 */

import { useMoraStore } from '@/lib/store/moraState';

export type OrbState = 'idle' | 'active' | 'learning' | 'warning' | 'demo';

let activeTimeout: NodeJS.Timeout | null = null;
let learningTimeout: NodeJS.Timeout | null = null;

/**
 * Set Orb to active state (navigation, user interaction)
 * Auto-reverts to idle after 800ms
 */
export function setActive() {
    const store = useMoraStore.getState();

    // Don't override warning state
    if (store.coreError) return;

    store.setOrbState('active');

    // Clear previous timeout
    if (activeTimeout) clearTimeout(activeTimeout);

    // Revert to idle after 800ms
    activeTimeout = setTimeout(() => {
        const currentState = useMoraStore.getState();
        // Only revert if still active (not overridden by learning/warning)
        if (currentState.orbState === 'active' && !currentState.coreError) {
            currentState.setOrbState('idle');
        }
    }, 800);
}

/**
 * Set Orb to learning state (Mycelium rendering, relations loading)
 * Auto-reverts to idle after 2000ms
 */
export function setLearning() {
    const store = useMoraStore.getState();

    // Don't override warning or active state
    if (store.coreError || store.orbState === 'active') return;

    store.setOrbState('learning');

    // Clear previous timeout
    if (learningTimeout) clearTimeout(learningTimeout);

    // Revert to idle after 2s
    learningTimeout = setTimeout(() => {
        const currentState = useMoraStore.getState();
        if (currentState.orbState === 'learning' && !currentState.coreError) {
            currentState.setOrbState('idle');
        }
    }, 2000);
}

/**
 * Set Orb to warning state (coreError present)
 * Persists until error is cleared
 */
export function setWarning() {
    useMoraStore.getState().setOrbState('warning');
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
        setWarning();
    } else {
        setIdle();
    }
}

/**
 * Cleanup timeouts (call on unmount if needed)
 */
export function cleanupAwareness() {
    if (activeTimeout) clearTimeout(activeTimeout);
    if (learningTimeout) clearTimeout(learningTimeout);
}
