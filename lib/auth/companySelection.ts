export interface CompanySelectionCandidate {
    id: string;
    name?: string;
    tenant_id?: string;
    is_demo?: boolean;
}

interface ResolveCompanySelectionInput {
    companies: CompanySelectionCandidate[];
    activeCompanyId?: string | null;
    storedCompanyId?: string | null;
    storedWorkspaceName?: string | null;
    profileCompanyId?: string | null;
    sessionCompanyId?: string | null;
    viewMode: 'owner' | 'demo' | 'workspace';
    tenantId?: string | null;
    isLocalhost?: boolean;
    isDemoTenant?: boolean;
    role?: string | null;
}

/**
 * Resolve the visible company without allowing a stale demo selection to mask
 * a real server-side HQ default. Explicit demo mode still keeps demo context.
 */
export function resolveCompanySelection(input: ResolveCompanySelectionInput): string | null {
    const {
        companies,
        activeCompanyId,
        storedCompanyId,
        storedWorkspaceName,
        profileCompanyId,
        sessionCompanyId,
        viewMode,
        tenantId,
        isLocalhost = false,
        isDemoTenant = false,
        role,
    } = input;

    const demoCompanies = companies.filter((company) => company.is_demo);
    const tenantCompanies = tenantId
        ? companies.filter((company) => company.tenant_id === tenantId)
        : companies;
    const realTenantCompanies = tenantCompanies.filter((company) => !company.is_demo);

    let allowedCompanies = companies;
    if (isLocalhost) {
        allowedCompanies = realTenantCompanies.length ? realTenantCompanies : companies.filter((company) => !company.is_demo);
        if (!allowedCompanies.length) allowedCompanies = companies;
    } else if (isDemoTenant) {
        allowedCompanies = companies;
    } else if (viewMode === 'demo') {
        allowedCompanies = demoCompanies;
    } else if (viewMode === 'workspace' || (viewMode === 'owner' && role !== 'system_owner')) {
        allowedCompanies = tenantCompanies;
    }

    const firstAllowed = (...ids: Array<string | null | undefined>) =>
        ids.find((id): id is string => Boolean(id && allowedCompanies.some((company) => company.id === id))) ?? null;

    // In a real workspace the server-side default is authoritative. This is
    // what prevents an old localStorage demo id from leaking into Saimôr HQ.
    if (!isDemoTenant && viewMode !== 'demo') {
        const realDefault = firstAllowed(profileCompanyId, sessionCompanyId);
        if (realDefault && !allowedCompanies.find((company) => company.id === realDefault)?.is_demo) {
            return realDefault;
        }
    }

    const cachedSelection = firstAllowed(activeCompanyId, storedCompanyId);
    if (cachedSelection) return cachedSelection;

    if (storedWorkspaceName) {
        const workspaceMatch = allowedCompanies.find((company) => company.name === storedWorkspaceName);
        if (workspaceMatch) return workspaceMatch.id;
    }

    return firstAllowed(
        profileCompanyId,
        sessionCompanyId,
        realTenantCompanies[0]?.id,
        demoCompanies[0]?.id,
        allowedCompanies[0]?.id,
    );
}
