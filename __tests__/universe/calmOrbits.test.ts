import { evenAngles, layoutOrbits, layoutOverlap, placeOnOrbit, type PlanetLabel } from '@/lib/universe/worldOrbits';

const NAMES = ['R&D', 'Product', 'Growth', 'Intelligence', 'Marketing', 'Vertrieb', 'Finance', 'Legal', 'Ohne Abteilung'];
const META = ['noch leer', 'noch leer', 'noch leer', 'noch leer', '2 Ordner · 88 Einträge', '3 Ordner · 0 Einträge', '1 Ordner · 3 Einträge', 'noch leer', '2 Ordner · 7 Einträge'];
const MOONS = [0, 0, 0, 0, 2, 3, 1, 0, 2];
const WEIGHTS = [0, 0, 0, 0, 88, 0, 3, 0, 7];

function calm(n: number, width: number, height: number) {
  const labels: PlanetLabel[] = NAMES.slice(0, n).map((name, i) => ({ name, meta: META[i], moons: MOONS[i], stars: 0 }));
  const opts = { width, height, weights: WEIGHTS.slice(0, n), phone: false, moraBase: 84, planetMul: 1.2, flat: true, labels };
  return { layout: layoutOrbits(opts), opts };
}

describe('ruhige Anordnung der Planeten (Pixel-Ansicht)', () => {
  it.each([[3, 724, 408], [5, 724, 408], [8, 724, 408], [9, 724, 408], [9, 1100, 740], [9, 1600, 900]])('%i Planeten in %i×%i: eine Bahn, gleichmäßig, kollisionsfrei', (n, w, h) => {
    const { layout, opts } = calm(n, w, h);
    expect(layout.flat).toBe(true);
    expect(layout.rings.length).toBeLessThanOrEqual(2);
    expect(layoutOverlap(layout, opts, 0)).toBe(0);
    // Alle Namen stehen unter ihren Planeten.
    layout.slots.forEach((s) => expect(placeOnOrbit(layout, s).front).toBe(true));
  });

  it('symmetrisch: Spiegelbild links/rechts ergibt dieselben Höhen', () => {
    const { layout } = calm(9, 1100, 740);
    const ys = layout.slots.map((s) => Math.round(placeOnOrbit(layout, s).y)).sort((a, b) => a - b);
    const mirrored = layout.slots.map((s) => Math.round(placeOnOrbit(layout, { ...s, angle: Math.PI - s.angle }).y)).sort((a, b) => a - b);
    expect(mirrored).toEqual(ys);
  });

  it('bei zu wenig Platz werden die Namen kompakt statt Planeten winzig', () => {
    const { layout } = calm(9, 724, 408);
    expect(layout.compact).toBe(true);
    expect(Math.min(...layout.slots.map((s) => s.size))).toBeGreaterThanOrEqual(52);
  });

  it('evenAngles: gleichmäßig in Kästchen-Abstand, Scheitel oben', () => {
    const a = evenAngles(4, 200, 100, 100, 100, 0);
    expect(a[0]).toBeCloseTo(-Math.PI / 2, 5);
    expect(new Set(a.map((x) => Math.round(x * 100))).size).toBe(4);
  });
});
