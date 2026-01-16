import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { coreGet } from '@/lib/api/coreClient';
import { useMoraStore } from '@/lib/store/moraState';

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
    const [isBootstrapped, setIsBootstrapped] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        // Only run in browser
        if (typeof window === 'undefined') return;

        const bootstrap = async () => {
            // Check if we already have a token in cookies or localStorage
            const hasCookie = document.cookie.includes('saimor_auth');
            const hasLocalToken = localStorage.getItem('saimor_dev_token');
            const hasSession = localStorage.getItem('mora_session');

            if (hasCookie || hasLocalToken) {
                try {
                    // Verify token validity
                    const result = await coreGet('/v1/auth/me', { isOptional: true });
                    if (result && result.user_id) {
                        // Auth is valid! Now load data
                        const store = useMoraStore.getState();

                        // Fix: Update user in store immediately so loadCompanies can use it
                        store.setUser({
                            id: result.user_id,
                            email: result.email || localStorage.getItem('last_user_name') + '@saimor.io', // Fallback if backend doesn't send email
                            name: result.name || result.email?.split('@')[0] || localStorage.getItem('last_user_name') || 'User',
                            role: result.role || localStorage.getItem('saimor_role') || 'member',
                            settings: result.settings || {}
                        });

                        // Update role from backend to ensure consistency
                        if (result.role) {
                            localStorage.setItem('saimor_role', result.role);
                        }

                        // Load companies in the background
                        await store.loadCompanies().catch(console.error);

                        // RESTORE ACTIVE COMPANY
                        // FIX: Re-fetch state after async loadCompanies to avoid race condition
                        const freshState = useMoraStore.getState();
                        const companies = freshState.companies;
                        const currentActive = freshState.activeCompanyId;
                        const storedCompany = localStorage.getItem('last_workspace');

                        console.log('[AuthBoot] Companies loaded:', companies.length, companies.map(c => c.name));

                        // 1. If we have active ID and it's in list -> good
                        // 2. If not, try to find by stored name
                        let selectedCompanyId: string | null = null;

                        if (!currentActive && storedCompany) {
                            const found = companies.find(c => c.name === storedCompany);
                            if (found) {
                                selectedCompanyId = found.id;
                                console.log('[AuthBoot] Restored active company:', found.name);
                            }
                        }

                        if (!selectedCompanyId && !currentActive && companies.length > 0) {
                            // 3. Fallback: Prefer demo company for demo users, else first company
                            const userRole = result.role || localStorage.getItem('saimor_role');
                            const demoCompany = companies.find(c => c.is_demo === true);

                            if (userRole === 'demo' && demoCompany) {
                                selectedCompanyId = demoCompany.id;
                                console.log('[AuthBoot] Demo user -> using demo company:', demoCompany.name);
                            } else {
                                // For owners/members, prefer non-demo company if available
                                const ownCompany = companies.find(c => !c.is_demo);
                                selectedCompanyId = ownCompany?.id || companies[0].id;
                                console.log('[AuthBoot] Owner/Member -> using company:', ownCompany?.name || companies[0].name);
                            }
                        }

                        // Set active company and load departments
                        if (selectedCompanyId) {
                            store.setActiveCompany(selectedCompanyId);
                            // Load departments for the selected company
                            await store.loadDepartments(selectedCompanyId).catch(err => {
                                console.warn('[AuthBoot] Failed to load departments:', err);
                            });
                        }

                        setIsBootstrapped(true);
                        return;
                    }
                } catch (err) {
                    console.log('Token validation failed', err);
                    // Continue to clear token below
                }

                // Token was invalid - clear it
                localStorage.removeItem('saimor_dev_token');
                localStorage.removeItem('mora_session');
                localStorage.removeItem('saimor_role');
                localStorage.removeItem('saimor_mode');
                document.cookie = 'saimor_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
            }

            // NO TOKEN OR INVALID TOKEN
            // Only redirect if NOT already on welcome page
            if (pathname !== '/') {
                setAuthError('Authentication required');
                router.push('/');
            } else {
                // Already on welcome page, just set error
                setAuthError('Not authenticated');
            }
        };

        bootstrap();
    }, [router, pathname]);

    return { isBootstrapped, authError };
}

