'use client';
import type { Star } from '@/lib/lea/finder';
import { useOsShellStore } from './shellStore';
import { openLegacyApp } from './legacyApps';
import { openNodeLike, type OpenableNodeLike } from '@/lib/utils/contentOpen';
import { usePaneStore } from '@/lib/store/paneStore';

export function sourceStationId(provider: string): string {
  const id = provider.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ({ googlemail: 'mail', imap: 'mail', nextcloudoauth: 'nextcloud' } as Record<string, string>)[id] ?? id;
}

/** A source marker opens source management, never the unrelated legacy design HUD. */
export function openSourceSettings(navigate?: (id: string) => void, source?: { label: string; sources: string[] }) {
  const store = useOsShellStore.getState();
  store.setSettingsSection('sources');
  store.setSettingsSource(source ?? null);
  if (navigate) navigate('settings');
  else store.setActiveFeature('settings');
}

/** All CORE node kinds are readable documents, including generic/link/imported nodes. */
export function openNodeStar(star: Star, companyId: string | null): boolean {
  if (star.kind === 'task' || star.kind === 'event') return false;
  const node = star.raw as OpenableNodeLike | undefined;
  if (star.kind === 'link' && node?.url) {
    try { if (!['http:', 'https:'].includes(new URL(node.url).protocol)) return false; } catch { return false; }
    openNodeLike({ ...node, id: star.id, type: 'link' }, usePaneStore.getState().openPane, { companyId: companyId ?? undefined });
    return true;
  }
  return openLegacyApp('document', { nodeId: star.id, ...(companyId ? { companyId } : {}) });
}
