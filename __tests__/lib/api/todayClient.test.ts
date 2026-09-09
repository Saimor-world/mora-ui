import {
  parseTodaySnapshot,
  snapshotMatchesTodayContext,
  type TodaySnapshot,
} from '@/lib/api/todayClient';

const sourceMeta = {
  source: 'test',
  scope: {
    level: 'company' as const,
    tenant_id: 'tenant-a',
    user_id: 'user-a',
    company_id: 'company-a',
  },
  connection: 'local',
  complete: true,
  as_of: '2026-09-07T16:00:00+00:00',
  stale_after_seconds: 300,
};

function validSnapshot(): TodaySnapshot {
  return {
    status: 'ok',
    date: '2026-09-07',
    timezone: 'Europe/Berlin',
    generated_at: '2026-09-07T16:00:00+00:00',
    requested_scope: {
      tenant_id: 'tenant-a',
      user_id: 'user-a',
      company_id: 'company-a',
    },
    mail: {
      ...sourceMeta,
      status: 'ok',
      source: 'gmail',
      inbox_loaded: 1,
      sample_limit: 5,
      items: [{ id: 'mail-1', subject: 'Hallo' }],
    },
    calendar: {
      ...sourceMeta,
      status: 'empty',
      source: 'google_calendar',
      date: '2026-09-07',
      count: 0,
      next_event: null,
      events: [],
    },
    tasks: {
      ...sourceMeta,
      status: 'ok',
      source: 'tasks',
      scope: {
        level: 'tenant',
        tenant_id: 'tenant-a',
        user_id: null,
        company_id: null,
      },
      counts: {
        open: 1,
        in_progress: 0,
        due_today: 0,
        overdue: 0,
      },
      items: [{ id: 'task-1', title: 'Prüfen', status: 'backlog' }],
      due_today: [],
      overdue: [],
    },
    nightwatch: {
      ...sourceMeta,
      status: 'empty',
      source: 'nightwatch_graph',
      open_incidents: 0,
      health_score: 100,
      incidents: [],
    },
  };
}

describe('todayClient contract validation', () => {
  it('accepts a complete scoped snapshot', () => {
    const snapshot = validSnapshot();
    expect(parseTodaySnapshot(snapshot)).toEqual(snapshot);
  });

  it('rejects readable sources with null counts instead of turning unknown into zero', () => {
    const snapshot = validSnapshot() as TodaySnapshot & { mail: TodaySnapshot['mail'] };
    snapshot.mail = { ...snapshot.mail, inbox_loaded: null };
    expect(parseTodaySnapshot(snapshot)).toBeNull();
  });

  it('rejects empty sources that contradict their zero-state', () => {
    const snapshot = validSnapshot();
    snapshot.calendar = { ...snapshot.calendar, status: 'empty', count: 2 };
    expect(parseTodaySnapshot(snapshot)).toBeNull();
  });

  it('rejects a snapshot from the previous company immediately', () => {
    const snapshot = validSnapshot();
    expect(snapshotMatchesTodayContext(snapshot, 'company-a', 'user-a')).toBe(true);
    expect(snapshotMatchesTodayContext(snapshot, 'company-b', 'user-a')).toBe(false);
  });

  it('rejects a snapshot from a previous principal', () => {
    const snapshot = validSnapshot();
    expect(snapshotMatchesTodayContext(snapshot, 'company-a', 'user-b')).toBe(false);
  });
});
