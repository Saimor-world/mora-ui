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

jest.mock('@/lib/lea/useWorld', () => ({
  useWorld: () => ({
    enabled: true, loading: false, failed: false, companyId: 'co-beispiel',
    planets: require('@/lib/lea/world').buildWorld({ departments, events }),
    events, tasks,
  }),
}));

import { PhoneHome } from '@/features/today/ui/PhoneHome';
import { WorldUniverse } from '@/components/world/WorldUniverse';

describe('PhoneHome (V4)', () => {
  it('shows MÔRA with eyes, one button, full names and overdue honestly', () => {
    const navigate = jest.fn();
    const ask = jest.fn();
    render(<PhoneHome greeting="Guten Morgen" firstName="Lea" navigate={navigate} onAskMora={ask} />);
    const stone = screen.getAllByTestId('mora-stone')[0];
    expect(stone).toHaveAttribute('data-face', 'true');
    expect(stone.querySelector('img')?.getAttribute('src')).toBe('/brand/mora-stone-v1.png');
    expect(screen.getAllByRole('button', { name: /MÔRA/ })).toHaveLength(1);
    expect(screen.getByTestId('phone-home-strip')).toHaveTextContent('Sophie Beispielhaft-Langname-Doppelname');
    const onlyToday = screen.getByTestId('phone-home-today');
    expect(within(onlyToday).getByText(/überfällig seit/)).toBeInTheDocument();
    expect(within(onlyToday).getByText('heute fällig')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Termine im Universe öffnen' }));
    expect(navigate).toHaveBeenCalledWith('universe');
    fireEvent.click(screen.getByTestId('phone-home-cta'));
    expect(ask).toHaveBeenCalled();
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
    expect(within(screen.getByTestId('world-mora')).getByTestId('mora-stone')).toHaveAttribute('data-face', 'true');
    const termine = screen.getByTestId('world-planet-d1');
    expect(termine.querySelector('.planet--sand')).not.toBeNull();
    expect(termine).toHaveTextContent('Termine');
    fireEvent.click(termine);
    expect(open).toHaveBeenCalledWith('d1');
  });
});
