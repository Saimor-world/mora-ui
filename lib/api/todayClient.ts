import { coreGet } from './http';

export type TodaySourceStatus =
  | 'ok'
  | 'empty'
  | 'disconnected'
  | 'partial'
  | 'unavailable'
  | 'stale';
export type TodayStatus = 'ok' | 'degraded' | 'unknown';
export type TodayScopeLevel = 'tenant' | 'user' | 'company';

export type TodayScope = {
  level: TodayScopeLevel;
  tenant_id: string;
  user_id?: string | null;
  company_id?: string | null;
};

export type TodaySourceMeta = {
  status: TodaySourceStatus;
  source: string;
  scope: TodayScope;
  connection: string;
  complete: boolean;
  as_of: string;
  stale_after_seconds: number;
};

export type TodayMailItem = {
  id: string;
  subject?: string;
  from_addr?: string;
  date?: string;
  snippet?: string;
  read?: boolean;
};

export type TodayCalendarEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  duration?: number;
  location?: string;
};

export type TodayTask = {
  id: string;
  title: string;
  status: 'backlog' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high' | null;
  due_date?: string | null;
};

export type TodayIncident = {
  id: string;
  title: string;
  summary?: string;
  severity?: 'info' | 'warning' | 'critical' | string;
  status?: string;
  acked?: boolean;
  host?: string | null;
};

export type TodaySnapshot = {
  status: TodayStatus;
  date: string;
  timezone: string;
  generated_at: string;
  requested_scope: {
    tenant_id: string;
    user_id: string;
    company_id: string | null;
  };
  mail: TodaySourceMeta & {
    inbox_loaded: number | null;
    sample_limit: number;
    items: TodayMailItem[];
  };
  calendar: TodaySourceMeta & {
    date: string;
    count: number | null;
    next_event: TodayCalendarEvent | null;
    events: TodayCalendarEvent[];
  };
  tasks: TodaySourceMeta & {
    counts: {
      open: number | null;
      in_progress: number | null;
      due_today: number | null;
      overdue: number | null;
    };
    items: TodayTask[];
    due_today: TodayTask[];
    overdue: TodayTask[];
  };
  nightwatch: TodaySourceMeta & {
    open_incidents: number | null;
    health_score: number | null;
    incidents: TodayIncident[];
  };
};

const SOURCE_STATES = new Set<TodaySourceStatus>([
  'ok',
  'empty',
  'disconnected',
  'partial',
  'unavailable',
  'stale',
]);
const SNAPSHOT_STATES = new Set<TodayStatus>(['ok', 'degraded', 'unknown']);
const SCOPE_LEVELS = new Set<TodayScopeLevel>(['tenant', 'user', 'company']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}

function isSourceMeta(value: unknown): value is TodaySourceMeta & Record<string, unknown> {
  if (!isRecord(value)) return false;
  const scope = value.scope;
  if (!isRecord(scope)) return false;
  return (
    SOURCE_STATES.has(value.status as TodaySourceStatus) &&
    typeof value.source === 'string' &&
    typeof value.connection === 'string' &&
    typeof value.complete === 'boolean' &&
    typeof value.as_of === 'string' &&
    typeof value.stale_after_seconds === 'number' &&
    SCOPE_LEVELS.has(scope.level as TodayScopeLevel) &&
    typeof scope.tenant_id === 'string' &&
    isNullableString(scope.user_id) &&
    isNullableString(scope.company_id)
  );
}

function readableStatus(status: TodaySourceStatus): boolean {
  return status === 'ok' || status === 'empty';
}

function readableCountIsValid(status: TodaySourceStatus, value: number | null): boolean {
  if (!readableStatus(status)) return true;
  if (typeof value !== 'number') return false;
  return status !== 'empty' || value === 0;
}

export function parseTodaySnapshot(value: unknown): TodaySnapshot | null {
  if (!isRecord(value) || !SNAPSHOT_STATES.has(value.status as TodayStatus)) return null;
  if (typeof value.date !== 'string' || typeof value.timezone !== 'string' || typeof value.generated_at !== 'string') {
    return null;
  }

  const requestedScope = value.requested_scope;
  if (
    !isRecord(requestedScope) ||
    typeof requestedScope.tenant_id !== 'string' ||
    typeof requestedScope.user_id !== 'string' ||
    !(requestedScope.company_id === null || typeof requestedScope.company_id === 'string')
  ) {
    return null;
  }

  const mail = value.mail;
  const calendar = value.calendar;
  const tasks = value.tasks;
  const nightwatch = value.nightwatch;
  if (!isSourceMeta(mail) || !isSourceMeta(calendar) || !isSourceMeta(tasks) || !isSourceMeta(nightwatch)) {
    return null;
  }

  if (!isNullableNumber(mail.inbox_loaded) || typeof mail.sample_limit !== 'number' || !Array.isArray(mail.items)) {
    return null;
  }
  if (!readableCountIsValid(mail.status, mail.inbox_loaded)) return null;

  if (
    typeof calendar.date !== 'string' ||
    !isNullableNumber(calendar.count) ||
    !(calendar.next_event === null || isRecord(calendar.next_event)) ||
    !Array.isArray(calendar.events)
  ) {
    return null;
  }
  if (!readableCountIsValid(calendar.status, calendar.count)) return null;

  const counts = tasks.counts;
  if (!isRecord(counts)) return null;
  const taskCounts = [counts.open, counts.in_progress, counts.due_today, counts.overdue];
  if (!taskCounts.every(isNullableNumber) || !Array.isArray(tasks.items) || !Array.isArray(tasks.due_today) || !Array.isArray(tasks.overdue)) {
    return null;
  }
  if (readableStatus(tasks.status) && taskCounts.some((count) => typeof count !== 'number')) return null;
  if (tasks.status === 'empty' && taskCounts.some((count) => count !== 0)) return null;

  if (
    !isNullableNumber(nightwatch.open_incidents) ||
    !isNullableNumber(nightwatch.health_score) ||
    !Array.isArray(nightwatch.incidents)
  ) {
    return null;
  }
  if (!readableCountIsValid(nightwatch.status, nightwatch.open_incidents)) return null;
  if (readableStatus(nightwatch.status) && typeof nightwatch.health_score !== 'number') return null;

  return value as TodaySnapshot;
}

export function snapshotMatchesTodayContext(
  snapshot: TodaySnapshot,
  companyId?: string | null,
  userId?: string | null,
): boolean {
  const expectedCompany = companyId ?? null;
  if (snapshot.requested_scope.company_id !== expectedCompany) return false;
  if (userId && snapshot.requested_scope.user_id !== userId) return false;
  return true;
}

export async function fetchTodaySnapshot(
  companyId?: string | null,
  userId?: string | null,
): Promise<TodaySnapshot | null> {
  const query = companyId ? `?company_id=${encodeURIComponent(companyId)}` : '';
  const raw = await coreGet(`/v3/today${query}`, { isOptional: true });
  const snapshot = parseTodaySnapshot(raw);
  if (!snapshot || !snapshotMatchesTodayContext(snapshot, companyId, userId)) return null;
  return snapshot;
}
