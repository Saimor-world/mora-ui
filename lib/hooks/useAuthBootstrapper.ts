'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { bridgeNextAuthSignOut } from '@/lib/auth/nextAuthBridge';
import { useUserProfile } from '@/lib/queries/useUserProfile';
import { useCompanies } from '@/lib/queries/useCompanies';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useNavStore } from '@/lib/store/navStore';
import { TENANT_DEMO, TENANT_HQ } from '@/lib/constants/tenants';
import { readCookie, writeCookie, deleteCookie } from '@/lib/auth/cookies';
import { authLogout } from '@/lib/api/coreClient';
import { clearClientSessionArtifacts, getSessionTier } from '@/lib/auth/sessionLifecycle';
import { isLocalRuntimeHost, useRuntimeSession } from '@/lib/auth/runtimeSession';
import { WEBSITE_ENTRY_CONTEXT_STORAGE_KEY } from '@/lib/websiteEntryStorage';
import type { UserProfile } from '@/lib/api/authClient';
import type { User, UserRole } from '@/lib/types/mora';

// ---------------------------------------------------------------------------
// Type mapping: UserProfile (authClient) → User (sessionStore)
// ---------------------------------------------------------------------------

function mapProfileToUser(profile: UserProfile): User {
    return {
        id: profile.user_id,
        name: profile.full_name ?? profile.email ?? 'Unknown',
        email: profile.email,
        role: profile.role as UserRole,
        tenant_id: profile.tenant_id,
        operational_state: profile.operational_state,
        setup_required: profile.setup_required,
        active_company_id: profile.active_company_id,
        active_company_name: profile.active_company_name,
        company_count: profile.company_count,
        scope_source: profile.scope_source,
    };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useAuthBootstrapper
 *
 * Declarative session bootstrap — useUserProfile + useCompanies run
 * automatically via TanStack Query. Side effects (store population,
 * company selection, stale-session teardown) run reactively in useEffect.
 *
 * Stale session detection: if `last_activity` is 72 h+ old (neustart tier),
 * we tear down auth (authLogout + signOut) and redirect to root before any
 * data is loaded.
 */
export function useAuthBootstrapper() {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session, status } = useRuntimeSession();

    // Declarative query hooks — fire as soon as the component mounts.
    // The queries themselves handle re-fetch, caching, and error states.
    const { data: profile } = useUserProfile();
    const { data: companies } = useCompanies({ enabled: !!profile });

    const setUser = useSessionStore((s) => s.setUser);
    const setHasBooted = useSessionStore((s) => s.setHasBooted);
    const isLoggingOut = useSessionStore((s) => s.isLoggingOut);
    const setIsLoggingOut = useSessionStore((s) => s.setIsLoggingOut);
    const hasBooted = useSessionStore((s) => s.hasBooted);

    const setActiveCompany = useNavStore((s) => s.setActiveCompany);
    const setViewMode = useNavStore((s) => s.setViewMode);
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const viewMode = useNavStore((s) => s.viewMode);

    const sessionUser = session?.user as any;
    const sessionEmail = sessionUser?.email || null;
    const sessionAccessToken = sessionUser?.accessToken || null;
    const sessionTenantId = sessionUser?.tenant_id || null;

    // ---------------------------------------------------------------------------
    // Stale session + token bridge effect
    // Runs whenever NextAuth status settles; does not depend on profile data.
    // ---------------------------------------------------------------------------
    const staleTeardownRan = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (status === 'loading') return;

        // --- Stale session check (neustart tier → 72h+) ---
        if (!staleTeardownRan.current) {
            const lastActivity = localStorage.getItem('last_activity');
            // Website entry preview: no last_activity exists for unauthenticated scan visitors.
            // getSessionTier(null) returns 'neustart', which would fire clearClientSessionArtifacts()
            // and wipe saimor_website_entry_context — skip teardown for these visitors entirely.
            const hasWebsiteEntryForTeardown = !!localStorage.getItem(WEBSITE_ENTRY_CONTEXT_STORAGE_KEY);
            if (!hasWebsiteEntryForTeardown && getSessionTier(lastActivity) === 'neustart' && pathname !== '/') {
                staleTeardownRan.current = true;
                const teardown: Promise<unknown>[] = [authLogout()];
                const shouldSignOutNextAuth =
                    status === 'authenticated' &&
                    (!isLocalRuntimeHost() || !readCookie('mora_session'));
                if (shouldSignOutNextAuth) {
                    teardown.push(bridgeNextAuthSignOut({ redirect: false }));
                }
                Promise.allSettled(teardown).then(() => {
                    clearClientSessionArtifacts();
                    router.replace('/');
                });
                return;
            }
        }

        // --- NextAuth token bridge (dev / localhost only) ---
        if (status === 'authenticated' && sessionAccessToken) {
            const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
            if (isLocalhost) localStorage.setItem('saimor_dev_token', sessionAccessToken);
            if (sessionEmail) {
                localStorage.setItem('last_user_name', sessionEmail.split('@')[0] || 'User');
                localStorage.setItem('last_user_email', sessionEmail);
            }
            writeCookie('mora_auth_token', sessionAccessToken, 7);
        }

        // --- Unauthenticated redirect ---
        if (status === 'unauthenticated' && pathname !== '/') {
            const hasCoreSession = !!readCookie('mora_session');
            const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
            const hasLegacyToken = isLocalhost ? localStorage.getItem('saimor_dev_token') : null;
            // Website entry preview: when a scan context is stored, allow unauthenticated
            // access. The OS renders in isolated preview mode — no real CORE data is loaded.
            const hasWebsiteEntry = !!localStorage.getItem(WEBSITE_ENTRY_CONTEXT_STORAGE_KEY);
            if (!hasCoreSession && !hasLegacyToken && !hasWebsiteEntry) {
                deleteCookie('mora_session');
                deleteCookie('mora_auth_token');
                router.push('/');
            }
        }
    }, [status, pathname, sessionAccessToken, sessionEmail, router]);

    // ---------------------------------------------------------------------------
    // Profile → sessionStore effect
    // Runs whenever the profile query resolves or changes.
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!profile) return;

        const user = mapProfileToUser(profile);
        setUser(user);

        // Persist role + tenant to localStorage for components that read them directly
        if (profile.role) localStorage.setItem('saimor_role', profile.role);
        if (profile.tenant_id) localStorage.setItem('saimor_tenant', profile.tenant_id);

        // Resolve and set active mode in navStore
        let determinedMode: 'real_hq' | 'public_playground' | 'personal_demo' | 'private_preview' = 'real_hq';
        if (profile.tenant_id === 'tenant-public-playground') {
            determinedMode = 'public_playground';
        } else if (profile.tenant_id?.startsWith('tenant-demo-')) {
            determinedMode = 'personal_demo';
        } else if (profile.tenant_id?.startsWith('tenant-preview-')) {
            determinedMode = 'private_preview';
        } else {
            determinedMode = 'real_hq';
        }
        useNavStore.getState().setActiveMode(determinedMode);

        // Normalize view mode for demo tenants
        const tenantId = profile.tenant_id || sessionTenantId;
        const isLocalhost =
            typeof window !== 'undefined' &&
            ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
        const storedViewMode =
            typeof window !== 'undefined' ? localStorage.getItem('saimor_view_mode') : null;

        if (tenantId === TENANT_DEMO) {
            if (storedViewMode !== 'demo' && storedViewMode !== 'workspace') {
                setViewMode('workspace');
            }
        } else if (storedViewMode === 'demo') {
            setViewMode('workspace');
        }
        if (isLocalhost && storedViewMode !== 'workspace') {
            setViewMode('workspace');
        }

        setHasBooted(true);
    }, [profile, setUser, setHasBooted, setViewMode, sessionTenantId]);

    // ---------------------------------------------------------------------------
    // Website entry preview boot
    // When there is no profile (unauthenticated preview), boot the OS so it does
    // not stay in the loading state indefinitely.
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (status === 'loading') return;
        if (profile) return; // Normal boot path handles this
        if (!localStorage.getItem(WEBSITE_ENTRY_CONTEXT_STORAGE_KEY)) return;
        setHasBooted(true);
    }, [status, profile, setHasBooted]);

    // ---------------------------------------------------------------------------
    // Company selection effect
    // Runs when both profile AND companies have resolved.
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!profile || !companies || companies.length === 0) return;

        // Only run company selection on first load — once a company is active, we don't re-select.
        if (activeCompanyId) return;

        const tenantId = profile.tenant_id || sessionTenantId;
        const isLocalhost =
            typeof window !== 'undefined' &&
            ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
        const role = profile.role;

        const storedCompanyId =
            typeof window !== 'undefined' ? localStorage.getItem('last_company_id') : null;
        let storedWorkspaceName =
            typeof window !== 'undefined' ? localStorage.getItem('last_workspace') : null;

        // Purge legacy brand names from cached workspace
        if (storedWorkspaceName) {
            const normalized = storedWorkspaceName.toLowerCase();
            if (normalized.includes('foerderlogiken') || normalized.includes('förderlogiken')) {
                localStorage.removeItem('last_workspace');
                storedWorkspaceName = null;
            }
        }

        const isDemoTenantFlag = tenantId === TENANT_DEMO;
        const demoCompanies = companies.filter((c) => c.is_demo);
        const hqCompanies = companies.filter((c) => c.tenant_id === TENANT_HQ);
        const tenantCompanies = tenantId
            ? companies.filter((c) => c.tenant_id === tenantId)
            : companies;

        let allowedCompanies = companies;
        if (isLocalhost) {
            allowedCompanies = companies.filter((c) => !c.is_demo);
            if (!allowedCompanies.length) allowedCompanies = companies;
        } else if (isDemoTenantFlag) {
            allowedCompanies = companies;
        } else if (viewMode === 'demo') {
            allowedCompanies = demoCompanies;
        } else if (viewMode === 'workspace') {
            allowedCompanies = tenantCompanies;
        } else if (viewMode === 'owner' && role !== 'system_owner') {
            allowedCompanies = tenantCompanies;
        }

        const pickAllowedCompanyId = (...candidates: Array<string | null | undefined>) => {
            for (const candidate of candidates) {
                if (candidate && allowedCompanies.some((c) => c.id === candidate)) {
                    return candidate;
                }
            }
            return null;
        };

        let selectedCompanyId: string | null = null;
        if (activeCompanyId && allowedCompanies.some((c) => c.id === activeCompanyId)) {
            selectedCompanyId = activeCompanyId;
        } else if (storedCompanyId && allowedCompanies.some((c) => c.id === storedCompanyId)) {
            selectedCompanyId = storedCompanyId;
        } else if (storedWorkspaceName) {
            const found = allowedCompanies.find((c) => c.name === storedWorkspaceName);
            if (found) selectedCompanyId = found.id;
        } else if (allowedCompanies.length > 0) {
            if (isDemoTenantFlag) {
                selectedCompanyId =
                    viewMode === 'workspace'
                        ? (hqCompanies[0]?.id || demoCompanies[0]?.id || allowedCompanies[0].id)
                        : (demoCompanies[0]?.id || hqCompanies[0]?.id || allowedCompanies[0].id);
            } else if (isLocalhost) {
                selectedCompanyId =
                    pickAllowedCompanyId(
                        sessionUser?.active_company_id,
                        profile.active_company_id,
                        hqCompanies[0]?.id,
                    ) ||
                    allowedCompanies.find((c) => !c.is_demo)?.id ||
                    allowedCompanies[0].id;
            } else {
                selectedCompanyId = allowedCompanies[0].id;
            }
        }

        if (selectedCompanyId) {
            setActiveCompany(selectedCompanyId);
        }
        // viewMode is intentionally included: switching to demo/owner mode should re-select the
        // appropriate company for that context.
    }, [profile, companies, sessionTenantId, viewMode, activeCompanyId, setActiveCompany, sessionUser?.active_company_id]);

    // ---------------------------------------------------------------------------
    // Logout detection effect
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (status === 'loading') return;
        if (isLoggingOut && status === 'unauthenticated') {
            setIsLoggingOut(false);
        }
    }, [status, isLoggingOut, setIsLoggingOut]);

    return {
        isBootstrapped: hasBooted,
        authError: null as string | null,
    };
}
