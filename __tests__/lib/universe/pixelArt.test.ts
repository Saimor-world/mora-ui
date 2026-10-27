import { PLANET_KINDS, hasRing, makeStars, paintMoon, paintNebula, paintPlanet, planetCanvasSize, planetGeometry, planetKind, seedOf } from '@/lib/universe/pixelArt';

const spec = (kind: (typeof PLANET_KINDS)[number], extra = {}) => ({ kind, d: 30, seed: seedOf(kind), light: { x: -0.6, y: -0.5 }, ...extra });
const opaque = (b: { data: Uint8ClampedArray | number[] }) => { let n = 0; for (let i = 3; i < b.data.length; i += 4) if (b.data[i] > 0) n++; return n; };

describe('pixelArt', () => {
  it('gives every department name a stable character', () => {
    expect(planetKind('R&D')).toBe('gas');
    expect(planetKind('Growth')).toBe('lava');
    expect(planetKind('Ohne Zuordnung')).toBe('rock');
    expect(planetKind('Irgendwas', 2)).toBe(planetKind('Irgendwas', 2));
    PLANET_KINDS.forEach((k) => expect(PLANET_KINDS).toContain(k));
  });

  it('paints every kind deterministically with a solid body', () => {
    PLANET_KINDS.forEach((k) => {
      const s = spec(k, { folders: 2, activity: 1 });
      const g = planetGeometry(s);
      const a = paintPlanet(s, g, 0), b = paintPlanet(s, g, 0);
      expect(Array.from(a.data)).toEqual(Array.from(b.data));
      expect(a.w).toBe(planetCanvasSize(s));
      expect(opaque(a)).toBeGreaterThan(300);
    });
  });

  it('draws a ring only for folders (or gas giants) and keeps the canvas an integer square', () => {
    expect(hasRing(spec('ocean'))).toBe(false);
    expect(hasRing(spec('ocean', { folders: 3 }))).toBe(true);
    expect(hasRing(spec('gas'))).toBe(true);
    expect(planetCanvasSize(spec('ocean', { folders: 3 }))).toBeGreaterThan(planetCanvasSize(spec('ocean')));
  });

  it('paints moons, nebula and stars at the requested size', () => {
    const m = paintMoon('rock', 9, 3, { x: -0.6, y: -0.5 }, true);
    expect(m.w).toBe(m.h);
    const n = paintNebula(60, 40, 5);
    expect([n.w, n.h]).toEqual([60, 40]);
    expect(makeStars(60, 40).length).toBeGreaterThan(5);
  });
});
