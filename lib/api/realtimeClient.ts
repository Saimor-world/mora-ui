"use client";

const AUTH_COOKIE = "mora_auth_token";

type EventHandler = (data: any) => void;

class RealtimeClient {
    private ws: WebSocket | null = null;
    private listeners: Map<string, Set<EventHandler>> = new Map();
    private reconnectTimer: NodeJS.Timeout | null = null;
    private isConnecting: boolean = false;
    private connectionId: string | null = null;

    constructor() {
        // Auto-connect handled by components
    }

    private getToken(): string | null {
        if (typeof document === 'undefined') return null;

        // Read cookies helper
        const readCookie = (name: string): string | null => {
            const matches = document.cookie.split('; ').find(row => row.startsWith(`${name}=`));
            return matches ? matches.split('=')[1] : null;
        };

        // Try auth sources in priority order
        let token = readCookie(AUTH_COOKIE) ||
            (typeof window !== 'undefined' ? localStorage.getItem('saimor_dev_token') : null) ||
            process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT ||
            process.env.NEXT_PUBLIC_API_TOKEN ||
            null;

        return token;
    }

    public connect() {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;

        const token = this.getToken();
        if (!token) {
            // console.warn('[Realtime] No token found, skipping connection');
            return;
        }

        this.isConnecting = true;

        // Using localhost:8081 (Main Core API) - Unified System
        // In production this would use an env variable
        // P1.5: Reliable WebSocket URL resolution
        const CORE_API_URL = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:8081';
        const CORE_WS_URL = process.env.NEXT_PUBLIC_CORE_WS_URL;

        // If we have an explicit WS URL, use it
        let wsUrl = "";
        if (CORE_WS_URL) {
            wsUrl = `${CORE_WS_URL}/v1/realtime/subscribe?token=${token}&event_types=all`;
        } else {
            // Handle relative paths (for Next.js proxy) vs absolute URLs
            if (CORE_API_URL.startsWith('/')) {
                // In production, we assume relative path works via the same host
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                wsUrl = `${protocol}//${window.location.host}${CORE_API_URL}/v1/realtime/subscribe?token=${token}&event_types=all`;

                // LOCAL DEV FALLBACK: If we are on localhost:3000 and using /api/core proxy, 
                // Next.js doesn't proxy WebSockets by default. Connect to 8081 directly.
                if (window.location.host.includes('localhost:3000')) {
                    wsUrl = `ws://localhost:8081/v1/realtime/subscribe?token=${token}&event_types=all`;
                }
            } else {
                const wsHost = CORE_API_URL.replace(/^http/, 'ws');
                wsUrl = `${wsHost}/v1/realtime/subscribe?token=${token}&event_types=all`;
            }
        }

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('[Realtime] Connected');
                this.isConnecting = false;
                if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
                this.emit('connected', { timestamp: Date.now() });
            };

            this.ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);

                    if (payload.type === 'welcome') {
                        this.connectionId = payload.connection_id;
                        console.log('[Realtime] Registered as', this.connectionId);
                    }
                    else if (payload.type === 'event') {
                        // console.log('[Realtime] Event:', payload.event_type);
                        this.emit(payload.event_type, payload.data);
                    }
                    else if (payload.type === 'ping') {
                        // ignore/reply pong?
                    }
                } catch (e) {
                    console.error('[Realtime] Failed to parse message:', event.data);
                }
            };

            this.ws.onclose = () => {
                console.log('[Realtime] Disconnected');
                this.isConnecting = false;
                this.ws = null;
                this.emit('disconnected', {});
                this.scheduleReconnect();
            };

            this.ws.onerror = (err) => {
                // console.error('[Realtime] Error:', err);
                this.ws?.close();
            };

        } catch (e) {
            console.error('[Realtime] Connection failed:', e);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            // console.log('[Realtime] Attempting reconnect...');
            this.connect();
        }, 5000);
    }

    public disconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.ws?.close();
        this.ws = null;
    }

    public on(event: string, handler: EventHandler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(handler);
    }

    public off(event: string, handler: EventHandler) {
        this.listeners.get(event)?.delete(handler);
    }

    private emit(event: string, data: any) {
        this.listeners.get(event)?.forEach(handler => handler(data));
    }
}

export const realtime = new RealtimeClient();
