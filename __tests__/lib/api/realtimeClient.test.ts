/**
 * realtimeClient — v3 migration tests
 */

// Mock coreClient BEFORE importing realtimeClient (Jest hoisting)
jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    corePost: jest.fn(),
    getCoreBaseUrl: jest.fn(() => 'http://localhost:8081'),
}));

import { buildWsUrl, fetchRealtimeStats, broadcastRealtimeEvent, realtime } from '@/lib/api/realtimeClient';
import { coreGet, corePost } from '@/lib/api/coreClient';

class FakeWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    static instances: FakeWebSocket[] = [];

    readyState = FakeWebSocket.CONNECTING;
    sent: string[] = [];
    closed = false;
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;

    constructor(public url: string) {
        FakeWebSocket.instances.push(this);
    }

    send(message: string) {
        this.sent.push(message);
    }

    close() {
        this.closed = true;
        this.readyState = FakeWebSocket.CLOSED;
        this.onclose?.();
    }

    open() {
        this.readyState = FakeWebSocket.OPEN;
        this.onopen?.();
    }
}

beforeEach(() => {
    jest.clearAllMocks();
    realtime.disconnect();
    FakeWebSocket.instances = [];
    (window as any).__mora_ws_lock = false;
    Object.defineProperty(global, 'WebSocket', {
        writable: true,
        value: FakeWebSocket,
    });
    document.cookie = 'mora_auth_token=test-session';
});

afterEach(() => {
    realtime.disconnect();
    jest.useRealTimers();
});

describe('buildWsUrl', () => {
    it('uses /v3/realtime/subscribe not /v1/', () => {
        const url = buildWsUrl('test-token', {
            coreWsUrl: 'wss://api.example.com',
        });
        expect(url).toContain('/v3/realtime/subscribe');
        expect(url).not.toContain('/v1/');
    });

    it('includes token in query string', () => {
        const url = buildWsUrl('mytoken', {
            coreWsUrl: 'wss://api.example.com',
        });
        expect(url).toContain('token=mytoken');
    });

    it('Branch B localhost: uses ws://localhost:8081', () => {
        const url = buildWsUrl('tok', {
            coreApiUrl: '/api/core',
            hostname: 'localhost',
            host: 'localhost:3000',
            protocol: 'ws:',
        });
        expect(url).toBe('ws://localhost:8081/v3/realtime/subscribe?token=tok&event_types=all');
    });

    it('uses explicit event_types when provided', () => {
        const url = buildWsUrl('tok', {
            coreWsUrl: 'wss://api.example.com',
            eventTypes: ['mindloop_event', 'node_update', 'mindloop_event'],
        });
        expect(url).toBe('wss://api.example.com/v3/realtime/subscribe?token=tok&event_types=mindloop_event,node_update');
    });

    it('filters internal lifecycle events from explicit event_types', () => {
        const url = buildWsUrl('tok', {
            coreWsUrl: 'wss://api.example.com',
            eventTypes: ['connected', 'mindloop_event', 'disconnected'],
        });
        expect(url).toBe('wss://api.example.com/v3/realtime/subscribe?token=tok&event_types=mindloop_event');
    });

    it('Branch B non-localhost: rewrites hq. host to api. with protocol', () => {
        const url = buildWsUrl('tok', {
            coreApiUrl: '/api/core',
            hostname: 'hq.saimor.world',
            host: 'hq.saimor.world',
            protocol: 'wss:',
        });
        expect(url).toBe('wss://api.saimor.world/v3/realtime/subscribe?token=tok&event_types=all');
    });

    it('Branch C absolute coreApiUrl: http replaced with ws', () => {
        const url = buildWsUrl('tok', {
            coreApiUrl: 'https://api.example.com',
        });
        expect(url).toBe('wss://api.example.com/v3/realtime/subscribe?token=tok&event_types=all');
    });
});

describe('fetchRealtimeStats', () => {
    it('routes to GET /v3/realtime/stats', async () => {
        (coreGet as jest.Mock).mockResolvedValue({ connections: 1, uptime: 100 });
        await fetchRealtimeStats();
        expect(coreGet).toHaveBeenCalledWith('/v3/realtime/stats');
    });
});

describe('broadcastRealtimeEvent', () => {
    it('routes to POST /v3/realtime/broadcast/{event_type}', async () => {
        (corePost as jest.Mock).mockResolvedValue({ sent: true });
        await broadcastRealtimeEvent('node.updated', { id: 'nd-1' });
        expect(corePost).toHaveBeenCalledWith(
            '/v3/realtime/broadcast/node.updated',
            { id: 'nd-1' }
        );
    });
});

describe('realtime subscription lifecycle', () => {
    it('does not close a connecting socket when a second event is added', () => {
        jest.useFakeTimers();

        const ghostHandler = jest.fn();
        const radarHandler = jest.fn();

        realtime.on('ghost_presence', ghostHandler);
        realtime.connect();
        expect(FakeWebSocket.instances).toHaveLength(1);
        const socket = FakeWebSocket.instances[0];
        expect(socket.url).toContain('event_types=ghost_presence');

        realtime.on('mora.radar.new', radarHandler);
        jest.advanceTimersByTime(75);

        expect(socket.closed).toBe(false);
        expect(FakeWebSocket.instances).toHaveLength(1);

        socket.open();

        expect(socket.sent.map((message) => JSON.parse(message))).toContainEqual({
            type: 'subscribe',
            event_types: ['mora.radar.new'],
        });

        realtime.off('ghost_presence', ghostHandler);
        realtime.off('mora.radar.new', radarHandler);
    });

    it('subscribes live without reconnecting when a socket is already open', () => {
        jest.useFakeTimers();

        const ghostHandler = jest.fn();
        const radarHandler = jest.fn();

        realtime.on('ghost_presence', ghostHandler);
        realtime.connect();
        const socket = FakeWebSocket.instances[0];
        socket.open();

        realtime.on('mora.radar.new', radarHandler);
        jest.advanceTimersByTime(75);

        expect(socket.closed).toBe(false);
        expect(FakeWebSocket.instances).toHaveLength(1);
        expect(socket.sent.map((message) => JSON.parse(message))).toContainEqual({
            type: 'subscribe',
            event_types: ['mora.radar.new'],
        });

        realtime.off('ghost_presence', ghostHandler);
        realtime.off('mora.radar.new', radarHandler);
    });
});
