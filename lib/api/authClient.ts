// lib/api/authClient.ts
// Authentication and user profile functions extracted from coreClient.ts.

import type { OperationalState } from '@/lib/types/session';
import { AUTH_COOKIE, coreGet, corePost, isLocalDemoFallback, isLocalhost, readCookie } from './http';

type AccountRole = 'admin' | 'owner' | 'system_owner' | 'manager' | 'member' | 'demo';

export interface AuthPayload {
    email: string;
    password: string;
    role?: AccountRole;
    tenant_id?: string;
}

export interface AuthSession {
    user_id: string;
    email?: string;
    role: AccountRole;
    tenant_id: string;
    token?: string | null;
    auth_type?: string;
    success?: boolean;
    scope?: string;
    message?: string;
}

export async function authRegister(payload: AuthPayload): Promise<AuthSession> {
    return corePost('/v3/auth/register', payload, { skipAuth: true });
}

export async function authLogin(payload: AuthPayload): Promise<AuthSession> {
    try {
        return await corePost('/v3/auth/login', payload, { skipAuth: true });
    } catch (err: any) {
        // REAL SYSTEM: No dev-token bypass.
        // If login fails, throw error to UI.
        throw err;
    }
}

export async function authLogout(): Promise<{ success?: boolean; message?: string } | null> {
    if (typeof window !== 'undefined') {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
                credentials: 'include',
            });
            return await response.json().catch(() => null);
        } catch {
            return null;
        }
    }

    return corePost('/v3/auth/logout', {}, { skipAuth: true, isOptional: true });
}

export interface SSOLoginResponse {
    token: string;
    user_id: string;
    role: string;
    tenant_id: string;
    email: string;
    scope: string;
}

export async function ssoLogin(token: string): Promise<SSOLoginResponse | null> {
    return corePost('/v1/auth/sso', { token }, { skipAuth: true, isOptional: true });
}

export interface UserProfile {
    user_id: string;
    email?: string;
    full_name?: string;
    role: AccountRole;
    tenant_id: string;
    scope?: string;
    demo_mode?: boolean;
    is_demo?: boolean;
    // Session operational contract (Core e2fa9d1+)
    operational_state?: OperationalState;
    setup_required?: boolean;
    active_company_id?: string;
    active_company_name?: string;
    company_count?: number;
    scope_source?: string;
}

function hasLocalDemoFallbackSession() {
    return isLocalDemoFallback() || (isLocalhost() && readCookie('mora_session') === 'local_demo_fallback');
}

function localDemoFallbackProfile(): UserProfile {
    return {
        user_id: 'local-demo-user',
        email: 'marius@saimor.world',
        full_name: 'Marius',
        role: 'owner',
        tenant_id: 'tenant-demo',
        scope: 'local-preview',
        demo_mode: false,
        operational_state: 'operational',
        setup_required: false,
        active_company_id: 'company-local-demo',
        active_company_name: 'SAIMÔR HQ',
        company_count: 1,
        scope_source: 'local_demo_fallback',
    };
}

export async function fetchUserProfile(): Promise<UserProfile> {
    if (hasLocalDemoFallbackSession()) return localDemoFallbackProfile();
    const authCookie = readCookie(AUTH_COOKIE);
    const hasRealSessionCookie = Boolean(authCookie && authCookie !== 'local_demo_fallback');
    const profile = await coreGet('/v3/auth/session', {
        isOptional: true,
        timeoutMs: hasRealSessionCookie ? 10000 : 3000,
    });
    if (profile) return profile as UserProfile;
    if (hasLocalDemoFallbackSession() || (!hasRealSessionCookie && isLocalhost() && process.env.NODE_ENV !== 'test')) {
        return localDemoFallbackProfile();
    }
    return profile as UserProfile;
}
