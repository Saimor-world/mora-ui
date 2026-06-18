import {
    PLANET_HOVER_ENTER_DWELL_MS,
    PLANET_HOVER_LEAVE_DWELL_MS,
    UNIVERSE_HOVER_RELEASE_MS,
    UNIVERSE_HOVER_RELEASE_HOME_MS,
} from '@/lib/universe/hoverTiming';

describe('universe hover timing', () => {
    it('uses a calm enter dwell before insight UI', () => {
        expect(PLANET_HOVER_ENTER_DWELL_MS).toBeGreaterThanOrEqual(400);
        expect(PLANET_HOVER_ENTER_DWELL_MS).toBeLessThanOrEqual(600);
    });

    it('keeps leave dwell shorter than enter dwell', () => {
        expect(PLANET_HOVER_LEAVE_DWELL_MS).toBeLessThan(PLANET_HOVER_ENTER_DWELL_MS);
    });

    it('releases universe focus shortly after leave', () => {
        expect(UNIVERSE_HOVER_RELEASE_MS).toBeGreaterThan(PLANET_HOVER_LEAVE_DWELL_MS);
        expect(UNIVERSE_HOVER_RELEASE_HOME_MS).toBeLessThanOrEqual(UNIVERSE_HOVER_RELEASE_MS);
    });
});
