import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDemoStore } from '@/lib/demo/demoStore';
import { usePostCalendar, usePostInbox } from '@/features/post/data/usePost';
import { useMemories } from '@/lib/queries/useMemories';
import { useMoraSend } from '@/features/mora/data/useMoraSend';
import { useMoraConversation } from '@/features/mora/data/conversationStore';
import { moraAgentClient } from '@/lib/api/moraAgentClient';
import { useSources } from '@/lib/os-prototype/useSources';

const coreGet = jest.fn();
jest.mock('@/lib/api/http', () => ({ coreGet: (...args: unknown[]) => coreGet(...args), normalizeList: (value: unknown) => Array.isArray(value) ? value : [] }));
jest.mock('@/lib/api/moraAgentClient', () => ({ moraAgentClient: { chat: jest.fn() } }));

function wrapper({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  coreGet.mockReset().mockResolvedValue([]);
  useDemoStore.getState().setDemoCompany(null);
  useSessionStore.getState().setUser({ id: 'owner', tenant_id: 'hq', role: 'system_owner', active_company_id: 'hq-company' } as any);
  useMoraConversation.getState().reset();
});

it('loads demo mail, calendar and company memory with explicit scope instead of the HQ defaults', async () => {
  useDemoStore.getState().setDemoCompany('demo-company');
  renderHook(() => { usePostInbox(); usePostCalendar(); useMemories(8); }, { wrapper });
  await waitFor(() => expect(coreGet).toHaveBeenCalledTimes(3));
  expect(coreGet.mock.calls.map((call) => call[0]).sort()).toEqual([
    '/v3/calendar/events?company_id=demo-company',
    '/v3/mail/messages?company_id=demo-company',
    '/v3/memory/entries?limit=8&company_id=demo-company',
  ]);
});

it('does not put a late HQ model reply into the new demo conversation', async () => {
  let resolve!: (value: any) => void;
  (moraAgentClient.chat as jest.Mock).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const { result } = renderHook(() => useMoraSend({ featureId: 'universe', contextLabel: 'Universe' }), { wrapper });
  act(() => result.current.mutate('HQ question'));
  await waitFor(() => expect(moraAgentClient.chat).toHaveBeenCalled());
  expect((moraAgentClient.chat as jest.Mock).mock.calls.at(-1)[0].context.company_id).toBe('hq-company');
  act(() => {
    useDemoStore.getState().setDemoCompany('demo-company');
    useMoraConversation.getState().add({ role: 'user', text: 'New demo question' });
    resolve({ response: 'Private HQ answer' });
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(useMoraConversation.getState().turns.map((t) => t.text)).toEqual(['New demo question']);
});

it('rejects an older CORE provider response that ignores the selected demo company', async () => {
  coreGet.mockResolvedValue({ connections: [{ id: 'mail', status: 'connected', label: 'HQ mailbox' }] });
  useDemoStore.getState().setDemoCompany('demo-company');
  const { result } = renderHook(() => useSources(true), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.data).toBeUndefined();
});
