import { validateRaumChange, extractJson, parseRaumLocal, resolveRaumIntent } from '@/lib/os/raumIntent';

const S = { scene: 'build' as const, volume: 0.5, ambientOn: false, warmth: 50, quiet: null };
const SEC = [{ id: 'profile', label: 'Profil' }, { id: 'audio', label: 'Audio' }];

describe('raumIntent', () => {
  it('keeps only allowed fields and clamps values', () => {
    const v = validateRaumChange({ scene: 'night', volume: 140, warmth: -3, quiet: 22, open: 'audio', wallet: 'x', ambientOn: 'ja' }, SEC);
    expect(v?.change).toEqual({ scene: 'night', volume: 1, warmth: 0, quiet: 22, open: 'audio' });
  });
  it('rejects unknown scenes and sections', () => {
    expect(validateRaumChange({ scene: 'party', open: 'root' }, SEC)?.change).toEqual({});
    expect(validateRaumChange('nope', SEC)).toBeNull();
  });
  it('extracts JSON from fenced replies', () => {
    expect(extractJson('```json\n{"scene":"lounge"}\n```')).toEqual({ scene: 'lounge' });
    expect(extractJson('kein json')).toBeNull();
  });
  it('local fallback understands simple phrases', () => {
    expect(parseRaumLocal('Nachts dunkler, Musik an, Stille ab 22', S, SEC)).toEqual({ scene: 'night', ambientOn: true, quiet: 22 });
    expect(parseRaumLocal('Profil', S, SEC)).toEqual({ open: 'profile' });
  });
  it('uses MÔRA when CORE answers, falls back offline otherwise', async () => {
    const ok = await resolveRaumIntent('abends ruhiger', S, SEC, async () => ({ reply: '{"scene":"lounge","volume":30,"note":"Abendlicht, leiser"}' }));
    expect(ok).toEqual({ source: 'mora', change: { scene: 'lounge', volume: 0.3 }, note: 'Abendlicht, leiser' });
    const off = await resolveRaumIntent('leiser', S, SEC, async () => { throw new Error('down'); });
    expect(off.source).toBe('offline');
    expect(off.change.volume).toBeCloseTo(0.3);
  });
});
