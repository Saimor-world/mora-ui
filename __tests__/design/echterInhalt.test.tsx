import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TodaySnapshot } from '@/lib/api/todayClient';
import { focusCards } from '@/lib/mora/bridgeData';
import { HomeFocus } from '@/features/home/widgets/HomeFocus';
import { PlanetSystem } from '@/features/home/cockpit/Scene';

let mockSnapshot: TodaySnapshot | null = null;
jest.mock('@/lib/os/useScopedToday', () => ({
  useScopedToday: () => ({ snapshot: mockSnapshot, loading: false, loadError: null, refresh: jest.fn(), refreshing: false }),
}));
// eslint-disable-next-line import/first
import { BridgeConcept } from '@/components/os-shell/BridgeConcept';

const ok = { status: 'ok', complete: true };
const task = (id: string, title: string, due_date: string, extra = {}) => ({ id, title, due_date, status: 'open', ...extra });
const snap = {
  date: '2026-11-03',
  generated_at: '2026-11-03T08:00:00Z',
  timezone: 'Europe/Berlin',
  mail: { ...ok, unread_count: 9, items: [
    { id: 'm1', subject: 'Rechnung 2026-114 offen', from_addr: 'buchhaltung@x.de', read: false },
    { id: 'm2', subject: 'Freigabe Angebot', from_addr: 'lea@x.de', read: false },
    { id: 'm3', subject: 'Newsletter', from_addr: 'news@x.de', read: false },
  ] },
  calendar: { ...ok, next_event: null, events: [
    { id: 'e1', title: 'Steuerberater', date: '2026-11-03', time: '14:00' },
    { id: 'e2', title: 'Team-Sync', date: '2026-11-03', time: '16:30' },
  ] },
  tasks: { ...ok, counts: { open: 3, in_progress: 0, due_today: 0, overdue: 0 }, due_today: [], overdue: [], items: [
    task('t1', 'Amt', '2026-11-17'),
    task('t2', 'Umsatzsteuer', '2026-11-10'),
    task('t3', 'Ohne Frist', ''),
  ] },
  nightwatch: { status: 'empty', complete: true, open_incidents: 0, incidents: [] },
} as unknown as TodaySnapshot;

describe('HQ Home: echter Inhalt statt Text', () => {
  it('Kosmos-Mitte zeigt höchstens drei Karten aus echten Daten – Name + Zahl/Datum', () => {
    const cards = focusCards(snap);
    expect(cards.map((c) => `${c.label} · ${c.value}`)).toEqual(['Post · 2 brauchen dich', 'Umsatzsteuer · Frist 10.11.', 'Amt · Frist 17.11.']);
    render(<HomeFocus cards={cards} onOpen={jest.fn()} />);
    expect(screen.getAllByTestId('home-focus-card')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Amt · Frist 17.11.' })).toBeInTheDocument();
  });

  it('ohne echte Daten bleibt die Mitte leer – kein Platzhaltertext', () => {
    expect(focusCards(null)).toEqual([]);
    const { container } = render(<HomeFocus cards={focusCards(null)} onOpen={jest.fn()} />);
    expect(container.textContent).toBe('');
  });

  it('verbundene Docks zeigen echte Zählungen, unverbundene bleiben dunkle Buchten', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const renderDock = () => render(
      <QueryClientProvider client={qc}>
        <BridgeConcept items={[]} activeId="home" onNavigate={jest.fn()} onMora={jest.fn()} onMore={jest.fn()} onNotifications={jest.fn()} onSearch={jest.fn()} mood="idle" moraOpen={false} attention={0} phone={false} showLegacy={false} />
      </QueryClientProvider>
    );
    mockSnapshot = snap;
    const { container, unmount } = renderDock();
    const deck = container.querySelector('.bridge__deck')!;
    expect(within(deck as HTMLElement).getByText('9 Mails')).toBeInTheDocument();
    expect(within(deck as HTMLElement).getByText('3 Aufgaben')).toBeInTheDocument();
    expect(within(deck as HTMLElement).getByText('2 Termine')).toBeInTheDocument();
    unmount();
    mockSnapshot = { ...snap, mail: { ...snap.mail, status: 'unavailable' } } as unknown as TodaySnapshot;
    renderDock();
    expect(screen.getByTestId('dock-bay-post').textContent).toBe('');
    mockSnapshot = null;
  });

  it('Planeten mit Aktivität pulsieren, ruhige nicht', () => {
    const planets = [
      { id: 'amt', title: 'Amt', jobRoles: [], glass: 'sage', moons: [] },
      { id: 'labor', title: 'Labor', jobRoles: [], glass: 'lavender', moons: [] },
    ] as never;
    render(<PlanetSystem planets={planets} attention={new Set()} signals={new Map([['amt', { isAlarm: false, reason: '2 heute fällig' }]])} company="HQ" compact onOpen={jest.fn()} />);
    expect(screen.getByTestId('open-amt')).toHaveClass('ck-planet--active');
    expect(screen.getByTestId('open-labor')).not.toHaveClass('ck-planet--active');
  });
});
