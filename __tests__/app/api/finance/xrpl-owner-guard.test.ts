/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('server-only', () => ({}));

const mockFetchCoreUpstream = jest.fn();
jest.mock('@/lib/api/coreReachability', () => ({
    fetchCoreUpstream: (...args: unknown[]) => mockFetchCoreUpstream(...args),
}));

jest.mock('@/lib/finance', () => {
    const account = (type: string) => ({
        address: 'rTEST', role: { type }, xrp: 1, availableXrp: 1,
        reserve: { ownerCount: 0 }, sequence: 1, security: {}, trustLines: [], transactions: [],
        evidence: { confidence: 'live' },
    });
    return {
        fetchCompanyAccounts: jest.fn(async () => [account('SAIMOR_SOVEREIGN_TREASURY'), account('SAIMOR_ORIGIN_HOT_MINTER')]),
        fetchServerInfo: jest.fn(async () => ({ reserveBaseXrp: 1, reserveIncrementXrp: 0.2, validatedLedger: 1 })),
        fetchOriginNftStatus: jest.fn(async () => ({ flags: 0, transferFee: 0, sellOffers: [] })),
        aggregateCompanyState: jest.fn(() => ({ openListings: [], lastUpdated: 'now' })),
        buildFinanceFeed: jest.fn(() => ({ feed: true })),
        buildMoraContext: jest.fn(() => ({})),
        createSnapshot: jest.fn(() => ({})),
        fetchAccountSnapshot: jest.fn(),
        KNOWN_ACCOUNTS: { SAIMOR_SOVEREIGN_TREASURY: { address: 'rA' }, SAIMOR_ORIGIN_HOT_MINTER: { address: 'rB' } },
        ORIGIN_NFT: { name: 'ORIGIN' },
    };
});

import { GET } from '@/app/api/finance/xrpl/route';

function req(cookie?: string, query = 'mode=company') {
    return new NextRequest(`https://hq.saimor.world/api/finance/xrpl?${query}`, { headers: cookie ? { cookie } : {} });
}

function meResponse(payload: unknown, ok = true) {
    return { ok, json: async () => payload };
}

describe('/api/finance/xrpl owner guard', () => {
    beforeEach(() => jest.clearAllMocks());

    it('401 without a session', async () => {
        const res = await GET(req());
        expect(res.status).toBe(401);
        expect(mockFetchCoreUpstream).not.toHaveBeenCalled();
    });

    it.each([
        ['member', { role: 'member' }],
        ['customer-company owner', { role: 'owner', is_system_owner: false }],
        ['admin', { role: 'admin' }],
    ])('403 for %s', async (_label, payload) => {
        mockFetchCoreUpstream.mockResolvedValue(meResponse(payload));
        const res = await GET(req('mora_session=sess_x'));
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toBe('forbidden');
        expect(body.treasury).toBeUndefined();
    });

    it('403 when CORE cannot confirm the role', async () => {
        mockFetchCoreUpstream.mockRejectedValue(new Error('down'));
        const res = await GET(req('mora_session=sess_x', 'mode=feed'));
        expect(res.status).toBe(403);
    });

    it('200 for the Saimôr system owner', async () => {
        mockFetchCoreUpstream.mockResolvedValue(meResponse({ role: 'system_owner', is_system_owner: true }));
        const res = await GET(req('mora_session=sess_owner'));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.mode).toBe('company');
        expect(body.treasury).not.toBeNull();
        expect(mockFetchCoreUpstream).toHaveBeenCalledWith('/v3/auth/me', expect.objectContaining({
            headers: expect.objectContaining({ Authorization: 'Bearer sess_owner' }),
        }));
    });
});
