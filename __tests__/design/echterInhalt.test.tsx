import fs from 'fs';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TodaySnapshot } from '@/lib/api/todayClient';
import { focusCards, upcomingEvents } from '@/lib/mora/bridgeData';
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
    { id: 'e1', title: 'Steuerberater', date: '2026-11-04', time: '14:00' },
    { id: 'e2', title: 'Team-Sync', date: '2026-11-04', time: '16:30' },
  ] },
  tasks: { ...ok, counts: { open: 3, in_progress: 0, due_today: 0, overdue: 0 }, due_today: [], overdue: [], items: [
    task('t1', 'Amt', '2026-11-17'),
    task('t2', 'Angebot Pilot', '2026-11-10'),
    task('t3', 'Ohne Frist', ''),
  ] },
  nightwatch: { status: 'empty', complete: true, open_incidents: 0, incidents: [] },
} as unknown as TodaySnapshot;

describe('HQ Home: echter Inhalt statt Text', () => {
  it('Kosmos-Mitte zeigt höchstens drei Karten aus echten Daten – Name + Zahl/Datum', () => {
    const cards = focusCards(snap);
    expect(cards.map((c) => `${c.label} · ${c.value}`)).toEqual(['Post · 2 brauchen dich', 'Angebot Pilot · Frist 10.11.', 'Amt · Frist 17.11.']);
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

  it('Als-Nächstes-Dock: Zahl und Liste aus derselben Quelle, spätere Tage mit Datum', () => {
    const late = { ...snap, calendar: { ...snap.calendar, events: [
      { id: 'e1', title: 'Steuerberater', date: '2026-11-03', time: '09:00' },
      { id: 'e2', title: 'Kundencall', date: '2026-11-05', time: '14:00' },
      { id: 'e3', title: 'Workshop', date: '2026-11-06', time: '10:00' },
    ] } } as unknown as TodaySnapshot;
    const now = 20 * 60;
    expect(upcomingEvents(late, now)).toEqual([
      { id: 'e2', when: 'Do 05.11. 14:00', label: 'Kundencall' },
      { id: 'e3', when: 'Fr 06.11. 10:00', label: 'Workshop' },
    ]);
    const realNow = Date.now;
    Date.now = () => new Date('2026-11-03T19:00:00Z').getTime();
    mockSnapshot = late;
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <BridgeConcept items={[]} activeId="home" onNavigate={jest.fn()} onMora={jest.fn()} onMore={jest.fn()} onNotifications={jest.fn()} onSearch={jest.fn()} mood="idle" moraOpen={false} attention={0} phone={false} showLegacy={false} />
      </QueryClientProvider>
    );
    Date.now = realNow;
    mockSnapshot = null;
    const text = container.querySelector('.bridge__deck')!.textContent ?? '';
    expect(text).toContain('2 Termine');
    expect(text).toContain('Do 05.11. 14:00 Kundencall');
    expect(text).not.toMatch(/kein Termin/i);
  });
});

describe('keine erfundenen Fristen im Produktivcode', () => {
  it('HQ-Quellen enthalten keine fest eingebauten USt-/Voranmeldungs-Fristen', () => {
    for (const f of ['lib/mora/bridgeData.ts', 'features/home/widgets/HomeFocus.tsx', 'features/home/cockpit/LiveCockpit.tsx', 'components/os-shell/BridgeConcept.tsx']) {
      expect(fs.readFileSync(f, 'utf8')).not.toMatch(/Umsatzsteuer|Voranmeldung|\d{2}\.\d{2}\.\d{4}|20\d\d-\d\d-\d\d/);
    }
  });
});

describe('HQ-Hintergrund', () => {
  it('der See hinter dem HQ nutzt nur Dateiendungen, die die Middleware öffentlich ausliefert', () => {
    const css = fs.readFileSync('components/os-shell/bridge-concept.css', 'utf8');
    const mw = fs.readFileSync('middleware.ts', 'utf8');
    const exts = /\\\.\(([a-z0-9|]+)\)\$/.exec(mw)![1].split('|');
    const lake = [...css.matchAll(/url\('(\/universe\/universe-lake\.[a-z]+)'\)/g)].map((m) => m[1]);
    expect(lake.length).toBeGreaterThan(0);
    for (const u of lake) expect(exts).toContain(u.split('.').pop());
  });
});
