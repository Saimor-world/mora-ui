import { TENANT_HQ, isSystemOwner } from '@/lib/constants/tenants';
import type { User } from '@/lib/types/mora';

/**
 * Klartext für Kundenfirmen (Kundentest 21.10.): interne SAIMÔR-Begriffe wie
 * „Wache“, „Werkstatt“, „Horizont“ sagen einem Café nichts. Nur das HQ
 * (Tenant HQ / System-Owner) sieht die internen Namen. Override für Tests:
 * localStorage `saimor-vocab` = "intern" | "klar".
 */
export function usesInternalVocabulary(user: Pick<User, 'tenant_id' | 'role'> | null | undefined): boolean {
  if (typeof window !== 'undefined') {
    try {
      const o = window.localStorage.getItem('saimor-vocab');
      if (o === 'intern') return true;
      if (o === 'klar') return false;
    } catch { /* ignore */ }
  }
  if (!user) return false;
  const scope = (user as { scope?: string | null }).scope ?? null;
  return user.tenant_id === TENANT_HQ || isSystemOwner(String(user.role ?? ''), scope);
}

const PLAIN: Record<string, string> = {
  Wache: 'Hinweise',
  Nightwatch: 'Hinweise',
  Werkstatt: 'Aufgaben',
  Horizont: 'Planung',
  Universe: 'Übersicht',
};

/** Begriff in der Sprache des Betriebs. */
export function businessTerm(term: string, internal: boolean): string {
  return internal ? term : PLAIN[term] ?? term;
}

/** Erster echter Vorname, nie eine Mail-Adresse. */
export function firstNameOf(user: Pick<User, 'name' | 'email'> | null | undefined): string {
  const raw = String(user?.name || '').trim();
  if (!raw || raw.includes('@')) return '';
  const first = raw.split(/\s+/)[0] || '';
  const local = user?.email?.split('@')[0]?.toLowerCase();
  return local && first.toLowerCase() === local ? '' : first;
}
