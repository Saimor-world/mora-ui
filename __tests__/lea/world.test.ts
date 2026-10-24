import { buildWorld, upcomingEvents } from '@/lib/lea/world';
import { buildDay, daySentence, inMinutes, personOf, serviceOf } from '@/lib/lea/day';

// Beispiel-Daten, keine echten Kundinnen.
const NOW = new Date(2026, 9, 23, 10, 15);
const departments = [
  { id: 'd1', name: 'Termine', slug: 'termine', spaces: [{ id: 's1', name: 'Kalender', folder_count: 1 }] },
  { id: 'd2', name: 'Kundinnen', spaces: [{ id: 's2', name: 'Stammkundinnen', folder_count: 2 }, { id: 's3', name: 'Neu', folder_count: 0 }] },
  { id: 'd3', name: 'Lager', spaces: [] },
];
const events = [
  { id: 'e1', title: 'Maniküre – Sophie Beispielhaft-Langname', date: '2026-10-23', time: '09:30', duration: 60 },
  { id: 'e2', title: 'Gelnägel – Mara Beispiel', date: '2026-10-23', time: '11:00', duration: 90 },
  { id: 'e3', title: 'Pediküre – Jana Beispiel', date: '2026-10-24', time: '10:00' },
];
const tasks = [
  { id: 't1', title: 'Gel bestellen', status: 'open', due_date: '2026-10-21' },
  { id: 't2', title: 'Rechnung schicken', status: 'open', due_date: '2026-10-23' },
  { id: 't3', title: 'Später', status: 'open', due_date: '2026-10-30' },
  { id: 't4', title: 'Erledigt', status: 'done', due_date: '2026-10-20' },
];

describe('world from real data', () => {
  it('makes one planet per department and nothing from templates', () => {
    const planets = buildWorld({ departments, events, now: NOW });
    expect(planets.map((p) => p.name)).toEqual(['Termine', 'Kundinnen', 'Lager']);
    expect(planets[1].moons.map((m) => m.label)).toEqual(['Stammkundinnen', 'Neu']);
    expect(planets[2].meta).toBe('noch leer');
    expect(planets[0].meta).toBe('2 Termine kommen');
    expect(buildWorld({ departments: [], events, now: NOW })).toEqual([]);
  });

  it('gives each department a matte material from its name', () => {
    const [termine, kundinnen, lager] = buildWorld({ departments, events, now: NOW });
    expect(termine.tone.className).toBe('planet--sand');
    expect(kundinnen.tone.className).toBe('planet--ton');
    expect(lager.tone.className).toBe('planet--stein');
  });

  it('only counts appointments from now on as upcoming', () => {
    expect(upcomingEvents(events, NOW).map((e) => e.id)).toEqual(['e2', 'e3']);
  });
});

describe('the day', () => {
  const day = buildDay(events, tasks, NOW);

  it('knows what comes next and in how long', () => {
    expect(day.next?.id).toBe('e2');
    expect(day.minutesToNext).toBe(45);
    expect(inMinutes(45)).toBe('in 45 Min');
    expect(inMinutes(125)).toBe('in 2 Std 5 Min');
  });

  it('shows overdue honestly as overdue, and nothing that is done or later', () => {
    expect(day.onlyToday).toEqual([
      { id: 't1', title: 'Gel bestellen', overdue: true, meta: 'überfällig seit 21.10.' },
      { id: 't2', title: 'Rechnung schicken', overdue: false, meta: 'heute fällig' },
    ]);
  });

  it('keeps full names', () => {
    expect(personOf(events[0].title)).toBe('Sophie Beispielhaft-Langname');
    expect(serviceOf(events[0].title)).toBe('Maniküre');
    expect(personOf('Teammeeting')).toBe('Teammeeting');
  });

  it('says only what the data supports', () => {
    expect(daySentence(day, NOW)).toBe('Heute 2 Termine. Als Nächstes um 11:00 Mara Beispiel.');
    expect(daySentence(buildDay([], [], NOW), NOW)).toBe('Heute ist nichts eingetragen.');
  });
});
