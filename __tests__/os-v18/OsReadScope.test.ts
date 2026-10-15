import { osReadKey } from '@/lib/os-prototype/readScope';

describe('MÔRA source read cache partition', () => {
  const base = { tenantId: 'tenant-a', userId: 'user-a', sessionGeneration: 1, companyId: 'company-a' };
  it('partitions cached mail/briefing data by principal, login epoch and company selection', () => {
    const a = osReadKey('mail-summary', base);
    expect(a).not.toEqual(osReadKey('mail-summary', { ...base, userId: 'user-b' }));
    expect(a).not.toEqual(osReadKey('mail-summary', { ...base, tenantId: 'tenant-b' }));
    expect(a).not.toEqual(osReadKey('mail-summary', { ...base, sessionGeneration: 2 }));
    expect(a).not.toEqual(osReadKey('mail-summary', { ...base, companyId: 'company-b' }));
    expect(a).not.toEqual(osReadKey('briefing', base));
  });
  it('never shares an authenticated result with an anonymous cache key', () => {
    expect(osReadKey('briefing', { ...base, tenantId: null, userId: null })).not.toEqual(
      osReadKey('briefing', base),
    );
  });
});
