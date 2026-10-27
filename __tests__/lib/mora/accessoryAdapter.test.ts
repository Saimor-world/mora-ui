import fs from 'fs';
import path from 'path';
import { JADE_MOUNTS, jadeMounts, legacyWorn, mountAttributes } from '@/lib/mora/accessoryAdapter';
import { DEFAULT_WARDROBE, TRAITS, normalizeWardrobe, resolve, thumbSrc, wardrobeLayers, limitAccessories, visibleAccessories } from '@/lib/mora/traits';

const pub = (p: string) => path.join(process.cwd(), 'public', p);

describe('accessoryAdapter (Jade)', () => {
  it('hat drei Demonstratoren, jeder mit Datei, Slot und Trait-Eintrag', () => {
    expect(Object.keys(JADE_MOUNTS).sort()).toEqual(['celestial-charm', 'gold-orbit', 'prism-shard']);
    for (const m of Object.values(JADE_MOUNTS)) {
      expect(fs.existsSync(pub(m.asset))).toBe(true);
      const slot = TRAITS.slots.find((s) => s.id === m.slot)!;
      const item = slot.items.find((i) => i.id === m.id)!;
      expect(item.figure).toBe('jade');
      expect(item.origin).toBe('standard');
      expect(fs.existsSync(pub(thumbSrc(item.variants[0].file)))).toBe(true);
    }
  });
  it('erfindet keine NFT-Daten', () => {
    for (const m of Object.values(JADE_MOUNTS)) expect(m.nftMetadata).toBeUndefined();
    expect(mountAttributes(JADE_MOUNTS['gold-orbit'])).toEqual([{ trait_type: 'Leuchten', value: 'Goldorbit' }]);
  });
  it('zeichnet gewählte Teile als Ebenen und lässt Pixel-Altstücke aus', () => {
    const w = normalizeWardrobe({ aura: 'gold-orbit', neck: 'celestial-charm', head: 'beanie' });
    expect(jadeMounts(w).map((m) => m.id)).toEqual(['gold-orbit', 'celestial-charm']);
    expect(jadeMounts(DEFAULT_WARDROBE)).toEqual([]);
  });
  it('trägt höchstens ein Halsstück', () => {
    const w = normalizeWardrobe({ neck: 'celestial-charm' });
    expect(jadeMounts(w).filter((m) => m.slot === 'neck')).toHaveLength(1);
    const swapped = { ...w, neck: 'scarf' };
    expect(jadeMounts(swapped).filter((m) => m.slot === 'neck')).toHaveLength(0);
    expect(legacyWorn(swapped)).toContain('neck/scarf');
  });
  it('Jade-Teile haben kein Pixel-Sprite und zählen weiter zur Accessoire-Grenze', () => {
    const w = normalizeWardrobe({ aura: 'gold-orbit', held: 'prism-shard', neck: 'celestial-charm' });
    expect(wardrobeLayers(w).map((l: { src: string }) => l.src).join()).not.toMatch(/gold-orbit|prism-shard|celestial-charm/);
    const kept = limitAccessories(w, ['neck', 'held', 'aura']);
    expect(visibleAccessories(kept).length).toBeLessThanOrEqual(2);
  });
  it('alte gespeicherte Outfits bleiben gültig', () => {
    const old = normalizeWardrobe({ head: 'beanie', neck: 'scarf:red' });
    expect(resolve(TRAITS.slots.find((s) => s.id === 'neck')!, old.neck)?.item.id).toBe('scarf');
  });
});
