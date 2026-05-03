/**
 * SIGNAL FLOW API
 * Dummy implementation for future signal/particle animations
 * between anchor points (Companies/Departments)
 *
 * PHASE 4 PREPARATION ONLY - Visualization comes later!
 */

import type { AnchorPoint } from './orbitMath';

export interface Signal {
    id: string;
    fromId: string;
    toId: string;
    intensity?: number;
    color?: string;
    timestamp: number;
}

// In-memory signal queue (for future canvas animation)
let signalQueue: Signal[] = [];
let signalIdCounter = 0;

/**
 * Trigger a signal from one anchor point to another
 * @param fromId - Source anchor ID
 * @param toId - Target anchor ID
 * @param intensity - Signal strength (0-1), default 0.5
 * @param color - Optional signal color (hex)
 * @returns Signal ID
 */
export function triggerSignal(
    fromId: string,
    toId: string,
    intensity: number = 0.5,
    color: string = '#10b981'
): string {
    const signal: Signal = {
        id: `signal-${signalIdCounter++}`,
        fromId,
        toId,
        intensity: Math.max(0, Math.min(1, intensity)), // Clamp 0-1
        color,
        timestamp: Date.now()
    };

    signalQueue.push(signal);

    return signal.id;
}

/**
 * Get all pending signals (for canvas renderer)
 * @returns Array of signals
 */
export function getPendingSignals(): Signal[] {
    return [...signalQueue];
}

/**
 * Clear all signals
 */
export function clearSignals(): void {
    signalQueue = [];
}

/**
 * Remove a specific signal by ID
 * @param signalId - Signal ID to remove
 */
export function removeSignal(signalId: string): void {
    signalQueue = signalQueue.filter(s => s.id !== signalId);
}

/**
 * Auto-cleanup signals older than N milliseconds
 * @param maxAge - Maximum age in ms, default 5000ms (5s)
 */
export function cleanupOldSignals(maxAge: number = 5000): void {
    const now = Date.now();
    signalQueue = signalQueue.filter(s => now - s.timestamp < maxAge);
}

/**
 * Calculate signal path between two anchor points
 * (For future use in canvas rendering)
 * @param from - Source anchor point
 * @param to - Target anchor point
 * @returns Array of bezier curve points
 */
export function calculateSignalPath(
    from: AnchorPoint,
    to: AnchorPoint
): { x: number; y: number }[] {
    // Dummy implementation - returns straight line points
    // Replace with bezier curve calculation later
    return [
        { x: from.x, y: from.y },
        { x: to.x, y: to.y }
    ];
}

/**
 * Example: Trigger demo signal flow pattern
 * (For testing purposes)
 */
export function triggerDemoSignalFlow(anchors: AnchorPoint[]): void {
    if (anchors.length < 2) return;

    // Trigger signals in a ring pattern
    for (let i = 0; i < anchors.length; i++) {
        const from = anchors[i];
        const to = anchors[(i + 1) % anchors.length];

        setTimeout(() => {
            triggerSignal(from.id, to.id, 0.7, '#10b981');
        }, i * 200); // Stagger by 200ms
    }
}
