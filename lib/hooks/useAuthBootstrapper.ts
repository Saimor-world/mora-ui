import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { coreGet } from '@/lib/api/coreClient';
import { useMoraStore } from '@/lib/store/moraState';
import { useSession, signOut } from 'next-auth/react';
import { TENANT_DEMO, TENANT_HQ } from '@/lib/constants/tenants';
import { readCookie, writeCookie, deleteCookie } from '@/lib/auth/cookies';
import { authLogout } from '@/lib/api/coreClient';
import { clearClientSessionArtifacts, isSessionResumeStale } from '@/lib/auth/sessionLifecycle';

const BOOTSTRAP_HEALTH_ATTEMPTS = 4;
const BOOTSTRAP_HEALTH_RETRY_MS = 1200;

/**
 * useAuthBootstrapper
 * 
 * Ensures a valid session exists. If not authenticated, redirects to root.
 * Prevents redirect loops by checking current path.
 * Also loads initial data after auth is confirmed.
 */
export function useAuthBootstrapper() {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const [isBootstrapped, setIsBootstrapped] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        // Only run in browser
        if (typeof window === 'undefined') return;
        if (status === 'loading') return;

        const bootstrap = async () => {
            const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
            const probeCoreHealth = async () => {
                for (let attempt = 0; attempt < BOOTSTRAP_HEALTH_ATTEMPTS; attempt += 1) {
                    const health = await coreGet('/v3/health', { skipAuth: true, isOptional: true });
                    if (health) return health;
                    if (attempt < BOOTSTRAP_HEALTH_ATTEMPTS - 1) {
                        await wait(BOOTSTRAP_HEALTH_RETRY_MS);
                    }
                }
                return null;
            };

            // Purge legacy branding artifacts (e.g. "Foerderlogiken"/encoding artifacts) from localStorage.
            // Older builds could persist a stale "default workspace" name which causes cross-browser drift.
            try {
                const suspect = ["foerderlogiken", "fÃ¶rderlogiken", "förderlogiken"];
                const keys: string[] = [];
                for (let i = 0; i < localStorage.length; i += 1) {
                    const key = localStorage.key(i);
                    if (key) keys.push(key);
                }
                keys.forEach((key) => {
                    const value = localStorage.getItem(key);
                    const hay = `${key}::${value ?? ""}`.toLowerCase();
                    if (suspect.some((s) => hay.includes(s))) {
                        localStorage.removeItem(key);
                    }
                });
            } catch {
                // best-effort cleanup
            }
            const hasNextAuth = status === 'authenticated';
            const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
            const hasLegacyToken = isLocalhost ? localStorage.getItem('saimor_dev_token') : null;
            const lastActivity = localStorage.getItem('last_activity');
            // readCookie uses document.cookie — cannot detect HttpOnly cookies set by Core.
            // hasCoreSession is intentionally kept for non-HttpOnly fallback paths.
            const hasCoreSession = !!readCookie('mora_session');
            // mora_session from Core is HttpOnly — browser sends it automatically but JS
            // cannot read it. If we are on a protected route and NextAuth has settled to
            // unauthenticated, still probe /v3/auth/session so the cookie gets validated
            // server-side. This prevents HttpOnly sessions from being silently rejected.
            const mayHaveHttpOnlySession = status === 'unauthenticated' && pathname !== '/';

            if (isSessionResumeStale(lastActivity) && pathname !== '/') {
                await authLogout();
                clearClientSessionArtifacts();
                if (status === 'authenticated') {
                    await signOut({ redirect: false });
                }
                setAuthError('Session expired. Please log in again.');
                router.push('/');
                return;
            }

            if (hasNextAuth || hasLegacyToken || hasCoreSession || mayHaveHttpOnlySession) {
                try {
                    // SYNC: If NextAuth is authenticated, ensure the token is in localStorage for coreClient
                    const currentToken = hasNextAuth ? (session?.user as any)?.accessToken : hasLegacyToken;
                    if (hasNextAuth && currentToken) {
                        // Only use localStorage token as a dev fallback. Production should rely on cookies/session.
                        if (isLocalhost) localStorage.setItem('saimor_dev_token', currentToken);
                        localStorage.setItem('last_user_name', session.user?.email?.split('@')[0] || 'User');

                        // Bridge NextAuth -> Core API cookie.
                        // coreClient/filesClient/realtimeClient rely on mora_auth_token.
                        writeCookie('mora_auth_token', currentToken, 7);
                    }

                    // Check core availability first to avoid auth redirect loops.
                    // Use a short startup retry window so a cold probe does not flash an error screen.
                    const health = await probeCoreHealth();
                    if (!health) {
                        const apiUrl = process.env.NEXT_PUBLIC_SAIMOR_CORE_URL || process.env.NEXT_PUBLIC_CORE_API_URL || 'the API server';
                        setAuthError(`Core unavailable. Check connection to ${apiUrl}.`);
                        return;
                    }
                    setAuthError(null);

                    // Verify token validity with Backend.
                    // skipAuth: true — mora_session is HttpOnly and invisible to coreRequest's
                    // token guard. credentials:'include' (set inside coreRequest) forwards all
                    // cookies including HttpOnly, so the Core can validate via mora_session.
                    // Bearer token paths (NextAuth, legacy devToken) still work because those
                    // tokens are set as readable cookies (mora_auth_token) which are also forwarded.
                    const result = await coreGet('/v3/auth/session', { isOptional: true, skipAuth: true });

                    if (result && result.user_id) {
                        // Auth is valid! Now load data
                        const store = useMoraStore.getState();
                        const tenantId = result.tenant_id || (session?.user as any)?.tenant_id;

                        // Fix: Update user in store immediately so loadCompanies can use it
                        store.setUser({
                            id: result.user_id,
                            email: result.email || session?.user?.email || 'user@saimor.io',
                            name: result.name || result.email?.split('@')[0] || session?.user?.name || 'User',
                            role: result.role || 'member',
                            settings: result.settings || {},
                            tenant_id: tenantId,
                            operational_state: result.operational_state,
                            setup_required:    result.setup_required,
                            active_company_id: result.active_company_id,
                            active_company_name: result.active_company_name,
                            company_count:     result.company_count,
                            scope_source:      result.scope_source,
                        });

                        // Normalize view mode for demo tenants to avoid cross-browser drift
                        const storedViewMode = typeof window !== 'undefined'
                            ? localStorage.getItem('saimor_view_mode')
                            : null;
                        if (tenantId === TENANT_DEMO) {
                            if (storedViewMode !== 'demo' && storedViewMode !== 'workspace') {
                                store.setViewMode('workspace');
                            }
                        } else if (storedViewMode === 'demo') {
                            store.setViewMode('workspace');
                        }

                        // Update role and tenant from backend to ensure consistency
                        if (result.role) {
                            localStorage.setItem('saimor_role', result.role);
                        }
                        if (tenantId) {
                            localStorage.setItem('saimor_tenant', tenantId);
                        }

                        // Load companies in the background
                        await store.loadCompanies().catch(console.error);

                        // RESTORE ACTIVE COMPANY
                        const freshState = useMoraStore.getState();
                        const companies = freshState.companies;
                        const currentActive = freshState.activeCompanyId;
                        const viewMode = freshState.viewMode;
                        const role = result.role || freshState.user?.role || 'member';

                        const storedCompanyId = localStorage.getItem('last_company_id');
                        let storedWorkspaceName = localStorage.getItem('last_workspace');

                        // Purge legacy brand names (e.g. foerderlogiken) from cached workspace
                        if (storedWorkspaceName) {
                            const normalized = storedWorkspaceName.toLowerCase();
                            if (normalized.includes('foerderlogiken')) {
                                localStorage.removeItem('last_workspace');
                                storedWorkspaceName = null;
                            }
                        }

                        const isDemoTenant = tenantId === TENANT_DEMO;
                        const demoCompanies = companies.filter(c => c.is_demo);
                        const hqCompanies = companies.filter(c => c.tenant_id === TENANT_HQ);
                        const tenantCompanies = tenantId
                            ? companies.filter(c => c.tenant_id === tenantId)
                            : companies;

                        let allowedCompanies = companies;
                        if (isDemoTenant) {
                            allowedCompanies = companies;
                        } else if (viewMode === 'demo') {
                            allowedCompanies = demoCompanies;
                        } else if (viewMode === 'workspace') {
                            allowedCompanies = tenantCompanies;
                        } else if (viewMode === 'owner' && role !== 'system_owner') {
                            allowedCompanies = tenantCompanies;
                        }

                        let selectedCompanyId: string | null = null;
                        if (currentActive && allowedCompanies.some(c => c.id === currentActive)) {
                            selectedCompanyId = currentActive;
                        } else if (storedCompanyId && allowedCompanies.some(c => c.id === storedCompanyId)) {
                            selectedCompanyId = storedCompanyId;
                        } else if (storedWorkspaceName) {
                            const found = allowedCompanies.find(c => c.name === storedWorkspaceName);
                            if (found) {
                                selectedCompanyId = found.id;
                            }
                        } else if (allowedCompanies.length > 0) {
                            if (isDemoTenant) {
                                selectedCompanyId = viewMode === 'workspace'
                                    ? (hqCompanies[0]?.id || demoCompanies[0]?.id || allowedCompanies[0].id)
                                    : (demoCompanies[0]?.id || hqCompanies[0]?.id || allowedCompanies[0].id);
                            } else {
                                selectedCompanyId = allowedCompanies[0].id;
                            }
                        }

                        if (selectedCompanyId) {
                            store.setActiveCompany(selectedCompanyId);
                            localStorage.setItem('last_company_id', selectedCompanyId);
                            // IMPORTANT: Load tree for THIS company context
                            const safeCompanies = Array.isArray(companies) ? companies : [];
                            const selectedCompany = safeCompanies.find(c => c.id === selectedCompanyId);
                            const targetTenant = selectedCompany?.tenant_id || tenantId;
                            await Promise.all([
                                store.loadTree(targetTenant, selectedCompanyId).catch((err) => console.log('Tree load fail', err)),
                                store.loadDepartments(selectedCompanyId).catch((err) => console.log('Dept load fail', err))
                            ]);
                        } else {
                            // Fallback if no company selected
                            await store.loadTree(tenantId).catch(() => { });
                        }

                        setIsBootstrapped(true);
                        return;
                    }
                } catch (err) {
                    console.log('Token/Data loading failed', err);
                }

                // If we reach here, verification failed but core is reachable.
                // Clear session to prevent redirect loops and return to login.
                if (status === 'authenticated') {
                    setAuthError('Session expired. Please log in again.');
                    await signOut({ redirect: false });
                }

                if (pathname !== '/') {
                    localStorage.removeItem('saimor_dev_token');
                    localStorage.removeItem('mora_session');
                    deleteCookie('mora_session');
                    deleteCookie('mora_auth_token');
                    router.push('/');
                }
            } else if (status === 'unauthenticated' || status === 'loading') {
                // Wait for loading, but redirect if unauthenticated
                if (status === 'unauthenticated' && pathname !== '/') {
                    setAuthError('Authentication required');
                    router.push('/');
                }
            }
        };

        bootstrap();
    }, [router, pathname, status, session]);

    return { isBootstrapped, authError };
}

