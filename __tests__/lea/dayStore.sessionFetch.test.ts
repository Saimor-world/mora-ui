import { useDayStore } from '@/lib/lea/dayStore';
import { useSessionStore } from '@/lib/store/sessionStore';

// Use the real HTTP helper and deduplicator. Mocking coreGet hides this race.
it('never joins the previous principal’s same-URL in-flight GET', async () => {
  const original = global.fetch;
  let oldReply!: (value: unknown) => void;
  let newReply!: (value: unknown) => void;
  global.fetch = jest.fn()
    .mockImplementationOnce(() => new Promise(resolve => { oldReply = resolve; }))
    .mockImplementationOnce(() => new Promise(resolve => { newReply = resolve; }));
  const response = (id: string) => ({ ok: true, status: 200, json: async () => ({ items: [{ event_id: id, phase: 'erledigt', version: 1 }] }) });
  try {
    useSessionStore.setState({ user: { id: 'old-owner', tenant_id: 'old-tenant' } as never, sessionGeneration: 1 });
    const old = useDayStore.getState().loadCompany('same-company-id');
    useSessionStore.setState({ user: { id: 'new-owner', tenant_id: 'new-tenant' } as never, sessionGeneration: 2 });
    const fresh = useDayStore.getState().loadCompany('same-company-id');
    expect(fetch).toHaveBeenCalledTimes(2);
    newReply(response('new-event')); await fresh;
    oldReply(response('old-private-event')); await old;
    expect(useDayStore.getState().phases).toEqual({ 'new-event': 'erledigt' });
  } finally { global.fetch = original; }
});
