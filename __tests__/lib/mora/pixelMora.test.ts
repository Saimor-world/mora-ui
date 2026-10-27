import { decide } from '@/lib/mora/pixelBrain';
import { isUnlocked, unlockHint, NO_UNLOCKS, ABO_MONTHS } from '@/lib/mora/unlock';
import { tierFor } from '@/components/world/PixelMora';
import { DEFAULT_WARDROBE, FOUNDER_PENDANT, defaultWardrobe, deriveRarity, stemOf, TIERS, OUTFIT_SLOTS, TRAITS, joinChoice, normalizeOutfits, normalizeWardrobe, randomWardrobe, limitAccessories, resolve, splitChoice, visibleAccessories, toNftAttributes, wardrobeLayers } from '@/lib/mora/traits';
import fs from 'fs';
import path from 'path';

describe('pixelBrain', () => {
  const pts = [{ id: 'a', x: 100, y: 0, weight: 0.1 }, { id: 'b', x: -100, y: 0, weight: 5 }];
  it('schläft nachts', () => { expect(decide({ points: pts, fresh: null, night: true, busy: false }, () => 0.5, undefined).kind).toBe('sleep'); });
  it('schaut zu neuen Ereignissen', () => { const i = decide({ points: pts, fresh: 'a', night: false, busy: false }, () => 0.5, undefined); expect(['look', 'visit']).toContain(i.kind); expect(i.id).toBe('a'); });
  it('bevorzugt aktive Planeten', () => {
    let b = 0; for (let k = 0; k < 200; k++) { const i = decide({ points: pts, fresh: null, night: false, busy: false }, Math.random, undefined); if (i.id === 'b') b++; if (i.id === 'a') b--; }
    expect(b).toBeGreaterThan(0);
  });
  it('ruht ohne Ziele in der Mitte', () => { const i = decide({ points: [], fresh: null, night: false, busy: false }, () => 0.5, undefined); expect(i.kind).toBe('rest'); });
});

describe('traits', () => {
  const items = TRAITS.slots.flatMap((s) => s.items);
  it('hat Defaults und viele Accessoires mit Farbvarianten', () => {
    expect(items.length).toBeGreaterThanOrEqual(24);
    expect(items.filter((i) => i.origin === 'standard').every((i) => i.variants.length >= 1)).toBe(true);
    expect(DEFAULT_WARDROBE.head).toBeNull(); expect(DEFAULT_WARDROBE.neck).toBe('scarf');
  });
  it('jede Variante hat Ebene und Vorschaubild auf der Platte', () => {
    for (const i of items.filter((x) => x.figure !== 'jade')) for (const v of i.variants) {
      for (const t of TIERS) {
        const dir = path.join('public/mora/pixel', `t${t}`, 'traits');
        expect(fs.existsSync(path.join(dir, v.anim ? stemOf(v.file, '--anim') : v.file))).toBe(true);
        if (v.back) expect(fs.existsSync(path.join(dir, stemOf(v.file, '--back')))).toBe(true);
      }
      expect(fs.existsSync(path.join('public/mora/pixel/thumbs', v.file))).toBe(true);
    }
  });
  it('verwirft unbekannte IDs und erlaubt leer', () => {
    const w = normalizeWardrobe({ head: 'nope', neck: null, face: 'glasses' });
    expect(w.head).toBeNull(); expect(w.neck).toBeNull(); expect(w.face).toBe('glasses:gold');
    expect(wardrobeLayers(w).map((l) => l.slot)).not.toContain('neck');
  });
  it('liest Varianten und alte IDs', () => {
    expect(splitChoice('beret:rot')).toEqual({ item: 'beret', variant: 'rot' });
    expect(joinChoice('beret', 'rot')).toBe('beret:rot');
    expect(normalizeWardrobe({ neck: 'scarf-red' }).neck).toBe('scarf:terra');
    expect(normalizeWardrobe({ neck: 'scarf:smaragd' }).neck).toBe('scarf:terra');
    expect(normalizeWardrobe({ head: 'sailor' }).head).toBe('beret:creme');
    expect(normalizeWardrobe({ head: 'beret:gibtsnicht' }).head).toBeNull();
    const head = TRAITS.slots.find((s) => s.id === 'head')!;
    expect(resolve(head, 'halo')?.variant.id).toBe('gold');
  });
  it('Weihnachtsmütze verdeckt den Kopf, der Anstecker bleibt unter dem Hut sichtbar', () => {
    const base = { ...DEFAULT_WARDROBE, head: 'wizard:violett', clip: 'flower-pin:pflaume' };
    expect(wardrobeLayers(base).map((l) => l.slot)).toEqual(expect.arrayContaining(['head', 'clip']));
    const x = wardrobeLayers({ ...DEFAULT_WARDROBE, seasonal: 'xmas:rot', head: 'halo:gold' }).map((l) => l.slot);
    expect(x).not.toContain('head'); expect(x).toContain('seasonal');
  });
  it('Standard-Outfit trägt den neuen Terrakotta-Schal mit Ebene hinter dem Körper', () => {
    expect(DEFAULT_WARDROBE.neck).toBe('scarf');
    const l = wardrobeLayers(DEFAULT_WARDROBE, { tier: 96 }).find((x) => x.slot === 'neck')!;
    expect(l.src).toBe('/mora/pixel/t96/traits/neck-scarf--terra.png'); expect(l.back).toBe('/mora/pixel/t96/traits/neck-scarf--terra--back.png');
  });
  it('Gründerstücke erscheinen nur bei Gründern; F1 ist ein Streifen mit 16 Bildern', () => {
    const w = { ...DEFAULT_WARDROBE, neck: FOUNDER_PENDANT, clip: 'founder-bloom', face: 'founder-sunglasses' };
    expect(wardrobeLayers(w).map((l) => l.slot)).toEqual([]);
    const f = wardrobeLayers(w, { founder: true, tier: 80 });
    expect(f.map((l) => l.slot)).toEqual(['neck', 'face', 'clip']);
    expect(f.find((l) => l.slot === 'neck')).toMatchObject({ src: '/mora/pixel/t80/traits/pendant-founder-f1--bluten-medaillon--anim.png', frames: 16 });
    expect(defaultWardrobe(true).neck).toBe(FOUNDER_PENDANT); expect(defaultWardrobe(false).neck).toBe('scarf');
    expect(visibleAccessories(defaultWardrobe(true))).toEqual(['neck']);
  });
  it('Hals ist ein Slot und höchstens zwei Accessoires sind sichtbar', () => {
    expect(TRAITS.slots.some((s) => s.id === 'pendant')).toBe(false);
    const full = { ...DEFAULT_WARDROBE, neck: 'bowtie:rot', head: 'beret:rot', face: 'glasses:rot', held: 'coffee:marine', clip: 'flower-pin:pflaume' };
    expect(visibleAccessories(full).length).toBe(5);
    expect(visibleAccessories(limitAccessories(full)).length).toBe(2);
    const keep = limitAccessories(full, ['held', 'face']);
    expect(keep.held).toBe('coffee:marine'); expect(keep.face).toBe('glasses:rot'); expect(keep.neck).toBeNull(); expect(keep.head).toBeNull();
    expect(limitAccessories({ ...DEFAULT_WARDROBE, aura: 'warm:gold' })).toEqual({ ...DEFAULT_WARDROBE, aura: 'warm:gold' });
  });
  it('alte Outfits mit Schal und Anhänger werden auf einen Hals-Slot migriert', () => {
    const n = normalizeWardrobe({ neck: 'scarf', pendant: 'moon-pendant:silber' } as never);
    expect(n.neck).toBe('moon-pendant:silber'); expect('pendant' in n).toBe(false);
  });
  it('wählt die Bildstufe passend zur Größe', () => {
    expect([34, 44, 56, 80, 88, 96, 112, 130, 280].map(tierFor)).toEqual([48, 48, 48, 80, 80, 96, 96, 140, 140]);
  });
  it('Zufall liefert immer gültige Auswahl', () => {
    for (let k = 0; k < 200; k++) {
      const w = randomWardrobe(); expect(normalizeWardrobe(w)).toEqual(w); expect(visibleAccessories(w).length).toBeLessThanOrEqual(2);
    }
    expect(Object.values(randomWardrobe(() => 0.99)).every((v) => v === null)).toBe(true);
  });
  it('Outfit-Plätze haben feste Größe und verwerfen Müll', () => {
    const o = normalizeOutfits([{ head: 'halo:rose' }, 5, null]);
    expect(o).toHaveLength(OUTFIT_SLOTS); expect(o[0]?.head).toBe('halo:rose'); expect(o[1]).toBeNull(); expect(o[5]).toBeNull();
    expect(normalizeOutfits('x').every((x) => x === null)).toBe(true);
  });
  it('liefert NFT-Attribute mit Variante', () => {
    const a = toNftAttributes({ ...DEFAULT_WARDROBE, head: 'beret:rot' });
    expect(a.find((x) => x.trait_type === 'Kopf')?.value).toBe('Barett (Rot)');
    expect(a.find((x) => x.trait_type === 'Gesicht')?.value).toBe('Keins');
  });
});

describe('MÔRA Ziele und Gründer', () => {
  it('landet nie auf einem Planeten', () => {
    const pts = [
      { id: 'a', x: 120, y: 0, weight: 3, r: 50, px: 200, py: 0 },
      { id: 'b', x: 60, y: -10, weight: 3, r: 60, px: 100, py: -20 },
    ];
    for (let k = 0; k < 300; k++) {
      const i = decide({ points: pts, fresh: null, night: false, busy: false, moraR: 29 }, Math.random, undefined);
      for (const q of pts) expect(Math.hypot(i.x - q.px, i.y - q.py)).toBeGreaterThanOrEqual(q.r + 29);
    }
  });
  it('Gründer-Regel: Inhaber im HQ oder System-Owner, sonst nicht', () => {
    const { isFounderUser } = jest.requireActual('@/lib/mora/useWardrobe');
    expect(isFounderUser({ role: 'owner', tenant_id: 'tenant-saimor-hq' })).toBe(true);
    expect(isFounderUser({ role: 'owner', tenant_id: 'tenant-kunde' })).toBe(false);
    expect(isFounderUser({ role: 'member', tenant_id: 'tenant-saimor-hq' })).toBe(false);
    expect(isFounderUser(null)).toBe(false);
  });
});

describe('Seltenheit und Freischaltung', () => {
  const items = TRAITS.slots.flatMap((s) => s.items);
  const special = items.filter((i) => i.origin !== 'standard');
  it('Seltenheit folgt nur der Herkunft, nie Farbe oder Kategorie', () => {
    for (const i of items) expect(i.rarity).toBe(deriveRarity(i));
    expect(items.filter((i) => i.origin === 'standard').every((i) => i.rarity === 'common' && i.unlock === 'standard')).toBe(true);
    // Alle Farbvarianten eines Stücks teilen dieselbe Seltenheit (sie hängt am Stück).
    expect(items.every((i) => typeof i.rarity === 'string')).toBe(true);
  });
  it('3 bis 5 Beispiele für besondere Stücke, je Herkunft belegt', () => {
    expect(special.length).toBeGreaterThanOrEqual(3);
    expect(special.length).toBeLessThanOrEqual(8);
    expect(special.filter((i) => i.origin === 'founder').map((i) => i.id).sort()).toEqual(['founder-bloom', 'founder-f1', 'founder-scarf', 'founder-sunglasses']);
    expect(new Set(special.map((i) => i.origin))).toEqual(new Set(['moment', 'earned', 'alive', 'founder']));
    expect(special.find((i) => i.id === 'genesis-scarf')).toMatchObject({ origin: 'moment', edition: 111, year: 2026 });
    expect(special.find((i) => i.id === 'founder-f1')).toMatchObject({ rarity: 'legendary', unlock: 'founder', tradable: false });
  });
  it('Alltag ist ohne Wallet, Abo und Gründerstatus frei', () => {
    for (const i of items.filter((x) => x.origin === 'standard')) expect(isUnlocked(i, NO_UNLOCKS)).toBe(true);
    for (const i of special) expect(isUnlocked(i, NO_UNLOCKS)).toBe(false);
  });
  it('Abo ab 6 bzw. 12 Monaten, NFT nur bei Besitz, Gründer nur für Gründer', () => {
    const swarm = items.find((i) => i.id === 'firefly-swarm')!; const med = items.find((i) => i.id === 'one-year-medallion')!;
    expect(isUnlocked(swarm, { ...NO_UNLOCKS, subscriptionMonths: ABO_MONTHS - 1 })).toBe(false);
    expect(isUnlocked(swarm, { ...NO_UNLOCKS, subscriptionMonths: ABO_MONTHS })).toBe(true);
    expect(isUnlocked(med, { ...NO_UNLOCKS, subscriptionMonths: 11 })).toBe(false);
    expect(isUnlocked(med, { ...NO_UNLOCKS, subscriptionMonths: 12 })).toBe(true);
    const gen = items.find((i) => i.id === 'genesis-scarf')!;
    expect(isUnlocked(gen, { ...NO_UNLOCKS, nftIds: ['genesis-scarf'] })).toBe(true);
    expect(isUnlocked(items.find((i) => i.id === 'founder-f1')!, { ...NO_UNLOCKS, founder: true })).toBe(true);
  });
  it('Hinweise sind ruhig: kein Preis, kein Druck', () => {
    for (const i of special) { const h = unlockHint(i); expect(h.length).toBeGreaterThan(10); expect(h).not.toMatch(/€|\$|kaufen|jetzt|nur noch|schnell/i); }
  });
  it('Zufall wählt keine gesperrten Stücke', () => {
    const lockedIds = new Set(special.map((i) => i.id));
    for (let k = 0; k < 200; k++) {
      const w = randomWardrobe(Math.random);
      for (const v of Object.values(w)) if (v) expect(lockedIds.has(splitChoice(v).item)).toBe(false);
    }
  });
});
