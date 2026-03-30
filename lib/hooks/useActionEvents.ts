import { useEffect } from 'react';
import { create } from 'zustand';
import { realtime } from '@/lib/api/realtimeClient';
import { coreGet } from '@/lib/api/coreClient';
import { NAVIGATION_ACTION_INTENT, NAVIGATION_RESULT_EVENT, type NavigationOutcome } from '@/lib/utils/searchOpen';

export type ActionStatus =
    | 'proposed'
    | 'running'
    | 'pending_confirmation'
    | 'done'
    | 'failed'
    | 'rejected'
    | 'expired';

export interface ActionEvent {
    event_id?: string;
    action_id: string;
    status: ActionStatus;
    intent?: string;
    tenant_id?: string;
    actor_id?: string;
    actor_role?: string;
    session_id?: string;
    batch_id?: string;
    message: string | null;
    error: string | null;
    payload: Record<string, unknown>;
    timestamp: string;
}

interface ActionEventState {
    events: ActionEvent[];
    isLoading: boolean;
    error: string | null;
    addEvent: (event: ActionEvent) => void;
    loadHistoricalEvents: () => Promise<void>;
    removeEvent: (actionId: string) => void;
    clearEvents: () => void;
}

function navigationOutcomeToActionEvent(detail: NavigationOutcome): ActionEvent {
    const now = new Date().toISOString();
    return {
        action_id: `nav-${Date.now()}-${detail.targetType}-${detail.nodeId || detail.folderId || detail.spaceId || detail.departmentId || detail.label || 'target'}`,
        status: 'done',
        intent: NAVIGATION_ACTION_INTENT,
        actor_role: 'system',
        message: detail.message,
        error: null,
        payload: {
            ...detail,
            tool_name: NAVIGATION_ACTION_INTENT,
        },
        timestamp: now,
    };
}

export const useActionEventStore = create<ActionEventState>((set, get) => ({
    events: [],
    isLoading: false,
    error: null,
    addEvent: (newEvent) => set((state) => {
        // Upsert based on action_id. If an event for the action_id exists, replace it,
        // otherwise add it to the beginning of the list.
        const existingIndex = state.events.findIndex(e => e.action_id === newEvent.action_id);
        if (existingIndex >= 0) {
            const updatedEvents = [...state.events];
            // Only update if newer timestamp
            if (new Date(newEvent.timestamp) >= new Date(updatedEvents[existingIndex].timestamp)) {
                updatedEvents[existingIndex] = newEvent;
            }
            return { events: updatedEvents };
        } else {
            return { events: [newEvent, ...state.events] };
        }
    }),
    loadHistoricalEvents: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await coreGet('/v3/actions/events?limit=50', { isOptional: true });
            if (Array.isArray(res?.events)) {
                // Ensure unique and latest events per action_id
                const latestEvents = new Map<string, ActionEvent>();
                res.events.forEach((evt: ActionEvent) => {
                    const existing = latestEvents.get(evt.action_id);
                    if (!existing || new Date(evt.timestamp) > new Date(existing.timestamp)) {
                        latestEvents.set(evt.action_id, evt);
                    }
                });

                // Keep local events that might be newer than server response,
                // and blend in standard server events. Sort by timestamp descending.
                const allEvents = Array.from(latestEvents.values());
                const state = get();

                state.events.forEach(localEvt => {
                    const serverEvt = latestEvents.get(localEvt.action_id);
                    if (!serverEvt || new Date(localEvt.timestamp) > new Date(serverEvt.timestamp)) {
                        allEvents.push(localEvt);
                    }
                });

                // Deduplicate one last time and sort
                const uniqueEventsMap = new Map<string, ActionEvent>();
                allEvents.forEach(e => {
                    const existing = uniqueEventsMap.get(e.action_id);
                    if (!existing || new Date(e.timestamp) > new Date(existing.timestamp)) {
                        uniqueEventsMap.set(e.action_id, e);
                    }
                });

                const sortedEvents = Array.from(uniqueEventsMap.values()).sort(
                    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );

                set({ events: sortedEvents, isLoading: false });
            } else if (Array.isArray(res)) {
                set({ events: res as ActionEvent[], isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to load action events';
            set({ error: message, isLoading: false });
        }
    },
    removeEvent: (actionId) => set(state => ({
        events: state.events.filter(e => e.action_id !== actionId)
    })),
    clearEvents: () => set({ events: [] })
}));

/**
 * useActionEvents Hook
 * 
 * Attaches to the `action_status` WebSocket events and provides reactive 
 * state of all actions. Handles fallback polling via `loadHistoricalEvents`.
 */
export function useActionEvents(enabled: boolean = true) {
    const events = useActionEventStore((s) => s.events);
    const isLoading = useActionEventStore((s) => s.isLoading);
    const error = useActionEventStore((s) => s.error);
    const addEvent = useActionEventStore((s) => s.addEvent);
    const loadHistoricalEvents = useActionEventStore((s) => s.loadHistoricalEvents);
    const removeEvent = useActionEventStore((s) => s.removeEvent);
    const clearEvents = useActionEventStore((s) => s.clearEvents);

    useEffect(() => {
        if (!enabled) return;

        // 1. Fetch initial state
        loadHistoricalEvents();

        // 2. Listen to websocket events
        const handleActionStatus = (data: ActionEvent) => {
            addEvent(data);
        };

        realtime.on('action_status', handleActionStatus);

        const handleNavigationResult = (event: Event) => {
            const detail = (event as CustomEvent<NavigationOutcome>).detail;
            if (!detail) return;
            addEvent(navigationOutcomeToActionEvent(detail));
        };
        window.addEventListener(NAVIGATION_RESULT_EVENT, handleNavigationResult as EventListener);

        // Optional polling fallback just in case WS reconnects or misses packets
        const intervalId = setInterval(() => {
            loadHistoricalEvents();
        }, 15000);

        return () => {
            realtime.off('action_status', handleActionStatus);
            window.removeEventListener(NAVIGATION_RESULT_EVENT, handleNavigationResult as EventListener);
            clearInterval(intervalId);
        };
    }, [enabled, addEvent, loadHistoricalEvents]);

    return { events, isLoading, error, removeEvent, clearEvents };
}
