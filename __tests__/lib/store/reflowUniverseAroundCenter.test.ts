import { reflowUniverseAroundCenter } from '@/lib/store/widgetStore';
import type { WidgetInstance } from '@/lib/widgets/types';

const LEFT_BAND_END = 5;
const RIGHT_BAND_START = 7;

const widget = (over: Partial<WidgetInstance>): WidgetInstance => ({
    i: 'w', type: 'clock', x: 0, y: 0, w: 2, h: 2, ...over,
});

describe('reflowUniverseAroundCenter', () => {
    it('keeps every widget in a peripheral glance band, not the centre', () => {
        const items = [
            widget({ i: 'a', type: 'clock', x: 4, w: 2 }),
            widget({ i: 'b', type: 'orgStats', x: 5, w: 6 }),
            widget({ i: 'c', type: 'signals', x: 1, w: 2 }),
            widget({ i: 'd', type: 'signals', x: 9, w: 2 }),
        ];
        for (const w of reflowUniverseAroundCenter(items)) {
            const inLeftBand = w.x >= 0 && w.x + w.w <= LEFT_BAND_END;
            const inRightBand = w.x >= RIGHT_BAND_START && w.x + w.w <= 12;
            expect(inLeftBand || inRightBand).toBe(true);
        }
    });

    it('clamps width and height to glance caps', () => {
        const [clock] = reflowUniverseAroundCenter([widget({ type: 'clock', x: 1, w: 4, h: 5 })]);
        expect(clock.w).toBeLessThanOrEqual(2);
        expect(clock.h).toBeLessThanOrEqual(2);

        const [nw] = reflowUniverseAroundCenter([widget({ i: 'nw', type: 'nightwatch', x: 0, w: 6, h: 9 })]);
        expect(nw.w).toBeLessThanOrEqual(3);
        expect(nw.h).toBeLessThanOrEqual(5);
    });

    it('preserves vertical position', () => {
        const [out] = reflowUniverseAroundCenter([widget({ x: 5, y: 7, w: 2, h: 2 })]);
        expect(out.y).toBe(7);
    });

    it('is idempotent', () => {
        const items = [widget({ i: 'a', type: 'nightwatch', x: 5, w: 6, h: 8 }), widget({ i: 'b', type: 'signals', x: 9, w: 3, h: 4 })];
        const once = reflowUniverseAroundCenter(items);
        const twice = reflowUniverseAroundCenter(once);
        expect(twice).toEqual(once);
    });
});
