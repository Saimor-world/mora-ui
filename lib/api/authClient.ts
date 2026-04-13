// lib/api/authClient.ts
// Authentication and user profile functions extracted from coreClient.ts.

import type { OperationalState } from '@/lib/types/session';
import { coreGet, corePost } from './http';

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

export async function fetchUserProfile(): Promise<UserProfile> {
    return coreGet('/v3/auth/session');
}
