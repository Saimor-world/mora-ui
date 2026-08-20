import { resolveCompanySelection } from '@/lib/auth/companySelection';

const companies = [
    { id: 'hq', name: 'Saimôr HQ', tenant_id: 'tenant-hq', is_demo: false },
    { id: 'coffee', name: 'Simple Coffee Group', tenant_id: 'tenant-hq', is_demo: true },
    { id: 'brandt', name: 'Brandt & Söhne', tenant_id: 'tenant-hq', is_demo: true },
];

describe('resolveCompanySelection', () => {
    it('replaces a stale demo cache with the real server-side HQ default', () => {
        expect(resolveCompanySelection({
            companies,
            activeCompanyId: 'brandt',
            storedCompanyId: 'brandt',
            profileCompanyId: 'hq',
            viewMode: 'workspace',
            tenantId: 'tenant-hq',
            role: 'system_owner',
        })).toBe('hq');
    });

    it('keeps an explicit demo selection while demo mode is active', () => {
        expect(resolveCompanySelection({
            companies,
            activeCompanyId: 'coffee',
            storedCompanyId: 'coffee',
            profileCompanyId: 'hq',
            viewMode: 'demo',
            tenantId: 'tenant-hq',
            role: 'system_owner',
        })).toBe('coffee');
    });
});
