// lib/api/authClient.ts
// Authentication and user profile functions extracted from coreClient.ts.

import type { OperationalState } from '@/lib/types/session';
import { coreGet, corePost, isLocalhost, readCookie } from './http';

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
    // Session operational contract (Core e2fa9d1+)
    operational_state?: OperationalState;
    setup_required?: boolean;
    active_company_id?: string;
    active_company_name?: string;
    company_count?: number;
    scope_source?: string;
}

function hasLocalDemoFallbackSession() {
    return isLocalhost() && readCookie('mora_session') === 'local_demo_fallback';
}

function localDemoFallbackProfile(): UserProfile {
    const websiteEntryCompanyName = localWebsiteEntryCompanyName();
    const companyName = websiteEntryCompanyName || 'Local Preview Workspace';
    const isWebsiteEntryFallback = Boolean(websiteEntryCompanyName);
    return {
        user_id: 'local-demo-user',
        email: 'demo@saimor.io',
        full_name: 'Local Demo',
        role: 'demo',
        tenant_id: isWebsiteEntryFallback ? 'tenant-preview-local' : 'tenant-demo',
        scope: isWebsiteEntryFallback ? 'website-preview' : 'local-preview',
        demo_mode: !isWebsiteEntryFallback,
        operational_state: 'operational',
        setup_required: false,
        active_company_id: isWebsiteEntryFallback ? 'company-website-entry-local' : 'company-local-demo',
        active_company_name: companyName,
        company_count: 1,
        scope_source: isWebsiteEntryFallback ? 'website_entry_local_fallback' : 'local_demo_fallback',
    };
}

function localWebsiteEntryCompanyName() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem('saimor_website_entry_context');
        const parsed = raw ? JSON.parse(raw) : null;
        return typeof parsed?.companyName === 'string' && parsed.companyName.trim()
            ? parsed.companyName.trim()
            : null;
    } catch {
        return null;
    }
}

export async function fetchUserProfile(): Promise<UserProfile> {
    const profile = await coreGet('/v3/auth/session', { isOptional: true });
    if (profile) return profile as UserProfile;
    if (hasLocalDemoFallbackSession()) return localDemoFallbackProfile();
    return profile as UserProfile;
}
