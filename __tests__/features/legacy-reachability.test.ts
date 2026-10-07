jest.mock('next/dynamic', () => () => { const Stub = () => null; return Stub; });

import { APP_IDS } from '@/lib/apps/AppLoader';
import { APP_REGISTRY } from '@/lib/apps/appRegistry';
import { LEGACY_APP_PLACEMENT, openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { FEATURE_MANIFESTS } from '@/features/registry';
import { LABS_GROUPS } from '@/features/labs';
import { usePaneStore } from '@/lib/store/paneStore';

describe('legacy / labs reachability', () => {
  it('every legacy app in APP_MAP has exactly one placement in the new IA', () => {
    const placed = LEGACY_APP_PLACEMENT.map((e) => e.appId);
    expect(new Set(placed).size).toBe(placed.length);
    expect([...placed].sort()).toEqual([...APP_IDS].sort());
  });

  it('Labs lists every placement group, so every old app is reachable from one screen', () => {
    const covered = new Set(LABS_GROUPS.flatMap((g) => g.placements));
    for (const e of LEGACY_APP_PLACEMENT) expect(covered.has(e.placement)).toBe(true);
  });

  it('feature manifests only reference existing legacy apps', () => {
    const ids = new Set(APP_REGISTRY.map((m) => m.id));
    for (const m of FEATURE_MANIFESTS) for (const a of m.legacyApps || []) expect(ids.has(a)).toBe(true);
  });

  it('old finance stays reachable as legacy and finance-v2 is owned by Finance', () => {
    expect(LEGACY_APP_PLACEMENT.find((e) => e.appId === 'finance')?.placement).toBe('legacy');
    expect(LEGACY_APP_PLACEMENT.find((e) => e.appId === 'finance-v2')?.placement).toBe('finance');
  });

  it('opens every legacy app as a classic pane', () => {
    for (const id of APP_IDS) {
      expect(openLegacyApp(id)).toBe(true);
      expect(usePaneStore.getState().panes.some((p) => p.id === `os-${id}` && p.type === id)).toBe(true);
    }
    expect(openLegacyApp('does-not-exist')).toBe(false);
  });
});
