import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlanetFocus } from '@/components/world/PlanetFocus';
import { buildLiveDay } from '@/lib/lea/live';
import type { FPlanet } from '@/lib/lea/finder';

it('offers the arrival action on the Berlin contract day even if the device is on the previous day', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-24T22:30:00Z'));
  try {
    const event = { id: 'event', title: 'Testtermin', date: '2026-10-25', time: '09:00', duration: 60 };
    const planet = { id: 'work', name: 'Arbeit', kind: 'department', spaces: [], stars: [],
      moons: [{ id: 'calendar', name: 'Kalender', count: 1, stars: [{ id: event.id, name: event.title, kind: 'event', raw: event }] }] } as unknown as FPlanet;
    const arrived = jest.fn();
    render(<PlanetFocus planet={planet} day={buildLiveDay([event], [], {}, new Date(), 'Europe/Berlin')}
      timeZone="Europe/Berlin" phone={false} readOnly={false} onZoom={jest.fn()} onClose={jest.fn()}
      onAsk={jest.fn()} onTaskDone={jest.fn()} onArrived={arrived} />);
    fireEvent.click(screen.getByTestId('world-focus-arrived'));
    expect(arrived).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});
