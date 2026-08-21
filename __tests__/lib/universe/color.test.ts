import { hexToRgb } from '@/lib/universe/color';

describe('hexToRgb', () => {
    it('liest ein sechsstelliges Hex', () => {
        expect(hexToRgb('#67e8f9')).toEqual([0x67, 0xe8, 0xf9]);
    });

    it('liest ein dreistelliges Hex', () => {
        expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    });
});
