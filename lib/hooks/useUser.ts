import { useCallback, useEffect, useState } from 'react';
import { fetchUserProfile, type UserProfile } from '@/lib/api/coreClient';
import { useAccountStore, type AccountRole } from '@/lib/auth/useAccount';

export type UserRole = AccountRole;

export function useUser() {
    const { currentAccount, loadFromCookie, logout, setFromProfile } = useAccountStore();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [role, setRole] = useState<UserRole>('demo');
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshProfile = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = loadFromCookie();
            if (!token) {
                setProfile(null);
                setRole('demo');
                setTenantId(null);
                return;
            }
            const backendProfile = await fetchUserProfile();
            setProfile(backendProfile);
            setRole(backendProfile.role);
            setTenantId(backendProfile.tenant_id);
            setFromProfile(backendProfile, token);
        } catch (err: any) {
            setProfile(null);
            setRole('demo');
            setTenantId(null);
            if (err?.status === 401 || err?.status === 404) {
                logout();
            }
            setError(err?.message || 'Failed to load user');
        } finally {
            setIsLoading(false);
        }
    }, [loadFromCookie, logout, setFromProfile]);

    useEffect(() => {
        refreshProfile();
    }, [refreshProfile]);

    useEffect(() => {
        if (currentAccount) {
            setRole(currentAccount.role);
            setTenantId(currentAccount.tenantId);
        }
    }, [currentAccount]);

    return {
        user: profile,
        role,
        tenantId,
        demoMode: role === 'demo',
        isLoading,
        error,
        isAdmin: role === 'admin' || role === 'owner' || role === 'manager',
        refreshProfile,
        logout,
    };
}
