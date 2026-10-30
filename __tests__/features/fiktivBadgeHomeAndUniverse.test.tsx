import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MORGENROT } from '@/lib/demo/morgenrot/online';
import { useSessionStore } from '@/lib/store/sessionStore';
import { buildFinder, TASKS_PLANET } from '@/lib/lea/finder';
import { buildLiveDay } from '@/lib/lea/live';
import { localISO } from '@/lib/lea/world';
import { LiveCockpit } from '@/features/home/cockpit/LiveCockpit';
import { LiveWorld } from '@/features/universe/ui/LiveWorld';
import { FinderVerse } from '@/components/finderverse/FinderVerse';
import { widgetsFromToday } from '@/features/home/widgets/adapters';
import type { TodaySnapshot } from '@/lib/api/todayClient';

const now = new Date('2026-10-29T10:00:00Z');
const todayIso = localISO(now);

const demoTasks = [
  { id: 't-fiktiv-1', title: '[FIKTIV] Siebträger entkalken', status: 'open', due_date: todayIso },
];
const demoEvents = [
  { id: 'e-fiktiv-1', title: 'Schicht Tarek B. (fiktiv)', date: todayIso, time: '06:30' },
];
const demoDepartments = [
  { id: 'dept-kueche', name: 'Küche (FIKTIV)', spaces: [{ id: 'sp-k', name: 'Vorbereitung [FIKTIV]' }] },
  { id: 'dept-service', name: 'Service (FIKTIV)', spaces: [{ id: 'sp-s', name: 'Gastraum' }] },
];
const demoFolders = [
  { id: 'f-rezepte', name: 'Rezepte [FIKTIV]', space_id: 'sp-k' },
  { id: 'f-schicht', name: 'Schichtplan', space_id: 'sp-s' },
];
const demoFinder = buildFinder({
  departments: demoDepartments,
  folders: demoFolders,
  nodes: [],
  tasks: demoTasks,
  now,
});
const demoDay = buildLiveDay(demoEvents, demoTasks, {}, now);
const demoPlanets = demoFinder
  .filter((p) => p.kind === 'department')
  .map((p) => ({
    id: p.id,
    name: p.name,
    tone: p.tone,
    weight: 1,
    meta: '1 Ordner',
    moons: p.moons.map((m) => ({ id: m.id, label: m.name, count: m.count })),
    traits: {
      folders: 1,
      docs: 0,
      events: 0,
      open: 1,
      overdue: 0,
      activity: 1,
      nextTask: { id: 't-fiktiv-1', title: '[FIKTIV] Siebträger entkalken' },
      latest: '[FIKTIV] Hygiene-Checkliste',
    },
  }));

jest.mock('@/lib/api/orgClient', () => ({
  fetchCompanies: jest.fn(async () => [
    { id: MORGENROT.companyId, name: 'Café Morgenrot (FIKTIV)', tenant_id: MORGENROT.tenantId, is_demo: true },
  ]),
}));

jest.mock('@/lib/lea/useWorld', () => ({
  useWorld: () => ({
    enabled: true,
    loading: false,
    failed: false,
    companyId: MORGENROT.companyId,
    sessionGeneration: 1,
    calendarUnavailable: false,
    calendar: {
      status: 'ok',
      complete: true,
      source: 'core_calendar',
      window: { from: todayIso, to: todayIso, timezone: 'Europe/Berlin' },
      last_synced_at: '2026-10-29T10:00:00Z',
    },
    planets: demoPlanets,
    finder: demoFinder,
    tasksPlanetId: TASKS_PLANET,
    day: demoDay,
    events: demoEvents,
    tasks: demoTasks,
  }),
}));

jest.mock('@/lib/lea/useHorizonSources', () => ({
  useHorizonSources: () => ({
    mail: {
      status: 'ok',
      hidden: 0,
      items: [{ id: 'm-1', subject: '[FIKTIV] Ankündigung Routinekontrolle', from_addr: 'amt@example.org' }],
    },
    feed: null,
    sources: [],
  }),
}));

jest.mock('@/lib/lea/useFinderActions', () => ({
  useFinderActions: () => ({
    createFolder: jest.fn(),
    createNote: jest.fn(),
    upload: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock('@/lib/lea/useDayActions', () => ({
  useDayActions: () => ({
    setDone: jest.fn(),
    addForTomorrow: jest.fn(),
    addTask: jest.fn(),
    assignFolder: jest.fn(),
  }),
}));

function makeSnapshot(): TodaySnapshot {
  const m = {
    source: 'test',
    scope: { level: 'company' as const, tenant_id: MORGENROT.tenantId, user_id: 'u-marius', company_id: MORGENROT.companyId },
    connection: 'local',
    complete: true,
    as_of: '2026-10-29T10:00:00Z',
    stale_after_seconds: 900,
  };
  return {
    status: 'ok',
    date: todayIso,
    timezone: 'Europe/Berlin',
    generated_at: '2026-10-29T10:00:00Z',
    requested_scope: { tenant_id: MORGENROT.tenantId, user_id: 'u-marius', company_id: MORGENROT.companyId },
    mail: {
      ...m,
      status: 'ok',
      source: 'demo_mail',
      unread_count: 1,
      inbox_loaded: 1,
      sample_limit: 5,
      items: [{ id: 'm-1', subject: '[FIKTIV] Ankündigung Routinekontrolle', from_addr: 'amt@example.org', snippet: 'Test' }],
    },
    calendar: {
      ...m,
      status: 'ok',
      source: 'core_calendar',
      date: todayIso,
      count: 1,
      next_event: { id: 'e-fiktiv-1', title: 'Schicht Tarek B. (fiktiv)', date: todayIso, time: '06:30' },
      events: demoEvents,
    },
    tasks: {
      ...m,
      status: 'ok',
      source: 'tasks',
      counts: { open: 1, in_progress: 0, due_today: 1, overdue: 0 },
      items: demoTasks,
      due_today: demoTasks,
      overdue: [],
    },
    nightwatch: { ...m, status: 'empty', source: 'nightwatch_graph', open_incidents: 0, health_score: 100, incidents: [] },
  } as TodaySnapshot;
}

describe('Demo-Tenant: fiktiv-badge in Home UND Universe + stripFiktiv erst in der Anzeige', () => {
  jest.setTimeout(60000);
  beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    useSessionStore.setState({
      user: {
        id: 'u-marius',
        name: 'Marius',
        role: 'owner',
        tenant_id: MORGENROT.tenantId,
        is_demo: true,
        active_company_id: MORGENROT.companyId,
        active_company_name: 'Café Morgenrot (FIKTIV)',
      } as any,
    });
  });

  it('behält [FIKTIV]-Marker in den Rohdaten, damit demo:true vor dem Strippen erkannt wird', () => {
    // Rohdaten in demoFinder / demoTasks tragen noch den Marker
    expect(demoFinder[0].name).toContain('FIKTIV');
    expect(demoTasks[0].title).toContain('[FIKTIV]');

    // widgetsFromToday erkennt demo:true aus dem Rohmarker und strippt erst für das Anzeige-Label
    const widgets = widgetsFromToday(makeSnapshot());
    const mailWidget = widgets.find((w) => w.id === 'mail');
    const calWidget = widgets.find((w) => w.id === 'calendar');
    expect(mailWidget?.demo).toBe(true);
    expect(mailWidget?.content.type === 'list' && mailWidget.content.items[0]?.title).toBe('Ankündigung Routinekontrolle');
    expect(calWidget?.demo).toBe(true);
    expect(calWidget?.content.type === 'appointments' && calWidget.content.items[0]?.title).toBe('Schicht Tarek B.');
  });

  it('zeigt für den Demo-Tenant im Home UND im Universe (WorldUniverse/LiveWorld/Finder) ein .fiktiv-badge ohne literales [FIKTIV]', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    // 1. HOME (LiveCockpit)
    const { container: homeContainer, unmount: unmountHome } = render(
      <QueryClientProvider client={qc}>
        <LiveCockpit
          navigate={jest.fn()}
          initialView="home"
          finderPlanets={demoFinder}
          snapshot={makeSnapshot()}
        />
      </QueryClientProvider>
    );

    const homeBadges = homeContainer.querySelectorAll('.fiktiv-badge');
    expect(homeBadges.length).toBeGreaterThan(0);
    expect(homeContainer.textContent).toContain('Café Morgenrot');
    expect(homeContainer.textContent).toContain('Küche');
    expect(homeContainer.textContent).toContain('Service');
    expect(homeContainer.textContent).not.toContain('[FIKTIV]');
    expect(homeContainer.textContent).not.toContain('(FIKTIV)');
    expect(homeContainer.textContent).not.toContain('(fiktiv)');
    unmountHome();

    // 2. UNIVERSE (LiveWorld + WorldUniverse)
    const { container: universeContainer, unmount: unmountUniverse } = render(
      <QueryClientProvider client={qc}>
        <LiveWorld onAskMora={jest.fn()} navigate={jest.fn()} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('universe-fiktiv-badge')).toBeInTheDocument();
    });
    expect(universeContainer.querySelectorAll('.fiktiv-badge').length).toBeGreaterThan(0);
    expect(universeContainer.textContent).toContain('Ankündigung Routinekontrolle');
    expect(universeContainer.textContent).not.toContain('[FIKTIV]');
    expect(universeContainer.textContent).not.toContain('(FIKTIV)');
    unmountUniverse();

    // 3. FINDER (FinderVerse)
    const deptPlanet = demoFinder.find((p) => p.kind === 'department')!;
    const { container: finderContainer, unmount: unmountFinder } = render(
      <QueryClientProvider client={qc}>
        <FinderVerse
          planet={deptPlanet}
          phone={false}
          day={demoDay}
          onClose={jest.fn()}
          onAskMora={jest.fn()}
          onOpenStar={jest.fn()}
          onCreateFolder={jest.fn()}
          onCreateNote={jest.fn()}
          onUpload={jest.fn()}
        />
      </QueryClientProvider>
    );

    expect(screen.getByTestId('finder-fiktiv-badge')).toBeInTheDocument();
    expect(finderContainer.querySelectorAll('.fiktiv-badge').length).toBeGreaterThan(0);
    expect(finderContainer.textContent).toContain('Küche');
    expect(finderContainer.textContent).toContain('Rezepte');
    expect(finderContainer.textContent).not.toContain('[FIKTIV]');
    expect(finderContainer.textContent).not.toContain('(FIKTIV)');
    unmountFinder();
  }, 60000);
});
