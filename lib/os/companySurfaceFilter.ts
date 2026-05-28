import { TENANT_DEMO, TENANT_HQ } from '@/lib/constants/tenants';
import type { CoreCompany } from '@/lib/types/core';
import type { SurfaceProfileSnapshot } from '@/lib/os/surfaceProfile';

interface FilterCompaniesForSurfaceOptions {
    surfaceProfile: SurfaceProfileSnapshot;
    role?: string | null;
    tenantId?: string | null;
    viewMode?: 'owner' | 'workspace' | 'demo' | string;
    websiteEntryActive?: boolean;
    displayCompany?: CoreCompany | null;
}

export function getPrimaryOperationalCompany(companies: CoreCompany[]): CoreCompany | null {
    return companies.find((company) => !company.is_demo && company.tenant_id === TENANT_HQ)
        || companies.find((company) => !company.is_demo)
        || companies[0]
        || null;
}

export function filterCompaniesForSurface(
    companies: CoreCompany[],
    {
        surfaceProfile,
        role,
        tenantId,
        viewMode,
        websiteEntryActive = false,
        displayCompany = null,
    }: FilterCompaniesForSurfaceOptions,
): CoreCompany[] {
    if (!Array.isArray(companies) || companies.length === 0) return [];

    if (websiteEntryActive) {
        const primary = displayCompany || getPrimaryOperationalCompany(companies);
        return primary ? [primary] : [];
    }

    if (surfaceProfile.isLocalTruthSurface || surfaceProfile.isHqSurface) {
        const primary = getPrimaryOperationalCompany(companies);
        return primary ? [primary] : [];
    }

    if (surfaceProfile.isPublicDemoSurface) {
        const demoCompanies = companies.filter((company) => company.is_demo);
        return demoCompanies.length ? demoCompanies : companies;
    }

    if (tenantId === TENANT_DEMO) {
        return companies.filter((company) => company.is_demo || company.tenant_id === TENANT_HQ);
    }

    if (viewMode === 'demo') {
        return companies.filter((company) => company.is_demo);
    }

    if (viewMode === 'workspace') {
        if (role === 'system_owner') {
            return companies.filter((company) => !company.is_demo);
        }
        return tenantId ? companies.filter((company) => company.tenant_id === tenantId) : companies;
    }

    if (role === 'system_owner') return companies;
    return tenantId ? companies.filter((company) => company.tenant_id === tenantId) : companies;
}
