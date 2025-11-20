/**
 * Real-Time Event Manager für Môra
 *
 * Intelligentes Polling-System für Live-Updates vom Core API.
 * Kann später leicht auf WebSockets umgestellt werden.
 *
 * Features:
 * - Smart Polling mit exponential backoff
 * - Event Deduplication
 * - Automatic reconnection
 * - TypeScript-first Design
 */

import { getMindloopEvents, getMindloopSynthesis } from './api/mindloop';
import type { MindloopEvent, MindloopItem } from './api/mindloop';

export type RealtimeEventType = 'mindloop_event' | 'mindloop_synthesis' | 'connection_status';

export interface RealtimeEvent {
  type: RealtimeEventType;
  timestamp: string;
  data: unknown;
}

export interface MindloopEventUpdate extends RealtimeEvent {
  type: 'mindloop_event';
  data: MindloopEvent;
}

export interface MindloopSynthesisUpdate extends RealtimeEvent {
  type: 'mindloop_synthesis';
  data: MindloopItem;
}

export interface ConnectionStatusUpdate extends RealtimeEvent {
  type: 'connection_status';
  data: {
    status: 'connected' | 'disconnected' | 'reconnecting';
    message?: string;
  };
}

type EventCallback = (event: RealtimeEvent) => void;

interface PollingConfig {
  interval: number; // milliseconds
  maxInterval: number; // max backoff
  backoffMultiplier: number;
}

/**
 * Real-Time Manager Singleton
 */
class RealtimeManager {
  private listeners: Set<EventCallback> = new Set();
  private seenEventIds: Set<string> = new Set();
  private seenSynthesisIds: Set<string> = new Set();
  private isPolling = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private currentInterval: number;
  private config: PollingConfig = {
    interval: 3000, // 3 seconds
    maxInterval: 30000, // 30 seconds max
    backoffMultiplier: 1.5,
  };
  private isConnected = false;

  constructor() {
    this.currentInterval = this.config.interval;
  }

  /**
   * Start real-time updates
   */
  start() {
    if (this.isPolling) return;

    console.log('[Realtime] 🌿 Starting live updates...');
    this.isPolling = true;
    this.emitConnectionStatus('connected');
    this.poll();
  }

  /**
   * Stop real-time updates
   */
  stop() {
    console.log('[Realtime] 🍂 Stopping live updates');
    this.isPolling = false;
    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }
    this.emitConnectionStatus('disconnected');
  }

  /**
   * Subscribe to events
   */
  subscribe(callback: EventCallback): () => void {
    this.listeners.add(callback);

    // Auto-start if first listener
    if (this.listeners.size === 1) {
      this.start();
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);

      // Auto-stop if no listeners
      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  }

  /**
   * Main polling loop
   */
  private async poll() {
    if (!this.isPolling) return;

    try {
      await this.fetchUpdates();

      // Success - reset interval to baseline
      this.currentInterval = this.config.interval;

      if (!this.isConnected) {
        this.isConnected = true;
        this.emitConnectionStatus('connected', 'Reconnected to Core');
      }
    } catch (error) {
      console.error('[Realtime] Poll error:', error);

      // Exponential backoff
      this.currentInterval = Math.min(
        this.currentInterval * this.config.backoffMultiplier,
        this.config.maxInterval
      );

      if (this.isConnected) {
        this.isConnected = false;
        this.emitConnectionStatus('reconnecting', 'Connection lost, retrying...');
      }
    }

    // Schedule next poll
    this.pollInterval = setTimeout(() => this.poll(), this.currentInterval);
  }

  /**
   * Fetch new events and synthesis from Core
   */
  private async fetchUpdates() {
    // Fetch Mind Loop Events
    const events = await getMindloopEvents(20);

    // Find new events (not seen before)
    const newEvents = events.filter(event => {
      const id = `${event.timestamp}-${event.event_type}`;
      if (this.seenEventIds.has(id)) return false;
      this.seenEventIds.add(id);
      return true;
    });

    // Emit new events
    newEvents.forEach(event => {
      this.emit({
        type: 'mindloop_event',
        timestamp: new Date().toISOString(),
        data: event,
      });
    });

    // Fetch Mind Loop Synthesis
    const synthResult = await getMindloopSynthesis();
    const synthesis = synthResult?.items || [];

    // Find new synthesis items
    const newSynthesis = synthesis.filter(item => {
      const id = item.id;
      if (this.seenSynthesisIds.has(id)) return false;
      this.seenSynthesisIds.add(id);
      return true;
    });

    // Emit new synthesis
    newSynthesis.forEach(item => {
      this.emit({
        type: 'mindloop_synthesis',
        timestamp: new Date().toISOString(),
        data: item,
      });
    });

    // Keep memory bounded (last 1000 IDs)
    if (this.seenEventIds.size > 1000) {
      const idsArray = Array.from(this.seenEventIds);
      this.seenEventIds = new Set(idsArray.slice(-500));
    }
    if (this.seenSynthesisIds.size > 1000) {
      const idsArray = Array.from(this.seenSynthesisIds);
      this.seenSynthesisIds = new Set(idsArray.slice(-500));
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: RealtimeEvent) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[Realtime] Listener error:', error);
      }
    });
  }

  /**
   * Emit connection status change
   */
  private emitConnectionStatus(
    status: 'connected' | 'disconnected' | 'reconnecting',
    message?: string
  ) {
    this.emit({
      type: 'connection_status',
      timestamp: new Date().toISOString(),
      data: { status, message },
    });
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isPolling: this.isPolling,
      isConnected: this.isConnected,
      currentInterval: this.currentInterval,
      listeners: this.listeners.size,
    };
  }
}

// Singleton instance
export const realtimeManager = new RealtimeManager();

// Auto-cleanup on window unload (browser only)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realtimeManager.stop();
  });
}
