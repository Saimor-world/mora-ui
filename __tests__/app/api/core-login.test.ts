jest.mock('next/server', () => {
    class MockHeaders {
        private values = new Map<string, string>();

        constructor(init?: Record<string, string>) {
            Object.entries(init || {}).forEach(([key, value]) => this.set(key, value));
        }

        get(name: string) {
            return this.values.get(name.toLowerCase()) || null;
        }

        set(name: string, value: string) {
            this.values.set(name.toLowerCase(), value);
        }

        append(name: string, value: string) {
            const current = this.get(name);
            this.set(name, current ? `${current}, ${value}` : value);
        }
    }

    class MockNextResponse {
        status: number;
        headers: MockHeaders;
        private bodyValue: string;

        constructor(body?: string, init?: { status?: number; headers?: Record<string, string> }) {
            this.bodyValue = body || '';
            this.status = init?.status || 200;
            this.headers = new MockHeaders(init?.headers);
        }

        static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
            return new MockNextResponse(JSON.stringify(data), {
                status: init?.status,
                headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
            });
        }

        async text() {
            return this.bodyValue;
        }

        async json() {
            return JSON.parse(this.bodyValue);
        }
    }

    return { NextResponse: MockNextResponse };
});

describe('/api/auth/core-login', () => {
    const originalFetch = global.fetch;
    const originalDemoFallbackFlag = process.env.SAIMOR_ENABLE_LOCAL_DEMO_FALLBACK;
    let POST: typeof import('@/app/api/auth/core-login/route').POST;

    beforeAll(async () => {
        if (typeof globalThis.Request === 'undefined') {
            (globalThis as any).Request = class Request {
                url: string;
                method: string;
                private bodyValue: string;

                constructor(url: string, init?: { method?: string; body?: string }) {
                    this.url = url;
                    this.method = init?.method || 'GET';
                    this.bodyValue = init?.body || '';
                }

                async text() {
                    return this.bodyValue;
                }
            };
        }
        ({ POST } = await import('@/app/api/auth/core-login/route'));
    });

    afterEach(() => {
        global.fetch = originalFetch;
        if (originalDemoFallbackFlag === undefined) {
            delete process.env.SAIMOR_ENABLE_LOCAL_DEMO_FALLBACK;
        } else {
            process.env.SAIMOR_ENABLE_LOCAL_DEMO_FALLBACK = originalDemoFallbackFlag;
        }
        jest.restoreAllMocks();
    });

    it('does not expose the local demo fallback unless explicitly enabled', async () => {
        delete process.env.SAIMOR_ENABLE_LOCAL_DEMO_FALLBACK;
        process.env = { ...process.env, NODE_ENV: 'production' };
        process.env.SAIMOR_CORE_URL = 'http://core:8081';
        global.fetch = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:8081')) as any;
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        const response = await POST(new Request('http://localhost/api/auth/core-login', {
            method: 'POST',
            body: JSON.stringify({ email: 'demo@saimor.io', password: 'demo123' }),
        }) as any);

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toMatchObject({
            success: false,
            detail: 'Dienst vorübergehend nicht erreichbar. Bitte in wenigen Minuten erneut versuchen.',
        });
    });

    it('returns a local demo fallback when Core is unavailable and the dev flag is enabled', async () => {
        process.env.SAIMOR_ENABLE_LOCAL_DEMO_FALLBACK = '1';
        process.env = { ...process.env, NODE_ENV: 'development' };
        global.fetch = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:8081')) as any;
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        const response = await POST(new Request('http://localhost/api/auth/core-login', {
            method: 'POST',
            body: JSON.stringify({ email: 'demo@saimor.io', password: 'demo123' }),
        }) as any);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            success: true,
            role: 'demo',
            tenant_id: 'tenant-demo',
            auth_type: 'local_demo_fallback',
        });
    });

    it('returns service unavailable for non-demo credentials when Core is unavailable', async () => {
        process.env = { ...process.env, NODE_ENV: 'production' };
        process.env.SAIMOR_CORE_URL = 'http://core:8081';
        global.fetch = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:8081')) as any;
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        const response = await POST(new Request('http://localhost/api/auth/core-login', {
            method: 'POST',
            body: JSON.stringify({ email: 'user@example.com', password: 'secret' }),
        }) as any);

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toMatchObject({
            success: false,
        });
    });
});
