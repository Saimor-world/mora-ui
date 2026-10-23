import { isOwner } from '@/lib/auth/roles';

/**
 * Names, never email addresses (stylebook 22.10.2026, Bauauftrag part 9).
 *
 * An email address or its local part is not a name: "Guten Tag, lea.k@…" reads like a
 * system message. When no real name is stored, the owner is called "Inhaberin" and
 * everyone else "Mitglied".
 */
export function realName(name?: string | null, email?: string | null): string {
  const raw = String(name ?? '').trim();
  if (!raw || raw.includes('@')) return '';
  const local = String(email ?? '').split('@')[0]?.trim().toLowerCase();
  if (local && raw.toLowerCase() === local) return '';
  return raw;
}

export function displayName(user: { name?: string | null; email?: string | null; role?: string | null } | null | undefined): string {
  return realName(user?.name, user?.email) || (isOwner(user?.role) ? 'Inhaberin' : 'Mitglied');
}

/** First word of a real name, or '' when there is none (callers then greet without a name). */
export function firstName(user: { name?: string | null; email?: string | null } | null | undefined): string {
  return realName(user?.name, user?.email).split(/\s+/)[0] || '';
}
