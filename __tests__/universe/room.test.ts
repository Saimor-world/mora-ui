import { loadRoom, saveRoom, nextMoraLevel, DEFAULT_ROOM } from '@/lib/universe/roomPrefs';
import { setMoraPresence, getMoraPresence } from '@/lib/universe/moraPresence';

describe('Raum-Schalter', () => {
    it('speichert pro Nutzer getrennt', () => {
        saveRoom('u1', { immersive: true, lage: false, mora: 'leise' });
        expect(loadRoom('u1')).toEqual({ immersive: true, lage: false, mora: 'leise' });
        expect(loadRoom('u2')).toEqual(DEFAULT_ROOM);
    });
    it('verwirft kaputte Werte', () => {
        window.localStorage.setItem('saimor.room.v1.u3', '{"mora":"laut","immersive":"ja"}');
        expect(loadRoom('u3')).toEqual(DEFAULT_ROOM);
    });
    it('MÔRA-Stufen rotieren Aktiv → Leise → Aus', () => {
        expect(nextMoraLevel('aktiv')).toBe('leise');
        expect(nextMoraLevel('leise')).toBe('aus');
        expect(nextMoraLevel('aus')).toBe('aktiv');
    });
    it('fertig fällt von selbst auf ruhig zurück', () => {
        jest.useFakeTimers();
        setMoraPresence({ state: 'done' });
        jest.advanceTimersByTime(2500);
        expect(getMoraPresence().state).toBe('calm');
        jest.useRealTimers();
    });
});
