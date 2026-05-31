import type { HomeView } from '@/lib/queries/useHomeView';

/**
 * Single source of truth for the displayed company name on Home.
 *
 * The backend view wins. websiteEntryContext is only the visitor-mode
 * bridge until Dossier migration. There is deliberately NO fallback to
 * `user.active_company_name` or a hardcoded 'Organisation' string —
 * if nothing is known, the name is empty and the UI renders nothing.
 */
export function resolveCompanyName(
    homeView: Pick<HomeView, 'company'> | undefined,
    websiteEntryContext: { companyName?: string } | null | undefined,
): string {
    return (
        homeView?.company?.name
        || websiteEntryContext?.companyName
        || ''
    );
}
