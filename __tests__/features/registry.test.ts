import { FEATURE_MANIFESTS, DEFAULT_FEATURE_ID, getFeature, isFeatureVisible, navigationModel, resolveFeatureId, visibleFeatures } from '@/features/registry';

const owner = { role: 'owner' as const, flags: new Set<string>() };

describe('feature manifest registry', () => {
  it('has unique ids and complete manifests', () => {
    const ids = FEATURE_MANIFESTS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of FEATURE_MANIFESTS) {
      expect(m.title).toBeTruthy();
      expect(m.description).toBeTruthy();
      expect(typeof m.load).toBe('function');
      expect(m.icon).toBeTruthy();
      expect(m.mora.contextLabel).toBeTruthy();
      expect(m.mora.suggestions.length).toBeGreaterThan(0);
    }
  });

  it('exposes exactly six calm primary surfaces in order, plus Labs/System as secondary', () => {
    const nav = navigationModel(owner);
    expect(nav.primary.map((m) => m.title)).toEqual(['Heute', 'MÔRA', 'Finance', 'Post', 'Wissen', 'Einstellungen']);
    expect(nav.secondary.map((m) => m.id)).toEqual(['universe', 'labs']);
  });

  it('keeps MÔRA in the mobile bar and moves settings/labs into "Mehr"', () => {
    const nav = navigationModel(owner);
    expect(nav.mobileBar.map((m) => m.id)).toEqual(['today', 'mora', 'finance', 'post', 'knowledge']);
    expect(nav.mobileMore.map((m) => m.id)).toEqual(['settings', 'universe', 'labs']);
  });

  it('hides permission-restricted features for roles without access', () => {
    const finance = getFeature('finance')!;
    expect(isFeatureVisible(finance, { role: 'member', flags: new Set() })).toBe(false);
    expect(isFeatureVisible(finance, { role: null, flags: new Set() })).toBe(false);
    expect(isFeatureVisible(finance, owner)).toBe(true);
  });

  it('local preview shows every surface (reads still fail closed)', () => {
    expect(visibleFeatures({ role: null, flags: new Set(), preview: true }).map((m) => m.id)).toContain('finance');
  });

  it('gates flagged manifests behind NEXT_PUBLIC_OS_FLAGS', () => {
    const flagged = { ...getFeature('labs')!, id: 'x', flag: 'atmosphere-universe' };
    expect(isFeatureVisible(flagged, owner)).toBe(false);
    expect(isFeatureVisible(flagged, { ...owner, flags: new Set(['atmosphere-universe']) })).toBe(true);
  });

  it('resolves unknown or forbidden deep links to Heute', () => {
    expect(resolveFeatureId('nope', owner)).toBe(DEFAULT_FEATURE_ID);
    expect(resolveFeatureId('finance', { role: 'member', flags: new Set() })).toBe('today');
    expect(resolveFeatureId('post', owner)).toBe('post');
  });
});
