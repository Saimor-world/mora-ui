import { allSourcesVerified, sourceTruth, todayCards } from '@/features/today/data/truth';
import { deriveAttention, deriveHints } from '@/features/today/data/attention';
import { sampleTodaySnapshot } from '@/features/today/data/sample';
import type { TodaySnapshot } from '@/lib/api/todayClient';

const now = new Date('2026-10-11T10:00:00.000Z').getTime();
function fresh(): TodaySnapshot { return sampleTodaySnapshot(new Date(now)); }

describe('Heute source-truth contracts', () => {
  it('refuses to call missing calendar entries a free day', () => {
    const s = fresh();
    s.calendar = { ...s.calendar, status: 'unavailable', count: null, events: [], next_event: null };
    expect(todayCards(s, now).calendar.title).toBe('Nicht erreichbar');
    expect(allSourcesVerified(s, now)).toBe(false);
  });

  it('never turns unknown task counts into zero', () => {
    const s = fresh();
    s.tasks = { ...s.tasks, status: 'partial', complete: false, counts: { open: null, overdue: null, in_progress: null, due_today: null }, items: [], due_today: [], overdue: [] };
    expect(todayCards(s, now).tasks.title).toBe('Unvollständig');
  });

  it('does not confuse a stale mailbox or incomplete Nightwatch with an all-clear', () => {
    const s = fresh();
    s.mail = { ...s.mail, status: 'stale', items: [] };
    s.nightwatch = { ...s.nightwatch, complete: false, open_incidents: null };
    const cards = todayCards(s, now);
    expect(cards.mail.title).toBe('Daten veraltet');
    expect(cards.nightwatch.title).toBe('Unvollständig');
  });

  it('allows known zero states only for complete and fresh evidence', () => {
    const s = fresh();
    s.calendar = { ...s.calendar, status: 'empty', count: 0, events: [], next_event: null };
    s.tasks = { ...s.tasks, status: 'empty', counts: { open: 0, in_progress: 0, due_today: 0, overdue: 0 }, items: [], due_today: [], overdue: [] };
    s.nightwatch = { ...s.nightwatch, status: 'empty', open_incidents: 0, incidents: [] };
    expect(todayCards(s, now).calendar.title).toBe('Keine Termine gemeldet');
    expect(todayCards(s, now).tasks.title).toBe('Keine offenen Aufgaben');
    expect(todayCards(s, now).nightwatch.title).toBe('Keine offenen Vorfälle gemeldet');
    expect(allSourcesVerified(s, now)).toBe(true);
  });

  it('expires a formerly green CORE observation after its TTL', () => {
    const s = fresh();
    s.calendar = { ...s.calendar, stale_after_seconds: 60 };
    expect(sourceTruth(s.calendar, now + 61_000)).toBe('stale');
    expect(sourceTruth({ ...s.calendar, as_of: 'bad-date' }, now)).toBe('unknown');
  });

  it('does not report a peaceful day when all sources are unknown', () => {
    const s = fresh();
    for (const area of ['mail', 'calendar', 'tasks', 'nightwatch'] as const) s[area].status = 'unavailable';
    expect(deriveAttention(s)).toHaveLength(0);
    expect(deriveHints(s).join(' ')).toContain('unbekannt');
    expect(deriveHints(s).join(' ')).not.toContain('Ruhiger Tag');
  });
});
