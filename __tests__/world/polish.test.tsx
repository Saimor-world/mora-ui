import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { osMotion, osRadius, osType } from '@/lib/design/osTokens';
import { focusTiles, type FPlanet } from '@/lib/lea/finder';

// Beispiel-Daten, keine echten Kundinnen.
const today = new Date();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const tasks = [{ id: 't1', title: 'Gel-Bestellung (Beispiel)', status: 'open', due_date: iso(today) }];

let worldState: Record<string, unknown> = {};
jest.mock('@/lib/lea/useWorld', () => ({ useWorld: () => worldState }));
const setDone = jest.fn();
jest.mock('@/lib/lea/useDayActions', () => ({ useDayActions: () => ({ setDone, addForTomorrow: jest.fn() }) }));

import { DayPanel } from '@/components/day/DayPanel';

const base = { enabled: true, loading: false, failed: false, companyId: 'co-beispiel', planets: [], events: [], tasks };

describe('Gemeinsame Skala', () => {
  it('hat keine Schrift unter 12 px und eine Grundkurve für Bewegung', () => {
    const sizes = Object.values(osType).filter((t) => typeof t === "object").map((t) => parseFloat((t as { size: string }).size));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12);
    expect(osType.body.size).toBe('15px');
    expect(osRadius).toMatchObject({ sm: '12px', md: '16px', lg: '24px' });
    expect(osMotion).toMatchObject({ fast: '160ms', base: '240ms', zoom: '520ms' });
  });
});

describe('DayPanel – Zustände', () => {
  beforeEach(() => { setDone.mockReset(); });

  it('zeigt beim Laden ein ruhiges Skelett statt einer leeren Fläche', () => {
    worldState = { ...base, loading: true };
    render(<DayPanel onAskMora={jest.fn()} />);
    expect(screen.getByTestId('day-loading')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Als Nächstes')).toBeInTheDocument();
  });

  it('sagt ehrlich, wenn CORE den Tag nicht geliefert hat', () => {
    worldState = { ...base, failed: true };
    render(<DayPanel onAskMora={jest.fn()} />);
    expect(screen.getByTestId('day-error')).toHaveTextContent('Gerade nicht lesbar');
  });

  it('meldet einen Speicherfehler in der Fehlerfarbe, nicht als Erfolg', async () => {
    worldState = { ...base };
    setDone.mockResolvedValue(false);
    render(<DayPanel onAskMora={jest.fn()} />);
    await act(async () => { fireEvent.click(screen.getByTestId('day-tick-t1')); });
    const toast = screen.getByTestId('day-toast');
    expect(toast).toHaveAttribute('data-tone', 'error');
    expect(toast).toHaveTextContent('Bitte noch einmal');
  });

  it('sendet nicht doppelt, solange gespeichert wird', async () => {
    worldState = { ...base };
    let resolve: (v: boolean) => void = () => undefined;
    setDone.mockImplementation(() => new Promise<boolean>((r) => { resolve = r; }));
    render(<DayPanel onAskMora={jest.fn()} />);
    const box = screen.getByTestId('day-tick-t1');
    fireEvent.click(box);
    fireEvent.click(box);
    expect(setDone).toHaveBeenCalledTimes(1);
    expect(box).toBeDisabled();
    await act(async () => { resolve(true); });
  });
});

describe('Fokus-Kacheln', () => {
  it('sind im Universe und im Finder dieselben (Einzahl/Mehrzahl stimmt)', () => {
    const planet = {
      id: 'd2', name: 'Kundinnen', kind: 'department', spaces: [], stars: [],
      moons: [
        { id: 'm1', name: 'Karteikarten', count: 1, stars: [{ id: 'n1', name: 'Karte (Beispiel)', kind: 'note' }] },
        { id: 'm2', name: 'Allergien', count: 1, stars: [] },
      ],
    } as unknown as FPlanet;
    expect(focusTiles(planet)).toEqual([['Ordner', 2, 'kreisen als Monde'], ['Einträge', 2, 'in den Ordnern']]);
    expect(focusTiles({ ...planet, moons: planet.moons.slice(0, 1) } as FPlanet)[0][2]).toBe('kreist als Mond');
  });
});
