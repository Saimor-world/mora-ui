import {
  UNIVERSE_SAFE_BOUNDS,
  UNIVERSE_CORE_POINT,
  routePointToward,
  distancePointToSegment,
  stableUniverseHash,
  clampUniverseCoordinate,
  buildSoftUniverseRoute,
  buildOrganicUniverseLayout,
  universeMinPlanetSeparation,
} from '@/lib/universe/layout';

describe('clampUniverseCoordinate', () => {
  it('clamps to the given range', () => {
    expect(clampUniverseCoordinate(5, 10, 20)).toBe(10);
    expect(clampUniverseCoordinate(25, 10, 20)).toBe(20);
    expect(clampUniverseCoordinate(15, 10, 20)).toBe(15);
  });
});

describe('stableUniverseHash', () => {
  it('is deterministic and returns an unsigned 32-bit int', () => {
    expect(stableUniverseHash('')).toBe(2166136261); // FNV-1a offset basis
    expect(stableUniverseHash('abc')).toBe(stableUniverseHash('abc'));
    expect(stableUniverseHash('abc')).not.toBe(stableUniverseHash('abd'));
    expect(stableUniverseHash('x') >>> 0).toBe(stableUniverseHash('x'));
  });
});

describe('routePointToward', () => {
  it('moves "offset" units from `from` toward `to`', () => {
    expect(routePointToward({ x: 0, y: 0 }, { x: 10, y: 0 }, 3)).toEqual({ x: 3, y: 0 });
  });
});

describe('distancePointToSegment', () => {
  it('returns the perpendicular distance to a segment', () => {
    expect(distancePointToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5);
  });
  it('handles a degenerate (zero-length) segment', () => {
    expect(distancePointToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBeCloseTo(5);
  });
});

describe('buildSoftUniverseRoute', () => {
  it('returns a cubic SVG path and a label point, deterministically', () => {
    const a = buildSoftUniverseRoute({ x: 30, y: 30 }, { x: 70, y: 55 }, 'k1', 2, 0.2, 4, 18);
    const b = buildSoftUniverseRoute({ x: 30, y: 30 }, { x: 70, y: 55 }, 'k1', 2, 0.2, 4, 18);
    expect(a).toEqual(b);
    expect(a.d).toMatch(/^M .* C /);
    expect(typeof a.labelX).toBe('number');
    expect(typeof a.labelY).toBe('number');
  });
});

describe('buildOrganicUniverseLayout', () => {
  it('returns an empty layout for no departments', () => {
    expect(buildOrganicUniverseLayout([], {})).toEqual([]);
  });

  it('places every department within the safe bounds, deterministically', () => {
    const depts = [
      { id: 'd1', name: 'Vertrieb', color: '#1' },
      { id: 'd2', name: 'HR', color: '#2' },
      { id: 'd3', name: 'Technik', color: '#3' },
    ];
    const metrics = {
      d1: { nodes: 10, spaces: 2, folders: 3, health: 1 },
      d2: { nodes: 1, spaces: 1, folders: 0, health: 1 },
      d3: { nodes: 5, spaces: 0, folders: 1, health: 1 },
    };
    const out = buildOrganicUniverseLayout(depts, metrics);
    expect(out).toHaveLength(3);
    for (const p of out) {
      expect(p.x).toBeGreaterThanOrEqual(UNIVERSE_SAFE_BOUNDS.minX);
      expect(p.x).toBeLessThanOrEqual(UNIVERSE_SAFE_BOUNDS.maxX);
      expect(p.y).toBeGreaterThanOrEqual(UNIVERSE_SAFE_BOUNDS.minY);
      expect(p.y).toBeLessThanOrEqual(UNIVERSE_SAFE_BOUNDS.maxY);
      expect(typeof p.id).toBe('string');
    }
    expect(buildOrganicUniverseLayout(depts, metrics)).toEqual(out);
  });

  it('keeps the core point constant', () => {
    expect(UNIVERSE_CORE_POINT).toEqual({ x: 50, y: 50 });
  });

  // Frueher stand hier ein fester Radius von 14 um den Mittelpunkt. Seit
  // cc6cc2c ("restrict planet orbits to central corridor 31%..69% to prevent
  // widget collision") ist die Vorgabe eine andere und praezisere: die Planeten
  // muessen die Widget-Spalten links (0..30%) und rechts (70..100%) freihalten.
  // Ein Radius sagt darueber nichts - ein Punkt bei 23 Einheiten Abstand kann
  // im Korridor liegen oder daneben, je nach Richtung. Geprueft wird deshalb
  // die Grenze selbst, nicht ein Ersatzmass dafuer.
  it('keeps planets inside the central corridor that clears the widget columns', () => {
    const depts = Array.from({ length: 8 }, (_, i) => ({
      id: `d${i}`,
      name: `Dept ${i}`,
      color: '#000',
    }));
    const metrics = Object.fromEntries(
      depts.map((d) => [d.id, { nodes: 3, spaces: 1, folders: 1, health: 1 }]),
    );
    const out = buildOrganicUniverseLayout(depts, metrics);
    for (const p of out) {
      expect(p.x).toBeGreaterThanOrEqual(UNIVERSE_SAFE_BOUNDS.minX);
      expect(p.x).toBeLessThanOrEqual(UNIVERSE_SAFE_BOUNDS.maxX);
      expect(p.y).toBeGreaterThanOrEqual(UNIVERSE_SAFE_BOUNDS.minY);
      expect(p.y).toBeLessThanOrEqual(UNIVERSE_SAFE_BOUNDS.maxY);
    }
  });

  it('keeps four departments separated enough to avoid visual overlap', () => {
    const depts = [
      { id: 'brain', name: 'Brain', color: '#1' },
      { id: 'finance', name: 'Finance', color: '#2' },
      { id: 'lab', name: 'Lab', color: '#3' },
      { id: 'ops', name: 'Operations', color: '#4' },
    ];
    const metrics = Object.fromEntries(
      depts.map((d) => [d.id, { nodes: 8, spaces: 2, folders: 2, health: 80 }]),
    );
    const out = buildOrganicUniverseLayout(depts, metrics);
    expect(out).toHaveLength(4);
    const minSep = universeMinPlanetSeparation(4);
    for (let i = 0; i < out.length; i += 1) {
      for (let j = i + 1; j < out.length; j += 1) {
        const distance = Math.hypot(out[i].x - out[j].x, out[i].y - out[j].y);
        expect(distance).toBeGreaterThanOrEqual(minSep * 0.95);
      }
    }
  });
});
