import {
    applyUniverseTheme,
    loadUniverseThemePref,
    resolveUniverseTheme,
    saveUniverseThemePref,
    UNIVERSE_THEME_KEY,
} from '@/lib/universe/universeTheme';
import { moraIsAway, setMoraPresence, getMoraPresence } from '@/lib/universe/moraPresence';
import { planetMaterial } from '@/components/universe/PlanetSphere';

describe('Universe-Thema', () => {
    beforeEach(() => {
        window.localStorage.clear();
        document.documentElement.dataset.uv2Theme = '';
    });

    it('folgt dem System, bis jemand umschaltet', () => {
        expect(loadUniverseThemePref()).toBe('system');
        saveUniverseThemePref('light');
        expect(loadUniverseThemePref()).toBe('light');
        expect(resolveUniverseTheme('light')).toBe('light');
        expect(resolveUniverseTheme('dark')).toBe('dark');
    });

    it('schreibt das gelöste Thema auf html', () => {
        applyUniverseTheme('light');
        expect(document.documentElement.dataset.uv2Theme).toBe('light');
        applyUniverseTheme('dark');
        expect(document.documentElement.dataset.uv2Theme).toBe('dark');
        expect(UNIVERSE_THEME_KEY).toMatch(/theme/);
    });
});

describe('MÔRAs Sitz', () => {
    beforeEach(() => {
        setMoraPresence({ state: 'calm', target: null, seat: 'home' });
    });
    it('ist zu Hause ruhig und weg im Dock', () => {
        setMoraPresence({ state: 'calm', seat: 'home' });
        expect(moraIsAway(getMoraPresence())).toBe(false);
        setMoraPresence({ state: 'calm', seat: 'away' });
        expect(moraIsAway(getMoraPresence())).toBe(true);
        setMoraPresence({ state: 'working', target: 'system:finanzen', seat: 'home' });
        expect(moraIsAway(getMoraPresence())).toBe(true);
    });
});

describe('Planeten-Merkmale', () => {
    it('gibt jedem Bereich eine eigene Oberfläche', () => {
        expect(planetMaterial('Wissen').feature).toBe('veins');
        expect(planetMaterial('Finanzen').feature).toBe('bands');
        expect(planetMaterial('Werkstatt').feature).toBe('craters');
        expect(planetMaterial('Post').feature).toBe('clouds');
        expect(planetMaterial('Markt').feature).toBe('swirl');
    });
});
