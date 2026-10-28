import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { TodaySnapshot } from '@/lib/api/todayClient';

// Fictional demo data only (Café Morgenrot).
const mockCoreGet = jest.fn();
jest.mock('@/lib/api/http', () => {
  const actual = jest.requireActual('@/lib/api/http');
  return { ...actual, coreGet: (...args: unknown[]) => mockCoreGet(...args) };
});

import { CoreError } from '@/lib/api/http';
import { MORGENROT } from '@/lib/demo/morgenrot/online';
import { MorgenrotHome } from '@/features/home/morgenrot/MorgenrotHome';

const meta = (tenant: string) => ({
  source: 'test',
  scope: { level: 'company' as const, tenant_id: tenant, user_id: 'u-lena', company_id: MORGENROT.companyId },
  connection: 'local', complete: true, as_of: '2026-10-28T08:00:00+00:00', stale_after_seconds: 900,
});

function snapshot(): TodaySnapshot {
  const m = meta(MORGENROT.tenantId);
  return {
    status: 'ok', date: '2026-10-28', timezone: 'Europe/Berlin', generated_at: '2026-10-28T08:00:00+00:00',
    requested_scope: { tenant_id: MORGENROT.tenantId, user_id: 'u-lena', company_id: MORGENROT.companyId },
    mail: { ...m, status: 'empty', source: 'demo_mail', inbox_loaded: 0, sample_limit: 5, items: [] },
    calendar: { ...m, status: 'ok', source: 'core_calendar', date: '2026-10-28', count: 1, next_event: null,
      events: [{ id: 'e1', title: 'Schicht Lena K. (fiktiv)', date: '2026-10-28', time: '08:00' }] },
    tasks: { ...m, status: 'ok', source: 'tasks', counts: { open: 1, in_progress: 0, due_today: 1, overdue: 0 },
      items: [{ id: 't1', title: 'Reservierung 12 Pers. 12:30 eindecken', status: 'backlog', due_date: '2026-10-28' }],
      due_today: [{ id: 't1', title: 'Reservierung 12 Pers. 12:30 eindecken', status: 'backlog', due_date: '2026-10-28' }], overdue: [] },
    nightwatch: { ...m, status: 'empty', source: 'nightwatch_graph', open_incidents: 0, health_score: 100, incidents: [] },
  } as TodaySnapshot;
}

type Route = (path: string) => unknown;
function serve(route: Route) {
  mockCoreGet.mockImplementation(async (path: string) => {
    const value = route(path);
    if (value instanceof Error) throw value;
    return value;
  });
}
const session = { user_id: 'u-lena', tenant_id: MORGENROT.tenantId, role: 'member', full_name: 'Lena K. (fiktiv)' };
const tree = { departments: [{ id: 'd-k', name: 'Küche' }, { id: 'd-s', name: 'Service' }] };
const navigate = jest.fn();

beforeEach(() => {
  mockCoreGet.mockReset();
  window.history.replaceState(null, '', '/os?firma=morgenrot&als=tarek');
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn(),
  }));
});
afterEach(() => {
  // Never the /demo routes: they can reseed or reset a tenant.
  for (const [path] of mockCoreGet.mock.calls) expect(String(path)).not.toMatch(/\/demo\//);
});

describe('Café Morgenrot from CORE', () => {
  it('online: reads Today and the two real departments of demo-morgenrot, no seed areas, no role switch', async () => {
    serve((path) => (path === '/v3/auth/session' ? session
      : path === `/v3/today?company_id=${MORGENROT.companyId}` ? snapshot()
      : path === `/v3/tree?company_id=${MORGENROT.companyId}` ? tree : new CoreError('unexpected', 404)));
    render(<MorgenrotHome navigate={navigate} />);
    expect(await screen.findByTestId('morgenrot-online')).toBeInTheDocument();
    expect(screen.getAllByTestId('morgenrot-department').map((d) => d.textContent)).toEqual(['Küche', 'Service']);
    expect(screen.getByText(/Guten (Morgen|Tag|Abend), Lena\./)).toBeInTheDocument();
    expect(screen.getAllByText('Reservierung 12 Pers. 12:30 eindecken')[0]).toBeInTheDocument();
    // The old seed shows four areas (Service, Küche, Theke, Verwaltung) and a local role switch.
    expect(screen.queryByText('Theke')).toBeNull();
    expect(screen.queryByText('Verwaltung')).toBeNull();
    expect(screen.queryByTestId('morgenrot-offline')).toBeNull();
    expect(screen.queryByText(/Offline-Beispiel/)).toBeNull();
  });

  it('offline: only when CORE does not answer, the fictional example appears and is marked', async () => {
    serve(() => null); // network error: coreGet resolves to null
    render(<MorgenrotHome navigate={navigate} />);
    expect(await screen.findByTestId('morgenrot-offline')).toBeInTheDocument();
    expect(screen.getByText(/^Offline-Beispiel, fiktiv/)).toBeInTheDocument();
  });

  it('offline also when CORE answers with a server error', async () => {
    serve(() => new CoreError('down', 503));
    render(<MorgenrotHome navigate={navigate} />);
    expect(await screen.findByTestId('morgenrot-offline')).toBeInTheDocument();
  });

  it('no rights: an honest state instead of the seed', async () => {
    serve((path) => (path === '/v3/auth/session' ? session : new CoreError('company not accessible', 403)));
    render(<MorgenrotHome navigate={navigate} />);
    expect(await screen.findByText('Kein Zugriff')).toBeInTheDocument();
    expect(screen.queryByTestId('morgenrot-offline')).toBeNull();
    expect(screen.queryByTestId('morgenrot-online')).toBeNull();
  });

  it('a snapshot for another company is never shown as Morgenrot', async () => {
    const other = snapshot();
    other.requested_scope = { ...other.requested_scope, company_id: 'demo-andere-firma' };
    serve((path) => (path === '/v3/auth/session' ? session : path.startsWith('/v3/today') ? other : tree));
    render(<MorgenrotHome navigate={navigate} />);
    expect(await screen.findByText('Kein Zugriff')).toBeInTheDocument();
  });

  it('not signed in: a way to sign in, never the seed', async () => {
    serve(() => new CoreError('Not authenticated', 401));
    render(<MorgenrotHome navigate={navigate} />);
    expect(await screen.findByTestId('morgenrot-login')).toHaveAttribute('href', '/');
    expect(screen.queryByTestId('morgenrot-offline')).toBeNull();
    expect(mockCoreGet).toHaveBeenCalledTimes(1);
  });

  it('signed in to another company: asks for the demo login and reads nothing of Morgenrot', async () => {
    serve((path) => (path === '/v3/auth/session' ? { ...session, tenant_id: 'tenant-saimor-hq' } : snapshot()));
    render(<MorgenrotHome navigate={navigate} />);
    await waitFor(() => expect(screen.getByTestId('morgenrot-login')).toBeInTheDocument());
    expect(screen.getByText(/bei einer anderen Firma angemeldet/)).toBeInTheDocument();
    expect(mockCoreGet).toHaveBeenCalledTimes(1);
  });
});
