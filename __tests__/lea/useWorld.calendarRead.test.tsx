import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorld } from '@/lib/lea/useWorld';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDemoStore } from '@/lib/demo/demoStore';
import { useNavStore } from '@/lib/store/navStore';
import { coreGet, coreRequest } from '@/lib/api/http';
import { calendarReadWindow } from '@/lib/api/calendarReadClient';

jest.mock('@/lib/api/http', () => ({ coreGet: jest.fn(), coreRequest: jest.fn() }));
jest.mock('@/lib/api/filesClient', () => ({ listCompanyFiles: jest.fn().mockResolvedValue([]) }));
jest.mock('@/lib/lea/dayStore', () => {
  const state = { phases: {}, loadCompany: jest.fn().mockResolvedValue(undefined) };
  return { useDayStore: (select: (value: typeof state) => unknown) => select(state) };
});
const request = coreRequest as jest.Mock;
const get = coreGet as jest.Mock;
let client: QueryClient;
const user = (id = 'reader', company = 'company') => ({ id, tenant_id: 'tenant', active_company_id: company, name: 'Test', role: 'owner' }) as never;
function snapshot(id = 'reader', company = 'company') {
  const window = calendarReadWindow();
  return {
    requested_scope: { tenant_id: 'tenant', user_id: id, company_id: company },
    scope: { level: 'company', tenant_id: 'tenant', user_id: id, company_id: company },
    window: { start_date: window.startDate, end_date: window.endDate, timezone: 'Europe/Berlin', selection: 'start_date' },
    coverage: { start_date: window.startDate, end_date: window.endDate },
    status: 'ok', source: 'core_calendar', complete: true, count: 1, truncated: false, limit: 1000,
    as_of: new Date(Date.now() - 1000).toISOString(), last_synced_at: null, stale_after_seconds: 600,
    events: [{ id: `event-${id}`, title: 'Test', date: window.startDate, time: null, duration: 1440, location: null }],
  };
}
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  useSessionStore.getState().resetStore();
  useSessionStore.getState().setUser(user());
  useDemoStore.setState({ demoCompanyId: null });
  useNavStore.setState({ activeCompanyId: null });
  get.mockImplementation(async (path: string) => path.startsWith('/v3/tree')
    ? { departments: [{ id: 'work', name: 'Arbeit', spaces: [] }] } : []);
  request.mockResolvedValue(snapshot());
});
afterEach(() => client.clear());

it('shares the bounded stored calendar with Home/Universe and keeps the real planet', async () => {
  const { result } = renderHook(() => useWorld(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.dayUnavailable).toBe(false);
  expect(result.current.events.map(event => event.id)).toEqual(['event-reader']);
  expect(result.current.planets.map(planet => planet.name)).toEqual(['Arbeit']);
  expect(get.mock.calls.some(([path]) => path.startsWith('/v3/calendar/events'))).toBe(false);
});

it.each(['partial', 'stale', 'not_synced', 'disconnected', 'unavailable', 'missing', 'forbidden'])('keeps Universe usable but never claims a free/finished day for %s', async (status) => {
  if (status === 'missing') request.mockResolvedValue(null);
  else if (status === 'forbidden') request.mockRejectedValue(Object.assign(new Error('denied'), { status: 403 }));
  else request.mockResolvedValue({ ...snapshot(), status, complete: false, count: null });
  const { result } = renderHook(() => useWorld(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.failed).toBe(false);
  expect(result.current.planets).toHaveLength(1);
  expect(result.current.dayUnavailable).toBe(true);
  expect(result.current.events).toEqual([]);
  expect(result.current.day.sentence).toMatch(/nicht vollständig lesen/);
  expect(result.current.day.sentence).not.toMatch(/alles erledigt|frei|niemand mehr/);
});

it('does not allow an unavailable task response to become all tasks done', async () => {
  get.mockImplementation(async (path: string) => path.startsWith('/v3/tasks') ? null : []);
  const { result } = renderHook(() => useWorld(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await waitFor(() => expect(result.current.dayUnavailable).toBe(true));
  expect(result.current.calendarUnavailable).toBe(false);
  expect(result.current.day.taskLine).toMatch(/nicht verfügbar/);
  expect(result.current.day.sentence).toMatch(/Aufgabenstand/);
});

it('invalidates the metadata passed to MÔRA when a previously successful read becomes forbidden', async () => {
  const { result } = renderHook(() => useWorld(), { wrapper });
  await waitFor(() => expect(result.current.calendar?.complete).toBe(true));
  request.mockRejectedValue(Object.assign(new Error('denied'), { status: 403 }));
  await act(async () => { await client.refetchQueries({ queryKey: ['lea-world', 'calendar-read'] }); });
  await waitFor(() => expect(result.current.calendarUnavailable).toBe(true));
  expect(result.current.calendar).toMatchObject({ status: 'unavailable', complete: false, count: null });
  expect(result.current.events).toEqual([]);
});

it('does not pass an expired cached success to MÔRA as complete', async () => {
  request.mockResolvedValue({ ...snapshot(), as_of: new Date(Date.now() - 1200000).toISOString() });
  const { result } = renderHook(() => useWorld(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.calendar).toMatchObject({ status: 'stale', complete: false, count: null });
});

it('evaluates freshness at response time rather than against a frozen mount timestamp', async () => {
  request.mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
    return { ...snapshot(), as_of: new Date().toISOString() };
  });
  const { result } = renderHook(() => useWorld(), { wrapper });
  await waitFor(() => expect(result.current.calendar?.complete).toBe(true));
  expect(result.current.dayUnavailable).toBe(false);
});

it('does not reuse an old principal’s pending response in the same company', async () => {
  let oldReply!: (value: unknown) => void;
  request.mockImplementationOnce(() => new Promise(resolve => { oldReply = resolve; }));
  const { result } = renderHook(() => useWorld(), { wrapper });
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  request.mockResolvedValue(snapshot('new-reader'));
  act(() => useSessionStore.getState().setUser(user('new-reader')));
  await waitFor(() => expect(result.current.events[0]?.id).toBe('event-new-reader'));
  await act(async () => oldReply(snapshot()));
  expect(result.current.events.map(event => event.id)).toEqual(['event-new-reader']);
});

it('uses the selected demo company rather than the session or navigation company', async () => {
  useDemoStore.setState({ demoCompanyId: 'demo' });
  request.mockResolvedValue(snapshot('reader', 'demo'));
  const { result } = renderHook(() => useWorld(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.companyId).toBe('demo');
  expect(request.mock.calls[0][0]).toContain('company_id=demo');
});
