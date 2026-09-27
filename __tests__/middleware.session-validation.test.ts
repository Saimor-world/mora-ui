/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const mockFetchCoreUpstream = jest.fn();
jest.mock('@/lib/api/coreReachability', () => ({
    fetchCoreUpstream: (...args: unknown[]) => mockFetchCoreUpstream(...args),
}));

const mockGetToken = jest.fn();
jest.mock('next-auth/jwt', () => ({
    getToken: (...args: unknown[]) => mockGetToken(...args),
}));

import { middleware } from '@/middleware';
import { nextAuthVerificationSecret } from '@/lib/auth/coreSessionGuard';

const ORIGINAL_ENV = { ...process.env };

function request(path: string, cookie?: string, host = 'os.saimor.world') {
    return new NextRequest(`https://${host}${path}`, {
        headers: cookie ? { cookie } : {},
    });
}

function setEnv(overrides: Record<string, string | undefined>) {
    for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined) delete (process.env as Record<string, string | undefined>)[key];
        else (process.env as Record<string, string | undefined>)[key] = value;
    }
}

describe('middleware session validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...ORIGINAL_ENV };
        mockGetToken.mockResolvedValue(null);
    });

    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });

    it('rejects API routes when the session cookie is not confirmed by CORE', async () => {
        mockFetchCoreUpstream.mockResolvedValue(new Response('{}', { status: 401 }));

        const res = await middleware(request('/api/client-errors', 'mora_auth_token=forged'));

        expect(res.status).toBe(401);
        expect(mockFetchCoreUpstream).toHaveBeenCalledWith(
            '/v3/auth/validate',
            expect.objectContaining({ headers: expect.objectContaining({ cookie: 'mora_auth_token=forged' }) }),
        );
    });

    it('allows API routes when CORE confirms the session', async () => {
        mockFetchCoreUpstream.mockResolvedValue(new Response('{"valid":true}', { status: 200 }));

        const res = await middleware(request('/api/finance/xrpl', 'mora_session=sess_ok'));

        expect(res.status).toBe(200);
        expect(res.headers.get('x-middleware-next')).toBe('1');
    });

    it('rejects API routes when CORE is unreachable', async () => {
        mockFetchCoreUpstream.mockRejectedValue(new Error('ECONNREFUSED'));

        const res = await middleware(request('/api/v2/anything', 'mora_session=sess_ok'));

        expect(res.status).toBe(401);
    });

    it('rejects API routes without any cookie and without calling CORE', async () => {
        const res = await middleware(request('/api/client-errors'));

        expect(res.status).toBe(401);
        expect(mockFetchCoreUpstream).not.toHaveBeenCalled();
    });

    it('still renders pages on cookie presence (data calls are validated by CORE)', async () => {
        const res = await middleware(request('/os', 'mora_session=anything'));

        expect(res.headers.get('x-middleware-next')).toBe('1');
        expect(mockFetchCoreUpstream).not.toHaveBeenCalled();
    });

    it('leaves public auth and CORE proxy routes untouched', async () => {
        const res = await middleware(request('/api/core/v3/auth/me'));

        expect(res.headers.get('x-middleware-next')).toBe('1');
        expect(mockFetchCoreUpstream).not.toHaveBeenCalled();
    });

    it('does not trust NextAuth tokens in production without a real secret', async () => {
        setEnv({ NODE_ENV: 'production', NEXTAUTH_SECRET: undefined });
        mockGetToken.mockResolvedValue({ sub: 'forged' });

        const page = await middleware(request('/os'));
        const api = await middleware(request('/api/client-errors'));

        expect(mockGetToken).not.toHaveBeenCalled();
        expect(page.status).toBe(307);
        expect(api.status).toBe(401);
    });

    it('accepts a NextAuth token verified with the configured secret', async () => {
        setEnv({ NODE_ENV: 'production', NEXTAUTH_SECRET: 'real-secret' });
        mockGetToken.mockResolvedValue({ sub: 'user-1' });

        const res = await middleware(request('/api/client-errors'));

        expect(mockGetToken).toHaveBeenCalledWith(expect.objectContaining({ secret: 'real-secret' }));
        expect(res.headers.get('x-middleware-next')).toBe('1');
    });
});

describe('nextAuthVerificationSecret', () => {
    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
    });

    it('never returns the public dev secret in production', () => {
        setEnv({ NODE_ENV: 'production', NEXTAUTH_SECRET: 'dev_secret_key_change_me_in_prod' });
        expect(nextAuthVerificationSecret()).toBeNull();
        setEnv({ NEXTAUTH_SECRET: undefined });
        expect(nextAuthVerificationSecret()).toBeNull();
    });

    it('keeps the dev fallback outside production', () => {
        setEnv({ NODE_ENV: 'test', NEXTAUTH_SECRET: undefined });
        expect(nextAuthVerificationSecret()).toBe('dev_secret_key_change_me_in_prod');
    });
});
