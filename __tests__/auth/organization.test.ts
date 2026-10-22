import { isSaimorInternal } from '@/lib/auth/organization';
import { TENANT_DEMO, TENANT_HQ } from '@/lib/constants/tenants';

describe('isSaimorInternal', () => {
  it('is true for the platform owner and for anyone in the SAIMÔR tenant', () => {
    expect(isSaimorInternal({ role: 'system_owner', tenant_id: 'tenant-lea' })).toBe(true);
    expect(isSaimorInternal({ role: 'member', tenant_id: TENANT_HQ })).toBe(true);
  });

  it('is false for a customer company, even for its owner', () => {
    expect(isSaimorInternal({ role: 'owner', tenant_id: 'tenant-nagelstudio-lea' })).toBe(false);
    expect(isSaimorInternal({ role: 'admin', tenant_id: 'tenant-nagelstudio-lea' })).toBe(false);
  });

  it('is false for the demo tenant and fails closed without a session', () => {
    expect(isSaimorInternal({ role: 'owner', tenant_id: TENANT_DEMO })).toBe(false);
    expect(isSaimorInternal(null)).toBe(false);
    expect(isSaimorInternal({ role: 'owner' })).toBe(false);
  });

  it('never decides by a name', () => {
    expect(isSaimorInternal({ role: 'owner', tenant_id: 'SAIMÔR HQ' } as never)).toBe(false);
  });
});
