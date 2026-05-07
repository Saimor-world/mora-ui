"use client";

import { coreGet, corePost } from '@/lib/api/coreClient';
import { logger } from '@/lib/utils/logger';

const AUTH_COOKIE = "mora_auth_token";

type EventHandler = (data: any) => void;

// ROOT CAUSE FIX: Next.js App Router evaluates this module multiple times when the
// root layout is "use client" — each hydration island creates a fresh module scope,
// giving each instance its own isConnecting flag and WebSocket reference.
//
// Solution: use window as a truly global (cross-evaluation) connection lock.
// window is SHARED across all module evaluations on the same page, so only
// ONE connection can ever be established at a time.
const globalWin = (): Window & { __mora_ws_lock?: boolean } | null =>
    typeof window !== 'undefined' ? (window as any) : null;
const wsLocked = () => globalWin()?.__mora_ws_lock === true;
const setWsLock = (v: boolean) => { const w = globalWin(); if (w) w.__mora_ws_lock = v; };

export interface BuildWsUrlOptions {
    /** Explicit WS base URL (e.g. wss://api.example.com). Overrides all derivation. */
    coreWsUrl?: string;
    /** HTTP API base URL. Used when coreWsUrl is absent. Defaults to NEXT_PUBLIC_CORE_API_URL. */
    coreApiUrl?: string;
    /** window.location.hostname override for testing. */
    hostname?: string;
    /** window.location.host override for testing. */
    host?: string;
    /** window.location.protocol override for testing. */
    protocol?: string;
    /** Explicit list of event types to subscribe to. Defaults to `all`. */
    eventTypes?: string[];
}

const INTERNAL_EVENTS = new Set(['connected', 'disconnected']);

function serializeEventTypes(eventTypes?: string[]): string {
    const normalized = Array.from(
        new Set((eventTypes ?? []).filter((eventType) => !!eventType && !INTERNAL_EVENTS.has(eventType)))
    ).sort();

    return normalized.length > 0 ? normalized.join(',') : 'all';
}

function eventTypesFromKey(key: string): Set<string> {
    if (!key || key === 'all') return new Set();
    return new Set(key.split(',').filter(Boolean));
}

/**
 * Build the WebSocket URL for /v3/realtime/subscribe.
 * Extracted from connect() to be testable without a live WebSocket engine.
 */
export function buildWsUrl(token: string, opts?: BuildWsUrlOptions): string {
    const coreApiUrl = opts?.coreApiUrl ?? process.env.NEXT_PUBLIC_CORE_API_URL ?? '/api/core';
    const coreWsUrl = opts?.coreWsUrl ?? process.env.NEXT_PUBLIC_CORE_WS_URL;
    const hostname = opts?.hostname ?? (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
    const host = opts?.host ?? (typeof window !== 'undefined' ? window.location.host : 'localhost');
    const protocol = opts?.protocol ?? (typeof window !== 'undefined'
        ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
        : 'ws:');
    const eventTypes = serializeEventTypes(opts?.eventTypes);

    if (coreWsUrl) {
        return `${coreWsUrl}/v3/realtime/subscribe?token=${token}&event_types=${eventTypes}`;
    }

    if (coreApiUrl.startsWith('/')) {
        const apiHost = host.startsWith('hq.') ? host.replace(/^hq\./, 'api.') : 'api.saimor.world';

        if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
            return `ws://localhost:8081/v3/realtime/subscribe?token=${token}&event_types=${eventTypes}`;
        }
        return `${protocol}//${apiHost}/v3/realtime/subscribe?token=${token}&event_types=${eventTypes}`;
    }

    const wsHost = coreApiUrl.replace(/^http/, 'ws');
    return `${wsHost}/v3/realtime/subscribe?token=${token}&event_types=${eventTypes}`;
}

class RealtimeClient {
    private ws: WebSocket | null = null;
    private listeners: Map<string, Set<EventHandler>> = new Map();
    private reconnectTimer: NodeJS.Timeout | null = null;
    private resubscribeTimer: NodeJS.Timeout | null = null;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private isConnecting: boolean = false;
    private connectionId: string | null = null;
    private subscribedEventTypesKey: string = 'all';
    private reconnectAttempts: number = 0;

    constructor() {}

    private getDesiredEventTypes(): string[] {
        return Array.from(this.listeners.keys()).filter((eventType) => !INTERNAL_EVENTS.has(eventType));
    }

    private getDesiredEventTypesKey(): string {
        return serializeEventTypes(this.getDesiredEventTypes());
    }

    private syncSubscriptions() {
        const desiredKey = this.getDesiredEventTypesKey();
        if (desiredKey === this.subscribedEventTypesKey) return;

        const wsState = this.ws?.readyState;
        if (wsState !== WebSocket.OPEN) {
            // If the socket is still handshaking, do nothing here. onopen will
            // reconcile the final listener set without tearing down the socket.
            return;
        }

        const previous = eventTypesFromKey(this.subscribedEventTypesKey);
        const desired = eventTypesFromKey(desiredKey);
        const added = Array.from(desired).filter((eventType) => !previous.has(eventType));
        const removed = Array.from(previous).filter((eventType) => !desired.has(eventType));

        try {
            if (added.length > 0) {
                this.ws?.send(JSON.stringify({ type: 'subscribe', event_types: added }));
            }
            if (removed.length > 0) {
                this.ws?.send(JSON.stringify({ type: 'unsubscribe', event_types: removed }));
            }
            this.subscribedEventTypesKey = desiredKey;
        } catch (error) {
            logger.warn('[Realtime] Subscription sync failed', error as Error);
        }
    }

    private scheduleResubscribe() {
        if (this.resubscribeTimer) clearTimeout(this.resubscribeTimer);

        this.resubscribeTimer = setTimeout(() => {
            this.resubscribeTimer = null;
            this.syncSubscriptions();
        }, 75);
    }

    private clearHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private startHeartbeat() {
        this.clearHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
            try {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            } catch {
                // Best effort only. onerror/onclose handles recovery.
            }
        }, 20_000);
    }

    private getToken(): string | null {
        if (typeof document === 'undefined') return null;

        // Read cookies helper
        const readCookie = (name: string): string | null => {
            const matches = document.cookie.split('; ').find(row => row.startsWith(`${name}=`));
            return matches ? matches.split('=')[1] : null;
        };

        // Try auth sources in priority order
        const isLocalhost =
            typeof window !== 'undefined' &&
            ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

        let token = readCookie(AUTH_COOKIE) ||
            (isLocalhost ? localStorage.getItem('saimor_dev_token') : null) ||
            process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT ||
            process.env.NEXT_PUBLIC_API_TOKEN ||
            null;

        return token;
    }

    public connect() {
        // Cross-evaluation lock: prevents duplicate connections when Next.js App Router
        // evaluates this module multiple times (once per hydration island).
        if (wsLocked()) return;
        const wsState = this.ws?.readyState;
        if (wsState === WebSocket.OPEN || wsState === WebSocket.CONNECTING || this.isConnecting) return;
        setWsLock(true); // claim the lock before any async work

        const token = this.getToken();
        if (!token) {
            logger.warn('[Realtime] No token found, skipping connection');
            setWsLock(false);
            return;
        }

        this.isConnecting = true;
        this.subscribedEventTypesKey = this.getDesiredEventTypesKey();

        const wsUrl = buildWsUrl(token, { eventTypes: this.getDesiredEventTypes() });

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {

                this.isConnecting = false;
                this.reconnectAttempts = 0; // reset backoff on successful connect
                // Lock stays set (wsLocked=true) while OPEN — prevents other instances connecting
                if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
                this.startHeartbeat();
                this.syncSubscriptions();
                this.emit('connected', { timestamp: Date.now() });
            };

            this.ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);

                    if (payload.type === 'welcome') {
                        this.connectionId = payload.connection_id;

                    }
                    else if (payload.type === 'event') {
                        logger.debug('[Realtime] Event:', payload.event_type);
                        this.emit(payload.event_type, payload.data);
                    }
                    else if (payload.type === 'ping' && this.ws?.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify({ type: 'pong' }));
                    }
                    else if (payload.type === 'pong') {
                        // heartbeat acknowledged
                    }
                } catch (e) {
                    logger.error('[Realtime] Failed to parse message', e as Error);
                }
            };

            this.ws.onclose = () => {

                this.isConnecting = false;
                this.ws = null;
                this.clearHeartbeat();
                setWsLock(false); // release lock so reconnect can proceed
                this.emit('disconnected', {});
                this.scheduleReconnect();
            };

            this.ws.onerror = (err) => {
                // logger.error('[Realtime] Error:', err); // redundant with onclose/onerror logic
                this.ws?.close();
            };

        } catch (e) {
            logger.error('[Realtime] Connection failed', e as Error);
            this.isConnecting = false;
            this.clearHeartbeat();
            setWsLock(false);
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        // Exponential backoff: 5s, 10s, 20s, 40s … capped at 60s
        const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts), 60_000);
        this.reconnectAttempts++;
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }

    public disconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.resubscribeTimer) clearTimeout(this.resubscribeTimer);
        this.clearHeartbeat();
        if (this.ws) {
            this.ws.onclose = null; // prevent onclose from scheduling a reconnect
            this.ws.onerror = null;
            this.ws.close();
            this.ws = null;
        }
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.subscribedEventTypesKey = 'all';
        setWsLock(false); // release global lock so future connect() calls can proceed
    }

    public on(event: string, handler: EventHandler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(handler);
        this.scheduleResubscribe();
    }

    public off(event: string, handler: EventHandler) {
        const handlers = this.listeners.get(event);
        handlers?.delete(handler);
        if (handlers && handlers.size === 0) {
            this.listeners.delete(event);
        }
    }

    private emit(event: string, data: any) {
        this.listeners.get(event)?.forEach(handler => handler(data));
    }
}

// ─── HTTP helpers (v3) ────────────────────────────────────────────────────────

export interface RealtimeStats {
    connections: number;
    uptime: number;
    [key: string]: unknown;
}

/**
 * GET /v3/realtime/stats
 * Returns current WebSocket server statistics.
 */
export async function fetchRealtimeStats(): Promise<RealtimeStats> {
    return coreGet('/v3/realtime/stats') as Promise<RealtimeStats>;
}

/**
 * POST /v3/realtime/broadcast/{event_type}
 * Broadcasts a custom event to all connected clients.
 */
export async function broadcastRealtimeEvent(
    eventType: string,
    data: Record<string, unknown>
): Promise<{ sent: boolean }> {
    return corePost(`/v3/realtime/broadcast/${eventType}`, data) as Promise<{ sent: boolean }>;
}

export const realtime = new RealtimeClient();
