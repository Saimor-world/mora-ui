import { CoreError, coreGet, corePost } from '@/lib/api/http';

describe('CORE auth error handling', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('keeps legacy tolerant 403 behavior by default', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 403,
      ok: false,
      statusText: 'Forbidden',
      json: jest.fn().mockResolvedValue({ detail: 'Forbidden' }),
    }) as any;

    await expect(coreGet('/v3/today', { isOptional: true })).resolves.toBeNull();
  });

  it('preserves 403 for an optional read that explicitly opts into strict auth', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 403,
      ok: false,
      statusText: 'Forbidden',
      json: jest.fn().mockResolvedValue({
        detail: { error_code: 'company_not_accessible', message: 'Company not accessible' },
      }),
    }) as any;

    await expect(
      coreGet('/v3/today?company_id=company-b', {
        isOptional: true,
        throwAuthErrors: true,
      }),
    ).rejects.toMatchObject({
      name: 'CoreError',
      status: 403,
      details: {
        error_code: 'company_not_accessible',
        message: 'Company not accessible',
      },
    });
  });

  it('preserves 401 for an optional strict read', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
      statusText: 'Unauthorized',
      json: jest.fn().mockResolvedValue({ detail: 'Session expired' }),
    }) as any;

    try {
      await coreGet('/v3/today', { isOptional: true, throwAuthErrors: true });
      throw new Error('expected coreGet to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(CoreError);
      expect((error as CoreError).status).toBe(401);
    }
  });

  it('keeps strict mutation behavior available for Mail and other actions', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 403,
      ok: false,
      statusText: 'Forbidden',
      json: jest.fn().mockResolvedValue({
        detail: { error_code: 'gmail_scope_missing', message: 'Reconnect Google' },
      }),
    }) as any;

    await expect(
      corePost('/v3/mail/messages/x/trash', {}, { throwAuthErrors: true }),
    ).rejects.toMatchObject({
      name: 'CoreError',
      status: 403,
      details: {
        error_code: 'gmail_scope_missing',
        message: 'Reconnect Google',
      },
    });
  });
});
