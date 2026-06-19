import {
    COSMOS_ZONE,
    isNearAnyPlanet,
    resolveUniverseFocusMode,
    resolveUniverseInteractionZone,
    universeWidgetOpacity,
    widgetOverlapsCosmosColumns,
} from '@/lib/universe/interactionZones';

describe('interactionZones', () => {
    describe('resolveUniverseInteractionZone', () => {
        it('classifies centre viewport as cosmos', () => {
            expect(resolveUniverseInteractionZone(0.5, 0.5)).toBe('cosmos');
        });

        it('classifies left edge as peripheral', () => {
            expect(resolveUniverseInteractionZone(0.08, 0.5)).toBe('peripheral');
        });

        it('respects cosmos bounds', () => {
            expect(resolveUniverseInteractionZone(COSMOS_ZONE.minX, COSMOS_ZONE.minY)).toBe('cosmos');
            expect(resolveUniverseInteractionZone(COSMOS_ZONE.minX - 0.01, 0.5)).toBe('peripheral');
        });
    });

    describe('widgetOverlapsCosmosColumns', () => {
        it('detects centre-spanning widgets', () => {
            expect(widgetOverlapsCosmosColumns(2, 4)).toBe(true);
        });

        it('allows left-band widgets', () => {
            expect(widgetOverlapsCosmosColumns(0, 3)).toBe(false);
        });

        it('allows right-band widgets', () => {
            expect(widgetOverlapsCosmosColumns(7, 3)).toBe(false);
            expect(widgetOverlapsCosmosColumns(10, 2)).toBe(false);
        });
    });

    describe('isNearAnyPlanet', () => {
        const planets = [{ x: 20, y: 40 }, { x: 80, y: 40 }];

        it('returns true near a planet', () => {
            expect(isNearAnyPlanet(0.2, 0.4, planets)).toBe(true);
        });

        it('returns false in open cosmos', () => {
            expect(isNearAnyPlanet(0.5, 0.5, planets)).toBe(false);
        });
    });

    describe('resolveUniverseFocusMode', () => {
        it('prioritises explore in cosmos zone', () => {
            expect(resolveUniverseFocusMode({
                zone: 'cosmos',
                nearPlanet: false,
                planetHovered: false,
                widgetHovered: false,
            })).toBe('explore');
        });

        it('allows widget focus at peripheral edge when hovered', () => {
            expect(resolveUniverseFocusMode({
                zone: 'peripheral',
                nearPlanet: false,
                planetHovered: false,
                widgetHovered: true,
            })).toBe('widget');
        });

        it('explore when near planet even at edge', () => {
            expect(resolveUniverseFocusMode({
                zone: 'peripheral',
                nearPlanet: true,
                planetHovered: false,
                widgetHovered: false,
            })).toBe('explore');
        });
    });

    describe('universeWidgetOpacity', () => {
        it('dims widgets in explore mode', () => {
            expect(universeWidgetOpacity('explore', false)).toBeLessThan(0.2);
        });

        it('keeps widgets readable in peripheral mode', () => {
            expect(universeWidgetOpacity('peripheral', false)).toBeGreaterThanOrEqual(0.35);
        });
    });
});
