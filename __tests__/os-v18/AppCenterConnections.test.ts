import { appPrimaryAction, assessSourceConnection, CONNECTION_EVIDENCE_LABEL, SOURCE_DEPENDENT_APPS } from '@/lib/os-prototype/appConnectionEvidence';
import type { SourceEntry } from '@/lib/os-prototype/useSources';

const entry = (group: string, status: string) =>
  ({ id: group, label: group, group, status, detail: '' }) as SourceEntry;

const base = { hasSession: true, isLoading: false, isError: false, isSuccess: true };

describe('new App-Center connector evidence', () => {
  it('sends unverified mail and calendar into Settings › Quellen, not straight to Post', () => {
    expect(appPrimaryAction('post', 'not_listed')).toBe('sources');
    expect(appPrimaryAction('post', 'available')).toBe('sources');
    expect(appPrimaryAction('post', 'unavailable')).toBe('sources');
    expect(appPrimaryAction('post', 'no_session')).toBe('sources');
    expect(appPrimaryAction('post', 'connected')).toBe('feature');
    expect(appPrimaryAction(undefined, null)).toBe('legacy');
    expect(appPrimaryAction('finance', null)).toBe('feature');
  });

  it('only makes claims about source groups that have explicit CORE contracts', () => {
    expect(SOURCE_DEPENDENT_APPS.mail).toBe('mail');
    expect(SOURCE_DEPENDENT_APPS.calendar).toBe('calendar');
    expect(SOURCE_DEPENDENT_APPS.finance).toBeUndefined();
    expect(SOURCE_DEPENDENT_APPS.nightwatch).toBeUndefined();
  });

  it('never interprets no session, network errors or a missing entry as connected', () => {
    expect(assessSourceConnection('mail', { ...base, hasSession: false, connections: [entry('mail', 'connected')] })).toBe('no_session');
    expect(assessSourceConnection('mail', { ...base, isLoading: true, isSuccess: false, connections: [] })).toBe('checking');
    expect(assessSourceConnection('mail', { ...base, isError: true, isSuccess: false, connections: [] })).toBe('unavailable');
    expect(assessSourceConnection('mail', { ...base, connections: [] })).toBe('not_listed');
    expect(CONNECTION_EVIDENCE_LABEL.not_listed).toBe('Quelle von CORE nicht gemeldet');
  });

  it('only shows connected when the matching source group is confirmed connected by CORE', () => {
    expect(assessSourceConnection('mail', { ...base, connections: [entry('calendar', 'connected')] })).toBe('not_listed');
    expect(assessSourceConnection('mail', { ...base, connections: [entry('mail', 'available')] })).toBe('available');
    expect(assessSourceConnection('mail', { ...base, connections: [entry('mail', 'setup_required')] })).toBe('setup_required');
    expect(assessSourceConnection('mail', { ...base, connections: [entry('mail', 'connected')] })).toBe('connected');
  });
});
