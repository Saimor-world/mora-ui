/**
 * React Hook für Real-Time Updates
 *
 * Einfache Integration von Live-Events in React Components
 *
 * Usage:
 * ```tsx
 * const { events, synthesis, status } = useRealtime();
 * ```
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  realtimeManager,
  type RealtimeEvent,
  type MindloopEventUpdate,
  type MindloopSynthesisUpdate,
  type ConnectionStatusUpdate,
} from '../realtime';
import type { MindloopEvent, MindloopItem } from '../api/mindloop';

interface RealtimeState {
  events: MindloopEvent[];
  synthesis: MindloopItem[];
  status: 'connected' | 'disconnected' | 'reconnecting';
  statusMessage?: string;
  lastUpdate: string | null;
}

export function useRealtime() {
  const [state, setState] = useState<RealtimeState>({
    events: [],
    synthesis: [],
    status: 'disconnected',
    lastUpdate: null,
  });

  const handleEvent = useCallback((event: RealtimeEvent) => {
    setState(prev => {
      switch (event.type) {
        case 'mindloop_event': {
          const eventUpdate = event as MindloopEventUpdate;
          return {
            ...prev,
            events: [eventUpdate.data, ...prev.events].slice(0, 50), // Keep last 50
            lastUpdate: event.timestamp,
          };
        }

        case 'mindloop_synthesis': {
          const synthesisUpdate = event as MindloopSynthesisUpdate;
          return {
            ...prev,
            synthesis: [synthesisUpdate.data, ...prev.synthesis].slice(0, 20), // Keep last 20
            lastUpdate: event.timestamp,
          };
        }

        case 'connection_status': {
          const statusUpdate = event as ConnectionStatusUpdate;
          return {
            ...prev,
            status: statusUpdate.data.status,
            statusMessage: statusUpdate.data.message,
            lastUpdate: event.timestamp,
          };
        }

        default:
          return prev;
      }
    });
  }, []);

  useEffect(() => {
    console.log('[useRealtime] 🌱 Subscribing to live updates');
    const unsubscribe = realtimeManager.subscribe(handleEvent);

    return () => {
      console.log('[useRealtime] 🍂 Unsubscribing from live updates');
      unsubscribe();
    };
  }, [handleEvent]);

  return state;
}

/**
 * Hook for connection status only
 */
export function useRealtimeStatus() {
  const [status, setStatus] = useState<{
    isConnected: boolean;
    isPolling: boolean;
    message?: string;
  }>({
    isConnected: false,
    isPolling: false,
  });

  useEffect(() => {
    const unsubscribe = realtimeManager.subscribe(event => {
      if (event.type === 'connection_status') {
        const update = event as ConnectionStatusUpdate;
        setStatus({
          isConnected: update.data.status === 'connected',
          isPolling: update.data.status !== 'disconnected',
          message: update.data.message,
        });
      }
    });

    // Get initial status
    const currentStatus = realtimeManager.getStatus();
    setStatus({
      isConnected: currentStatus.isConnected,
      isPolling: currentStatus.isPolling,
    });

    return unsubscribe;
  }, []);

  return status;
}

/**
 * Hook for Mind Loop events only
 */
export function useRealtimeMindloopEvents() {
  const [events, setEvents] = useState<MindloopEvent[]>([]);

  useEffect(() => {
    const unsubscribe = realtimeManager.subscribe(event => {
      if (event.type === 'mindloop_event') {
        const update = event as MindloopEventUpdate;
        setEvents(prev => [update.data, ...prev].slice(0, 50));
      }
    });

    return unsubscribe;
  }, []);

  return events;
}

/**
 * Hook for Mind Loop synthesis only
 */
export function useRealtimeSynthesis() {
  const [synthesis, setSynthesis] = useState<MindloopItem[]>([]);

  useEffect(() => {
    const unsubscribe = realtimeManager.subscribe(event => {
      if (event.type === 'mindloop_synthesis') {
        const update = event as MindloopSynthesisUpdate;
        setSynthesis(prev => [update.data, ...prev].slice(0, 20));
      }
    });

    return unsubscribe;
  }, []);

  return synthesis;
}
