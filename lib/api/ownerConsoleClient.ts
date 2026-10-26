import { coreGet, corePatch } from './http';

export type OwnerRole = 'system_owner' | 'owner' | 'admin' | 'manager' | 'member' | 'demo';
export interface ManagedUser {
  id: string; tenant_id: string; email: string; full_name: string | null;
  role: OwnerRole; is_active: boolean; email_verified: boolean;
  default_company_id: string | null; default_company_name: string | null;
  last_login_at: string | null;
}
export interface ManagedCompany { id: string; tenant_id: string; name: string; is_demo: boolean }
export type UserUpdate = Pick<ManagedUser, 'full_name' | 'role' | 'is_active'> & { default_company_id: string };

function requireArray<T>(value: unknown): T[] {
  if (!Array.isArray(value)) throw new Error('CORE hat keine bestätigte Liste geliefert.');
  return value as T[];
}

/** Uses the existing system-owner API. CORE, not this surface, grants permission. */
export const ownerConsoleClient = {
  users: async () => requireArray<ManagedUser>(await coreGet('/v3/system/owner/users?limit=250', { throwAuthErrors: true })),
  companies: async () => requireArray<ManagedCompany>(await coreGet('/v3/system/owner/companies?limit=200', { throwAuthErrors: true })),
  updateUser: async (id: string, changes: UserUpdate): Promise<ManagedUser> => {
    const result = await corePatch(`/v3/system/owner/users/${encodeURIComponent(id)}`, changes, { throwAuthErrors: true });
    if (!result || result.id !== id) throw new Error('Die Änderung wurde von CORE nicht bestätigt. Bitte neu laden.');
    return result;
  },
};
