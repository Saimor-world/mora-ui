import { dayMarks, mailCounts, moraLine, stations, warmBriefing } from '@/lib/mora/bridgeData';
import type { TodaySnapshot } from '@/lib/api/todayClient';

const ok = { status: 'ok', complete: true };
const snap = {
  date: '2026-10-30',
  mail: { ...ok, unread_count: null, items: [
    { id: 'm1', subject: 'Krankmeldung – heute nicht da', from_addr: 'tarek.b@x.demo', read: false },
    { id: 'm2', subject: 'Neue Reservierung', from_addr: 'a@x.demo', read: false },
  ] },
  calendar: { ...ok, events: [
    { id: 'e1', title: 'Schicht Tarek B. (fiktiv)', date: '2026-10-30', time: '06:30' },
    { id: 'e2', title: '[FIKTIV] Kassenbuch prüfen', date: '2026-10-30', time: '11:00' },
    { id: 'e3', title: 'Spät', date: '2026-10-30', time: '23:30' },
  ] },
  tasks: { ...ok, counts: { open: 4, in_progress: 0, due_today: 2, overdue: 0 }, items: [] },
  nightwatch: { status: 'empty', complete: true, open_incidents: 0, incidents: [] },
} as unknown as TodaySnapshot;

it('uses one mail number for dock and briefing', () => {
  expect(mailCounts(snap, 10)).toEqual({ unread: 10, needsYou: 1 });
  expect(warmBriefing(snap, 10, 8)).toBe('Guten Morgen. 10 Mails warten, 1 braucht dich. Tarek fällt aus, die Schicht um 06:30 ist offen.');
});

it('labels only real events between 6 and 22 and flags the open shift', () => {
  const marks = dayMarks(snap, 10 * 60);
  expect(marks.map((m) => [m.time, m.label, m.problem])).toEqual([['06:30', 'Schicht offen · Tarek', true], ['11:00', 'Kassenbuch prüfen', false]]);
  expect(moraLine(snap, 600)).toContain('Tarek fällt heute aus');
});

it('never shows dashes when a source is missing', () => {
  const s = stations({ ...snap, tasks: { ...snap.tasks, status: 'unavailable' } } as TodaySnapshot);
  expect(s.find((x) => x.id === 'today')).toMatchObject({ value: 'Offline', detail: 'Aufgaben nicht verbunden' });
  expect(stations(null).every((x) => !/^[-–]+$/.test(x.value))).toBe(true);
});
