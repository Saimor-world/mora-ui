import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';

import { TodayOverview } from '@/components/home/TodayOverview';
import { fetchTodaySnapshot, type TodaySnapshot } from '@/lib/api/todayClient';

let mockActiveCompanyId: string | null = 'company-a';
let mockUserId = 'user-a';
const mockOpenPane = jest.fn();

jest.mock('@/lib/store/navStore', () => ({
  useNavStore: (selector: (state: { activeCompanyId: string | null }) => unknown) =>
    selector({ activeCompanyId: mockActiveCompanyId }),
}));

jest.mock('@/lib/store/sessionStore', () => ({
  useSessionStore: (selector: (state: { user: { id: string } }) => unknown) =>
    selector({ user: { id: mockUserId } }),
}));

jest.mock('@/lib/store/paneStore', () => ({
  usePaneStore: (selector: (state: { openPane: typeof mockOpenPane }) => unknown) =>
    selector({ openPane: mockOpenPane }),
}));

jest.mock('@/lib/api/todayClient', () => {
  const actual = jest.requireActual('@/lib/api/todayClient');
  return {
    ...actual,
    fetchTodaySnapshot: jest.fn(),
  };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

function snapshotFor(companyId: string, mailSubject: string): TodaySnapshot {
  const meta = {
    source: 'test',
    scope: {
      level: 'company' as const,
      tenant_id: 'tenant-a',
      user_id: 'user-a',
      company_id: companyId,
    },
    connection: 'local',
    complete: true,
    as_of: '2026-09-07T16:00:00+00:00',
    stale_after_seconds: 300,
  };

  return {
    status: 'ok',
    date: '2026-09-07',
    timezone: 'Europe/Berlin',
    generated_at: '2026-09-07T16:00:00+00:00',
    requested_scope: {
      tenant_id: 'tenant-a',
      user_id: 'user-a',
      company_id: companyId,
    },
    mail: {
      ...meta,
      status: 'ok',
      source: 'gmail',
      inbox_loaded: 1,
      sample_limit: 5,
      items: [{ id: `mail-${companyId}`, subject: mailSubject }],
    },
    calendar: {
      ...meta,
      status: 'empty',
      source: 'calendar',
      date: '2026-09-07',
      count: 0,
      next_event: null,
      events: [],
    },
    tasks: {
      ...meta,
      status: 'empty',
      source: 'tasks',
      scope: {
        level: 'tenant',
        tenant_id: 'tenant-a',
        user_id: null,
        company_id: null,
      },
      counts: { open: 0, in_progress: 0, due_today: 0, overdue: 0 },
      items: [],
      due_today: [],
      overdue: [],
    },
    nightwatch: {
      ...meta,
      status: 'empty',
      source: 'nightwatch_graph',
      open_incidents: 0,
      health_score: 100,
      incidents: [],
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockActiveCompanyId = 'company-a';
  mockUserId = 'user-a';
});

describe('TodayOverview scope switching', () => {
  it('never renders a late response from the previous company', async () => {
    const first = deferred<TodaySnapshot | null>();
    const second = deferred<TodaySnapshot | null>();
    (fetchTodaySnapshot as jest.Mock)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { rerender } = render(<TodayOverview />);
    await waitFor(() =>
      expect(fetchTodaySnapshot).toHaveBeenCalledWith('company-a', 'user-a'),
    );

    mockActiveCompanyId = 'company-b';
    rerender(<TodayOverview />);
    await waitFor(() =>
      expect(fetchTodaySnapshot).toHaveBeenCalledWith('company-b', 'user-a'),
    );

    await act(async () => {
      first.resolve(snapshotFor('company-a', 'Alte Firmenmail'));
      await first.promise;
    });
    expect(screen.queryByText('Alte Firmenmail')).not.toBeInTheDocument();

    await act(async () => {
      second.resolve(snapshotFor('company-b', 'Neue Firmenmail'));
      await second.promise;
    });
    expect(await screen.findByText('Neue Firmenmail')).toBeInTheDocument();
    expect(screen.queryByText('Alte Firmenmail')).not.toBeInTheDocument();
  });
});
