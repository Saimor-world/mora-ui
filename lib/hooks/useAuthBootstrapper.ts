import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { coreGet } from '@/lib/api/coreClient';
import { useMoraStore } from '@/lib/store/moraState';
import { useSession, signOut } from 'next-auth/react';

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
            // Purge legacy branding artifacts (e.g. "Förderlogiken") from localStorage
            const legacyPattern = /(foerderlogiken|forderlogiken)/i;
            const keys = [];
            for (let i = 0; i < localStorage.length; i += 1) {
                const key = localStorage.key(i);
                if (key) keys.push(key);
            }
            keys.forEach((key) => {
                const value = localStorage.getItem(key);
                if (value && legacyPattern.test(value)) {
                    localStorage.removeItem(key);
                }
            });
            const hasNextAuth = status === 'authenticated';
            const hasLegacyToken = localStorage.getItem('saimor_dev_token');

            if (hasNextAuth || hasLegacyToken) {
                try {
                    // SYNC: If NextAuth is authenticated, ensure the token is in localStorage for coreClient
                    const currentToken = hasNextAuth ? (session?.user as any)?.accessToken : hasLegacyToken;
                    if (hasNextAuth && currentToken) {
                        localStorage.setItem('saimor_dev_token', currentToken);
                        localStorage.setItem('last_user_name', session.user?.email?.split('@')[0] || 'User');
                    }

                    // Check core availability first to avoid auth redirect loops
                    const health = await coreGet('/v1/health', { skipAuth: true, isOptional: true });
                    if (!health) {
                        setAuthError('Core unavailable. Start the core API on port 8081.');
                        return;
                    }

                    // Verify token validity with Backend
                    const result = await coreGet('/v1/auth/me', { isOptional: true });

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
                            tenant_id: tenantId
                        });

                        // Normalize view mode for demo tenants to avoid cross-browser drift
                        const storedViewMode = typeof window !== 'undefined'
                            ? localStorage.getItem('saimor_view_mode')
                            : null;
                        if (tenantId === 'tenant-demo') {
                            if (storedViewMode !== 'demo' && storedViewMode !== 'workspace') {
                                store.setViewMode('demo');
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
                        if (storedWorkspaceName) {
                            const normalized = storedWorkspaceName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                            if (normalized.includes('foerderlogiken') || normalized.includes('forderlogiken')) {
                                localStorage.removeItem('last_workspace');
                                storedWorkspaceName = null;
                            }
                        }

                        const isDemoTenant = tenantId === 'tenant-demo';
                        const demoCompanies = companies.filter(c => c.is_demo);
                        const hqCompanies = companies.filter(c => c.tenant_id === 'tenant-saimor-hq');
                        const tenantCompanies = tenantId
                            ? companies.filter(c => c.tenant_id === tenantId)
                            : companies;

                        let allowedCompanies = companies;
                        if (viewMode === 'demo') {
                            allowedCompanies = demoCompanies;
                        } else if (viewMode === 'workspace') {
                            allowedCompanies = isDemoTenant ? hqCompanies : tenantCompanies;
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
                            selectedCompanyId = allowedCompanies[0].id;
                        }

                        if (selectedCompanyId) {
                            store.setActiveCompany(selectedCompanyId);
                            localStorage.setItem('last_company_id', selectedCompanyId);
                            // IMPORTANT: Load tree for THIS company context
                            const selectedCompany = companies.find(c => c.id === selectedCompanyId);
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

