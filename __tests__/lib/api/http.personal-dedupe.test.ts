import { coreGet } from '@/lib/api/http';
import { _leereBuendelung } from '@/lib/api/anfrageBuendelung';

const originalFetch = global.fetch;
beforeEach(() => { _leereBuendelung(); });
afterEach(() => { global.fetch = originalFetch; _leereBuendelung(); });

it('deduplicates one scope while keeping two simultaneous principals separate on the same URL', async () => {
  const replies: Array<(value: Response) => void> = [];
  const fetchMock = jest.fn(() => new Promise<Response>(resolve => { replies.push(resolve); }));
  global.fetch = fetchMock;
  const first = coreGet('/v3/connections', { skipAuth: true, dedupeScope: 'principal-A' });
  const duplicate = coreGet('/v3/connections', { skipAuth: true, dedupeScope: 'principal-A' });
  const second = coreGet('/v3/connections', { skipAuth: true, dedupeScope: 'principal-B' });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const response = (principal: string) => ({ ok: true, status: 200, json: async () => ({ principal }) }) as Response;
  replies[1](response('B'));
  await expect(second).resolves.toEqual({ principal: 'B' });
  replies[0](response('A'));
  await expect(first).resolves.toEqual({ principal: 'A' });
  await expect(duplicate).resolves.toEqual({ principal: 'A' });
  for (const call of fetchMock.mock.calls as unknown as Array<[string, RequestInit]>) {
    expect(call[0]).not.toContain('principal-');
    expect(call[1]).not.toHaveProperty('dedupeScope');
    expect(JSON.stringify(call[1].headers)).not.toContain('principal-');
  }
});
