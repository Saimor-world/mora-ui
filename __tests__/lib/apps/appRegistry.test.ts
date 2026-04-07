import { APP_REGISTRY, getAppManifest } from '@/lib/apps/appRegistry';
import type { AppManifest } from '@/lib/apps/types';

describe('appRegistry', () => {
  it('contains exactly 15 app entries', () => {
    expect(APP_REGISTRY).toHaveLength(15);
  });

  it('every app has required fields', () => {
    for (const app of APP_REGISTRY) {
      expect(app.id).toBeTruthy();
      expect(app.name).toBeTruthy();
      expect(app.description).toBeTruthy();
      expect(app.icon).toBeTruthy();
      expect(app.color).toBeTruthy();
      expect(app.category).toBeTruthy();
      expect(app.defaultSize.width).toBeGreaterThan(0);
      expect(app.defaultSize.height).toBeGreaterThan(0);
    }
  });

  it('all app ids are unique', () => {
    const ids = APP_REGISTRY.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getAppManifest returns correct manifest by id', () => {
    const finder = getAppManifest('finder');
    expect(finder?.name).toBe('Finder');
    expect(finder?.category).toBe('core');
  });

  it('getAppManifest returns undefined for unknown id', () => {
    expect(getAppManifest('nonexistent')).toBeUndefined();
  });

  it('contains the 3 new apps with isNew flag', () => {
    const newApps = APP_REGISTRY.filter(a => a.isNew);
    const newIds = newApps.map(a => a.id);
    expect(newIds).toContain('tasks');
    expect(newIds).toContain('timeline');
    expect(newIds).toContain('canvas');
  });

  it('apps requiring roles have at least one valid role', () => {
    const gated = APP_REGISTRY.filter(a => a.requiresRole);
    for (const app of gated) {
      expect(app.requiresRole!.length).toBeGreaterThan(0);
    }
  });
});
