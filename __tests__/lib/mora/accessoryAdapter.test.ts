import fs from 'fs';
import path from 'path';
import { JADE_MOUNTS, jadeMounts, legacyWorn, mountAttributes } from '@/lib/mora/accessoryAdapter';
import { DEFAULT_WARDROBE, FOUNDER_PENDANT, TRAITS, normalizeWardrobe, resolve, thumbSrc, wardrobeLayers, limitAccessories, visibleAccessories } from '@/lib/mora/traits';

const pub = (p: string) => path.join(process.cwd(), 'public', p);
const ORIGINS = ['standard', 'moment', 'earned', 'alive', 'founder'];
const itemOf = (id: string) => TRAITS.slots.flatMap((s) => s.items).find((i) => i.id === id)!;

describe('accessoryAdapter (Jade)', () => {
  it('hat die Garderobe: Brille, Mütze, Schal, Kette, Gründerband und Blüten-Medaillon', () => {
    expect(Object.keys(JADE_MOUNTS).sort()).toEqual(['founder-f1', 'founder-scarf', 'jade-beanie', 'jade-scarf', 'jade-sunglasses', 'pearl-necklace']);
    for (const m of Object.values(JADE_MOUNTS)) {
      expect(fs.existsSync(pub(m.asset))).toBe(true);
      const slot = TRAITS.slots.find((s) => s.id === m.slot)!;
      const item = slot.items.find((i) => i.id === m.id)!;
      expect(item.figure === 'jade' || item.figure === 'both').toBe(true);
      expect(ORIGINS).toContain(item.origin);
      const v = item.variants[0];
      expect(fs.existsSync(pub(thumbSrc(v.thumb ?? v.file)))).toBe(true);
    }
  });
  it('Mode-Attribute und Herkunft stehen im Adapter, ohne Besitz-, Preis- oder Seltenheitsaussage', () => {
    for (const m of Object.values(JADE_MOUNTS)) {
      expect(m.nftMetadata).toBeUndefined();
      const a = mountAttributes(m);
      expect(a.map((t) => t.trait_type)).toEqual([expect.any(String), 'Kategorie', 'Kollektion', 'Material', 'Herkunft']);
      expect(a.every((t) => t.value.length > 0)).toBe(true);
    }
    expect(mountAttributes(JADE_MOUNTS['jade-sunglasses'])).toEqual([
      { trait_type: 'Gesicht', value: 'Sonnenbrille' }, { trait_type: 'Kategorie', value: 'Brille' },
      { trait_type: 'Kollektion', value: 'Basis' }, { trait_type: 'Material', value: 'Rauchglas, Metallrahmen' }, { trait_type: 'Herkunft', value: 'standard' },
    ]);
    expect(mountAttributes(JADE_MOUNTS['founder-f1']).slice(1)).toEqual([
      { trait_type: 'Kategorie', value: 'Anhänger' }, { trait_type: 'Kollektion', value: 'Gründer' },
      { trait_type: 'Material', value: 'Gold, Navy-Emaille, Jade-Cabochon' }, { trait_type: 'Herkunft', value: 'founder' },
    ]);
  });
  it('Gründerstücke sind nur für Gründer, nicht handelbar und tragen die Herkunft founder', () => {
    for (const id of ['founder-f1', 'founder-scarf']) {
      expect(itemOf(id)).toMatchObject({ origin: 'founder', unlock: 'founder', tradable: false });
    }
    for (const id of ['jade-sunglasses', 'jade-beanie', 'jade-scarf', 'pearl-necklace']) expect(itemOf(id)).toMatchObject({ origin: 'standard', unlock: 'standard' });
  });
  it('Schal ist nicht grün oder gold', () => {
    expect(itemOf('jade-scarf').variants[0].swatch).toBe('#c0643a');
    expect(itemOf('founder-scarf').variants[0].swatch).toBe('#1c2850');
  });
  it('zeichnet gewählte Teile als Ebenen und lässt Pixel-Altstücke aus', () => {
    const w = normalizeWardrobe({ face: 'jade-sunglasses', head: 'jade-beanie', aura: 'warm', neck: null });
    expect(jadeMounts(w).map((m) => m.id)).toEqual(['jade-sunglasses', 'jade-beanie']);
    expect(jadeMounts(DEFAULT_WARDROBE)).toEqual([]);
    expect(legacyWorn(w)).toEqual(['aura/warm']);
  });
  it('trägt höchstens ein Halsstück', () => {
    const w = normalizeWardrobe({ neck: 'pearl-necklace' });
    expect(jadeMounts(w).filter((m) => m.slot === 'neck')).toHaveLength(1);
    const swapped = { ...w, neck: 'scarf' };
    expect(jadeMounts(swapped).filter((m) => m.slot === 'neck')).toHaveLength(0);
    expect(legacyWorn(swapped)).toContain('neck/scarf');
    expect(jadeMounts({ ...w, neck: FOUNDER_PENDANT }, true).filter((m) => m.slot === 'neck').map((m) => m.id)).toEqual(['founder-f1']);
    expect(jadeMounts({ ...w, neck: FOUNDER_PENDANT })).toEqual([]);
  });
  it('Jade-Teile haben kein Pixel-Sprite und zählen zur Accessoire-Grenze (höchstens zwei)', () => {
    const w = normalizeWardrobe({ face: 'jade-sunglasses', head: 'jade-beanie', neck: 'pearl-necklace' });
    expect(visibleAccessories(w).length).toBe(2);
    expect(wardrobeLayers(w).map((l: { src: string }) => l.src).join()).not.toMatch(/jade-|pearl-necklace/);
    const kept = limitAccessories(w, ['neck', 'head', 'face']);
    expect(visibleAccessories(kept).length).toBeLessThanOrEqual(2);
  });
  it('Gründerstücke behalten ihr Pixel-Sprite und die Jade-Zeichnung', () => {
    expect(wardrobeLayers({ ...DEFAULT_WARDROBE, neck: FOUNDER_PENDANT }, { founder: true }).map((l) => l.slot)).toEqual(['neck']);
    expect(itemOf('founder-f1').figure).toBe('both');
  });
  it('alte gespeicherte Outfits bleiben gültig', () => {
    const old = normalizeWardrobe({ head: 'beanie', neck: 'scarf:red', aura: 'pearl-ring', held: 'smoky-quartz' });
    expect(resolve(TRAITS.slots.find((s) => s.id === 'neck')!, old.neck)?.item.id).toBe('scarf');
    expect(jadeMounts(old)).toEqual([]);
  });
});
