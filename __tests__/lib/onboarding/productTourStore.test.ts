import {
    isProductTourDismissed,
    markProductTourDismissed,
    resetProductTour,
    PRODUCT_TOUR_SETTINGS_KEY,
} from '@/lib/onboarding/productTourStore';

describe('productTourStore', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('reads dismissal from user settings', () => {
        expect(isProductTourDismissed({ [PRODUCT_TOUR_SETTINGS_KEY]: true })).toBe(true);
        expect(isProductTourDismissed({})).toBe(false);
    });

    it('persists dismissal locally and via sync callback', () => {
        const sync = jest.fn();
        markProductTourDismissed({ syncUserSettings: sync });
        expect(localStorage.getItem('saimor_product_tour_dismissed')).toBe('1');
        expect(sync).toHaveBeenCalledWith({ [PRODUCT_TOUR_SETTINGS_KEY]: true });
        expect(isProductTourDismissed()).toBe(true);
    });

    it('reset clears local flag and server setting', () => {
        markProductTourDismissed();
        const sync = jest.fn();
        resetProductTour({ syncUserSettings: sync });
        expect(localStorage.getItem('saimor_product_tour_dismissed')).toBeNull();
        expect(sync).toHaveBeenCalledWith({ [PRODUCT_TOUR_SETTINGS_KEY]: false });
    });

    it('migrates legacy localStorage key', () => {
        localStorage.setItem('saimor_first_run_tour_v1', 'done');
        expect(isProductTourDismissed()).toBe(true);
    });
});
