import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { buildFinder, planetCounts, TASKS_PLANET, COLLECT_PLANET } from '@/lib/lea/finder';
import { FinderVerse } from '@/components/finderverse/FinderVerse';
import type { LiveDay } from '@/lib/lea/live';

const now = new Date('2026-10-23T09:12:00');
const input = {
  departments: [{ id: 'd1', name: 'Material & Farben', slug: 'material-farben', spaces: [] }, { id: 'd2', name: 'Termine', slug: 'termine', spaces: [] }],
  unassigned: [{ id: 's1', name: 'Termine', slug: 'termine' }, { id: 's2', name: 'Lose', slug: 'lose' }],
  folders: [{ id: 'f1', name: 'Calendar', space_id: 's1', node_count: 2 }],
  nodes: [
    { id: 'n1', title: 'Auffüllen – Michelle', type: 'event', folder_id: 'f1', metadata: { date: '2026-10-23', time: '09:30' } },
    { id: 'n2', title: 'Auffüllen – Fr. Demir', type: 'note', folder_id: 'f1', metadata: { subtype: 'calendar_event', date: '2026-10-22', time: '13:00' } },
  ],
  tasks: [
    { id: 't1', title: 'Gel-Farbe Herbstrot nachbestellen', status: 'open', due_date: '2026-10-23' },
    { id: 't2', title: 'Instagram: Herbst-Designs posten', status: 'open', due_date: '2026-10-22' },
    { id: 't3', title: 'Erledigt', status: 'done', due_date: null },
  ],
  now,
};
const day: LiveDay = { running: null, stale: null, next: null, minutesToNext: null, open: [], doneToday: [], doneTodayEvents: false, tomorrow: [], sentence: '', ahead: null };

describe('buildFinder (Finder = Universe)', () => {
  const planets = buildFinder(input);
  it('merges a slug-equal space into its department: Termine gets the moon Calendar with 2 stars', () => {
    const termine = planets.find((p) => p.id === 'd2')!;
    expect(termine.moons.map((m) => m.name)).toEqual(['Calendar']);
    expect(termine.moons[0].stars.map((s) => s.kind)).toEqual(['event', 'event']);
    expect(planetCounts(termine)).toMatchObject({ folders: 1, events: 2 });
  });
  it('puts unmatched spaces on the collect planet and tasks on the Aufgaben planet, open/overdue first', () => {
    expect(planets.find((p) => p.id === COLLECT_PLANET)?.spaces.map((s) => s.id)).toEqual(['s2']);
    const tasks = planets.find((p) => p.id === TASKS_PLANET)!;
    expect(tasks.stars.map((s) => s.id)).toEqual(['t2', 't1', 't3']);
    expect(planetCounts(tasks)).toMatchObject({ open: 2, overdue: 1 });
  });
});

describe('FinderVerse', () => {
  const planets = buildFinder(input);
  const base = { phone: false, day, onClose: jest.fn(), onAskMora: jest.fn(), onOpenStar: jest.fn(), onToggleTask: jest.fn(), onCreateFolder: jest.fn(async () => undefined), onCreateNote: jest.fn(async () => undefined), onUpload: jest.fn(async () => undefined) };

  it('zooms planet → moon → star, switches to list and back with a breadcrumb', () => {
    render(<FinderVerse {...base} planet={planets.find((p) => p.id === 'd2')!} />);
    fireEvent.click(screen.getByTestId('fv-moon-f1'));
    expect(screen.getByTestId('fv-crumbs')).toHaveTextContent('Calendar');
    fireEvent.click(screen.getByTestId('fv-star-n1'));
    expect(screen.getByTestId('fv-selected')).toHaveTextContent('Auffüllen – Michelle');
    fireEvent.click(screen.getByTestId('fv-view-list'));
    expect(screen.getByTestId('fv-row-n2')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('fv-up'));
    expect(screen.getByTestId('fv-row-f1')).toBeInTheDocument();
  });

  it('shows an honest empty state with „Ordner anlegen“ and creates via the callback', async () => {
    render(<FinderVerse {...base} planet={planets.find((p) => p.id === 'd1')!} />);
    expect(screen.getByTestId('fv-empty')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('fv-empty-folder'));
    fireEvent.change(screen.getByTestId('fv-form-input'), { target: { value: 'Farbkarten' } });
    await act(async () => { fireEvent.submit(screen.getByTestId('fv-form')); });
    expect(base.onCreateFolder).toHaveBeenCalledWith('Farbkarten');
  });

  it('ticks a task on the Aufgaben planet; a member preview is read-only', () => {
    const { unmount } = render(<FinderVerse {...base} planet={planets.find((p) => p.id === TASKS_PLANET)!} />);
    fireEvent.click(screen.getByTestId('fv-star-t1'));
    fireEvent.click(screen.getByTestId('fv-toggle-task'));
    expect(base.onToggleTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
    unmount();
    render(<FinderVerse {...base} role="member" planet={planets.find((p) => p.id === 'd1')!} />);
    expect(screen.queryByTestId('fv-new-folder')).toBeNull();
  });
});
