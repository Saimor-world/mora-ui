import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TodaySnapshot } from '@/lib/api/todayClient';
import { greetingFor, sceneFor, berlinHour } from '@/lib/os-prototype/scene';
import { warmBriefing } from '@/lib/mora/bridgeData';
import { buildMoraBriefing } from '@/lib/queries/useDailyBriefing';
import { dayMoonsFor } from '@/lib/universe/dayMoons';
import { PlanetSystem } from '@/features/home/cockpit/Scene';

let mockSnapshot: TodaySnapshot | null = null;
jest.mock('@/lib/os/useScopedToday', () => ({
  useScopedToday: () => ({ snapshot: mockSnapshot, loading: false, loadError: null, refresh: jest.fn(), refreshing: false }),
}));
// eslint-disable-next-line import/first
import { BridgeConcept } from '@/components/os-shell/BridgeConcept';

const ok = { status: 'ok', complete: true };
const base = {
  date: '2026-11-28', generated_at: '2026-11-28T16:30:00Z', timezone: 'Europe/Berlin',
  mail: { ...ok, unread_count: 0, items: [] },
  tasks: { ...ok, counts: { open: 0, in_progress: 0, due_today: 0, overdue: 0 }, due_today: [], overdue: [], items: [] },
  nightwatch: { status: 'empty', complete: true, open_incidents: 0, incidents: [] },
  calendar: { ...ok, next_event: null, events: [] },
} as unknown as TodaySnapshot;

const items = [
  { id: 'home', title: 'Home', icon: () => null, description: '', slot: 'primary', order: 1, visibility: 'nav' },
  { id: 'today', title: 'Heute', icon: () => null, description: '', slot: 'primary', order: 10, visibility: 'nav' },
  { id: 'post', title: 'Post', icon: () => null, description: '', slot: 'primary', order: 40, visibility: 'nav' },
  { id: 'knowledge', title: 'Wissen', icon: () => null, description: '', slot: 'primary', order: 50, visibility: 'nav' },
  { id: 'settings', title: 'Einstellungen', icon: () => null, description: '', slot: 'primary', order: 60, visibility: 'nav' },
  { id: 'universe', title: 'Universe', icon: () => null, description: '', slot: 'secondary', order: 80, visibility: 'nav' },
] as any;

const dock = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <BridgeConcept items={items} activeId="home" onNavigate={jest.fn()} onMora={jest.fn()} onMore={jest.fn()} onNotifications={jest.fn()} onSearch={jest.fn()} onControl={jest.fn()} mood="idle" moraOpen={false} attention={0} phone={false} showLegacy={false} />
  </QueryClientProvider>,
);

describe('eine Tageszeit, ein Gruß', () => {
  it('Flow, Build und Lounge teilen sich dieselbe Uhr (Berlin)', () => {
    expect(greetingFor(new Date('2026-11-28T08:00:00+01:00'))).toBe('Guten Morgen.');
    expect(greetingFor(new Date('2026-11-28T08:00:00+01:00'), 'Mira')).toBe('Guten Morgen, Mira.');
    expect(greetingFor(new Date('2026-11-28T13:00:00+01:00'))).toBe('Guten Tag.');
    expect(greetingFor(new Date('2026-11-28T18:30:00+01:00'))).toBe('Guten Abend.');
    expect(greetingFor(new Date('2026-11-28T23:15:00+01:00'))).toBe('Guten Abend.');
    expect(sceneFor(new Date('2026-11-28T18:30:00+01:00')).id).toBe('lounge');
    expect(berlinHour(new Date('2026-11-28T18:30:00+01:00'))).toBe(18);
  });

  it('Briefing und Dock nutzen denselben Gruß', () => {
    expect(warmBriefing(base, 1, 18)).toMatch(/^Guten Abend\./);
    expect(buildMoraBriefing({ date: '2026-11-28', metrics: { unread_mails: 1, nightwatch_quiet: true } })).toMatch(/^(Guten Morgen|Guten Tag|Guten Abend)\./);
  });
});

describe('See und Cockpit', () => {
  afterEach(() => { mockSnapshot = null; });

  it('zeigt ohne Lage keine Kacheln und höchstens drei Lichtpunkte, wenn etwas anliegt', () => {
    mockSnapshot = base;
    const quiet = dock();
    expect(quiet.container.querySelectorAll('.bridge__inst:not([style])')).toHaveLength(0);
    expect(quiet.queryByTestId('dock-light-today')).toBeNull();
    expect(quiet.queryByTestId('dock-light-post')).toBeNull();
    expect(quiet.queryByTestId('dock-light-next')).toBeNull();
    expect(quiet.container.textContent).not.toMatch(/Nichts fällig/);
    quiet.unmount();

    mockSnapshot = { ...base, mail: { ...ok, unread_count: 1, items: [{ id: 'm1', subject: 'TEST: Mira', read: false }] },
      tasks: { ...ok, counts: { open: 1, in_progress: 0, due_today: 1, overdue: 0 }, due_today: [{ id: 't1', title: 'TEST: Mira anrufen', status: 'open', due_date: '2026-11-28' }], overdue: [], items: [] },
      calendar: { ...ok, next_event: { id: 'e1', title: 'Termin Mira', date: '2026-11-28', time: '17:30' }, events: [{ id: 'e1', title: 'Termin Mira', date: '2026-11-28', time: '17:30' }] },
    } as unknown as TodaySnapshot;
    const busy = dock();
    expect(busy.getByTestId('dock-light-post')).toBeInTheDocument();
    expect(busy.getByTestId('dock-light-today')).toBeInTheDocument();
    expect(busy.getByTestId('dock-light-next')).toBeInTheDocument();
    expect(busy.container.querySelectorAll('.bridge__light')).toHaveLength(3);
    busy.unmount();
  });

  it('das Dock zeigt Universe, Post, Heute und Mehr – der Rest liegt nicht als Icon in der Leiste', () => {
    mockSnapshot = base;
    const { container, unmount } = dock();
    const apps = [...container.querySelectorAll('.bridge__app')].map((el) => el.getAttribute('data-feature'));
    expect(apps).toEqual(['universe', 'post', 'today', 'more']);
    expect(apps).not.toContain('knowledge');
    expect(apps).not.toContain('settings');
    expect(apps).not.toContain('control');
    expect(apps).not.toContain('calendar');
    unmount();
  });
});

describe('Planet zeigt offene Einträge als Monde und fliegt in den Raum', () => {
  it('offene Einträge einer Abteilung erscheinen als Monde am Planeten', () => {
    const snap = {
      ...base,
      tasks: { ...ok, counts: { open: 1, in_progress: 0, due_today: 1, overdue: 0 }, due_today: [{ id: 't-mira', title: 'TEST: Mira anrufen', status: 'open', due_date: '2026-11-28', department_id: 'dept-mira' }], overdue: [], items: [] },
    } as unknown as TodaySnapshot;
    const moons = dayMoonsFor(snap);
    expect(moons.get('dept-mira')?.map((m) => m.taskId)).toEqual(['t-mira']);
    render(<PlanetSystem planets={[{ id: 'dept-mira', title: 'Mira Studio', moons: [] } as never]} attention={new Set()} company="Test" moons={moons} onOpen={jest.fn()} />);
    expect(screen.getByTestId('day-moon-t-t-mira')).toBeInTheDocument();
  });
});
