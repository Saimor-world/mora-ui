import { useSessionStore } from '@/lib/store/sessionStore';
import { TENANT_HQ } from '@/lib/constants/tenants';
import type { User } from '@/lib/types/mora';

/** A session inside SAIMÔR's own organization (sees internal cards like Wache, Paddle, Labs). */
export function setSaimorSession(overrides: Partial<User> = {}) {
  useSessionStore.setState({ user: { id: 'user-hq', name: 'Marius', role: 'owner', tenant_id: TENANT_HQ, ...overrides } });
}

/** The owner of a customer company: never sees SAIMÔR-internal cards. */
export function setCustomerSession(overrides: Partial<User> = {}) {
  useSessionStore.setState({ user: { id: 'user-lea', name: 'Lea', role: 'owner', tenant_id: 'tenant-beispiel-lea', ...overrides } });
}

export function clearSession() {
  useSessionStore.setState({ user: null });
}
