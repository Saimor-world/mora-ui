import { buildLiveDay } from '@/lib/lea/live';
import { buildDay, daySentence, nextOpenToday } from '@/lib/lea/day';
import { hm, localISO } from '@/lib/lea/world';

const zone = 'Europe/Berlin';
it.each(['2026-10-24T22:30:00Z', '2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z'])('keeps the contract day on desktop, phone and tiles in any device zone: %s', (instant) => {
  const now = new Date(instant);
  const events = [{ id: 'berlin', title: 'Berliner Termin', date: '2026-10-25', time: '09:00', duration: 60 }];
  const live = buildLiveDay(events, [], {}, now, zone);
  expect(localISO(now, zone)).toBe('2026-10-25');
  expect(live.next?.id).toBe('berlin');
  expect(live.sentence).toContain('Um 09:00');
  const phone = buildDay(events, [], now, zone);
  expect(phone.today).toHaveLength(1);
  expect(daySentence(phone, now, zone)).toContain('Heute 1 Termin');
  expect(nextOpenToday(events, {}, now, zone).total).toBe(1);
});

it('uses the repeated Berlin winter hour, not the device clock, for countdowns', () => {
  const now = new Date('2026-10-25T01:30:00Z');
  const events = [{ id: 'next', title: 'Test', date: '2026-10-25', time: '03:00', duration: 60 }];
  expect(hm(now, zone)).toBe('02:30');
  expect(buildLiveDay(events, [], {}, now, zone).minutesToNext).toBe(30);
  expect(buildDay(events, [], now, zone).minutesToNext).toBe(30);
});

it('does not declare an unknown duration finished after an invented hour', () => {
  const now = new Date('2026-10-25T11:00:00Z');
  const events = [{ id: 'unknown-end', title: 'Test', date: '2026-10-25', time: '09:00' }];
  expect(buildLiveDay(events, [], {}, now, zone).stale?.id).toBe('unknown-end');
  expect(daySentence(buildDay(events, [], now, zone), now, zone)).not.toContain('vorbei');
});
