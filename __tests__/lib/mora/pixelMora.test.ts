import { decide } from '@/lib/mora/pixelBrain';
import { DEFAULT_WARDROBE, TRAITS, normalizeWardrobe, toNftAttributes, wardrobeLayers } from '@/lib/mora/traits';

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
  it('hat Defaults und genug Accessoires', () => {
    expect(TRAITS.slots.reduce((n, s) => n + s.items.length, 0)).toBeGreaterThanOrEqual(20);
    expect(DEFAULT_WARDROBE.head).toBe('sprout');
  });
  it('verwirft unbekannte IDs und erlaubt leer', () => {
    const w = normalizeWardrobe({ head: 'nope', neck: null, face: 'glasses' });
    expect(w.head).toBe('sprout'); expect(w.neck).toBeNull(); expect(w.face).toBe('glasses');
    expect(wardrobeLayers(w).map((l) => l.slot)).not.toContain('neck');
  });
  it('liefert NFT-Attribute', () => { expect(toNftAttributes(DEFAULT_WARDROBE).find((a) => a.trait_type === 'Kopf')?.value).toBeTruthy(); });
});
