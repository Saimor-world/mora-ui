import { decide } from '@/lib/mora/pixelBrain';
import { isUnlocked, unlockHint, NO_UNLOCKS, ABO_MONTHS } from '@/lib/mora/unlock';
import { DEFAULT_WARDROBE, deriveRarity, OUTFIT_SLOTS, TRAITS, joinChoice, normalizeOutfits, normalizeWardrobe, randomWardrobe, resolve, splitChoice, toNftAttributes, wardrobeLayers } from '@/lib/mora/traits';
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
    expect(items.length).toBeGreaterThanOrEqual(30);
    expect(items.filter((i) => i.origin === 'standard').every((i) => i.variants.length >= 3)).toBe(true);
    expect(DEFAULT_WARDROBE.head).toBe('sprout');
  });
  it('jede Variante hat Ebene und Vorschaubild auf der Platte', () => {
    for (const i of items) for (const v of i.variants) {
      expect(fs.existsSync(path.join('public/mora/pixel/traits', v.file))).toBe(true);
      expect(fs.existsSync(path.join('public/mora/pixel/thumbs', v.file))).toBe(true);
    }
  });
  it('verwirft unbekannte IDs und erlaubt leer', () => {
    const w = normalizeWardrobe({ head: 'nope', neck: null, face: 'glasses' });
    expect(w.head).toBe('sprout'); expect(w.neck).toBeNull(); expect(w.face).toBe('glasses:gold');
    expect(wardrobeLayers(w).map((l) => l.slot)).not.toContain('neck');
  });
  it('liest Varianten und alte IDs', () => {
    expect(splitChoice('beret:rot')).toEqual({ item: 'beret', variant: 'rot' });
    expect(joinChoice('beret', 'rot')).toBe('beret:rot');
    expect(normalizeWardrobe({ neck: 'scarf-red' }).neck).toBe('scarf:rot');
    expect(normalizeWardrobe({ head: 'sailor' }).head).toBe('captain:weiss');
    expect(normalizeWardrobe({ head: 'beret:gibtsnicht' }).head).toBe('sprout');
    const head = TRAITS.slots.find((s) => s.id === 'head')!;
    expect(resolve(head, 'crown')?.variant.id).toBe('gold');
  });
  it('Hut verdeckt die Spange, Weihnachtsmütze auch den Kopf', () => {
    const base = { ...DEFAULT_WARDROBE, head: 'wizard:violett', clip: 'moon:gold' };
    expect(wardrobeLayers(base).map((l) => l.slot)).not.toContain('clip');
    expect(wardrobeLayers({ ...base, head: 'sprout', clip: 'moon:gold' }).map((l) => l.slot)).toContain('clip');
    const x = wardrobeLayers({ ...DEFAULT_WARDROBE, seasonal: 'xmas:rot', head: 'crown:gold' }).map((l) => l.slot);
    expect(x).not.toContain('head'); expect(x).toContain('seasonal');
  });
  it('Zufall liefert immer gültige Auswahl', () => {
    for (let k = 0; k < 200; k++) {
      const w = randomWardrobe(); expect(normalizeWardrobe(w)).toEqual({ ...DEFAULT_WARDROBE, ...Object.fromEntries(Object.entries(w).map(([a, b]) => [a, b])) });
    }
    expect(Object.values(randomWardrobe(() => 0.99)).every((v) => v === null)).toBe(true);
  });
  it('Outfit-Plätze haben feste Größe und verwerfen Müll', () => {
    const o = normalizeOutfits([{ head: 'crown:silber' }, 5, null]);
    expect(o).toHaveLength(OUTFIT_SLOTS); expect(o[0]?.head).toBe('crown:silber'); expect(o[1]).toBeNull(); expect(o[5]).toBeNull();
    expect(normalizeOutfits('x').every((x) => x === null)).toBe(true);
  });
  it('liefert NFT-Attribute mit Variante', () => {
    const a = toNftAttributes({ ...DEFAULT_WARDROBE, head: 'beret:rot' });
    expect(a.find((x) => x.trait_type === 'Kopf')?.value).toBe('Barett (Rot)');
    expect(a.find((x) => x.trait_type === 'Gesicht')?.value).toBe('Keins');
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
    expect(special.length).toBeLessThanOrEqual(5);
    expect(new Set(special.map((i) => i.origin))).toEqual(new Set(['moment', 'earned', 'alive', 'founder']));
    expect(special.find((i) => i.id === 'genesis-scarf')).toMatchObject({ origin: 'moment', edition: 111, year: 2026 });
    expect(special.find((i) => i.id === 'founder-crown')).toMatchObject({ rarity: 'legendary', unlock: 'founder', tradable: false });
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
    expect(isUnlocked(items.find((i) => i.id === 'founder-crown')!, { ...NO_UNLOCKS, founder: true })).toBe(true);
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
