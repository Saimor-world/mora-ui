import { buildDemoUniverse } from '@/features/universe/data/demoUniverse';
import { DEMO_DEPARTMENTS, DEMO_MAIL } from '@/lib/os-prototype/demoPack';
import { sampleTodaySnapshot } from '@/features/today/data/sample';

describe('V1.3 demo pack (Simple Coffee Group) → original universe shapes', () => {
  const demo = buildDemoUniverse();
  it('every department becomes a territory with folder moons and doc counts', () => {
    expect(demo.territories).toHaveLength(DEMO_DEPARTMENTS.length);
    const tech = demo.territories.find((t) => t.name === 'Technology & AI')!;
    expect(tech.documents).toBe(3);
    expect(tech.spaceList?.map((s) => s.name)).toEqual(['Core System']);
    demo.territories.forEach((t) => { expect(t.x).toBeGreaterThan(0); expect(t.y).toBeGreaterThan(0); });
  });
  it('signals point only to existing territories; MÔRA looks at San Francisco', () => {
    const ids = new Set(demo.territories.map((t) => t.id));
    demo.signals.forEach((s) => expect(ids.has(s.targetId)).toBe(true));
    expect(demo.attention.targetId).toBe('demo-sf');
  });
  it('carries no money: business summary has no currency and no revenue', () => {
    expect(demo.business).toEqual({ monthlyRevenueMinor: 0, currency: null, activeCount: 0, providers: [] });
  });
  it('Heute sample uses the demo mail and calendar', () => {
    const s = sampleTodaySnapshot();
    expect(s.mail.items.map((m) => m.subject)).toEqual(DEMO_MAIL.map((m) => m.subject));
    expect(s.calendar.events[0].title).toBe('Store Stuttgart — Schichtplanung Q3');
  });
  it('contains no private names', () => {
    const blocked = new RegExp(['lu' + 'ana', 'lumi' + 'ina', 'chatur' + 'bate'].join('|'), 'i');
    expect(JSON.stringify(demo)).not.toMatch(blocked);
  });
});

describe('V1.3.1 threads and layout', () => {
  const { buildRelationStrands } = jest.requireActual('@/lib/universe/relations');
  it('with an origin override every strand starts at the MÔRA core and ends at its planet centre', () => {
    const demo = buildDemoUniverse();
    const strands = buildRelationStrands(demo.signals, demo.territories, { x: 50, y: 50 });
    expect(strands.length).toBeGreaterThan(0);
    strands.forEach((s: any) => {
      const [, sx, sy] = /^M\s*([\d.]+)[ ,]([\d.]+)/.exec(s.d)!.map(Number);
      expect(Math.hypot(sx - 50, sy - 50)).toBeLessThan(4); // beginnt am Kernrand
      const t = demo.territories.find((x) => x.id === s.targetId)!;
      expect([s.endX, s.endY]).toEqual([t.x, t.y]);
    });
  });
  it('without override the legacy edge origins stay unchanged', () => {
    const demo = buildDemoUniverse();
    const strands = buildRelationStrands(demo.signals, demo.territories);
    expect(strands.some((s: any) => { const [, sx, sy] = /^M\s*(-?[\d.]+)[ ,](-?[\d.]+)/.exec(s.d)!.map(Number); return Math.hypot(sx - 50, sy - 50) > 20; })).toBe(true);
  });
  it('all planets stay inside the field (0..100) in both layouts', () => {
    for (const compact of [false, true]) {
      buildDemoUniverse({ compact }).territories.forEach((t) => {
        expect(t.x).toBeGreaterThan(0); expect(t.x).toBeLessThan(100);
        expect(t.y).toBeGreaterThan(0); expect(t.y).toBeLessThan(100);
      });
    }
  });
});
