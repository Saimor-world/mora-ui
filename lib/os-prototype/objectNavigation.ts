'use client';
import { objectNavigationScope, useOsShellStore, type ObjectTarget } from './shellStore';

/** A navigation command only: resolve the ID from the current readable data, never from this store. */
export function openOsObject(kind: ObjectTarget['kind'], id: string, navigate: (featureId: string) => void, originScope: string, surface: ObjectTarget['surface'] = 'today'): boolean {
  if (typeof id !== 'string' || !id.trim() || originScope !== objectNavigationScope()) return false;
  if (kind === 'task' && surface !== 'today') return false;
  useOsShellStore.getState().setObjectTarget({ kind, id, scope: originScope, surface });
  navigate(surface);
  return true;
}
