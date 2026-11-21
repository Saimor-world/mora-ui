import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanetSystem } from '@/features/home/cockpit/Scene';
import { dayMoonsFor } from '@/lib/universe/dayMoons';
import { demoTodaySnapshot } from '@/lib/demo/morgenrot/demoToday';

const planets = [{ id: 'd-theke', title: 'Theke', moons: [] }, { id: 'd-einkauf', title: 'Einkauf', moons: [] }] as never;

describe('Monde = Tagesdinge der Abteilung', () => {
  it('jede Abteilung mit Tagesdingen bekommt Monde', () => {
    const m = dayMoonsFor(demoTodaySnapshot('demo-morgenrot', 'u', 't'));
    expect(m.get('d-theke')?.length).toBeGreaterThan(0);
    expect([...m.values()].every((l) => l.length <= 4)).toBe(true);
  });

  it('Mond klappt auf, Aufgabe lässt sich abhaken', async () => {
    const onTaskDone = jest.fn().mockResolvedValue(true);
    const moons = new Map([['d-theke', [{ id: 't-1', kind: 'task' as const, title: 'Milch bestellen', taskId: '1' }]]]);
    render(<PlanetSystem planets={planets} attention={new Set()} company="Café" compact moons={moons} onTaskDone={onTaskDone} onOpen={() => {}} />);
    fireEvent.click(screen.getByTestId('day-moon-t-1'));
    expect(screen.getByTestId('day-moon-card-t-1')).toHaveTextContent('Milch bestellen');
    fireEvent.click(screen.getByTestId('day-moon-done-t-1'));
    fireEvent.click(screen.getByTestId('day-moon-done-t-1'));
    expect(onTaskDone).toHaveBeenCalledTimes(1);
    expect(onTaskDone).toHaveBeenCalledWith('1');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Erledigt' })).toHaveAttribute('aria-pressed', 'true'));
  });
});

it('leaves a refused change open and accepts a confirmed retry', async () => {
  const save = jest.fn().mockRejectedValueOnce(new Error('abgelehnt')).mockResolvedValueOnce(true);
  const moons = new Map([['d-theke', [{ id: 't-1', kind: 'task' as const, title: 'Eintrag Mira', taskId: '1' }]]]);
  render(<PlanetSystem planets={planets} attention={new Set()} company="Test" compact moons={moons} onTaskDone={save} onOpen={() => {}} />);
  fireEvent.click(screen.getByTestId('day-moon-t-1'));
  const button = screen.getByRole('button', { name: 'Erledigt' });
  fireEvent.click(button);
  expect(await screen.findByRole('alert')).toHaveTextContent('Änderung nicht bestätigt');
  expect(button).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(button);
  await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
  expect(screen.queryByRole('alert')).toBeNull();
});
