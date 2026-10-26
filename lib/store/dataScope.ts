'use client';
import { useSyncExternalStore } from 'react';
import { useSessionStore } from './sessionStore';
import { useNavStore } from './navStore';
import { useDemoStore, resolveScopeCompany } from '@/lib/demo/demoStore';

/** Cache/conversation identity, never a permission grant. CORE validates every request. */
function scopeIdentity(): string {
  const session = useSessionStore.getState();
  const demo = useDemoStore.getState();
  const company = resolveScopeCompany(demo.demoCompanyId, session.user?.active_company_id ?? null, useNavStore.getState().activeCompanyId);
  return JSON.stringify([session.sessionGeneration, session.user?.tenant_id ?? null, session.user?.id ?? null, session.user?.role ?? null, demo.selectionGeneration, company]);
}

// Resolve lazily: API modules are also imported during server boot, before a
// browser session has been established. Imports alone must not read identity.
let identity: string | undefined;
let generation = 0;
const observeScope = () => {
  const next = scopeIdentity();
  if (next !== identity) { identity = next; generation += 1; }
};
// Observe transitions even if a view is temporarily unmounted: real-company
// A→B→A must not accept A's first delayed response either.
useSessionStore.subscribe(observeScope);
useDemoStore.subscribe(observeScope);
useNavStore.subscribe(observeScope);

export function getDataScopeKey(): string {
  observeScope();
  return JSON.stringify([generation, identity]);
}

export function subscribeDataScope(onChange: () => void) {
  const unsub = [useSessionStore.subscribe(onChange), useDemoStore.subscribe(onChange), useNavStore.subscribe(onChange)];
  return () => unsub.forEach((fn) => fn());
}

export function useDataScopeKey(): string {
  return useSyncExternalStore(subscribeDataScope, getDataScopeKey, () => 'server');
}
