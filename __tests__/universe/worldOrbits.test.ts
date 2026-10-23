import { FLOAT, clearanceFromMora, floatOffset, layoutOrbits, moraSize, placeOnOrbit, planetSize, ringCounts } from '@/lib/universe/worldOrbits';

// Universe-Fläche im OS: Computer 1440×900 und Handy 390×844 (abzüglich Kopfzeile, Einleitung, Dock).
const FIELDS = [
  { width: 1440 - 48, height: 900 - 220, phone: false },
  { width: 1024 - 48, height: 768 - 220, phone: false },
  { width: 390 - 32, height: 844 - 330, phone: true },
];

describe('world orbits', () => {
  it('puts few planets inside and more outside', () => {
    expect(ringCounts(0)).toEqual([]);
    expect(ringCounts(3)).toEqual([3]);
    expect(ringCounts(4)).toEqual([2, 2]);
    expect(ringCounts(7)).toEqual([3, 4]);
    expect(ringCounts(12).reduce((a, b) => a + b, 0)).toBe(12);
  });

  it('keeps MÔRA the largest body', () => {
    for (const phone of [false, true]) {
      expect(planetSize(100, 100, phone)).toBeLessThan(moraSize(phone));
      expect(planetSize(0, 100, phone)).toBeGreaterThanOrEqual(phone ? 44 : 60);
    }
  });

  it('places every planet on its drawn orbit, never inside MÔRA and inside the field', () => {
    for (const field of FIELDS) {
      for (let n = 1; n <= 10; n++) {
        const weights = Array.from({ length: n }, (_, i) => (i * 7) % 11);
        const layout = layoutOrbits({ ...field, weights });
        expect(layout.slots).toHaveLength(n);
        layout.slots.forEach((slot) => {
          const ring = layout.rings[slot.ring];
          const p = placeOnOrbit(layout, slot);
          const onEllipse = ((p.x - layout.cx) / ring.rx) ** 2 + ((p.y - layout.cy) / ring.ry) ** 2;
          expect(onEllipse).toBeCloseTo(1, 6);
          expect(clearanceFromMora(layout, p, slot.size)).toBeGreaterThan(0);
          expect(p.x - slot.size / 2).toBeGreaterThanOrEqual(0);
          expect(p.x + slot.size / 2).toBeLessThanOrEqual(field.width);
          expect(p.y - slot.size / 2).toBeGreaterThanOrEqual(0);
          expect(p.y + slot.size / 2).toBeLessThanOrEqual(field.height);
        });
      }
    }
  });

  it('floats only a few pixels, so planets stay on their place', () => {
    for (let t = 0; t < 60; t += 0.7) {
      const { dx, dy } = floatOffset(3, t);
      expect(Math.abs(dx)).toBeLessThanOrEqual(FLOAT.x);
      expect(Math.abs(dy)).toBeLessThanOrEqual(FLOAT.y);
    }
    expect(FLOAT.periodX).toBeGreaterThanOrEqual(10);
  });
});

describe('Full HD', () => {
  it('grows MÔRA, planets and orbits on a 1920×1080 field, MÔRA stays the largest', () => {
    const fhd = layoutOrbits({ width: 1920 - 48, height: 1080 - 220, weights: [1, 4, 9, 2], phone: false });
    const laptop = layoutOrbits({ width: 1280 - 48, height: 800 - 220, weights: [1, 4, 9, 2], phone: false });
    expect(fhd.scale).toBeGreaterThan(laptop.scale);
    expect(fhd.mora).toBeGreaterThan(laptop.mora);
    expect(Math.max(...fhd.slots.map((s) => s.size))).toBeLessThan(fhd.mora);
    expect(fhd.rings[fhd.rings.length - 1].rx).toBeGreaterThan(laptop.rings[laptop.rings.length - 1].rx);
    fhd.slots.forEach((slot) => expect(clearanceFromMora(fhd, placeOnOrbit(fhd, slot), slot.size)).toBeGreaterThan(0));
  });
});
