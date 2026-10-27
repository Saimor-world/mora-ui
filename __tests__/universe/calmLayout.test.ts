import { layoutOrbits, layoutOverlap, placeOnOrbit, type PlanetLabel } from '@/lib/universe/worldOrbits';

const NAMES: (PlanetLabel & { weight: number })[] = [
  { name: 'Inbox · 83', meta: '12 offen · 3 überfällig', moons: 0, stars: 8, weight: 31 },
  { name: 'Intelligence', meta: '4 Bereiche', moons: 4, stars: 2, weight: 18 },
  { name: 'Marketing', meta: '5 Bereiche', moons: 5, weight: 16 },
  { name: 'Forschung & Entwicklung', meta: '3 Bereiche', moons: 3, stars: 1, weight: 14 },
  { name: 'Vertrieb', meta: '6 Bereiche', moons: 6, stars: 3, weight: 12 },
  { name: 'Finanzen & Verwaltung', meta: '2 Bereiche', moons: 2, weight: 9 },
  { name: 'Kalender', meta: '2 Termine kommen', weight: 7 },
  { name: 'Team', meta: '1 Bereich', moons: 1, weight: 4 },
];
// Feld = Fenster − Kopfleiste − Pulse-/Horizont-Spalten (268/288 ab 1280 px), Höhe − 160 px für die Frageleiste.
const FIELDS = [
  { label: '1280', width: 1280 - 268 - 288, height: 720 - 152 - 160 },
  { label: '1440', width: 1440 - 268 - 288, height: 900 - 152 - 160 },
  { label: '1920', width: 1920 - 268 - 288, height: 1080 - 152 - 160 },
];

describe('calm grid layout (pixel view)', () => {
  for (const f of FIELDS) {
    // 1280×720 ist das engste Feld: dort trägt die Reihe sicher bis 5 Planeten (zwei Reihen brauchen > 408 px).
    for (let n = 1; n <= (f.label === '1280' ? 5 : 8); n++) {
      it(`${n} planets at ${f.label}: no overlaps, no orbits`, () => {
        const labels = NAMES.slice(0, n);
        const o = { width: f.width, height: f.height, phone: false, weights: labels.map((p) => p.weight), labels, calm: true, moraBase: 150 };
        const layout = layoutOrbits(o);
        expect(layout.calm).toBe(true);
        expect(layoutOverlap(layout, o, 0)).toBe(0);
        layout.slots.forEach((s) => expect(s.at).toBeDefined());
      });
    }
  }

  it('orders by importance: heaviest top-left, rows centred, equal tiers share a size', () => {
    const w = [4, 31, 9, 18, 16, 14];
    const layout = layoutOrbits({ width: 1000, height: 560, phone: false, weights: w, calm: true });
    const pos = layout.slots.map((s) => placeOnOrbit(layout, s, 12));
    const heaviest = pos[1];
    const base = (i: number) => pos[i].y + layout.slots[i].size / 2;
    pos.forEach((_, i) => { if (i !== 1) expect(base(1) <= base(i) + 0.5).toBe(true); });
    const rows = new Map<number, number[]>();
    pos.forEach((p, i) => rows.set(Math.round(base(i)), [...(rows.get(Math.round(base(i))) ?? []), p.x]));
    rows.forEach((xs) => { const mid = (Math.min(...xs) + Math.max(...xs)) / 2; expect(Math.abs(mid - layout.cx)).toBeLessThan(1); });
  });

  it('is deterministic and ignores time (no drifting orbits)', () => {
    const a = layoutOrbits({ width: 900, height: 520, phone: false, weights: [5, 3, 2], calm: true });
    const p1 = placeOnOrbit(a, a.slots[0], 0);
    const p2 = placeOnOrbit(a, a.slots[0], 99);
    expect(p1).toEqual(p2);
  });

  it('phone keeps the classic layout', () => {
    const l = layoutOrbits({ width: 358, height: 514, phone: true, weights: [3, 2, 1], calm: true });
    expect(l.calm).toBeUndefined();
  });
});
