import { isBegleiterDemoAllowed } from '@/lib/begleiter/demoAccess';

describe('isBegleiterDemoAllowed', () => {
    const demo = { get: (key: string) => (key === 'demo' ? '1' : null) };
    const live = { get: (key: string) => null };

    it('requires ?demo=1', () => {
        expect(isBegleiterDemoAllowed(live, { hostname: 'localhost' })).toBe(false);
    });

    it('allows localhost captures', () => {
        expect(isBegleiterDemoAllowed(demo, { hostname: 'localhost' })).toBe(true);
        expect(isBegleiterDemoAllowed(demo, { hostname: '127.0.0.1' })).toBe(true);
    });

    it('allows website-entry preview on production hosts', () => {
        expect(isBegleiterDemoAllowed(demo, {
            hostname: 'hq.saimor.world',
            previewSession: true,
        })).toBe(true);
    });

    it('allows visitor / private_preview companion sessions', () => {
        expect(isBegleiterDemoAllowed(demo, {
            hostname: 'hq.saimor.world',
            activeMode: 'visitor',
        })).toBe(true);
        expect(isBegleiterDemoAllowed(demo, {
            hostname: 'hq.saimor.world',
            activeMode: 'private_preview',
        })).toBe(true);
    });

    it('does not show demo on a live production host without preview context', () => {
        expect(isBegleiterDemoAllowed(demo, {
            hostname: 'hq.saimor.world',
            previewSession: false,
            activeMode: 'real_hq',
        })).toBe(false);
    });
});
