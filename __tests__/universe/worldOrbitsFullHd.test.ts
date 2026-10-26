import { LABEL_HALF, layoutOrbits, orbitScale, placeOnOrbit } from '@/lib/universe/worldOrbits';

// Full HD im OS: Fläche 1920 × (1080 − Kopfzeile) abzüglich MÔRA-Eingabe; Karten links, Horizont rechts.
const FULL_HD = { width: 1920, height: 1080 - 56 - 144, phone: false };
const LEFT = 352;
const RIGHT = 296;

describe('Universe füllt Full HD', () => {
  it.each([4, 5, 6, 7, 8])('%i Planeten bleiben in der freien Spalte zwischen Karten und Horizont', (n) => {
    const weights = Array.from({ length: n }, (_, i) => (i * 7) % 11);
    const layout = layoutOrbits({ ...FULL_HD, weights, insetLeft: LEFT, insetRight: RIGHT });
    const free = FULL_HD.width - LEFT - RIGHT;
    expect(layout.cx).toBeCloseTo(LEFT + free / 2, 0);
    const half = LABEL_HALF * layout.scale;
    const xs = layout.slots.map((slot) => {
      const p = placeOnOrbit(layout, slot);
      expect(p.x - Math.max(slot.size / 2, half)).toBeGreaterThanOrEqual(LEFT);
      expect(p.x + Math.max(slot.size / 2, half)).toBeLessThanOrEqual(FULL_HD.width - RIGHT);
      return p.x;
    });
    // Nutzt die Breite: die Planeten spannen mindestens 68 % der freien Spalte.
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThanOrEqual(free * 0.68);
  });

  it('nutzt auf breiten Flächen mehr als die feste Bahnbreite', () => {
    const layout = layoutOrbits({ ...FULL_HD, weights: [3, 5, 2, 8, 1, 4] });
    const outer = Math.max(...layout.rings.map((r) => r.rx));
    expect(outer).toBeGreaterThan(440 * layout.scale);
  });

  it('koppelt den Größenfaktor an die Breite', () => {
    expect(orbitScale(880, false, 1920)).toBe(1.35);
    expect(orbitScale(880, false, 900)).toBeLessThan(1.35);
    expect(orbitScale(880, true, 1920)).toBe(1);
  });
});
