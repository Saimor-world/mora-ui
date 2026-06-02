import { formatActionTitle, formatActionMessage, formatTime, formatBatchTime, formatRole } from '@/lib/actionCenter/format';

const evt = (payload: any, extra: any = {}): any => ({ action_id: 'a', status: 'done', intent: '', payload, timestamp: '2026-06-01T08:30:00.000Z', ...extra });

describe('formatActionTitle', () => {
  it('maps a known intent to its German label', () => {
    expect(formatActionTitle(evt({ tool_name: 'create_folder' }))).toBe('Ordner erstellen');
  });
  it('humanizes an unknown intent by replacing underscores', () => {
    expect(formatActionTitle(evt({}, { intent: 'some_weird_intent' }))).toBe('some weird intent');
  });
});

describe('formatActionMessage', () => {
  it('prefers an explicit error', () => {
    expect(formatActionMessage(evt({}, { error: 'kaputt' }))).toBe('kaputt');
  });
  it('falls back to the message', () => {
    expect(formatActionMessage(evt({}, { message: 'fertig' }))).toBe('fertig');
  });
  it('uses the status label when nothing else is present', () => {
    expect(formatActionMessage(evt({}, { status: 'rejected' }))).toBe('Verworfen');
  });
});

describe('formatTime', () => {
  it('formats a valid timestamp as HH:MM', () => {
    expect(formatTime('2026-06-01T08:05:00.000Z')).toMatch(/^\d{2}:\d{2}$/);
  });
  it('returns a placeholder for missing/invalid input', () => {
    expect(formatTime(undefined)).toBe('--:--');
    expect(formatTime('not-a-date')).toBe('--:--');
  });
});

describe('formatBatchTime', () => {
  it('labels today with "Heute"', () => {
    const now = new Date().toISOString();
    expect(formatBatchTime(now)).toMatch(/^Heute · \d{2}:\d{2}$/);
  });
  it('returns a placeholder for an invalid date', () => {
    expect(formatBatchTime('nope')).toBe('--');
  });
});

describe('formatRole', () => {
  it('maps system_owner to system, defaults missing, passes through others', () => {
    expect(formatRole('system_owner')).toBe('system');
    expect(formatRole(null)).toBe('unbekannt');
    expect(formatRole('manager')).toBe('manager');
  });
});
