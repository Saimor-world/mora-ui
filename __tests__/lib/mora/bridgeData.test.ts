import { dayMarks, instrumentLines, mailCounts, moraLine, stations, warmBriefing } from '@/lib/mora/bridgeData';
import type { TodaySnapshot } from '@/lib/api/todayClient';

const ok = { status: 'ok', complete: true };
const snap = {
  date: '2026-10-30',
  mail: { ...ok, unread_count: null, items: [
    { id: 'm1', subject: 'Krankmeldung – heute nicht da', from_addr: 'tarek.b@x.demo', read: false },
    { id: 'm2', subject: 'Neue Reservierung', from_addr: 'a@x.demo', read: false },
  ] },
  calendar: { ...ok, events: [
    { id: 'e1', title: 'Schicht Tarek B. (fiktiv)', date: '2026-10-30', time: '06:30', is_open: true },
    { id: 'e2', title: '[FIKTIV] Kassenbuch prüfen', date: '2026-10-30', time: '11:00' },
    { id: 'e3', title: 'Spät', date: '2026-10-30', time: '23:30' },
  ] },
  tasks: { ...ok, counts: { open: 4, in_progress: 0, due_today: 2, overdue: 0 }, items: [] },
  nightwatch: { status: 'empty', complete: true, open_incidents: 0, incidents: [] },
} as unknown as TodaySnapshot;

it('uses one mail number for dock and briefing', () => {
  expect(mailCounts(snap, 10)).toEqual({ unread: 10, needsYou: 1 });
  expect(warmBriefing(snap, 10, 8)).toBe('Guten Morgen. 10 Mails warten, 1 braucht dich. Schicht um 06:30 offen.');
});

it('labels only real events between 6 and 22 and flags the open shift', () => {
  const marks = dayMarks(snap, 10 * 60);
  expect(marks.map((m) => [m.time, m.label, m.problem])).toEqual([['06:30', 'Offen · Schicht Tarek B.', true], ['11:00', 'Kassenbuch prüfen', false]]);
  expect(moraLine(snap, 600)).toContain('Schicht um 06:30 offen');
});

it('never shows dashes when a source is missing', () => {
  const s = stations({ ...snap, tasks: { ...snap.tasks, status: 'unavailable' } } as TodaySnapshot);
  expect(s.find((x) => x.id === 'today')).toMatchObject({ value: 'Offline', detail: 'Aufgaben nicht verbunden' });
  expect(stations(null).every((x) => !/^[-–]+$/.test(x.value))).toBe(true);
});

it('does not infer a person’s absence or shift duration from mail and a matching first name', () => {
  const sample = { ...snap, calendar: { ...snap.calendar, events: snap.calendar.events.map(e => ({ ...e, is_open: false })) } };
  expect(moraLine(sample, 600)).toBe('1 Mail braucht dich.');
  expect(stations(sample).find(s => s.id === 'team')).toMatchObject({ value: '1 Schicht', detail: 'Heute im Kalender' });
  expect(instrumentLines(sample, 'team', 600)[0].text).toBe('Schicht Tarek B.');
});

it('distinguishes an inbox with read mail from an empty inbox', () => {
  expect(warmBriefing({ ...snap, mail: { ...snap.mail, unread_count: 0, items: snap.mail.items.map(m => ({ ...m, read: true })) } })).toContain('Keine ungelesenen Mails');
});
