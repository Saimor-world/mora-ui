import { layoutOrbits, layoutOverlap, planetFootprint, type PlanetLabel } from '@/lib/universe/worldOrbits';

// HQ-ähnlich (Stand 24.10.2026): 7 Abteilungen, 107 Elemente, lange Namen, Monde.
const HQ: (PlanetLabel & { weight: number })[] = [
  { name: 'Intelligence', meta: '4 Bereiche', moons: 4, stars: 2, weight: 18 },
  { name: 'Inbox · 83', meta: '12 offen · 3 überfällig', moons: 0, stars: 8, weight: 31 },
  { name: 'Marketing', meta: '5 Bereiche', moons: 5, stars: 0, weight: 16 },
  { name: 'Forschung & Entwicklung', meta: '3 Bereiche', moons: 3, stars: 1, weight: 14 },
  { name: 'Finanzen & Verwaltung', meta: '2 Bereiche', moons: 2, weight: 9 },
  { name: 'Vertrieb', meta: '6 Bereiche', moons: 6, stars: 3, weight: 12 },
  { name: 'Kalender', meta: '2 Termine kommen', moons: 0, stars: 2, weight: 7 },
];

const FIELDS = [
  { label: '1920', width: 1920 - 48 - 340, height: 1080 - 220, phone: false },
  { label: '1440', width: 1440 - 48 - 320, height: 900 - 220, phone: false },
  { label: '390', width: 390 - 32, height: 844 - 330, phone: true },
];

describe('collision-free planet layout', () => {
  for (const f of FIELDS) {
    it(`HQ data has no overlapping planets, labels or moons at ${f.label}`, () => {
      const layout = layoutOrbits({ width: f.width, height: f.height, phone: f.phone, weights: HQ.map((p) => p.weight), labels: HQ });
      // nichts überlappt (Planet, Name, Mondbogen, MÔRA, Rand) …
      expect(layoutOverlap(layout, { ...f, labels: HQ }, 0)).toBe(0);
      // … und am Computer bleibt überall 6 px Luft.
      if (!f.phone) expect(layoutOverlap(layout, { ...f, labels: HQ })).toBe(0);
    });
  }
  it('stays collision-free for 1 to 10 planets on desktop', () => {
    for (let n = 1; n <= 10; n++) {
      const labels = Array.from({ length: n }, (_, i) => ({ ...HQ[i % HQ.length], name: `${HQ[i % HQ.length].name}` }));
      const f = FIELDS[0];
      const layout = layoutOrbits({ width: f.width, height: f.height, phone: false, weights: labels.map((p) => p.weight), labels });
      expect(layoutOverlap(layout, { ...f, labels })).toBe(0);
    }
  });
  it('label sits below front planets and above back planets', () => {
    const layout = layoutOrbits({ width: 1500, height: 860, phone: false, weights: [1, 2, 3, 4], labels: HQ.slice(0, 4) });
    layout.slots.forEach((sl, i) => {
      const [sphere, label] = planetFootprint(layout, sl, HQ[i], false);
      expect(label.y0 >= sphere.y1 - 30 || label.y1 <= sphere.y0 + 30).toBe(true);
    });
  });
});
