import { buildLandscape } from '@/features/universe/data/landscape';
import { sampleLandscapeInput } from '@/features/universe/data/sample';

describe('universe landscape model', () => {
  const labs = { count: 18, names: ['Scanner'] };
  it('maps every OS area to a planet with a matching /os target', () => {
    const l = buildLandscape({ ...sampleLandscapeInput(), finance: { kind: 'state', label: 'nicht geprüft' }, labs });
    expect(l.planets.map((p) => [p.id, p.target])).toEqual([
      ['today', 'today'], ['post', 'post'], ['finance', 'finance'], ['knowledge', 'knowledge'],
      ['spaces', 'universe:organization'], ['connections', 'settings'], ['labs', 'labs'],
    ]);
  });
  it('marks sample planets, never finance (finance stays contract truth)', () => {
    const l = buildLandscape({ ...sampleLandscapeInput(), finance: { kind: 'state', label: 'x' }, labs });
    expect(l.planets.find((p) => p.id === 'today')!.sample).toBe(true);
    expect(l.planets.find((p) => p.id === 'finance')!.sample).toBe(false);
    expect(l.planets.find((p) => p.id === 'finance')!.metrics[0].value).toBe('nicht belegt');
  });
  it('draws assigned strands from MÔRA for signals and inferred strands only with evidence', () => {
    const l = buildLandscape({ ...sampleLandscapeInput(), finance: { kind: 'state', label: 'x' }, labs });
    expect(l.strands.find((s) => s.id === 'mora-today')?.evidence).toBe('assigned');
    expect(l.strands.find((s) => s.id === 'post-finance')?.evidence).toBe('inferred');
    const empty = buildLandscape({ sample: false });
    expect(empty.strands.filter((s) => s.from !== 'mora')).toEqual([]);
  });
  it('without data planets are "unknown", not empty; attention picks a warning first', () => {
    const empty = buildLandscape({ sample: false });
    expect(empty.planets.find((p) => p.id === 'post')!.tone).toBe('unknown');
    const l = buildLandscape({ ...sampleLandscapeInput(), finance: { kind: 'value', label: 'Stand', value: '1 €', warnings: 0 }, labs });
    expect(l.attention?.planetId).toBe('today');
  });
});
