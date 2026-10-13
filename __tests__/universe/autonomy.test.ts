import { capPlanets, attentionScores, attentionLevel, attentionDiameter, MAX_PLANETS } from '@/lib/universe/autonomy';

const deps = (n: number) => Array.from({ length: n }, (_, i) => ({ id: 'd' + i, name: 'Bereich ' + i }));

describe('capPlanets', () => {
    it('leaves up to 7 untouched', () => {
        expect(capPlanets(deps(3), {}).planets).toHaveLength(3);
        expect(capPlanets(deps(7), {}).overflow).toHaveLength(0);
    });
    it('keeps 6 by substance and moves the rest to overflow for 12', () => {
        const sub = Object.fromEntries(deps(12).map((d, i) => [d.id, i]));
        const r = capPlanets(deps(12), sub);
        expect(r.planets).toHaveLength(MAX_PLANETS - 1);
        expect(r.overflow).toHaveLength(6);
        expect(r.planets.map((d) => d.id)).toContain('d11');
        expect(r.overflow.map((d) => d.id)).toContain('d0');
    });
});

describe('attention', () => {
    it('is calm and equal without signals', () => {
        const s = attentionScores(['a', 'b'], []);
        expect(s).toEqual({ a: 0, b: 0 });
        expect(attentionLevel(0, false)).toBe('mitte');
        expect(attentionDiameter(0, false)).toBe(attentionDiameter(1, false));
    });
    it('weights incidents above mail and ignores unknown targets', () => {
        const s = attentionScores(['a', 'b'], [{ targetId: 'a', kind: 'mail' }, { targetId: 'b', kind: 'nightwatch' }, { targetId: 'x', kind: 'mail' }]);
        expect(s.b).toBe(1);
        expect(s.a).toBeCloseTo(0.5);
        expect(attentionLevel(s.b, true)).toBe('vorn');
        expect(attentionLevel(0, true)).toBe('ruhig');
    });
});
