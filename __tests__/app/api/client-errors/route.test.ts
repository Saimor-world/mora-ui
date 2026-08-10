jest.mock('next/server', () => {
    class MockNextResponse {
        status: number;
        headers: { get: (name: string) => string | null };

        constructor(_body?: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
            this.status = init.status ?? 200;
            const headers = new Map(
                Object.entries(init.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
            );
            this.headers = { get: (name: string) => headers.get(name.toLowerCase()) ?? null };
        }

        static json(_body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
            return new MockNextResponse(null, init);
        }
    }

    return { NextResponse: MockNextResponse };
});

import { POST } from '@/app/api/client-errors/route';

function request(body: string, ip: string, extraHeaders: Record<string, string> = {}) {
    const bytes = Buffer.from(body);
    let consumed = false;
    const headers = new Map<string, string>([
        ['content-type', 'application/json'],
        ['x-real-ip', ip],
        ...Object.entries(extraHeaders).map(([key, value]) => [key.toLowerCase(), value] as [string, string]),
    ]);

    return {
        headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
        body: {
            getReader: () => ({
                read: async () => {
                    if (consumed) return { done: true, value: undefined };
                    consumed = true;
                    return { done: false, value: bytes };
                },
                cancel: async () => undefined,
            }),
        },
    } as unknown as Request;
}

describe('client error route', () => {
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        errorSpy.mockRestore();
    });

    it('accepts and redacts a valid report', async () => {
        const response = await POST(request(JSON.stringify({
            message: 'Failed for alice@example.com',
            context: { token: 'private', code: 'E_TEST' },
        }), 'route-valid'));

        expect(response.status).toBe(202);
        expect(errorSpy).toHaveBeenCalledTimes(1);
        const logged = String(errorSpy.mock.calls[0][1]);
        expect(logged).not.toContain('alice@example.com');
        expect(logged).not.toContain('private');
        expect(logged).toContain('E_TEST');
    });

    it('rejects invalid JSON without logging it', async () => {
        const response = await POST(request('{broken', 'route-invalid'));
        expect(response.status).toBe(400);
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('rejects an oversized chunked body even without content-length', async () => {
        const response = await POST(request(JSON.stringify({
            message: 'x'.repeat(17_000),
        }), 'route-large'));
        expect(response.status).toBe(413);
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('rejects a declared oversized body before parsing', async () => {
        const response = await POST(request(
            JSON.stringify({ message: 'small' }),
            'route-declared-large',
            { 'content-length': '20000' },
        ));
        expect(response.status).toBe(413);
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('rate-limits repeated reports from one source', async () => {
        for (let index = 0; index < 10; index += 1) {
            const response = await POST(request(
                JSON.stringify({ message: `failure-${index}` }),
                'route-rate-limit',
            ));
            expect(response.status).toBe(202);
        }

        const blocked = await POST(request(
            JSON.stringify({ message: 'failure-blocked' }),
            'route-rate-limit',
        ));
        expect(blocked.status).toBe(429);
        expect(blocked.headers.get('retry-after')).toBe('60');
    });
});
