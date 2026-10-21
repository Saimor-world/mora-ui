import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { TodayOverview } from '@/components/home/TodayOverview';
import { CoreError } from '@/lib/api/http';
import { fetchTodaySnapshot, type TodaySnapshot } from '@/lib/api/todayClient';

let mockActiveCompanyId: string | null = 'company-a';
let mockUserId = 'user-a';
let mockTenantId = 'tenant-a';
let mockSessionGeneration = 1;
const mockOpenPane = jest.fn();
let mockUniverseV2 = false;
jest.mock('@/lib/universe/morgen', () => ({ isUniverseV2Enabled: () => mockUniverseV2 }));
jest.mock('@/components/home/CalendarContinuity', () => ({ CalendarContinuity: () => null }));

jest.mock('@/lib/store/navStore', () => ({
  useNavStore: (selector: (state: { activeCompanyId: string | null }) => unknown) =>
    selector({ activeCompanyId: mockActiveCompanyId }),
}));

jest.mock('@/lib/store/sessionStore', () => ({
  useSessionStore: (selector: (state: {
    user: { id: string; tenant_id: string };
    sessionGeneration: number;
  }) => unknown) =>
    selector({
      user: { id: mockUserId, tenant_id: mockTenantId },
      sessionGeneration: mockSessionGeneration,
    }),
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
  mockTenantId = 'tenant-a';
  mockSessionGeneration = 1;
  mockUniverseV2 = false;
});

describe('TodayOverview Universe V2 source truth', () => {
  beforeEach(() => { mockUniverseV2 = true; window.localStorage.setItem('saimor-vocab', 'intern'); });
  afterEach(() => { window.localStorage.removeItem('saimor-vocab'); });

  it('shows loading and prevents connection setup while a response is pending', async () => {
    const pending = deferred<TodaySnapshot | null>();
    (fetchTodaySnapshot as jest.Mock).mockReturnValue(pending.promise);
    render(<TodayOverview />);
    expect(screen.getAllByText('Wird geladen')).toHaveLength(4);
    expect(screen.getByTestId('uv2-today-calendar')).toBeDisabled();
    expect(screen.queryByText('Nicht verbunden')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('uv2-today-calendar'));
    expect(mockOpenPane).not.toHaveBeenCalled();
  });

  it.each([401, 403])('retains the %s distinction in the actual V2 widgets', async (status) => {
    (fetchTodaySnapshot as jest.Mock).mockRejectedValue(new CoreError('test', status, 'test'));
    render(<TodayOverview />);
    await waitFor(() => expect(screen.getAllByText(status === 401 ? 'Sitzung abgelaufen' : 'Kein Zugriff')).toHaveLength(status === 401 ? 5 : 4));
    expect(screen.queryByText('Nicht verbunden')).not.toBeInTheDocument();
    expect(screen.queryByText('Verbinden')).not.toBeInTheDocument();
    if (status === 403) expect(screen.getByTestId('uv2-today-calendar')).toBeDisabled();
  });

  it('retries a server failure instead of opening account setup', async () => {
    (fetchTodaySnapshot as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(snapshotFor('company-a', 'Wieder da'));
    render(<TodayOverview />);
    await waitFor(() => expect(screen.getAllByText('Nicht verfügbar')).toHaveLength(4));
    fireEvent.click(screen.getByTestId('uv2-today-tasks'));
    expect(await screen.findByText('Wieder da')).toBeInTheDocument();
    expect(mockOpenPane).not.toHaveBeenCalled();
  });

  it('only opens setup for explicitly disconnected external sources', async () => {
    const snapshot = snapshotFor('company-a', 'Keine Verbindung');
    snapshot.mail.status = 'disconnected';
    snapshot.mail.inbox_loaded = null;
    snapshot.mail.items = [];
    (fetchTodaySnapshot as jest.Mock).mockResolvedValue(snapshot);
    render(<TodayOverview />);
    // Kundentest 21.10.: keine Kachel „Nicht verbunden“, sondern eine leise Zeile.
    const connect = await screen.findByTestId('uv2-today-connect');
    expect(screen.queryByTestId('uv2-today-mail')).toBeNull();
    expect(connect).toHaveTextContent('Post verbinden');
    fireEvent.click(connect);
    expect(mockOpenPane).toHaveBeenCalledWith(expect.objectContaining({ type: 'integrations' }));
    fireEvent.click(screen.getByTestId('uv2-today-tasks'));
    expect(mockOpenPane).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'tasks' }));
  });

  it('shows customer companies plain language and no idle system watch', async () => {
    window.localStorage.setItem('saimor-vocab', 'klar');
    (fetchTodaySnapshot as jest.Mock).mockResolvedValue(snapshotFor('company-a', 'Alles da'));
    render(<TodayOverview />);
    await screen.findByTestId('uv2-today-tasks');
    expect(screen.queryByText('Wache')).toBeNull();
  });
});

describe('TodayOverview scope and auth boundaries', () => {
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

  it('shows an expired session instead of pretending Today is merely disconnected', async () => {
    (fetchTodaySnapshot as jest.Mock).mockRejectedValueOnce(
      new CoreError('Session expired', 401, 'Session expired'),
    );

    render(<TodayOverview />);

    expect(await screen.findAllByText('Sitzung abgelaufen')).toHaveLength(5);
    expect(screen.queryByText('nicht verbunden')).not.toBeInTheDocument();
  });

  it('shows a company access denial separately from source availability', async () => {
    (fetchTodaySnapshot as jest.Mock).mockRejectedValueOnce(
      new CoreError('company not accessible', 403, 'company not accessible'),
    );

    render(<TodayOverview />);

    expect(await screen.findAllByText('Kein Zugriff')).toHaveLength(4);
    expect(await screen.findByText('kein Zugriff')).toBeInTheDocument();
    expect(screen.queryByText('Nicht verbunden')).not.toBeInTheDocument();
  });
});
