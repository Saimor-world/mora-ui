import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const coreGet = jest.fn(async (_path: string) => ({ text: 'echt', metrics: { unread_mails: 249 }, messages: [{ id: 'real', subject: 'Echte Mail' }] }));
jest.mock('@/lib/api/http', () => {
  const actual = jest.requireActual('@/lib/api/http');
  return { ...actual, coreGet: (p: string) => coreGet(p) };
});

import { useDemoStore } from '@/lib/demo/demoStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDailyBriefing } from '@/lib/queries/useDailyBriefing';
import { usePostInbox } from '@/features/post/data/usePost';

const wrap = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('Demo-Bühne holt nie echte Postfach-Quellen', () => {
  beforeEach(() => {
    coreGet.mockClear();
    useSessionStore.setState({ user: { id: 'u-marius', tenant_id: 'tenant-saimor-hq' } as never });
  });
  afterEach(() => useDemoStore.getState().setDemoCompany(null));

  it('eigene Firma: Briefing und Post laden wie bisher', async () => {
    const b = renderHook(() => useDailyBriefing(), { wrapper: wrap() });
    const p = renderHook(() => usePostInbox(), { wrapper: wrap() });
    await waitFor(() => expect(b.result.current.data?.metrics?.unread_mails).toBe(249));
    await waitFor(() => expect(p.result.current.data?.length).toBe(1));
  });

  it('Demo-Firma gewählt: kein /v3/briefing, kein /v3/mail, keine echte Zahl', async () => {
    useDemoStore.getState().setDemoCompany('demo-morgenrot');
    const b = renderHook(() => useDailyBriefing(), { wrapper: wrap() });
    const p = renderHook(() => usePostInbox(), { wrapper: wrap() });
    await waitFor(() => expect(p.result.current.isSuccess).toBe(true));
    expect(p.result.current.data).toEqual([]);
    expect(b.result.current.data).toBeUndefined();
    const paths = coreGet.mock.calls.map((c) => c[0]);
    expect(paths.filter((x) => /\/v3\/(briefing|mail|calendar)/.test(x))).toEqual([]);
  });
});
