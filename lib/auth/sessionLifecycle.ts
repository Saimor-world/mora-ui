import { deleteCookie, writeCookie } from '@/lib/auth/cookies';

// ═══════════════════════════════════════════════════════════════════════════
// Mora Erwachen — Consciousness-Gradient Session System
// ═══════════════════════════════════════════════════════════════════════════
//
// Sessions aren't binary. Mora's awareness of you decays over time:
//   sofort     (0–4h)   → instant auto-resume, zero friction
//   erwachen   (4–24h)  → Mora "wakes up", one-click continue
//   erkennung  (24–72h) → Mora tries to recognize you, may need password
//   neustart   (72h+)   → fresh start, but Mora remembers your name

export type SessionTier = 'sofort' | 'erwachen' | 'erkennung' | 'neustart';

const TIER_BOUNDARIES_MS = {
    sofort:    4  * 60 * 60 * 1000,   // 4 hours
    erwachen:  24 * 60 * 60 * 1000,   // 24 hours
    erkennung: 72 * 60 * 60 * 1000,   // 72 hours
};

/** @deprecated — use getSessionTier() instead */
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

/**
 * Determine which consciousness tier applies based on last activity timestamp.
 * No activity record → neustart (can't trust what we don't know).
 */
export function getSessionTier(lastActivity: string | null | undefined, now = Date.now()): SessionTier {
    if (!lastActivity) return 'neustart';
    const ts = Date.parse(lastActivity);
    if (Number.isNaN(ts)) return 'neustart';
    const age = now - ts;

    if (age <= TIER_BOUNDARIES_MS.sofort)    return 'sofort';
    if (age <= TIER_BOUNDARIES_MS.erwachen)  return 'erwachen';
    if (age <= TIER_BOUNDARIES_MS.erkennung) return 'erkennung';
    return 'neustart';
}

/**
 * Human-readable German absence text for the session UI.
 * "3 Stunden abwesend", "2 Tage abwesend", etc.
 */
export function formatAbsenceText(lastActivity: string | null | undefined): string {
    if (!lastActivity) return '';
    const ts = Date.parse(lastActivity);
    if (Number.isNaN(ts)) return '';
    const age = Date.now() - ts;
    const minutes = Math.floor(age / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} Tag${days !== 1 ? 'e' : ''} abwesend`;
    if (hours > 0) return `${hours} Stunde${hours !== 1 ? 'n' : ''} abwesend`;
    if (minutes > 5) return `${minutes} Minuten abwesend`;
    return 'Gerade aktiv';
}

/** @deprecated — use getSessionTier() instead */
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
