import { bridgeLights } from '@/components/os-shell/BridgeConcept';
import type { TodaySnapshot } from '@/lib/api/todayClient';

const snapshot = {
  calendar: { status: 'ok', complete: true, events: [{ id: 'event-1', title: 'Reservierung', date: '2026-10-31', time: '10:00' }] },
  tasks: { status: 'ok', complete: true, items: [{ id: 'task-1', title: 'Bestellung prüfen', status: 'backlog', due_date: '2026-10-30' }, { id: 'task-2', title: 'Erledigt', status: 'done', due_date: '2026-10-30' }] },
  mail: { status: 'ok', complete: true, items: [{ id: 'mail-1', subject: 'Lieferung', date: '2026-10-29T10:00:00Z' }] },
} as unknown as TodaySnapshot;

it('shows dated open events and tasks, but does not mistake mail receipt dates for deadlines', () => {
  const lights = bridgeLights(snapshot);
  expect(lights.map((light) => light.id)).toEqual(['task-1', 'event-1']);
  expect(lights[1]).toMatchObject({ kind: 'Termin', target: 'calendar', date: '2026-10-31 10:00' });
});

it('does not manufacture events from incomplete or unavailable sources', () => {
  expect(bridgeLights(null)).toEqual([]);
  const partial = { ...snapshot, calendar: { ...snapshot.calendar, complete: false }, tasks: { ...snapshot.tasks, status: 'unavailable' }, mail: { ...snapshot.mail, complete: false } } as TodaySnapshot;
  expect(bridgeLights(partial)).toEqual([]);
});
