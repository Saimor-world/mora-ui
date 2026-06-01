import { getAppUniverseGroups, summarizeHiddenSurfaces } from '@/lib/openflow/appUniverse';

describe('appUniverse', () => {
  it('groups existing apps into product-language constellations', () => {
    const groups = getAppUniverseGroups();

    expect(groups.map((group) => group.id)).toEqual([
      'work',
      'sources',
      'agents_flows',
      'people',
      'studio',
      'system',
    ]);
    expect(groups.find((group) => group.id === 'work')?.appIds).toEqual(
      expect.arrayContaining(['finder', 'notes', 'tasks', 'calendar'])
    );
    expect(groups.find((group) => group.id === 'sources')?.appIds).toEqual(
      expect.arrayContaining(['mail', 'integrations', 'meine-dateien'])
    );
    expect(groups.find((group) => group.id === 'agents_flows')?.appIds).toEqual(
      expect.arrayContaining(['chat', 'action-center', 'work-session'])
    );
  });

  it('summarizes hidden surfaces from the tunnel catalog as product decisions', () => {
    const summary = summarizeHiddenSurfaces();

    expect(summary.gatedCount).toBeGreaterThan(0);
    expect(summary.keepVisualIds).toEqual(expect.arrayContaining(['resonance-room', 'memory-sidebar']));
    expect(summary.productIssueIds).toEqual(expect.arrayContaining(['mora-memory-chat', 'feature-flags']));
  });
});
