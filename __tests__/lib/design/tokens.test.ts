import {
    typeScale,
    semanticColor,
    levelToMeaning,
    surfaceTone,
    glow,
    elevation,
    type SemanticMeaning,
} from '@/lib/design/tokens';

describe('design tokens', () => {
    describe('typeScale', () => {
        it('every scale entry is a non-empty className string', () => {
            Object.values(typeScale).forEach((cls) => {
                expect(typeof cls).toBe('string');
                expect(cls.length).toBeGreaterThan(0);
            });
        });

        it('exposes the full intent hierarchy', () => {
            expect(Object.keys(typeScale)).toEqual(
                expect.arrayContaining(['hero', 'display', 'title', 'section', 'body', 'meta']),
            );
        });
    });

    describe('semanticColor', () => {
        const meanings: SemanticMeaning[] = ['critical', 'warning', 'safe', 'ai', 'info', 'neutral'];
        const requiredKeys = ['text', 'bg', 'border', 'glow', 'glowStrong', 'accent', 'chip', 'chipText'];

        it.each(meanings)('"%s" returns all required palette keys as non-empty strings', (meaning) => {
            const palette = semanticColor(meaning);
            requiredKeys.forEach((key) => {
                const value = palette[key as keyof typeof palette];
                expect(typeof value).toBe('string');
                expect(value.length).toBeGreaterThan(0);
            });
        });
    });

    describe('levelToMeaning', () => {
        it('maps German risk levels to meanings', () => {
            expect(levelToMeaning('Kritisch')).toBe('critical');
            expect(levelToMeaning('Sicher')).toBe('safe');
            expect(levelToMeaning('Mittel')).toBe('warning');
        });

        it('defaults unknown / undefined level to warning', () => {
            expect(levelToMeaning(undefined)).toBe('warning');
            expect(levelToMeaning('xyz')).toBe('warning');
        });
    });

    describe('surfaceTone', () => {
        it('exposes base, raised, glass tones as non-empty strings', () => {
            expect(surfaceTone.base.length).toBeGreaterThan(0);
            expect(surfaceTone.raised.length).toBeGreaterThan(0);
            expect(surfaceTone.glass.length).toBeGreaterThan(0);
        });
    });

    describe('glow + elevation', () => {
        it('glow helpers produce CSS strings containing the input color', () => {
            const c = 'rgba(239,68,68,0.28)';
            expect(glow.soft(c)).toContain(c);
            expect(glow.strong(c)).toContain(c);
            expect(glow.text(c)).toContain(c);
            expect(glow.radial(c)).toContain(c);
        });

        it('glow.radial accepts a custom focal point', () => {
            expect(glow.radial('rgba(0,0,0,0.1)', '80% 80%')).toContain('80% 80%');
        });

        it('elevation recipes are non-empty CSS strings', () => {
            expect(elevation.card.length).toBeGreaterThan(0);
            expect(elevation.floating.length).toBeGreaterThan(0);
            expect(elevation.glassEdge.length).toBeGreaterThan(0);
        });
    });
});
