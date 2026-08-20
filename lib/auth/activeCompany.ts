import type { CoreCompany } from '@/lib/types/core';
export type ActiveMode = 'real_hq' | 'public_playground' | 'personal_demo' | 'private_preview' | 'visitor';
export type CompanyViewMode = 'owner' | 'demo' | 'workspace';
export function isExplicitDemoContext(viewMode: CompanyViewMode, activeMode: ActiveMode): boolean {
    return viewMode === 'demo'
        || activeMode === 'public_playground'
        || activeMode === 'personal_demo'
        || activeMode === 'visitor';
}
/**
 * Resolve the company that a surface is allowed to render.
 * Real HQ never falls through to a demo company while a real company exists.
 * Explicit demo surfaces only use demo companies when the catalog provides one.
 */
export function resolveVisibleCompany(
    companies: CoreCompany[],
    activeCompanyId: string | null | undefined,
    viewMode: CompanyViewMode,
    activeMode: ActiveMode,
): CoreCompany | null {
    if (companies.length === 0) return null;
    const explicitDemo = isExplicitDemoContext(viewMode, activeMode);
    const realCompanies = companies.filter((company) => !company.is_demo);
    const demoCompanies = companies.filter((company) => company.is_demo);
    const eligible = explicitDemo
        ? (demoCompanies.length > 0 ? demoCompanies : companies)
        : (realCompanies.length > 0 ? realCompanies : companies);
    return eligible.find((company) => company.id === activeCompanyId) ?? eligible[0] ?? null;
}