import { createSafeErrorReport, sendSafeErrorReport } from '@/lib/utils/error-reporting';

describe('production-safe error reporting', () => {
    it('redacts identity, credentials, query strings, and local usernames', () => {
        const error = new Error(
            'alice@example.com failed with Bearer secret-token at C:\\Users\\alice\\repo',
        );
        error.stack = 'at https://saimor.world/path?userId=89b6b6a0-178e-4a7f-85cb-13fa24785e20';

        const report = createSafeErrorReport({
            message: 'Request for alice@example.com failed',
            error,
            context: {
                userId: '89b6b6a0-178e-4a7f-85cb-13fa24785e20',
                email: 'alice@example.com',
                route: 'https://saimor.world/home?token=secret',
                nested: { tenantId: 'tenant-private', code: 'E_UPSTREAM' },
            },
        });
        const serialized = JSON.stringify(report);

        expect(serialized).not.toContain('alice@example.com');
        expect(serialized).not.toContain('secret-token');
        expect(serialized).not.toContain('89b6b6a0');
        expect(serialized).not.toContain('tenant-private');
        expect(serialized).not.toContain('C:\\\\Users\\\\alice');
        expect(serialized).toContain('E_UPSTREAM');
        expect(serialized).toContain('[query-redacted]');
    });

    it('sends safe reports without credentials', () => {
        const fetchMock = jest.fn().mockResolvedValue({ status: 202 }) as jest.MockedFunction<typeof fetch>;

        sendSafeErrorReport({
            message: 'Failed for alice@example.com',
            context: { userId: 'private-user', code: 'E_TEST' },
        }, fetchMock);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/client-errors',
            expect.objectContaining({ credentials: 'omit', keepalive: true }),
        );
        const body = String((fetchMock.mock.calls[0][1] as RequestInit).body);
        expect(body).not.toContain('alice@example.com');
        expect(body).not.toContain('private-user');
        expect(body).toContain('E_TEST');
    });
});