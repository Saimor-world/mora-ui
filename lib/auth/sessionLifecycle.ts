import { deleteCookie, writeCookie } from '@/lib/auth/cookies';

export const SESSION_RESUME_MAX_AGE_MS = 12 * 60 * 60 * 1000;

const EXPLICIT_SESSION_KEYS = [
    'saimor_dev_token',
    'saimor_mode',
    'saimor_role',
    'saimor_tenant',
    'last_company_id',
    'last_workspace',
    'last_activity',
    'user_name',
    'onboarding_complete',
    'mora_session',
    'last_user_name',
    'saimor_auth_token',
    'mora_auth_token',
];

export function isSessionResumeStale(lastActivity: string | null | undefined, now = Date.now()): boolean {
    if (!lastActivity) return false;
    const ts = Date.parse(lastActivity);
    if (Number.isNaN(ts)) return false;
    return now - ts > SESSION_RESUME_MAX_AGE_MS;
}

export function touchSessionActivity(timestamp = new Date()): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('last_activity', timestamp.toISOString());
}

export function clearClientSessionArtifacts(): void {
    if (typeof window === 'undefined') return;

    EXPLICIT_SESSION_KEYS.forEach((key) => localStorage.removeItem(key));

    Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('saimor_') || key.startsWith('mora_') || key.startsWith('last_')) {
            localStorage.removeItem(key);
        }
    });

    writeCookie('saimor_auth', '', -1);
    writeCookie('mora_auth_token', '', -1);
    deleteCookie('mora_session');
    deleteCookie('mora_auth_token');
}
