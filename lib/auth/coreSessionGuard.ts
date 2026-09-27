import { fetchCoreUpstream } from '@/lib/api/coreReachability';

/**
 * Server-side session check against CORE (edge-safe, used by middleware).
 *
 * Session cookies are opaque CORE session ids, so only CORE can say whether
 * one is valid. Cookie presence alone proves nothing: anyone can send
 * `mora_auth_token=x`.
 */

export const CORE_SESSION_COOKIES = ['mora_session', 'mora_auth_token'] as const;

const DEV_NEXTAUTH_SECRET = 'dev_secret_key_change_me_in_prod';

interface CookieReader {
    get(name: string): { value: string } | undefined;
}

export function hasCoreSessionCookie(cookies: CookieReader): boolean {
    return CORE_SESSION_COOKIES.some((name) => !!cookies.get(name)?.value);
}

export async function hasValidCoreSession(cookies: CookieReader, timeoutMs = 3000): Promise<boolean> {
    const cookieHeader = CORE_SESSION_COOKIES
        .map((name) => {
            const value = cookies.get(name)?.value;
            return value ? `${name}=${value}` : null;
        })
        .filter(Boolean)
        .join('; ');
    if (!cookieHeader) return false;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchCoreUpstream('/v3/auth/validate', {
            method: 'GET',
            headers: { cookie: cookieHeader, accept: 'application/json' },
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

/**
 * Secret for verifying NextAuth JWTs. The well-known dev fallback is only
 * accepted outside production; in production a missing NEXTAUTH_SECRET means
 * NextAuth tokens are not trusted at all (a token signed with a public default
 * secret can be forged by anyone).
 */
export function nextAuthVerificationSecret(): string | null {
    const isProduction = process.env.NODE_ENV === 'production';
    const configured = (process.env.NEXTAUTH_SECRET || '').trim();
    if (configured && !(isProduction && configured === DEV_NEXTAUTH_SECRET)) return configured;
    return isProduction ? null : DEV_NEXTAUTH_SECRET;
}
