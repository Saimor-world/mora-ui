import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const coreGet = jest.fn();
jest.mock('@/lib/api/http', () => ({
  ...jest.requireActual('@/lib/api/http'),
  coreGet: (...args: unknown[]) => coreGet(...args),
}));
jest.mock('@/lib/api/coreClient', () => ({ coreGet: (...args: unknown[]) => coreGet(...args) }));

import { useCommunicationLiveData, buildCommunicationContextMessage } from '@/lib/hooks/useCommunicationLiveData';
import { useHorizonSources } from '@/lib/lea/useHorizonSources';
import { useDemoStore } from '@/lib/demo/demoStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useNavStore } from '@/lib/store/navStore';
import { useDailyBriefing } from '@/lib/queries/useDailyBriefing';
import { useSources } from '@/lib/os-prototype/useSources';
import { useMailSummary } from '@/lib/os-prototype/mailSummary';
import { usePostInbox, usePostCalendar } from '@/features/post/data/usePost';

function response(path: string) {
  if (path.includes('/mail/')) return { messages: [{ id: 'private-mail', subject: 'Private test mail', from: 'lea@example.test' }] };
  if (path.includes('/calendar/')) return { events: [{ id: 'private-event', title: 'Private test event' }] };
  if (path.includes('/rss/')) return { items: [{ id: 'private-feed', title: 'Private test feed' }] };
  if (path.includes('/users/me/content')) return { cloud_storage: { connectors: [{ id: 'private-cloud', enabled: true, status: 'configured' }] } };
  if (path.includes('/cloud/')) return { items: [{ id: 'private-file', name: 'Private test file' }] };
  return { planets: [{ key: 'system:post', label: 'Private source', kind: 'system', moons: [{ key: 'source:private', label: 'Private source' }] }] };
}

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return { client, Wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> };
}

beforeEach(() => {
  coreGet.mockReset().mockImplementation(async (path: string) => response(path));
  useDemoStore.getState().setDemoCompany(null);
  useSessionStore.setState({ user: { id: 'presenter-test', tenant_id: 'tenant-test' } as never, sessionGeneration: 0 });
  useNavStore.setState({ activeCompanyId: 'company-test' });
});
afterEach(() => { cleanup(); useDemoStore.getState().setDemoCompany(null); });

it('communication never loads personal mail, calendar, feeds or cloud while in demo', async () => {
  useDemoStore.getState().setDemoCompany('demo-morgenrot');
  const { result } = renderHook(() => useCommunicationLiveData());
  await act(async () => { await result.current.refresh(); });
  expect(coreGet).not.toHaveBeenCalled();
  expect(result.current).toMatchObject({ mailPreview: [], calendarPreview: [], feedPreview: [], cloudPreview: [], mailStatus: 'unavailable', calendarStatus: 'unavailable', isLoading: false });
});

it('does not start a queued communication fetch if demo begins before its first microtask', async () => {
  const { result } = renderHook(() => useCommunicationLiveData(false));
  await act(async () => {
    const pending = result.current.refresh();
    useDemoStore.getState().setDemoCompany('demo-morgenrot');
    await pending;
  });
  expect(coreGet).not.toHaveBeenCalled();
});

it('hides loaded communication and MÔRA context immediately on demo entry', async () => {
  const { result } = renderHook(() => useCommunicationLiveData());
  await waitFor(() => expect(result.current.cloudPreview).toHaveLength(1));
  const oldRefresh = result.current.refresh;
  expect(result.current.mailPreview[0].subject).toBe('Private test mail');
  coreGet.mockClear();
  act(() => useDemoStore.getState().setDemoCompany('demo-morgenrot'));
  await act(async () => { await oldRefresh(); });
  expect(coreGet).not.toHaveBeenCalled();
  const d = result.current;
  expect(buildCommunicationContextMessage(d.mailPreview, d.calendarPreview, d.feedPreview, d.cloudPreview)).toBeNull();
});

it('drops late communication replies and prevents a cloud follow-up across a demo round trip', async () => {
  let finish!: () => void;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  coreGet.mockImplementation(async (path: string) => { await gate; return response(path); });
  const { result } = renderHook(() => useCommunicationLiveData(false));
  let pending!: Promise<void>;
  act(() => { pending = result.current.refresh(); });
  await waitFor(() => expect(coreGet).toHaveBeenCalledTimes(4));
  // Even a batched own → demo → own round trip invalidates the original read.
  act(() => { useDemoStore.getState().setDemoCompany('demo-morgenrot'); useDemoStore.getState().setDemoCompany(null); });
  await act(async () => { finish(); await pending; });
  expect(coreGet).toHaveBeenCalledTimes(4);
  expect(result.current).toMatchObject({ mailPreview: [], calendarPreview: [], feedPreview: [], cloudPreview: [] });
  coreGet.mockImplementation(async (path: string) => response(path));
  await act(async () => { await result.current.refresh(); });
  expect(result.current.cloudPreview).toHaveLength(1);
});

it('does not reuse communication from another authenticated principal on the same company', async () => {
  const { result } = renderHook(() => useCommunicationLiveData(false));
  await act(async () => { await result.current.refresh(); });
  const oldRefresh = result.current.refresh;
  coreGet.mockClear();
  act(() => useSessionStore.setState({ user: { id: 'other-test', tenant_id: 'other-tenant' } as never, sessionGeneration: 1 }));
  expect(result.current.mailPreview).toEqual([]);
  expect(result.current.mailStatus).toBe('idle');
  await act(async () => { await oldRefresh(); });
  expect(coreGet).not.toHaveBeenCalled();
});

it('horizon masks warm cached data in demo and when disabled', async () => {
  const { Wrapper } = wrapper();
  const { result, rerender } = renderHook(({ enabled }) => useHorizonSources('company-test', enabled), { initialProps: { enabled: true }, wrapper: Wrapper });
  await waitFor(() => expect(result.current.mail?.items).toHaveLength(1));
  expect(result.current.sources).toHaveLength(1);
  rerender({ enabled: false });
  expect(result.current).toEqual({ mail: null, feed: null, sources: null });
  coreGet.mockClear();
  act(() => useDemoStore.getState().setDemoCompany('demo-morgenrot'));
  rerender({ enabled: true });
  expect(result.current).toEqual({ mail: null, feed: null, sources: null });
  expect(coreGet).not.toHaveBeenCalled();
});

it('horizon discards an old reply instead of caching it after a demo round trip', async () => {
  let finish!: () => void;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  coreGet.mockImplementation(async (path: string) => { await gate; return response(path); });
  const { Wrapper, client } = wrapper();
  const { result } = renderHook(() => useHorizonSources('company-test', true), { wrapper: Wrapper });
  await waitFor(() => expect(coreGet).toHaveBeenCalledTimes(3));
  const oldKeys = client.getQueryCache().getAll().map(query => query.queryKey);
  act(() => { useDemoStore.getState().setDemoCompany('demo-morgenrot'); useDemoStore.getState().setDemoCompany(null); });
  await act(async () => { finish(); await gate; });
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(result.current.mail?.items).toHaveLength(1); // A new own-scope read is allowed.
  for (const key of oldKeys) expect(client.getQueryData(key)).toBeNull();
});

it('horizon uses a separate cache for a new principal even with the same company ID', async () => {
  const { Wrapper } = wrapper();
  const { result } = renderHook(() => useHorizonSources('company-test', true), { wrapper: Wrapper });
  await waitFor(() => expect(result.current.mail?.items).toHaveLength(1));
  coreGet.mockImplementation(() => new Promise(() => {}));
  act(() => useSessionStore.setState({ user: { id: 'other-test', tenant_id: 'other-tenant' } as never, sessionGeneration: 1 }));
  expect(result.current).toEqual({ mail: null, feed: null, sources: null });
});

const sourceCases: Array<[string, () => { data: unknown; refetch: () => Promise<unknown> }]> = [
  ['briefing', useDailyBriefing],
  ['connections', () => useSources(true)],
  ['mail summary', () => useMailSummary(true)],
];
describe.each(sourceCases)('%s source cache boundary', (_name, useSource) => {
  it('masks cached data in demo and refuses even an explicit refetch', async () => {
    coreGet.mockResolvedValue({ private_test_marker: 'presenter' });
    const { Wrapper, client } = wrapper();
    const { result } = renderHook(useSource, { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    const oldQuery = client.getQueryCache().getAll()[0];
    const oldKey = oldQuery.queryKey;
    coreGet.mockClear();
    act(() => useDemoStore.getState().setDemoCompany('demo-morgenrot'));
    expect(result.current.data).toBeUndefined();
    await act(async () => { await result.current.refetch(); await oldQuery.fetch(); });
    expect(coreGet).not.toHaveBeenCalled();
    expect(client.getQueryData(oldKey)).toBeNull();
  });

  it('does not return the prior principal cache, or refetch into its old cache key', async () => {
    coreGet.mockResolvedValue({ private_test_marker: 'presenter' });
    const { Wrapper, client } = wrapper();
    const { result } = renderHook(useSource, { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    const oldQuery = client.getQueryCache().getAll()[0];
    const oldKey = oldQuery.queryKey;
    coreGet.mockImplementation(() => new Promise(() => {}));
    act(() => useSessionStore.setState({ user: { id: 'other-test', tenant_id: 'other-tenant' } as never, sessionGeneration: 1 }));
    expect(result.current.data).toBeUndefined();
    coreGet.mockClear();
    await act(async () => { await oldQuery.fetch(); });
    expect(coreGet).not.toHaveBeenCalled();
    expect(client.getQueryData(oldKey)).toBeNull();
  });
});

const postCases: Array<[string, () => { data: unknown; refetch: () => Promise<unknown> }]> = [['post inbox', usePostInbox], ['post calendar', usePostCalendar]];
describe.each(postCases)('%s account boundary', (_name, usePost) => {
  it('partitions two users in the same tenant and drops an obsolete refetch', async () => {
    coreGet.mockResolvedValue([{ id: 'private-item', title: 'Private test item' }]);
    const { Wrapper, client } = wrapper();
    const { result } = renderHook(usePost, { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    const oldQuery = client.getQueryCache().getAll()[0];
    coreGet.mockImplementation(() => new Promise(() => {}));
    act(() => useSessionStore.setState({ user: { id: 'other-test', tenant_id: 'tenant-test' } as never, sessionGeneration: 1 }));
    expect(result.current.data).toBeUndefined();
    coreGet.mockClear();
    await act(async () => { await oldQuery.fetch(); });
    expect(coreGet).not.toHaveBeenCalled();
    expect(client.getQueryData(oldQuery.queryKey)).toBeNull();
  });
});
