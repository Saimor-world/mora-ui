import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DayMoons, PlanetSystem } from '@/features/home/cockpit/Scene';
import { dayMoonsFor } from '@/lib/universe/dayMoons';
import { demoTodaySnapshot } from '@/lib/demo/morgenrot/demoToday';
import type { TodaySnapshot } from '@/lib/api/todayClient';

const planets = [{ id: 'd-theke', title: 'Theke', moons: [] }, { id: 'd-einkauf', title: 'Einkauf', moons: [] }] as never;

describe('Monde = Tagesdinge der Abteilung', () => {
  it('jede Abteilung mit Tagesdingen bekommt Monde', () => {
    const m = dayMoonsFor(demoTodaySnapshot('demo-morgenrot', 'u', 't'));
    expect(m.get('d-theke')?.length).toBeGreaterThan(0);
    expect([...m.values()].every((l) => l.length <= 4)).toBe(true);
  });

  it('Mond klappt auf, Aufgabe lässt sich abhaken', () => {
    const onTaskDone = jest.fn();
    const moons = new Map([['d-theke', [{ id: 't-1', kind: 'task' as const, title: 'Milch bestellen', taskId: '1' }]]]);
    render(<PlanetSystem planets={planets} attention={new Set()} company="Café" compact moons={moons} onTaskDone={onTaskDone} onOpen={() => {}} />);
    fireEvent.click(screen.getByTestId('day-moon-t-1'));
    expect(screen.getByTestId('day-moon-card-t-1')).toHaveTextContent('Milch bestellen');
    fireEvent.click(screen.getByTestId('day-moon-done-t-1'));
    fireEvent.click(screen.getByTestId('day-moon-done-t-1'));
    expect(onTaskDone).toHaveBeenCalledTimes(1);
    expect(onTaskDone).toHaveBeenCalledWith('1');
  });

  it('opens an event using its real object ID instead of its prefixed display key', () => {
    const snapshot = { tasks: { items: [], overdue: [], due_today: [] }, calendar: { events: [{ id: 'event-real-id', title: 'Real event', department_id: 'dep' }] }, mail: { items: [] } } as unknown as TodaySnapshot;
    const moons = dayMoonsFor(snapshot).get('dep')!;
    const onOpen = jest.fn();
    render(<DayMoons moons={moons} x={0} y={0} r={50} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Real event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Öffnen' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'e-event-real-id', objectId: 'event-real-id', kind: 'event' }));
  });

  it('does not turn a generated display key into an object link when CORE gives no ID', () => {
    const snapshot = { tasks: { items: [], overdue: [], due_today: [] }, calendar: { events: [{ title: 'Event without ID', department_id: 'dep' }] }, mail: { items: [] } } as unknown as TodaySnapshot;
    const onOpen = jest.fn();
    render(<DayMoons moons={dayMoonsFor(snapshot).get('dep')!} x={0} y={0} r={50} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Event without ID' }));
    expect(screen.queryByRole('button', { name: 'Öffnen' })).not.toBeInTheDocument();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('opens task details without checking the task off', () => {
    const onOpen = jest.fn(), onTaskDone = jest.fn();
    render(<DayMoons moons={[{ id: 't-task-id', objectId: 'task-id', taskId: 'task-id', kind: 'task', title: 'Read task' }]} x={0} y={0} r={50} onOpen={onOpen} onTaskDone={onTaskDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Read task' }));
    fireEvent.click(screen.getByRole('button', { name: 'Öffnen' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ objectId: 'task-id', kind: 'task' }));
    expect(onTaskDone).not.toHaveBeenCalled();
  });
});
