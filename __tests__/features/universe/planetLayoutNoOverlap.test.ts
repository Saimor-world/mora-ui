import { computePlanetSlots } from '@/features/home/cockpit/Scene';
import { layoutOrbits, planetFootprint, type PlanetLabel, type Rect } from '@/lib/universe/worldOrbits';

function rectOverlap(a: Rect, b: Rect, pad = 0): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + pad;
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + pad;
  return w > 0 && h > 0 ? w * h : 0;
}

describe('Planet layout overlap regression test (7 planets)', () => {
  const DEPARTMENTS_7 = [
    { id: 'geschaeftsleitung', title: 'Geschäftsleitung', moons: [{ id: 'm1' }, { id: 'm2' }] },
    { id: 'produkt-design', title: 'Produkt & Design', moons: [{ id: 'm3' }] },
    { id: 'engineering', title: 'Engineering', moons: [{ id: 'm4' }, { id: 'm5' }, { id: 'm6' }] },
    { id: 'marketing', title: 'Marketing', moons: [{ id: 'm7' }] },
    { id: 'vertrieb', title: 'Vertrieb', moons: [{ id: 'm8' }] },
    { id: 'kundenservice', title: 'Kundenservice', moons: [{ id: 'm9' }] },
    { id: 'finanzen', title: 'Finanzen', moons: [{ id: 'm10' }, { id: 'm11' }] },
  ];

  const VIEWPORTS = [
    { name: 'Desktop (1440x900)', width: 1440 - 180, height: 900 - 240, phone: false },
    { name: 'Tablet (1024x768)', width: 1024 - 120, height: 768 - 220, phone: false },
    { name: 'Mobile (390x844)', width: 390 - 32, height: 844 - 280, phone: true },
  ];

  VIEWPORTS.forEach(({ name, width, height, phone }) => {
    test(`keine zwei Positionen oder Label-Boxen überlappen bei 7 Abteilungen auf ${name}`, () => {
      const slots = computePlanetSlots(DEPARTMENTS_7, { width, height, phone });
      expect(slots).toHaveLength(7);

      // 1. Keine zwei Planeten teilen sich dieselbe Position (Distanzprüfung der Zentren)
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const a = slots[i];
          const b = slots[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          // Mittelpunkte dürfen keinesfalls aufeinanderliegen
          expect(dist).toBeGreaterThan(30);
        }
      }

      // 2. Erzeuge Bounding-Boxen für Kugel und Label-Box jedes Planeten
      const footprints: Rect[][] = slots.map((s, i) => {
        const title = DEPARTMENTS_7[i].title;
        const r = s.size / 2;
        const labelW = Math.min(phone ? 104 : 140, Math.max(60, title.length * 7));
        const labelH = 36;

        const sphereRect: Rect = {
          x0: s.x - r,
          y0: s.y - r,
          x1: s.x + r,
          y1: s.y + r,
          kind: 'sphere',
        };

        const labelRect: Rect = {
          x0: s.x - labelW / 2,
          y0: s.y + r + 4,
          x1: s.x + labelW / 2,
          y1: s.y + r + 4 + labelH,
          kind: 'label',
        };

        return [sphereRect, labelRect];
      });

      // 3. Prüfe paarweise Überdeckung: keine zwei Körper/Labels überlappen
      let totalOverlaps = 0;
      for (let i = 0; i < footprints.length; i++) {
        for (let j = i + 1; j < footprints.length; j++) {
          for (const boxA of footprints[i]) {
            for (const boxB of footprints[j]) {
              const area = rectOverlap(boxA, boxB, 0);
              if (area > 0) {
                totalOverlaps++;
              }
            }
          }
        }
      }

      expect(totalOverlaps).toBe(0);
    });
  });
});

describe('PixelUniverseOverview layout overlap test (7 planets with moon orbits in footprint)', () => {
  const DEPARTMENTS_7 = [
    { id: 'geschaeftsleitung', title: 'Geschäftsleitung', moons: [{ id: 'm1' }, { id: 'm2' }] },
    { id: 'produkt-design', title: 'Produkt & Design', moons: [{ id: 'm3' }] },
    { id: 'engineering', title: 'Engineering', moons: [{ id: 'm4' }, { id: 'm5' }, { id: 'm6' }] },
    { id: 'marketing', title: 'Marketing', moons: [{ id: 'm7' }] },
    { id: 'vertrieb', title: 'Vertrieb', moons: [{ id: 'm8' }] },
    { id: 'kundenservice', title: 'Kundenservice', moons: [{ id: 'm9' }] },
    { id: 'finanzen', title: 'Finanzen', moons: [{ id: 'm10' }, { id: 'm11' }] },
  ];

  const VIEWPORTS = [
    { name: 'Desktop (1440x900)', width: 1440, height: 900 - 140, phone: false },
    { name: 'Tablet (1024x768)', width: 1024, height: 768 - 140, phone: false },
    { name: 'Mobile (390x844)', width: 390, height: 844 - 180, phone: true },
  ];

  VIEWPORTS.forEach(({ name, width, height, phone }) => {
    test(`keine zwei Planeten oder Mondbahnen überlappen im Pixel-Layout auf ${name}`, () => {
      const weights = DEPARTMENTS_7.map((_, i) => 50 + (i % 3) * 10);
      const labels: PlanetLabel[] = DEPARTMENTS_7.map((p) => ({
        name: p.title,
        moons: p.moons.length,
      }));

      const layout = layoutOrbits({
        width,
        height,
        weights,
        phone,
        calm: true,
        moraBase: 0,
        labels,
      });

      expect(layout.slots).toHaveLength(7);

      // Footprints inklusive Kugel, Label und Mondbahnen
      const allFootprints: Rect[][] = layout.slots.map((slot, i) =>
        planetFootprint(layout, slot, labels[i], phone)
      );

      let overlaps = 0;
      for (let i = 0; i < allFootprints.length; i++) {
        for (let j = i + 1; j < allFootprints.length; j++) {
          for (const boxA of allFootprints[i]) {
            for (const boxB of allFootprints[j]) {
              // Bounding-Box Überlappung
              const area = rectOverlap(boxA, boxB, 0);
              if (area > 0) {
                overlaps++;
              }
            }
          }
        }
      }

      expect(overlaps).toBe(0);
    });
  });
});
