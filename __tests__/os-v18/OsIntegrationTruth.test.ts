import { todayCards, allSourcesVerified } from '@/features/today/data/truth';
import { appPrimaryAction, assessSourceConnection } from '@/lib/os-prototype/appConnectionEvidence';
import { sampleTodaySnapshot } from '@/features/today/data/sample';

const now = new Date('2026-10-11T10:00:00.000Z');
const connected = [{ id: 'mail', label: 'E-Mail', group: 'mail', status: 'connected' as const, detail: '' }];

describe('OS integration: App-Center and Heute share CORE truth boundaries', () => {
  it('refuses to call a disconnected connector live or its mailbox empty', () => {
    const source = assessSourceConnection('mail', { hasSession: true, isLoading: false, isError: false, isSuccess: true, connections: [] });
    expect(source).toBe('not_listed');
    expect(appPrimaryAction('post', source)).toBe('sources');

    const snapshot = sampleTodaySnapshot(now);
    snapshot.mail = { ...snapshot.mail, status: 'disconnected', complete: false, inbox_loaded: null, items: [] };
    expect(todayCards(snapshot, now.getTime()).mail.title).toBe('Nicht verbunden');
    expect(allSourcesVerified(snapshot, now.getTime())).toBe(false);
  });

  it('a connected connector is not evidence that the day snapshot was successfully read', () => {
    const source = assessSourceConnection('mail', { hasSession: true, isLoading: false, isError: false, isSuccess: true, connections: connected });
    expect(source).toBe('connected');
    expect(appPrimaryAction('post', source)).toBe('feature');

    const snapshot = sampleTodaySnapshot(now);
    snapshot.mail = { ...snapshot.mail, status: 'unavailable', complete: false, inbox_loaded: null, items: [] };
    expect(todayCards(snapshot, now.getTime()).mail.title).toBe('Nicht erreichbar');
    expect(allSourcesVerified(snapshot, now.getTime())).toBe(false);
  });

  it('fresh, explicitly complete empty evidence permits an honest zero state', () => {
    const snapshot = sampleTodaySnapshot(now);
    snapshot.calendar = { ...snapshot.calendar, status: 'empty', count: 0, events: [], next_event: null };
    expect(todayCards(snapshot, now.getTime()).calendar.title).toBe('Keine Termine gemeldet');
  });
});
