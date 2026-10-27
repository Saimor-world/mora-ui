import { layoutOrbits, layoutOverlap, type PlanetLabel } from '@/lib/universe/worldOrbits';

const NAMES: (PlanetLabel & { weight: number })[] = [
  { name: 'R&D', meta: '2 Ordner · 88 Einträge', moons: 2, stars: 1, weight: 88 },
  { name: 'Ohne Abteilung', meta: '2 Ordner · 7 Einträge', moons: 2, weight: 7 },
  { name: 'Growth', meta: '1 Ordner · 3 Einträge', moons: 1, weight: 3 },
  { name: 'Product', meta: '3 Ordner · 0 Einträge', moons: 3, stars: 2, weight: 1 },
  { name: 'Intelligence', meta: 'noch leer', weight: 1 },
  { name: 'Marketing', meta: '5 Bereiche', moons: 2, weight: 5 },
  { name: 'Vertrieb', meta: '6 Bereiche', moons: 3, weight: 4 },
  { name: 'Finance', meta: '1 Ordner · 12 Einträge', moons: 1, weight: 12 },
];
// Pixel-Ansicht: Bahnen wie bisher, nur MÔRA größer (moraBase 150). Feld = Fenster − Kopf − Spalten, Höhe − 160 für die Frageleiste.
const FIELDS = [
  { label: '1280', width: 1280 - 268 - 288, height: 800 - 152 - 160 },
  { label: '1440', width: 1440 - 268 - 288, height: 900 - 152 - 160 },
  { label: '1920', width: 1920 - 268 - 288, height: 1080 - 152 - 160 },
];

describe('pixel view keeps the orbit layout', () => {
  for (const f of FIELDS) {
    for (const n of [3, 4, 5, 6, 7, 8]) {
      it(`${n} planets at ${f.label}: on orbits, no overlaps`, () => {
        const labels = NAMES.slice(0, n);
        const o = { width: f.width, height: f.height, phone: false, weights: labels.map((p) => p.weight), labels, moraBase: n >= 8 ? 120 : 150 };
        const layout = layoutOrbits(o);
        expect(layout.rings.every((r) => r.rx > 0 && r.ry > 0)).toBe(true);
        expect(layoutOverlap(layout, o, 0)).toBe(0);
      });
    }
  }
});
