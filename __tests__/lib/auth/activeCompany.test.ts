import { resolveVisibleCompany } from '@/lib/auth/activeCompany';
import type { CoreCompany } from '@/lib/types/core';
const company = (id: string, isDemo: boolean): CoreCompany => ({
    id,
    tenant_id: 'tenant-1',
    owner_id: 'owner-1',
    name: id,
    slug: id,
    is_demo: isDemo,
});
const companies = [company('saimor-hq', false), company('simple-coffee', true)];
describe('resolveVisibleCompany', () => {
    it('rejects a stale demo selection in real HQ', () => {
        expect(resolveVisibleCompany(companies, 'simple-coffee', 'workspace', 'real_hq')?.id)
            .toBe('saimor-hq');
    });
    it('keeps a real selected company in real HQ', () => {
        expect(resolveVisibleCompany(companies, 'saimor-hq', 'workspace', 'real_hq')?.id)
            .toBe('saimor-hq');
    });
    it('uses demo data only in an explicit demo context', () => {
        expect(resolveVisibleCompany(companies, 'saimor-hq', 'demo', 'personal_demo')?.id)
            .toBe('simple-coffee');
    });
    it('returns null when the server exposes no companies', () => {
        expect(resolveVisibleCompany([], 'stale', 'workspace', 'real_hq')).toBeNull();
    });
});