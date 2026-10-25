import { calendarReadWindow, calendarSnapshotIsCurrent, fetchCalendarReadSnapshot, parseCalendarReadSnapshot, type CalendarReadContext } from '@/lib/api/calendarReadClient';
import { coreRequest } from '@/lib/api/http';

jest.mock('@/lib/api/http', () => ({ coreRequest: jest.fn() }));
const request = coreRequest as jest.Mock;
const ctx: CalendarReadContext = { tenantId: 'tenant', userId: 'reader', companyId: 'company', startDate: '2026-10-25', endDate: '2026-11-01' };
function snapshot() {
  return {
    requested_scope: { tenant_id: ctx.tenantId, user_id: ctx.userId, company_id: ctx.companyId },
    scope: { level: 'company', tenant_id: ctx.tenantId, user_id: ctx.userId, company_id: ctx.companyId },
    window: { start_date: ctx.startDate, end_date: ctx.endDate, timezone: 'Europe/Berlin', selection: 'start_date' },
    coverage: { start_date: ctx.startDate, end_date: ctx.endDate },
    status: 'ok', source: 'core_calendar', complete: true, count: 1, truncated: false, limit: 1000,
    as_of: '2026-10-25T12:00:00Z', last_synced_at: null, stale_after_seconds: 600,
    events: [{ id: 'all-day', title: 'Test', date: ctx.startDate, time: null, duration: 1440, location: null }],
  };
}

beforeEach(() => request.mockReset());

it('preserves all-day null time and unknown duration without adding defaults', () => {
  const raw = snapshot(); raw.events[0].duration = null as never;
  expect(parseCalendarReadSnapshot(raw, ctx)?.events[0]).toMatchObject({ time: null, duration: null });
});

it('stops trusting a cached complete response after expiry, a clock mismatch or window end', () => {
  const parsed = parseCalendarReadSnapshot(snapshot(), ctx)!;
  expect(calendarSnapshotIsCurrent(parsed, new Date('2026-10-25T12:05:00Z'))).toBe(true);
  expect(calendarSnapshotIsCurrent(parsed, new Date('2026-10-25T12:11:00Z'))).toBe(false);
  expect(calendarSnapshotIsCurrent(parsed, new Date('2026-10-25T11:59:00Z'))).toBe(false);
  expect(calendarSnapshotIsCurrent({ ...parsed, window: { ...parsed.window, end_date: '2026-10-24' } }, new Date('2026-10-25T12:05:00Z'))).toBe(false);
  expect(calendarSnapshotIsCurrent({ ...parsed, source: 'google_calendar', last_synced_at: '2026-10-25T11:00:00Z' }, new Date('2026-10-25T12:05:00Z'))).toBe(false);
});

it('keeps an external Google calendar scoped to its user, not to the company', () => {
  const raw = snapshot(); raw.source = 'google_calendar'; raw.scope.level = 'user'; raw.scope.company_id = null as never;
  expect(parseCalendarReadSnapshot(raw, ctx)?.source).toBe('google_calendar');
  raw.scope.company_id = ctx.companyId;
  expect(parseCalendarReadSnapshot(raw, ctx)).toBeNull();
});

it.each(['partial', 'stale', 'not_synced', 'disconnected', 'unavailable'])('preserves %s as unknown, never a proven empty day', (status) => {
  const raw = { ...snapshot(), status, complete: false, count: null };
  expect(parseCalendarReadSnapshot(raw, ctx)).toMatchObject({ status, complete: false, count: null });
  expect(parseCalendarReadSnapshot({ ...raw, complete: true, count: 0 }, ctx)).toBeNull();
});

it('accepts only a complete zero-count snapshot as empty', () => {
  expect(parseCalendarReadSnapshot({ ...snapshot(), status: 'empty', count: 0, events: [] }, ctx)?.complete).toBe(true);
  expect(parseCalendarReadSnapshot({ ...snapshot(), events: [] }, ctx)).toBeNull();
});

it.each(['tenant_id', 'user_id', 'company_id'])('rejects a snapshot requested for a different %s', (key) => {
  const raw = snapshot(); (raw.requested_scope as Record<string, unknown>)[key] = 'other';
  expect(parseCalendarReadSnapshot(raw, ctx)).toBeNull();
});

it.each([
  { window: { ...snapshot().window, start_date: '2026-10-24' } },
  { window: { ...snapshot().window, timezone: 'UTC' } },
  { coverage: { start_date: '2026-10-26', end_date: ctx.endDate } },
  { complete: false }, { count: 0 }, { truncated: true }, { limit: 1001 }, { as_of: 'invalid' },
  { source: 'invented' }, { scope: { ...snapshot().scope, tenant_id: 'other' } },
])('rejects contradictory or wrongly scoped metadata %#', (override) => {
  expect(parseCalendarReadSnapshot({ ...snapshot(), ...override }, ctx)).toBeNull();
});

it.each([{ date: '2026-02-31' }, { date: '2026-10-24' }, { time: '24:00' }, { duration: -1 }, { id: '' }])('rejects a corrupt event instead of filtering it into false emptiness %#', (override) => {
  expect(parseCalendarReadSnapshot({ ...snapshot(), events: [{ ...snapshot().events[0], ...override }] }, ctx)).toBeNull();
});

it('selects allowed fields instead of forwarding provider payloads to MÔRA', () => {
  const raw = { ...snapshot(), provider_payload: 'must-not-escape', events: [{ ...snapshot().events[0], access_token: 'synthetic-do-not-forward' }] };
  expect(JSON.stringify(parseCalendarReadSnapshot(raw, ctx))).not.toMatch(/must-not-escape|synthetic-do-not-forward/);
});

it('uses the stored read model without a legacy or provider fallback', async () => {
  request.mockResolvedValue(snapshot());
  expect(await fetchCalendarReadSnapshot(ctx)).not.toBeNull();
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith('/v3/calendar/read-model?company_id=company&start_date=2026-10-25&end_date=2026-11-01',
    { method: 'GET', isOptional: true, throwAuthErrors: true, timeoutMs: 15000 });
});

it.each([null, {}])('does not turn an unavailable/old CORE response into empty', async (raw) => {
  request.mockResolvedValue(raw);
  expect(await fetchCalendarReadSnapshot(ctx)).toBeNull();
  expect(request).toHaveBeenCalledTimes(1);
});

it('preserves authorization failures for the consuming query', async () => {
  const denied = Object.assign(new Error('denied'), { status: 403 });
  request.mockRejectedValue(denied);
  await expect(fetchCalendarReadSnapshot(ctx)).rejects.toBe(denied);
});

it.each([
  { startDate: '2026-02-31' }, { endDate: '2026-10-24' }, { endDate: '2026-12-01' }, { companyId: '' },
])('does not request an invalid or unbounded scope %#', async (override) => {
  expect(await fetchCalendarReadSnapshot({ ...ctx, ...override })).toBeNull();
  expect(request).not.toHaveBeenCalled();
});

it.each([
  ['2026-10-24T22:30:00Z', '2026-10-25', '2026-11-01'],
  ['2026-10-25T22:30:00Z', '2026-10-25', '2026-11-01'],
  ['2026-10-25T23:30:00Z', '2026-10-26', '2026-11-02'],
])('uses Berlin dates across the winter-time change: %s', (instant, startDate, endDate) => {
  expect(calendarReadWindow(new Date(instant))).toEqual({ startDate, endDate });
});
