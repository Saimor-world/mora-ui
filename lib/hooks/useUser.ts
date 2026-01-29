import { useCallback, useEffect, useState, useMemo } from 'react';
import { fetchUserProfile, type UserProfile } from '@/lib/api/coreClient';
import { useAccountStore, type AccountRole } from '@/lib/auth/useAccount';

export type UserRole = AccountRole;

// Module-level flag to prevent duplicate loads
let _hasLoaded = false;

// Helper to get token from any source
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    // Try all possible token locations
    const devToken = localStorage.getItem('saimor_dev_token');
    if (devToken) return devToken;
    // Try cookies
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
        const [name, value] = cookie.split('=');
        if (name === 'mora_auth_token' || name === 'saimor_auth') {
            try { return decodeURIComponent(value); } catch { return value; }
        }
    }
    return null;
}

export function useUser() {
    const { currentAccount, logout, setFromProfile } = useAccountStore();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshProfile = useCallback(async (force = false) => {
        // Prevent duplicate loads unless forced
        if (_hasLoaded && !force) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const token = getAuthToken();
            if (!token) {
                setProfile(null);
                setIsLoading(false);
                return;
            }
            _hasLoaded = true;
            const backendProfile = await fetchUserProfile();
            setProfile(backendProfile);
            setFromProfile(backendProfile, token);
        } catch (err: any) {
            setProfile(null);
            _hasLoaded = false;
            if (err?.status === 401 || err?.status === 404) {
                logout();
            }
            setError(err?.message || 'Failed to load user');
        } finally {
            setIsLoading(false);
        }
    }, [logout, setFromProfile]);

    useEffect(() => {
        refreshProfile();
    }, [refreshProfile]);

    // Derive role and tenantId from profile (priority) or currentAccount (fallback)
    const role: UserRole = useMemo(() => {
        if (profile?.role) return profile.role;
        if (currentAccount?.role) return currentAccount.role;
        return 'demo';
    }, [profile, currentAccount]);

    const tenantId: string | null = useMemo(() => {
        if (profile?.tenant_id) return profile.tenant_id;
        if (currentAccount?.tenantId) return currentAccount.tenantId;
        return null;
    }, [profile, currentAccount]);

    return {
        user: profile,
        role,
        tenantId,
        demoMode: role === 'demo',
        isLoading,
        error,
        isAdmin: role === 'admin' || role === 'owner' || role === 'system_owner' || role === 'manager',
        refreshProfile,
        logout,
    };
}

// Reset on logout (call from Dock)
export function resetUserState() {
    _hasLoaded = false;
}
