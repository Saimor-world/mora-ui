import { CoreError, corePost } from '@/lib/api/http';

describe('corePost auth error handling', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        global.fetch = originalFetch;
        jest.restoreAllMocks();
    });

    it('keeps the legacy tolerant behavior for 403 responses by default', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            status: 403,
            ok: false,
            statusText: 'Forbidden',
            json: jest.fn().mockResolvedValue({
                detail: { error_code: 'gmail_scope_missing', message: 'Reconnect Google' },
            }),
        }) as any;

        await expect(corePost('/v3/mail/messages/x/trash', {})).resolves.toBeNull();
    });

    it('throws a structured CoreError when an explicit mutation opts in', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            status: 403,
            ok: false,
            statusText: 'Forbidden',
            json: jest.fn().mockResolvedValue({
                detail: { error_code: 'gmail_scope_missing', message: 'Reconnect Google' },
            }),
        }) as any;

        try {
            await corePost('/v3/mail/messages/x/trash', {}, { throwAuthErrors: true });
            throw new Error('expected corePost to throw');
        } catch (error) {
            expect(error).toBeInstanceOf(CoreError);
            expect((error as CoreError).status).toBe(403);
            expect((error as CoreError).details).toEqual({
                error_code: 'gmail_scope_missing',
                message: 'Reconnect Google',
            });
        }
    });
});
