import { relativeTime, normalizePrivateAreaLabel, kindLabel } from '@/components/home/homeSurfaceFormat';

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('relativeTime', () => {
  it('says "gerade eben" under a minute', () => {
    expect(relativeTime(ago(30_000))).toBe('gerade eben');
  });
  it('reports minutes', () => {
    expect(relativeTime(ago(5 * MIN))).toBe('vor 5 Min.');
  });
  it('reports hours', () => {
    expect(relativeTime(ago(3 * HOUR))).toBe('vor 3 Std.');
  });
  it('reports a single day with singular suffix', () => {
    expect(relativeTime(ago(1 * DAY + HOUR))).toBe('vor 1 Tag');
  });
  it('reports multiple days with plural suffix', () => {
    expect(relativeTime(ago(3 * DAY))).toBe('vor 3 Tagen');
  });
  it('falls back to an absolute date beyond two weeks', () => {
    const out = relativeTime(ago(40 * DAY));
    expect(out).not.toMatch(/vor|gerade/);
    expect(out).toMatch(/\d/);
  });
});

describe('normalizePrivateAreaLabel', () => {
  it('defaults empty/nullish to "Privater Bereich"', () => {
    expect(normalizePrivateAreaLabel('')).toBe('Privater Bereich');
    expect(normalizePrivateAreaLabel(null)).toBe('Privater Bereich');
    expect(normalizePrivateAreaLabel(undefined)).toBe('Privater Bereich');
  });
  it('maps generic space names to "Privater Bereich"', () => {
    expect(normalizePrivateAreaLabel('My Space')).toBe('Privater Bereich');
    expect(normalizePrivateAreaLabel('personal space')).toBe('Privater Bereich');
  });
  it('keeps a meaningful custom label', () => {
    expect(normalizePrivateAreaLabel('Marius Privat')).toBe('Marius Privat');
  });
});

describe('kindLabel', () => {
  it('maps each kind to its German label', () => {
    expect(kindLabel('document')).toBe('Dokument');
    expect(kindLabel('finder')).toBe('Finder');
    expect(kindLabel('notes')).toBe('Notizen');
    expect(kindLabel('chat')).toBe('Mora');
    expect(kindLabel('other')).toBe('Aktivität');
  });
});
