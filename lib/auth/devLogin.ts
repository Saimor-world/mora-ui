/**
 * Whether the "Dev Master Login" convenience button may be shown/used.
 *
 * SECURITY: development builds only. The button bypasses normal auth by logging
 * in with credentials from env, so it must NEVER be reachable in production —
 * regardless of which NEXT_PUBLIC_* vars happen to be present in a build.
 * (NEXT_PUBLIC_* values are baked into the public client bundle, so they must
 * not carry real credentials in production anyway.)
 */
export function isDevLoginEnabled(): boolean {
    return process.env.NODE_ENV === 'development';
}

/** Dev-login credentials from env. Empty unless explicitly configured locally. */
export function getDevLoginCredentials(): { email: string; password: string } {
    return {
        email: process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL ?? '',
        password: process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD ?? '',
    };
}
