// lib/api/http.ts
// Base HTTP infrastructure extracted from coreClient.ts.
// All domain modules import from here, not from coreClient.ts directly.

import type { OperationalState } from '@/lib/types/session';
export type { OperationalState };

/**
 * Core API base URL resolution.
 *
 * - Production usually sets NEXT_PUBLIC_SAIMOR_CORE_URL=https://api.saimor.world
 * - Dev usually proxies through Next.js rewrites at /api/core
 * - Some envs mistakenly include /v1; normalize that away to avoid /v1/v1.
 */
export function getCoreBaseUrl(): string {
    const raw = (process.env.NEXT_PUBLIC_SAIMOR_CORE_URL || process.env.NEXT_PUBLIC_CORE_API_URL || '').trim();
    const absoluteBase = raw.replace(/\/+$/, '');

    if (typeof window !== 'undefined') {
        // Prefer absolute URL if provided (prevents rewrite issues in production)
        if (absoluteBase && absoluteBase.startsWith('http')) {
            return absoluteBase;
        }
        // Fallback to proxy
        return '/api/core';
    }
    
    let base = absoluteBase.length > 0 ? absoluteBase : '/api/core';
    if (base.toLowerCase().endsWith('/v1')) base = base.slice(0, -3);
    return base.length > 0 ? base : '/api/core';
}

export const AUTH_COOKIE = "mora_auth_token";

export function isLocalhost(): boolean {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

export class CoreError extends Error {
    status: number;
    details?: any;
    constructor(message: string, status: number, details?: any) {
        super(message);
        this.status = status;
        this.details = details;
        this.name = 'CoreError';
    }
}

type CoreRequestOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
    skipAuth?: boolean;
    isOptional?: boolean; // If true, 401 errors won't clear tokens/logout
    headers?: Record<string, string>;
};

export function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = document.cookie.split('; ').find(row => row.startsWith(`${name}=`));
    if (!value) return null;
    const [, raw] = value.split('=');
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

export function isTokenExpired(token: string): boolean {
    // Opaque session tokens issued by Core login (sess_...) carry server-side TTL.
    // The server validates them on each request — no client-side expiry check needed.
    if (token.startsWith('sess_')) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        return Date.now() >= exp;
    } catch {
        return true; // If we can't parse as JWT, assume expired
    }
}

export async function coreRequest(path: string, options: CoreRequestOptions = {}): Promise<any> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (!options.skipAuth) {
        const token = readCookie(AUTH_COOKIE);
        // Only use devToken if NO cookie is present - gives priority to fresh sessions
        const devToken = !token && isLocalhost() ? localStorage.getItem('saimor_dev_token') : null;
        const finalToken = token || devToken;

        if (finalToken) {
            // Check if token is expired BEFORE making request
            if (isTokenExpired(finalToken)) {
                // Clear stale readable tokens, but still continue the request.
                // A valid HttpOnly core session may still exist server-side.
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('saimor_dev_token');
                    document.cookie = `${AUTH_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
                }
            } else {
                headers['Authorization'] = `Bearer ${finalToken}`;
            }
        }
    }

    let response: Response;
    try {
        const url = `${getCoreBaseUrl()}${path}`;
        response = await fetch(url, {
            method: options.method ?? 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            credentials: 'include',
        });
    } catch (err: any) {
        // Network error - return null silently
        return null;
    }

    // SILENT HANDLING: 401/403 = auth issue -> return null, caller uses fallback
    if (response.status === 401 || response.status === 403) {
        // Critical: If token was invalid AND not optional, clear it so next refresh doesn't retry bad token
        if (typeof window !== 'undefined' && !options.isOptional) {
            localStorage.removeItem('saimor_dev_token');
            document.cookie = `${AUTH_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
        }
        return null;
    }

    if (!response.ok) {
        // For optional requests, silently return null on any error (including 500)
        if (options.isOptional) {
            return null;
        }

        let message = `Core API Error: ${response.status} ${response.statusText}`;
        let details: any = null;
        try {
            const errorBody = await response.json();
            details = errorBody?.detail ?? errorBody ?? null;
            if (errorBody.detail) {
                if (Array.isArray(errorBody.detail)) {
                    message = errorBody.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
                } else {
                    if (typeof errorBody.detail === 'string') {
                        message = errorBody.detail;
                    } else {
                        message = errorBody.detail.message || JSON.stringify(errorBody.detail);
                    }
                }
            }
        } catch {
            // ignore parse errors
        }
        throw new CoreError(message, response.status, details);
    }

    if (response.status === 204) {
        return null;
    }
    try {
        const json = await response.json();
        // Unwrap v3 envelope { data: <payload>, meta: { api_version: "v3", ... } }
        // Guard: both keys must exist AND meta.api_version must be exactly "v3"
        // so v1 payloads that happen to contain a "data" key are not accidentally unwrapped.
        if (
            json !== null &&
            typeof json === 'object' &&
            !Array.isArray(json) &&
            'data' in json &&
            'meta' in json &&
            typeof json.meta === 'object' &&
            json.meta?.api_version === 'v3'
        ) {
            return json.data;
        }
        return json;
    } catch {
        return null;
    }
}

export async function coreGet(path: string, options: Omit<CoreRequestOptions, 'method' | 'body'> = {}): Promise<any> {
    return coreRequest(path, { ...options, method: 'GET' });
}

export async function corePost(path: string, body: any, options: Omit<CoreRequestOptions, 'method'> = {}): Promise<any> {
    return coreRequest(path, { ...options, method: 'POST', body });
}

export async function corePatch(path: string, body: any): Promise<any> {
    return coreRequest(path, { method: 'PATCH', body });
}

export async function corePut(path: string, body: any, options: Omit<CoreRequestOptions, 'method'> = {}): Promise<any> {
    return coreRequest(path, { ...options, method: 'PUT', body });
}

export async function coreDelete(path: string): Promise<void> {
    await coreRequest(path, { method: 'DELETE' });
}

export function normalizeList<T>(value: any, keys: string[] = []): T[] {
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === 'object') {
        for (const key of keys) {
            const candidate = (value as Record<string, any>)[key];
            if (Array.isArray(candidate)) return candidate as T[];
        }
        const items = (value as Record<string, any>).items;
        if (Array.isArray(items)) return items as T[];
        const data = (value as Record<string, any>).data;
        if (Array.isArray(data)) return data as T[];
    }
    return [];
}
