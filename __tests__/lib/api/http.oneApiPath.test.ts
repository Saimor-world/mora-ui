import { getCoreBaseUrl } from '@/lib/api/http';

describe('getCoreBaseUrl (one API path)', () => {
    const env = { ...process.env };
    afterEach(() => { process.env = { ...env }; });

    it('always uses the same-origin proxy in the browser, even with an absolute public URL', () => {
        process.env.NEXT_PUBLIC_SAIMOR_CORE_URL = 'https://api.saimor.world';
        process.env.NEXT_PUBLIC_CORE_API_URL = 'https://api.saimor.world';
        expect(getCoreBaseUrl()).toBe('/api/core');
    });
});
