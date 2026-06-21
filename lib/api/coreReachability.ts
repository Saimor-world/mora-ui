/**
 * Server-side CORE reachability helpers for Next.js route handlers.
 *
 * Auth proxies should prefer the internal Docker URL (SAIMOR_CORE_URL) and
 * fall back to the public API URL when internal routing fails.
 */

const DEFAULT_PUBLIC_CORE_URL = 'https://api.saimor.world';

function trimTrailingSlashes(value: string): string {
    return value.replace(/\/+$/, '');
}

export function getPublicCoreBaseUrl(): string {
    const raw =
        process.env.NEXT_PUBLIC_SAIMOR_CORE_URL ||
        process.env.NEXT_PUBLIC_CORE_API_URL ||
        DEFAULT_PUBLIC_CORE_URL;
    return trimTrailingSlashes(raw.trim() || DEFAULT_PUBLIC_CORE_URL);
}

export function getInternalCoreBaseUrl(): string | null {
    const raw = (process.env.SAIMOR_CORE_URL || '').trim();
    if (raw) return trimTrailingSlashes(raw);
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        return null;
    }
    return 'http://core:8081';
}

export function getCoreUpstreamBaseUrls(): string[] {
    const bases = [getInternalCoreBaseUrl(), getPublicCoreBaseUrl()].filter(Boolean) as string[];
    return [...new Set(bases)];
}

export function isLocalDevRuntime(): boolean {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        return true;
    }

    const internal = (process.env.SAIMOR_CORE_URL || '').trim().toLowerCase();
    return (
        internal.includes('localhost') ||
        internal.includes('127.0.0.1') ||
        internal.includes('[::1]')
    );
}

export function coreUnreachableUserMessage(): string {
    if (isLocalDevRuntime()) {
        return 'Mora Core ist lokal nicht erreichbar. Starte CORE auf dem konfigurierten Port (SAIMOR_CORE_URL) oder nutze den lokalen Demo-Zugang.';
    }
    return 'Dienst vorübergehend nicht erreichbar. Bitte in wenigen Minuten erneut versuchen.';
}

export async function probePublicCoreHealth(timeoutMs = 4000): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(`${getPublicCoreBaseUrl()}/v3/health`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
            signal: controller.signal,
        });
        return response.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

export async function fetchCoreUpstream(path: string, init: RequestInit): Promise<Response> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const bases = getCoreUpstreamBaseUrls();
    let lastError: unknown;

    for (const base of bases) {
        try {
            return await fetch(`${base}${normalizedPath}`, init);
        } catch (error) {
            lastError = error;
            console.warn(`[coreReachability] ${base}${normalizedPath} failed:`, error);
        }
    }

    throw lastError ?? new Error('Core upstream unreachable');
}
