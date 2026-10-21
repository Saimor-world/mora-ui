import { flyMora, getMoraPresence, moraIsAway, resetMoraPresence, seatOf, setMoraPresence } from '@/lib/universe/moraPresence';

describe('MÔRA-Präsenz', () => {
    beforeEach(() => {
        resetMoraPresence();
    });

    it('liegt standardmäßig im Dock, der Sitz ist leer', () => {
        expect(getMoraPresence().place).toBe('dock');
        expect(getMoraPresence().seat).toBe('away');
        expect(moraIsAway()).toBe(true);
        expect(seatOf('dock')).toBe('away');
        expect(seatOf('seat')).toBe('home');
        expect(seatOf('planet')).toBe('away');
    });

    it('ist genau an einem Ort: Sitz, Dock oder Planet', () => {
        flyMora('seat');
        expect(getMoraPresence().place).toBe('seat');
        expect(moraIsAway()).toBe(false);
        flyMora('dock');
        expect(moraIsAway()).toBe(true);
        flyMora('planet', { target: 'system:finanzen' });
        expect(getMoraPresence()).toMatchObject({ place: 'planet', target: 'system:finanzen' });
        expect(moraIsAway()).toBe(true);
    });

    it('needs und glow fliegen sie nicht von allein', () => {
        setMoraPresence({ state: 'needs', target: 'system:finanzen' });
        expect(getMoraPresence().place).toBe('dock');
        expect(moraIsAway()).toBe(true);
        setMoraPresence({ state: 'working', target: 'system:finanzen' });
        expect(getMoraPresence().place).toBe('dock');
    });

    it('übersetzt alte seat-Events, ohne einen zweiten Körper zu erzeugen', () => {
        setMoraPresence({ state: 'calm', seat: 'home' });
        expect(getMoraPresence().place).toBe('seat');
        setMoraPresence({ state: 'calm', seat: 'away' });
        expect(getMoraPresence().place).toBe('dock');
    });

    it('behält den Ort, wenn nur der Zustand wechselt', () => {
        flyMora('seat');
        setMoraPresence({ state: 'listening' });
        expect(getMoraPresence().place).toBe('seat');
        setMoraPresence({ state: 'done' });
        expect(getMoraPresence().place).toBe('seat');
    });
});
