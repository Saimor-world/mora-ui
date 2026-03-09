/**
 * realtimeClient — v3 migration tests
 */

// Mock coreClient BEFORE importing realtimeClient (Jest hoisting)
jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    corePost: jest.fn(),
}));

import { buildWsUrl, fetchRealtimeStats, broadcastRealtimeEvent } from '@/lib/api/realtimeClient';
import { coreGet, corePost } from '@/lib/api/coreClient';

beforeEach(() => jest.clearAllMocks());

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
