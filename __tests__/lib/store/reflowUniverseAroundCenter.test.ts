import { reflowUniverseAroundCenter } from '@/lib/store/widgetStore';
import type { WidgetInstance } from '@/lib/widgets/types';

const LEFT_BAND_END = 4; // cols [0, 4)
const RIGHT_BAND_START = 8; // cols [8, 12)

const widget = (over: Partial<WidgetInstance>): WidgetInstance => ({
    i: 'w', type: 'clock', x: 0, y: 0, w: 4, h: 3, ...over,
});

describe('reflowUniverseAroundCenter', () => {
    it('keeps every widget out of the reserved centre columns [4,8)', () => {
        const items = [
            widget({ i: 'a', x: 4, w: 4 }), // dead centre
            widget({ i: 'b', x: 5, w: 6 }), // straddles centre, wide
            widget({ i: 'c', x: 2, w: 2 }), // already left
            widget({ i: 'd', x: 9, w: 3 }), // already right
        ];
        for (const w of reflowUniverseAroundCenter(items)) {
            const inLeftBand = w.x >= 0 && w.x + w.w <= LEFT_BAND_END;
            const inRightBand = w.x >= RIGHT_BAND_START && w.x + w.w <= 12;
            expect(inLeftBand || inRightBand).toBe(true);
        }
    });

    it('clamps width to a single band and routes by horizontal centre', () => {
        const [wide] = reflowUniverseAroundCenter([widget({ x: 1, w: 8 })]);
        expect(wide.w).toBeLessThanOrEqual(4);
        // centre at x=5 (>6 false → left): mid = 1 + 8/2 = 5 ≤ 6 → left band
        expect(wide.x + wide.w).toBeLessThanOrEqual(LEFT_BAND_END);

        const [rightish] = reflowUniverseAroundCenter([widget({ x: 9, w: 4 })]);
        expect(rightish.x).toBeGreaterThanOrEqual(RIGHT_BAND_START);
    });

    it('preserves vertical position', () => {
        const [out] = reflowUniverseAroundCenter([widget({ x: 5, y: 7, w: 4, h: 5 })]);
        expect(out.y).toBe(7);
        expect(out.h).toBe(5);
    });

    it('is idempotent', () => {
        const items = [widget({ i: 'a', x: 5, w: 6 }), widget({ i: 'b', x: 8, w: 4 })];
        const once = reflowUniverseAroundCenter(items);
        const twice = reflowUniverseAroundCenter(once);
        expect(twice).toEqual(once);
    });
});
