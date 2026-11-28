import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TodaySnapshot } from '@/lib/api/todayClient';
import { HomeFocus } from '@/features/home/widgets/HomeFocus';

let mockSnapshot: TodaySnapshot | null = null;
jest.mock('@/lib/os/useScopedToday', () => ({
  useScopedToday: () => ({ snapshot: mockSnapshot, loading: false, loadError: null, refresh: jest.fn(), refreshing: false }),
}));
// eslint-disable-next-line import/first
import { BridgeConcept } from '@/components/os-shell/BridgeConcept';

const ok = { status: 'ok', complete: true };
const base = {
  date: '2026-11-04', generated_at: '2026-11-04T06:00:00Z', timezone: 'Europe/Berlin',
  mail: { ...ok, unread_count: 0, items: [] },
  tasks: { ...ok, counts: { open: 0, in_progress: 0, due_today: 0, overdue: 0 }, due_today: [], overdue: [], items: [] },
  nightwatch: { status: 'empty', complete: true, open_incidents: 0, incidents: [] },
};
const dock = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <BridgeConcept items={[]} activeId="home" onNavigate={jest.fn()} onMora={jest.fn()} onMore={jest.fn()} onNotifications={jest.fn()} onSearch={jest.fn()} mood="idle" moraOpen={false} attention={0} phone={false} showLegacy={false} />
  </QueryClientProvider>,
);

beforeAll(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-11-04T07:00:00+01:00')); });
afterAll(() => { jest.useRealTimers(); mockSnapshot = null; });

it('appointments become a point of light on the lake, not a glass tile of lines', () => {
  mockSnapshot = { ...base, calendar: { ...ok, next_event: { id: 'e1', title: 'Roadmap Review', date: '2026-11-04', time: '15:00' }, events: [
    { id: 'e1', title: 'Roadmap Review', date: '2026-11-04', time: '15:00' },
    { id: 'e2', title: 'Team-Sync', date: '2026-11-04', time: '16:30' },
  ] } } as unknown as TodaySnapshot;
  const { container, unmount } = dock();
  const light = screen.getByTestId('dock-light-next');
  expect(light.textContent).toMatch(/Nächst|Termin/);
  expect(container.querySelectorAll('.bridge__light')).toHaveLength(1);
  expect(screen.queryByTestId('dock-lines-next')).toBeNull();
  unmount();
});

it('the lake stays empty when nothing is due — no bare tiles, no „Nichts fällig“', () => {
  mockSnapshot = { ...base, calendar: { ...ok, next_event: null, events: [] } } as unknown as TodaySnapshot;
  const { container, unmount } = dock();
  expect(screen.queryByTestId('dock-light-today')).toBeNull();
  expect(screen.queryByTestId('dock-light-next')).toBeNull();
  expect(screen.queryByTestId('dock-light-post')).toBeNull();
  expect(container.textContent).not.toMatch(/Nichts fällig/);
  unmount();
});

it('the centre of the lake stays quiet: no rim highlight straight under MÔRA', () => {
  mockSnapshot = { ...base, calendar: { ...ok, next_event: null, events: [] } } as unknown as TodaySnapshot;
  const { container } = dock();
  const mid = container.querySelector('#bridge-edge stop[offset=".5"]')!;
  expect(mid.getAttribute('stop-opacity') ?? mid.getAttribute('stopOpacity')).toBe('0');
});

it('the legacy dock glass does not paint over the bridge (hard cut across the lake)', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'app/saimor-next.css'), 'utf8');
  expect(css).toMatch(/\[data-testid='dock'\]:not\(\.bridge__body\) \{\s*padding/);
});

it('phone renders at most two focus cards so none runs into MÔRA', () => {
  const cards = ['a', 'b', 'c'].map((id) => ({ id, label: id, value: '1', tone: 'calm', target: { kind: 'post' } })) as never;
  const { unmount } = render(<HomeFocus cards={cards} phone onOpen={jest.fn()} />);
  expect(screen.getAllByTestId('home-focus-card')).toHaveLength(2);
  unmount();
  render(<HomeFocus cards={cards} onOpen={jest.fn()} />);
  expect(screen.getAllByTestId('home-focus-card')).toHaveLength(3);
});

it('calm appointment marks are not drawn as lone dots on the wave (they live in Als Nächstes)', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'components/os-shell/bridge-concept.css'), 'utf8');
  expect(css).toMatch(/\.bridge__mark:not\(\[data-problem='true'\]\) \{ display:none; \}/);
});
