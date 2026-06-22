import {
    coreUnreachableUserMessage,
    fetchCoreUpstream,
    getCoreUpstreamBaseUrls,
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

    it('falls back to the public API URL when internal routing fails', async () => {
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
});
