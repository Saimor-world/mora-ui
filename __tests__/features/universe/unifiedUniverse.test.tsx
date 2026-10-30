import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UniverseSurface from '@/features/universe/index';
import { UnifiedUniverse } from '@/features/universe/ui/UnifiedUniverse';
import { LiveCockpit } from '@/features/home/cockpit/LiveCockpit';
import { OsDock } from '@/components/os-shell/OsDock';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { buildFinder, TASKS_PLANET } from '@/lib/lea/finder';
import { buildLiveDay } from '@/lib/lea/live';
import { localISO } from '@/lib/lea/world';
import { MORGENROT } from '@/lib/demo/morgenrot/online';
import type { FeatureManifest } from '@/features/types';
import { Orbit, Mail, Home } from 'lucide-react';

const now = new Date('2026-10-29T10:00:00Z');
const todayIso = localISO(now);

const demoTasks = [
  { id: 't-1', title: 'Espressobohnen nachfüllen', status: 'open', due_date: todayIso },
];
const demoEvents = [
  { id: 'e-1', title: 'Schicht Tarek B.', date: todayIso, time: '06:30' },
];
const demoDepartments = [
  { id: 'dept-kueche', name: 'Küche', spaces: [{ id: 'sp-k', name: 'Vorbereitung' }] },
  { id: 'dept-service', name: 'Service', spaces: [{ id: 'sp-s', name: 'Gastraum' }] },
];
const demoFolders = [
  { id: 'f-rezepte', name: 'Rezepte', space_id: 'sp-k' },
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

const mockItems: FeatureManifest[] = [
  { id: 'home', title: 'Home', description: 'Home', icon: Home, slot: 'primary', order: 10, visibility: 'nav', mobile: 'bar', load: () => Promise.resolve({ default: () => null }) },
  { id: 'universe', title: 'Universe', description: 'Universe', icon: Orbit, slot: 'primary', order: 20, visibility: 'nav', mobile: 'bar', load: () => Promise.resolve({ default: () => null }) },
  { id: 'post', title: 'Post', description: 'Post', icon: Mail, slot: 'primary', order: 30, visibility: 'nav', mobile: 'bar', load: () => Promise.resolve({ default: () => null }) },
] as unknown as FeatureManifest[];

describe('Ein Universe statt zwei + MÔRA-Größe im Dock', () => {
  jest.setTimeout(30000);

  beforeEach(() => {
    localStorage.clear();
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

  it('Home → Universe und Heute → Universe rendern dieselbe UnifiedUniverse-Komponente mit genau einer MÔRA im Dock', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    // 1. Einstieg Heute → Universe (UniverseSurface / #universe)
    const { container: universeSurfaceContainer, unmount: unmountUniverse } = render(
      <QueryClientProvider client={qc}>
        <UniverseSurface navigate={jest.fn()} preview={false} />
      </QueryClientProvider>
    );

    expect(screen.getByTestId('universe-unified')).toBeInTheDocument();
    expect(screen.getByTestId('world-view-toggle')).toBeInTheDocument();
    // Schwebende MÔRA im Zentrum des Universe (HQ-Pixelansicht wie in main b2f2a99)
    expect(universeSurfaceContainer.querySelectorAll('[data-testid="world-mora"]').length).toBe(1);
    unmountUniverse();

    // 2. Einstieg Home (LiveCockpit mit initialView="universe" delegiert zur zentralen UniverseSurface)
    const navigateMock = jest.fn();
    const { unmount: unmountCockpit } = render(
      <QueryClientProvider client={qc}>
        <LiveCockpit navigate={navigateMock} initialView="universe" />
      </QueryClientProvider>
    );

    expect(navigateMock).toHaveBeenCalledWith('universe');
    unmountCockpit();
  });

  it('schaltet zwischen Pixel und Glas um, ohne den ausgewählten Planeten oder Navigationszustand zu verlieren', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={qc}>
        <UnifiedUniverse navigate={jest.fn()} initialPlanetId="dept-kueche" initialStyle="glas" />
      </QueryClientProvider>
    );

    // Initial geöffnet: Planet Küche
    expect(screen.getByTestId('planet-dept-kueche')).toBeInTheDocument();
    expect(screen.getByTestId('universe-unified')).toHaveAttribute('data-style', 'glas');

    // Umschalten per Version-B-Toggle (.wd-view auf der linken Seite)
    const toggleBtn = screen.getByTestId('world-view-toggle');
    fireEvent.click(toggleBtn);

    // Jetzt im Pixel-Modus, aber Planet Küche ist IMMER NOCH geöffnet!
    expect(screen.getByTestId('universe-unified')).toHaveAttribute('data-style', 'pixel');
    expect(screen.getByTestId('planet-dept-kueche')).toBeInTheDocument();
    expect(localStorage.getItem('mora.planet_style')).toBe('pixel');

    // Erneut umschalten per Toggle-Button (Glas)
    fireEvent.click(toggleBtn);

    expect(screen.getByTestId('universe-unified')).toHaveAttribute('data-style', 'glas');
    expect(screen.getByTestId('planet-dept-kueche')).toBeInTheDocument();
    expect(localStorage.getItem('mora.planet_style')).toBe('glas');

    // Zurück zum System per Back-Button
    const backBtn = screen.getByTestId('world-planet-close');
    fireEvent.click(backBtn);

    // Jetzt in der System-Ansicht mit allen Planeten
    expect(screen.getByTestId('planet-system')).toBeInTheDocument();
    expect(screen.queryByTestId('planet-dept-kueche')).not.toBeInTheDocument();
  });

  it('Dock ist schlank und einzeilig ohne .os-dock__stage, mit freiem Frag-MÔRA-Feld und kompaktem MÔRA-Button', () => {
    const { unmount } = render(
      <OsDock
        items={mockItems}
        mobileItems={[]}
        activeId="home"
        moraOpen={false}
        moreActive={false}
        onNavigate={jest.fn()}
        onSearch={jest.fn()}
        onMora={jest.fn()}
        onMore={jest.fn()}
        onNotifications={jest.fn()}
      />
    );

    const stone = screen.getByTestId('dock-mora');
    expect(stone).toBeInTheDocument();
    expect(stone.querySelector('.os-dock__stage')).toBeNull();
    expect(screen.getByTestId('dock-ask-open')).toBeInTheDocument();
    expect(screen.getByText('Frag MÔRA …')).toBeInTheDocument();
    expect(screen.queryByTestId('dock-active-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dock-attention')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dock-last-active')).not.toBeInTheDocument();
    unmount();
  });
});
