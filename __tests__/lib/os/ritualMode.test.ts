import {
    RITUAL_SCENES,
    RITUAL_SCENE_ORDER,
    getAutoRitualScene,
    getEffectiveRitualScene,
    cycleRitualScene,
} from '@/lib/os/ritualMode';

describe('ritualMode', () => {
    it('every scene defines both rgba accent and solid accentHex', () => {
        RITUAL_SCENE_ORDER.forEach((id) => {
            const scene = RITUAL_SCENES[id];
            expect(scene.accent).toMatch(/^rgba\(/);
            expect(scene.accentHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(scene.aura).toMatch(/^rgba\(/);
        });
    });

    it('cycles through all four scenes and wraps around', () => {
        let id = RITUAL_SCENE_ORDER[0];
        const seen = new Set<string>([id]);
        for (let i = 0; i < RITUAL_SCENE_ORDER.length - 1; i++) {
            id = cycleRitualScene(id);
            seen.add(id);
        }
        expect(seen.size).toBe(4);
        // one more cycle wraps back to the start
        expect(cycleRitualScene(id)).toBe(RITUAL_SCENE_ORDER[0]);
    });

    it('autoTime maps day parts to scenes', () => {
        expect(getAutoRitualScene(new Date('2026-05-29T08:00:00'))).toBe('flow');
        expect(getAutoRitualScene(new Date('2026-05-29T13:00:00'))).toBe('build');
        expect(getAutoRitualScene(new Date('2026-05-29T19:00:00'))).toBe('lounge');
        expect(getAutoRitualScene(new Date('2026-05-29T23:00:00'))).toBe('night');
    });

    it('manual scene is respected only when autoTime is off', () => {
        const noon = new Date('2026-05-29T13:00:00');
        // autoTime on → time-based (build), ignoring manual pick
        expect(getEffectiveRitualScene({ sceneId: 'night', autoTime: true }, noon)).toBe('build');
        // autoTime off → manual pick honored
        expect(getEffectiveRitualScene({ sceneId: 'night', autoTime: false }, noon)).toBe('night');
    });
});
