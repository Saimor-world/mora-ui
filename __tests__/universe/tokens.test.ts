import { TYPE, UV, dateEyebrow } from '@/lib/universe/tokens';

describe('Saimôr Universe Designsprache', () => {
  it('nutzt die Marken-Farben von saimor.world', () => {
    expect(UV.gold).toBe('#D6A848');
    expect(UV.cream).toBe('#F7F4E9');
    expect(UV.ink).toBe('#050706');
  });
  it('hat höchstens drei Schriftfamilien und nur Serif für Aussagen', () => {
    const families = new Set(Object.values(TYPE).map((t) => t.fontFamily));
    expect(families.size).toBe(3);
    expect(TYPE.display.fontFamily).toContain('Cormorant');
    expect(TYPE.meta.fontFamily).toContain('Space Mono');
  });
  it('schreibt die Eyebrow auf Deutsch', () => {
    expect(dateEyebrow(new Date('2026-10-13T08:00:00'))).toMatch(/Dienstag · 13\. Oktober/);
  });
});
