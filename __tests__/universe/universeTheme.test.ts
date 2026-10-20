import {
    applyUniverseTheme,
    loadUniverseThemePref,
    resolveUniverseTheme,
    saveUniverseThemePref,
    UNIVERSE_THEME_KEY,
} from '@/lib/universe/universeTheme';
import { flyMora, moraIsAway, setMoraPresence, getMoraPresence, resetMoraPresence } from '@/lib/universe/moraPresence';
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
        resetMoraPresence();
    });
    it('startet im Dock und kommt nur per Flug nach Hause', () => {
        expect(getMoraPresence().place).toBe('dock');
        expect(moraIsAway()).toBe(true);
        flyMora('seat');
        expect(moraIsAway(getMoraPresence())).toBe(false);
        flyMora('dock');
        expect(moraIsAway()).toBe(true);
        setMoraPresence({ state: 'needs', target: 'system:finanzen', place: 'seat' });
        expect(moraIsAway()).toBe(false);
        flyMora('planet', { target: 'system:finanzen' });
        expect(moraIsAway()).toBe(true);
    });
    it('bleibt weg, bis der Sitz sie nach Hause ruft', () => {
        flyMora('dock');
        expect(moraIsAway()).toBe(true);
        flyMora('seat', { target: null });
        expect(moraIsAway()).toBe(false);
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
