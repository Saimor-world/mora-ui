import { reflowUniverseAroundCenter } from '@/lib/store/widgetStore';
import type { WidgetInstance } from '@/lib/widgets/types';

const LEFT_BAND_END = 3; // cols [0, 3)
const RIGHT_BAND_START = 9; // cols [9, 12)

const widget = (over: Partial<WidgetInstance>): WidgetInstance => ({
    i: 'w', type: 'clock', x: 0, y: 0, w: 3, h: 3, ...over,
});

describe('reflowUniverseAroundCenter', () => {
    it('keeps every widget in a peripheral glance band, not the centre', () => {
        const items = [
            widget({ i: 'a', x: 4, w: 3 }), // dead centre
            widget({ i: 'b', x: 5, w: 6 }), // straddles centre, wide
            widget({ i: 'c', x: 1, w: 2 }), // already left
            widget({ i: 'd', x: 9, w: 3 }), // already right
        ];
        for (const w of reflowUniverseAroundCenter(items)) {
            const inLeftBand = w.x >= 0 && w.x + w.w <= LEFT_BAND_END;
            const inRightBand = w.x >= RIGHT_BAND_START && w.x + w.w <= 12;
            expect(inLeftBand || inRightBand).toBe(true);
        }
    });

    it('clamps width to a single glance band and routes by horizontal centre', () => {
        const [wide] = reflowUniverseAroundCenter([widget({ x: 1, w: 8 })]);
        expect(wide.w).toBeLessThanOrEqual(3);
        expect(wide.x + wide.w).toBeLessThanOrEqual(LEFT_BAND_END);

        const [rightish] = reflowUniverseAroundCenter([widget({ x: 9, w: 3 })]);
        expect(rightish.x).toBeGreaterThanOrEqual(RIGHT_BAND_START);
    });

    it('preserves vertical position', () => {
        const [out] = reflowUniverseAroundCenter([widget({ x: 5, y: 7, w: 3, h: 5 })]);
        expect(out.y).toBe(7);
        expect(out.h).toBe(5);
    });

    it('is idempotent', () => {
        const items = [widget({ i: 'a', x: 5, w: 6 }), widget({ i: 'b', x: 9, w: 3 })];
        const once = reflowUniverseAroundCenter(items);
        const twice = reflowUniverseAroundCenter(once);
        expect(twice).toEqual(once);
    });
});
