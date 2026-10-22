import { ORBIT, orbitRxOf, placeUniverse, type UniverseModel } from '@/lib/universe/planetModel';
import {
  MOON_MAX, UNIVERSE_PLANET_MAX, UNIVERSE_PLANET_MIN, clearanceFromMora, depthZ, matteTone, moonSize,
  pointOnOrbit, universePlanetSize, visibleMoons,
} from '@/lib/universe/stylebookPlanets';

const look = (a: string, g: string, seed = 1) => ({ archetype: a, hue: 40, glyph: g, seed });
const sys = (cap: string, angle: number) => ({ key: `system:${cap}`, kind: 'system' as const, capability: cap, label: cap, state: 'active' as const, size: 'M' as const, brightness: 1, score: 1, ring: 1, angle, look: look('ocean', 'mail'), moons: [], more_moons: 0, counts: {} });
const dom = (id: string) => ({ key: `dept:${id}`, kind: 'domain' as const, department_id: id, label: id, state: 'active' as const, size: 'S' as const, brightness: 1, score: 1, ring: 2, look: look('pearl', 'box'), moons: [], more_moons: 0, counts: { docs: 2, spaces: 1 } });
const model = (planets: any[]): UniverseModel => ({ company: { id: 'c', name: 'Beispiel', sector: 'live', industry_template: 'generic', template_label: 'Allgemein' }, edition: 'customer', model_version: 1, planets, clusters: [], belt: null, suggestions: [] } as UniverseModel);

// Planet field in OrganizationField at 1440×900 (xl) and the tightest desktop case 1024×768 (lg).
const FIELDS = [{ width: 1440 - 2 * 285, height: 900 - 210 - 96 }, { width: 1024 - 2 * 168, height: 768 - 210 - 96 }];
const MORA_CORE = 56;

describe('moon size from data', () => {
  it('follows max(56, 34 + count·9) on the computer and max(56, 22 + count·5) on the phone', () => {
    expect(moonSize(0)).toBe(56);
    expect(moonSize(2)).toBe(56);
    expect(moonSize(6)).toBe(88);
    expect(moonSize(6, 'phone')).toBe(56);
    expect(moonSize(8, 'phone')).toBe(62);
  });

  it('never drops below the 56-px touch target and is capped for very full spaces', () => {
    expect(moonSize(-3)).toBe(56);
    expect(moonSize(Number.NaN)).toBe(56);
    expect(moonSize(100)).toBe(MOON_MAX.desktop);
    expect(moonSize(100, 'phone')).toBe(MOON_MAX.phone);
  });

  it('shows created spaces even when empty, but no empty derived group', () => {
    const moons = [{ id: 'a', count: 0 }, { id: 'b', count: 0, derived: true }, { id: 'c', count: 3, derived: true }];
    expect(visibleMoons(moons).map((m) => m.id)).toEqual(['a', 'c']);
  });
});

describe('planets in the universe', () => {
  it('are 58–72 px', () => {
    expect(universePlanetSize(20)).toBe(UNIVERSE_PLANET_MIN);
    expect(universePlanetSize(64)).toBe(64);
    expect(universePlanetSize(140)).toBe(UNIVERSE_PLANET_MAX);
  });

  it('sit exactly on their drawn orbit and never inside MÔRA\'s circle', () => {
    for (let n = 1; n <= 8; n++) {
      const planets = [
        ...Array.from({ length: Math.ceil(n / 2) }, (_, i) => sys(`s${i}`, i * 60)),
        ...Array.from({ length: Math.floor(n / 2) }, (_, i) => dom(`d${i}`)),
      ];
      for (const body of placeUniverse(model(planets))) {
        const rx = orbitRxOf(body.x, body.y);
        // The ellipse OrganizationField draws for this planet passes through its centre.
        const onEllipse = ((body.x - 50) / rx) ** 2 + ((body.y - 50) / (rx * ORBIT.aspect)) ** 2;
        expect(onEllipse).toBeCloseTo(1, 6);
        for (const field of FIELDS) {
          expect(clearanceFromMora(body, UNIVERSE_PLANET_MAX, field, MORA_CORE)).toBeGreaterThan(0);
        }
      }
    }
  });

  it('use the same formula for orbit and position', () => {
    const p = pointOnOrbit(30, ORBIT.aspect, 210);
    expect(orbitRxOf(p.x, p.y)).toBeCloseTo(30, 6);
  });

  it('are stacked by depth: closer (lower) planets above those behind', () => {
    expect(depthZ(80)).toBeGreaterThan(depthZ(20));
    expect(depthZ(-5)).toBe(depthZ(0));
  });
});

describe('matte tone', () => {
  it('is stable per name and matte (a soft shade, no highlight)', () => {
    expect(matteTone('Termine')).toEqual(matteTone('termine '));
    const tone = matteTone('Kundinnen');
    expect(tone.background).toBe(`radial-gradient(circle at 35% 30%, ${tone.light}, ${tone.dark} 70%)`);
    expect(tone.background).not.toMatch(/#fff|white|rgba\(255/i);
  });
});
