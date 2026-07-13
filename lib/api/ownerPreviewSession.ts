import 'server-only';

import type { NextRequest } from 'next/server';

import { fetchCoreUpstream } from '@/lib/api/coreReachability';

export const OWNER_RETURN_COOKIE = 'mora_owner_return_session';
export const OWNER_RETURN_MAX_AGE = 60 * 60 * 24;

export function readCurrentSessionToken(request: NextRequest): string | null {
    return request.cookies.get('mora_session')?.value
        || request.cookies.get('mora_auth_token')?.value
        || null;
}

export async function isSystemOwnerSession(token: string | null): Promise<boolean> {
    if (!token) return false;

    try {
        const response = await fetchCoreUpstream('/v3/auth/me', {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
        });
        if (!response.ok) return false;
        const payload = await response.json().catch(() => null);
        return payload?.role === 'system_owner' && payload?.is_system_owner === true;
    } catch {
        return false;
    }
}
