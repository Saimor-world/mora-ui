import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { buildWorld } from '@/lib/lea/world';

// Beispiel-Daten, keine echten Kundinnen.
const today = new Date();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = new Date(today); yesterday.setDate(today.getDate() - 2);
const events = [
  { id: 'e1', title: 'Maniküre – Sophie Beispielhaft-Langname-Doppelname', date: iso(today), time: '23:58', duration: 60 },
];
const tasks = [
  { id: 't1', title: 'Gel-Bestellung beim Beispiel-Großhandel aufgeben', status: 'open', due_date: iso(yesterday) },
  { id: 't2', title: 'Rechnung schicken', status: 'open', due_date: iso(today) },
];
const departments = [
  { id: 'd1', name: 'Termine', spaces: [{ id: 's1', name: 'Kalender', folder_count: 1 }] },
  { id: 'd2', name: 'Kundinnen', spaces: [] },
];

let mockDayUnavailable = false;
afterEach(() => { mockDayUnavailable = false; });
jest.mock('@/lib/lea/useWorld', () => ({
  useWorld: () => ({
    enabled: true, loading: false, failed: false, companyId: 'co-beispiel',
    dayUnavailable: mockDayUnavailable,
    planets: require('@/lib/lea/world').buildWorld({ departments, events }),
    events: mockDayUnavailable ? [] : events, tasks,
    day: require('@/lib/lea/live').buildLiveDay(events, tasks, {}),
  }),
}));
const setPhase = jest.fn(async () => ({ phase: 'laeuft', conflict: false, saved: true, version: 1 }));
jest.mock('@/lib/lea/dayStore', () => ({ useDayStore: (selector: (s: unknown) => unknown) => selector({ phases: {}, since: {}, pending: {}, sync: 'core', setPhase }) }));
const setDone = jest.fn().mockResolvedValue(true);
const addForTomorrow = jest.fn().mockResolvedValue(true);
jest.mock('@/lib/lea/useDayActions', () => ({ useDayActions: () => ({ setDone, addForTomorrow }) }));

import { PhoneHome } from '@/features/today/ui/PhoneHome';
import { WorldUniverse } from '@/components/world/WorldUniverse';

describe('PhoneHome (V4)', () => {
  it('keeps the planets and MÔRA button usable without claiming an unknown day is empty', () => {
    mockDayUnavailable = true;
    const ask = jest.fn();
    render(<PhoneHome greeting="Guten Tag" firstName="Test" navigate={jest.fn()} onAskMora={ask} />);
    expect(screen.getByText('Dein Tagesstand ist gerade nicht vollständig lesbar.')).toBeInTheDocument();
    expect(screen.queryByText('Heute ist nichts eingetragen.')).not.toBeInTheDocument();
    expect(screen.queryByTestId('day-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('phone-home-planets')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('phone-home-cta'));
    expect(ask).toHaveBeenCalled();
  });
  it('shows MÔRA with eyes, one button, full names and overdue honestly', () => {
    const navigate = jest.fn();
    const ask = jest.fn();
    render(<PhoneHome greeting="Guten Morgen" firstName="Lea" navigate={navigate} onAskMora={ask} />);
    const stone = screen.getAllByTestId('mora-stone')[0];
    expect(stone).toHaveAttribute('data-face', 'true');
    expect(stone.querySelector('img')?.getAttribute('src')).toBe('/brand/mora-stone-v1.png');
    expect(screen.getAllByRole('button', { name: /MÔRA/ })).toHaveLength(1);
    expect(screen.queryByTestId('phone-home-strip')).toBeNull();
    const onlyToday = screen.getByTestId('day-tasks');
    expect(within(onlyToday).getByText(/überfällig seit/)).toBeInTheDocument();
    expect(within(onlyToday).getByText('heute fällig')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Termine im Universe öffnen' }));
    expect(navigate).toHaveBeenCalledWith('universe');
    fireEvent.click(screen.getByTestId('phone-home-cta'));
    expect(ask).toHaveBeenCalled();
  });
});

describe('DayPanel', () => {
  it('does not display Frei or completed tasks when its source is unconfirmed', () => {
    mockDayUnavailable = true;
    const { DayPanel } = require('@/components/day/DayPanel');
    render(<DayPanel onAskMora={jest.fn()} />);
    expect(screen.getByTestId('day-error')).toBeInTheDocument();
    expect(screen.queryByText('Frei')).not.toBeInTheDocument();
    expect(screen.queryByText('Nichts drängt mehr.')).not.toBeInTheDocument();
  });
  it('ticks a task via CORE, offers undo, marks arrival and plans tomorrow', async () => {
    const { DayPanel } = require('@/components/day/DayPanel');
    render(<DayPanel onAskMora={jest.fn()} />);
    fireEvent.click(screen.getByTestId('day-tick-t2'));
    await screen.findByText(/Erledigt: Rechnung schicken/);
    expect(setDone).toHaveBeenCalledWith(expect.objectContaining({ id: 't2' }), true);
    fireEvent.click(within(screen.getByTestId('day-toast')).getByText('Rückgängig'));
    expect(setDone).toHaveBeenLastCalledWith(expect.objectContaining({ id: 't2' }), false);
    fireEvent.click(screen.getByTestId('day-arrived'));
    await screen.findByText(/Maniküre.*läuft\./);
    expect(setPhase).toHaveBeenCalledWith('e1', 'laeuft');
    fireEvent.click(screen.getByTestId('day-plan'));
    fireEvent.change(screen.getByTestId('day-tomorrow-input'), { target: { value: 'Beispiel morgen' } });
    fireEvent.submit(screen.getByTestId('day-tomorrow-input').closest('form')!);
    await screen.findByText('Für morgen notiert.');
    expect(addForTomorrow).toHaveBeenCalledWith('Beispiel morgen');
  });
});

describe('WorldUniverse', () => {
  afterEach(() => jest.restoreAllMocks());

  it('stays hidden until the field has a size (no planets at 0,0)', () => {
    render(<WorldUniverse planets={buildWorld({ departments, events })} phone={false} onOpenPlanet={jest.fn()} onMora={jest.fn()} />);
    expect(screen.queryAllByRole('button', { name: /öffnen/ })).toHaveLength(0);
  });

  it('draws one matte planet per department around MÔRA and opens it', () => {
    jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1200);
    jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(640);
    const open = jest.fn();
    const planets = buildWorld({ departments, events });
    render(<WorldUniverse planets={planets} phone={false} onOpenPlanet={open} onMora={jest.fn()} />);
    expect(screen.getAllByRole('button', { name: /öffnen ·/ })).toHaveLength(2);
    expect(within(screen.getByTestId('world-mora')).getByTestId('mora-spirit')).toBeInTheDocument();
    expect(screen.getByTestId('mora-status')).toHaveTextContent('MÔRA ist da und ruhig.');
    const termine = screen.getByTestId('world-planet-d1');
    expect(termine.querySelector('.planet--tone')).not.toBeNull(); // eine Saimôr-Palette für alle (24.10.2026)
    expect(termine).toHaveTextContent('Termine');
    fireEvent.click(termine);
    expect(open).toHaveBeenCalledWith('d1');
  });
});
