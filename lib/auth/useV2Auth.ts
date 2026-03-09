/**
 * useV2Auth - Modern Session-Based Auth Hook
 * ==========================================
 * Replaces JWT-based auth with clean session management.
 *
 * Usage:
 * const { user, login, logout, isLoading, error } = useV2Auth();
 */
import { useState, useEffect, useCallback } from "react";
import { v2Login, v2Logout, v2GetMe, v2ValidateAuth, type UserMe, V2Error } from "@/lib/api/v2Client";
import { useMoraStore } from "@/lib/store/moraState";

interface UseV2AuthReturn {
    user: UserMe | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

export function useV2Auth(): UseV2AuthReturn {
    const [user, setUser] = useState<UserMe | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const moraSetUser = useMoraStore((state) => state.setUser);
    const moraResetStore = useMoraStore((state) => state.resetStore);

    // Check session on mount
    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Quick validation first
            const validation = await v2ValidateAuth();
            if (!validation.valid) {
                setUser(null);
                setIsLoading(false);
                return;
            }

            // Get full user data
            const userData = await v2GetMe();
            setUser(userData);

            // NOTE: useV2Auth is a legacy auth path. The v2 session response does not carry
            // the operational contract fields (operational_state, setup_required, active_company_id,
            // active_company_name, company_count). Users authenticating via this path will have
            // these fields as undefined in the store. Prefer useAuthBootstrapper (v3 path) for
            // full operational state support.
            moraSetUser({
                id: userData.user_id,
                name: userData.email.split("@")[0],
                email: userData.email,
                role: userData.role as any,
                tenant_id: userData.tenant_id,
            });
        } catch (err) {
            setUser(null);
            // Don't show error for unauthenticated state
        } finally {
            setIsLoading(false);
        }
    };

    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await v2Login(email, password);

            if (response.success) {
                // Get full user data
                const userData = await v2GetMe();
                setUser(userData);

                // NOTE: useV2Auth is a legacy auth path. The v2 session response does not carry
                // the operational contract fields (operational_state, setup_required, active_company_id,
                // active_company_name, company_count). Users authenticating via this path will have
                // these fields as undefined in the store. Prefer useAuthBootstrapper (v3 path) for
                // full operational state support.
                moraSetUser({
                    id: userData.user_id,
                    name: userData.email.split("@")[0],
                    email: userData.email,
                    role: userData.role as any,
                    tenant_id: userData.tenant_id,
                });

                return true;
            }

            setError("Login failed");
            return false;
        } catch (err) {
            const message = err instanceof V2Error
                ? err.message
                : "Login failed - check your connection";
            setError(message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [moraSetUser]);

    const logout = useCallback(async () => {
        setIsLoading(true);

        try {
            await v2Logout();
        } catch {
            // Ignore logout errors
        }

        // Clear local state
        setUser(null);
        setError(null);
        moraResetStore();
        setIsLoading(false);
    }, [moraResetStore]);

    const refresh = useCallback(async () => {
        await checkSession();
    }, []);

    return {
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        logout,
        refresh,
    };
}

/**
 * Simple hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
    const [isAuth, setIsAuth] = useState(false);

    useEffect(() => {
        v2ValidateAuth().then((result) => {
            setIsAuth(result.valid);
        });
    }, []);

    return isAuth;
}
