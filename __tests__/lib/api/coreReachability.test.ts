import {
    CORE_UPSTREAM_TIMEOUT_MS,
    coreUnreachableUserMessage,
    fetchCoreUpstream,
    getCoreUpstreamBaseUrls,
    getInternalCoreBaseUrl,
    getPublicCoreBaseUrl,
    isLocalDevRuntime,
} from '@/lib/api/coreReachability';

describe('coreReachability', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
        jest.restoreAllMocks();
    });

    it('uses production-safe messaging outside local dev runtimes', () => {
        process.env = { ...process.env, NODE_ENV: 'production' };
        process.env.SAIMOR_CORE_URL = 'http://core:8081';

        expect(isLocalDevRuntime()).toBe(false);
        expect(coreUnreachableUserMessage()).toBe(
            'Dienst vorübergehend nicht erreichbar. Bitte in wenigen Minuten erneut versuchen.'
        );
    });

    it('uses local dev messaging in development', () => {
        process.env = { ...process.env, NODE_ENV: 'development' };
        process.env.SAIMOR_CORE_URL = 'http://127.0.0.1:8081';

        expect(isLocalDevRuntime()).toBe(true);
        expect(coreUnreachableUserMessage()).toContain('lokal nicht erreichbar');
        expect(coreUnreachableUserMessage()).toContain('SAIMOR_CORE_URL');
    });

    it('orders internal docker URL before public API URL', () => {
        process.env = { ...process.env, NODE_ENV: 'production' };
        process.env.SAIMOR_CORE_URL = 'http://core:8081';
        process.env.NEXT_PUBLIC_SAIMOR_CORE_URL = 'https://api.saimor.world';

        expect(getCoreUpstreamBaseUrls()).toEqual([
            'http://core:8081',
            'https://api.saimor.world',
        ]);
        expect(getPublicCoreBaseUrl()).toBe('https://api.saimor.world');
    });

    it('has no Reference #001 public fallback when an instance config omits it', () => {
        process.env = { ...process.env, NODE_ENV: 'production' };
        delete process.env.NEXT_PUBLIC_SAIMOR_CORE_URL;
        delete process.env.NEXT_PUBLIC_CORE_API_URL;
        process.env.SAIMOR_CORE_URL = 'http://core:8081';

        expect(getPublicCoreBaseUrl()).toBeNull();
        expect(getCoreUpstreamBaseUrls()).toEqual(['http://core:8081']);
    });

    it('falls back to an explicitly configured public API URL when internal routing fails', async () => {
        process.env = { ...process.env, NODE_ENV: 'production' };
        process.env.SAIMOR_CORE_URL = 'http://core:8081';
        process.env.NEXT_PUBLIC_SAIMOR_CORE_URL = 'https://api.saimor.world';

        const fetchMock = jest
            .fn()
            .mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND core'))
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: async () => '{"ok":true}',
            });

        global.fetch = fetchMock as typeof fetch;

        const response = await fetchCoreUpstream('/v3/auth/login', { method: 'POST' });

        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[0][0]).toBe('http://core:8081/v3/auth/login');
        expect(fetchMock.mock.calls[1][0]).toBe('https://api.saimor.world/v3/auth/login');
    });

    it('on Vercel without SAIMOR_CORE_URL there is no docker default, only the public URL', () => {
        process.env = { ...process.env, NODE_ENV: 'production', VERCEL: '1' };
        delete process.env.SAIMOR_CORE_URL;
        process.env.NEXT_PUBLIC_SAIMOR_CORE_URL = 'https://api.saimor.world';

        expect(getInternalCoreBaseUrl()).toBeNull();
        expect(getCoreUpstreamBaseUrls()).toEqual(['https://api.saimor.world']);
    });

    it('keeps the docker default on the server, where VERCEL is not set', () => {
        process.env = { ...process.env, NODE_ENV: 'production' };
        delete process.env.VERCEL;
        delete process.env.SAIMOR_CORE_URL;

        expect(getInternalCoreBaseUrl()).toBe('http://core:8081');
    });

    it('gives up a hanging internal URL after the timeout and answers from the public URL', async () => {
        jest.useFakeTimers();
        try {
            process.env = { ...process.env, NODE_ENV: 'production' };
            process.env.SAIMOR_CORE_URL = 'http://core:8081';
            process.env.NEXT_PUBLIC_SAIMOR_CORE_URL = 'https://api.saimor.world';

            const fetchMock = jest.fn((url: string, init: RequestInit) => {
                if (url.startsWith('http://core:8081')) {
                    // Never answers on its own; only the abort ends it.
                    return new Promise((_, reject) => {
                        init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
                    });
                }
                return Promise.resolve({ ok: true, status: 200, text: async () => '{"ok":true}' });
            });
            global.fetch = fetchMock as unknown as typeof fetch;

            const pending = fetchCoreUpstream('/v3/auth/session', { method: 'GET' });
            await jest.advanceTimersByTimeAsync(CORE_UPSTREAM_TIMEOUT_MS - 1);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            await jest.advanceTimersByTimeAsync(1);
            const response = await pending;

            expect(response.status).toBe(200);
            expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
                'http://core:8081/v3/auth/session',
                'https://api.saimor.world/v3/auth/session',
            ]);
            expect(CORE_UPSTREAM_TIMEOUT_MS).toBeLessThanOrEqual(3000);
        } finally {
            jest.useRealTimers();
        }
    });
});
