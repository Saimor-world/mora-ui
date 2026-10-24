import { isSaimorInternal } from '@/lib/auth/organization';
describe('isSaimorInternal mit Demo-Firma', () => {
  it('HQ-Owner ist intern', () => expect(isSaimorInternal({ role: 'owner', tenant_id: 'tenant-saimor-hq' })).toBe(true));
  it('aktive is_demo-Firma schaltet intern ab', () =>
    expect(isSaimorInternal({ role: 'system_owner', tenant_id: 'tenant-saimor-hq' }, { activeCompanyIsDemo: true })).toBe(false));
});
