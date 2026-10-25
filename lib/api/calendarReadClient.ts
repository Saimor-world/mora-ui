import { coreRequest } from './http';

export interface CalendarReadContext {
  tenantId: string;
  userId: string;
  companyId: string;
  startDate: string;
  endDate: string;
}

export type CalendarReadStatus = 'ok' | 'empty' | 'partial' | 'stale' | 'not_synced' | 'disconnected' | 'unavailable';
export interface CalendarReadEvent {
  id: string;
  title: string;
  date: string;
  time: string | null;
  duration: number | null;
  location: string | null;
}
export interface CalendarReadSnapshot {
  status: CalendarReadStatus;
  source: 'core_calendar' | 'google_calendar';
  complete: boolean;
  count: number | null;
  events: CalendarReadEvent[];
  as_of: string;
  last_synced_at: string | null;
  stale_after_seconds: number;
  window: { start_date: string; end_date: string; timezone: 'Europe/Berlin'; selection: 'start_date' };
}

const statuses = new Set<string>(['ok', 'empty', 'partial', 'stale', 'not_synced', 'disconnected', 'unavailable']);
const berlinDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' });
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const day = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
  && Number.isFinite(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
const stamp = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));

/** Matches CORE's stored eight-start-day window, including the Berlin DST boundary. */
export function calendarReadWindow(now = new Date()): { startDate: string; endDate: string } {
  const startDate = berlinDay.format(now);
  const end = new Date(`${startDate}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  return { startDate, endDate: end.toISOString().slice(0, 10) };
}

export function parseCalendarReadSnapshot(raw: unknown, ctx: CalendarReadContext): CalendarReadSnapshot | null {
  if (!record(raw)) return null;
  const requested = raw.requested_scope, scope = raw.scope, window = raw.window, coverage = raw.coverage;
  if (!record(requested) || requested.tenant_id !== ctx.tenantId || requested.user_id !== ctx.userId
    || requested.company_id !== ctx.companyId) return null;
  if (!record(scope) || scope.tenant_id !== ctx.tenantId || scope.user_id !== ctx.userId
    || !['company', 'user'].includes(String(scope.level))) return null;
  if (raw.source !== 'core_calendar' && raw.source !== 'google_calendar') return null;
  // A personal Google snapshot remains a user source, never a company-owned calendar.
  if (raw.source === 'google_calendar') {
    if (scope.level !== 'user' || scope.company_id !== null) return null;
  } else if (scope.company_id !== ctx.companyId) return null;
  if (!record(window) || window.start_date !== ctx.startDate || window.end_date !== ctx.endDate
    || window.timezone !== 'Europe/Berlin' || window.selection !== 'start_date') return null;
  if (!statuses.has(String(raw.status)) || typeof raw.complete !== 'boolean' || typeof raw.truncated !== 'boolean'
    || !Number.isSafeInteger(raw.limit) || Number(raw.limit) < 1 || Number(raw.limit) > 1000
    || !Array.isArray(raw.events) || raw.events.length > Number(raw.limit)
    || !stamp(raw.as_of) || !(raw.last_synced_at === null || stamp(raw.last_synced_at))
    || !Number.isSafeInteger(raw.stale_after_seconds) || Number(raw.stale_after_seconds) < 0) return null;
  const complete = raw.status === 'ok' || raw.status === 'empty';
  if (raw.complete !== complete || (complete && (raw.truncated || raw.count !== raw.events.length))
    || (!complete && raw.count !== null) || (raw.status === 'empty' && raw.events.length !== 0)
    || (raw.status === 'ok' && raw.events.length === 0)) return null;
  if (!record(coverage) || !(coverage.start_date === null || day(coverage.start_date))
    || !(coverage.end_date === null || day(coverage.end_date))) return null;
  if (complete && (!day(coverage.start_date) || !day(coverage.end_date)
    || coverage.start_date > ctx.startDate || coverage.end_date < ctx.endDate)) return null;
  const events: CalendarReadEvent[] = [];
  for (const event of raw.events) {
    if (!record(event) || typeof event.id !== 'string' || !event.id || typeof event.title !== 'string'
      || !day(event.date) || event.date < ctx.startDate || event.date > ctx.endDate
      || !(event.time === null || (typeof event.time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(event.time)))
      || !(event.duration === null || (Number.isSafeInteger(event.duration) && Number(event.duration) >= 0))
      || !(event.location === null || typeof event.location === 'string')) return null;
    events.push({ id: event.id, title: event.title, date: event.date, time: event.time as string | null,
      duration: event.duration as number | null, location: event.location as string | null });
  }
  // Deliberately select fields: raw provider payloads never become MÔRA context.
  return {
    status: raw.status as CalendarReadStatus, source: raw.source, complete, count: complete ? events.length : null,
    events, as_of: raw.as_of, last_synced_at: raw.last_synced_at as string | null,
    stale_after_seconds: raw.stale_after_seconds as number,
    window: { start_date: ctx.startDate, end_date: ctx.endDate, timezone: 'Europe/Berlin', selection: 'start_date' },
  };
}

/** A previously complete query can expire while a tab is asleep or offline. */
export function calendarSnapshotIsCurrent(snapshot: CalendarReadSnapshot | null | undefined, now = new Date()): boolean {
  if (!snapshot?.complete) return false;
  const today = calendarReadWindow(now).startDate;
  const freshAt = snapshot.source === 'google_calendar' ? snapshot.last_synced_at : snapshot.as_of;
  const age = freshAt ? (now.getTime() - Date.parse(freshAt)) / 1000 : NaN;
  return age >= 0 && age <= snapshot.stale_after_seconds
    && snapshot.window.start_date <= today && snapshot.window.end_date >= today;
}

export async function fetchCalendarReadSnapshot(ctx: CalendarReadContext): Promise<CalendarReadSnapshot | null> {
  if (!ctx.tenantId || !ctx.userId || !ctx.companyId || !day(ctx.startDate) || !day(ctx.endDate)) return null;
  const days = (Date.parse(`${ctx.endDate}T00:00:00Z`) - Date.parse(`${ctx.startDate}T00:00:00Z`)) / 86400000;
  if (days < 0 || days > 30) return null;
  const query = new URLSearchParams({ company_id: ctx.companyId, start_date: ctx.startDate, end_date: ctx.endDate });
  // React Query owns identity-scoped deduplication. Do not join the HTTP helper's
  // URL-only in-flight request from a previous authenticated principal.
  const raw = await coreRequest(`/v3/calendar/read-model?${query}`, {
    method: 'GET', isOptional: true, throwAuthErrors: true, timeoutMs: 15000,
  });
  return parseCalendarReadSnapshot(raw, ctx);
}
