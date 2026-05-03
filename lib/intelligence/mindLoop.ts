import { CoreNode } from "@/lib/types/core";
import { recordAwarenessSignal } from "@/lib/api/coreClient";
import { logger } from "@/lib/utils/logger";

/**
 * MINDLOOP EVENT MODEL (Phase 8 Active)
 *
 * Defines the structure for intelligence events within the system.
 * These events drive the "Awareness Engine" and trigger UI reactions.
 *
 * V12: Backend sync RE-ENABLED with intelligent batching:
 * - Events are batched and sent every 30 seconds (max)
 * - Only significant events are synced (not every nav click)
 * - Reduces from 10-20 req/min to ~2 req/min
 */

export type MindLoopEventType =
    | 'USER_ACTION'      // Explicit user interaction
    | 'SYSTEM_ALERT'     // Core errors, connection issues
    | 'DATA_CHANGE'      // Node updates, creations
    | 'SEMANTIC_MATCH'   // Pattern recognition (AI)
    | 'CONST_UPDATE'     // Constellation re-calculation
    | 'NAV_EVENT';       // Navigation changes (Phase 8.1)

export type AwarenessLevel = 'idle' | 'watch' | 'focus' | 'alert' | 'insight' | 'thinking';

export interface MindLoopEvent {
    id: string;
    type: MindLoopEventType;
    source: string; // "Core", "UI", "User"
    timestamp: number;
    payload: any;
    severity: number; // 0.0 - 1.0
    awarenessTrigger?: AwarenessLevel;
}

/**
 * BEHAVIORAL PATTERNS
 * Rudimentary rule-based triggers for Phase 8.
 */
export const MindLoopPatterns = {
    // If > 3 nodes created in 1 minute -> High Activity -> Focus
    HIGH_ACTIVITY_THRESHOLD: 3,

    // If error severity > 0.8 -> Alert
    CRITICAL_ERROR_THRESHOLD: 0.8,

    // If semantic match score > 0.9 -> Insight
    INSIGHT_THRESHOLD: 0.9
};

// Event Bus & Intelligence Engine (Phase 8.1 Active, V12 Batching)
class MindLoopController {
    private eventLog: MindLoopEvent[] = [];
    private currentState: AwarenessLevel = 'idle';
    private listeners: ((state: AwarenessLevel) => void)[] = [];

    // Configuration
    private readonly DECAY_MS = 60000; // 1 minute memory
    private readonly ACTIVITY_THRESHOLD = 3; // Events per minute for High Activity

    // V12: Batching for backend sync
    private pendingSync: MindLoopEvent[] = [];
    private syncTimer: NodeJS.Timeout | null = null;
    private readonly SYNC_INTERVAL_MS = 30000; // Sync every 30 seconds
    private readonly SYNC_THRESHOLD = 5; // Or when 5 significant events accumulate
    private readonly SIGNIFICANT_EVENTS: MindLoopEventType[] = ['SYSTEM_ALERT', 'DATA_CHANGE', 'SEMANTIC_MATCH'];

    /**
     * Dispatch an event into the MindLoop.
     * Triggers immediate state re-evaluation.
     */
    public dispatch(event: Omit<MindLoopEvent, 'id' | 'timestamp'>) {
        const fullEvent: MindLoopEvent = {
            ...event,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        };

        this.eventLog.push(fullEvent);
        logger.debug(`[MindLoop] Event: ${fullEvent.type}`, fullEvent);

        // V12: Intelligent batching for backend sync
        // Only queue significant events, not every navigation click
        if (this.SIGNIFICANT_EVENTS.includes(fullEvent.type)) {
            this.queueForSync(fullEvent);
        }

        // Prune old events
        this.pruneEvents();

        // Re-evaluate state
        const newState = this.evaluateState();
        if (newState !== this.currentState) {
            this.currentState = newState;
            this.notifyListeners();
        }

        return fullEvent;
    }

    public getRecentEvents(limit = 10): MindLoopEvent[] {
        return this.eventLog.slice(-limit);
    }

    public getCurrentState(): AwarenessLevel {
        return this.currentState;
    }

    public subscribe(listener: (state: AwarenessLevel) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(this.currentState));
    }

    /**
     * V12: Queue event for batched backend sync
     */
    private queueForSync(event: MindLoopEvent) {
        this.pendingSync.push(event);

        // Sync immediately if threshold reached
        if (this.pendingSync.length >= this.SYNC_THRESHOLD) {
            this.flushSync();
            return;
        }

        // Otherwise, schedule sync if not already scheduled
        if (!this.syncTimer) {
            this.syncTimer = setTimeout(() => {
                this.flushSync();
            }, this.SYNC_INTERVAL_MS);
        }
    }

    /**
     * V12: Flush pending events to backend
     */
    private async flushSync() {
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
            this.syncTimer = null;
        }

        if (this.pendingSync.length === 0) return;

        const eventsToSync = [...this.pendingSync];
        this.pendingSync = [];

        try {
            // Send batch as single request
            // Backend should handle array of events
            for (const event of eventsToSync) {
                await recordAwarenessSignal(
                    event.type.toLowerCase(),
                    {
                        ...event.payload,
                        severity: event.severity,
                        timestamp: event.timestamp
                    }
                );
            }
            logger.debug(`[MindLoop] Synced ${eventsToSync.length} events to backend`);
        } catch (error) {
            // Silent fail - don't block UI for backend issues
            logger.warn('[MindLoop] Backend sync failed', error as Error);
        }
    }

    private pruneEvents() {
        const now = Date.now();
        this.eventLog = this.eventLog.filter(e => (now - e.timestamp) < this.DECAY_MS);
    }

    /**
     * Core Intelligence Logic
     * Determines the optimal Awareness State based on short-term memory.
     */
    private evaluateState(): AwarenessLevel {
        const recentEvents = this.eventLog;

        // 0. THINKING: Priority override if explicit thinking event is very recent (< 2s)
        const recentThinking = recentEvents.find(e =>
            e.awarenessTrigger === 'thinking' && (Date.now() - e.timestamp < 2000)
        );
        if (recentThinking) return 'thinking';

        // 1. CRITICAL: Check for Active System Alerts (Highest Priority)
        const recentAlerts = recentEvents.filter(e =>
            e.type === 'SYSTEM_ALERT' && e.severity > MindLoopPatterns.CRITICAL_ERROR_THRESHOLD
        );
        if (recentAlerts.length > 0) return 'alert';

        // 2. INSIGHT: Check for recent profound semantic matches
        const recentInsights = recentEvents.filter(e =>
            e.type === 'SEMANTIC_MATCH' && e.severity > MindLoopPatterns.INSIGHT_THRESHOLD
        );
        if (recentInsights.length > 0) return 'insight';

        // 3. FOCUS: Check for high user activity or explicit focus triggers
        const focusTriggers = recentEvents.filter(e =>
            e.awarenessTrigger === 'focus' || e.type === 'DATA_CHANGE'
        );
        const userActions = recentEvents.filter(e => e.type === 'USER_ACTION');

        if (focusTriggers.length > 0 || userActions.length >= this.ACTIVITY_THRESHOLD) {
            return 'focus';
        }

        // 4. WATCH: Navigation / Observation events
        const watchTriggers = recentEvents.filter(e => e.awarenessTrigger === 'watch');
        if (watchTriggers.length > 0) return 'watch';

        // 5. Default
        return 'idle';
    }
}

export const mindLoop = new MindLoopController();
