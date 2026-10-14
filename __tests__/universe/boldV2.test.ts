import { shortcutLabel, isApplePlatform } from '@/lib/os/shortcut';
import { planetForSource, calmExcerpt } from '@/lib/universe/spaceAnswer';
import { universeLayerFor, homeLayerFor, cameraTransition, CAMERA } from '@/lib/universe/motion';
import { moonSlots, interiorSentence } from '@/components/universe/PlanetInterior';

describe('Tastenkürzel', () => {
  it('zeigt ⌘K auf dem Mac und Ctrl+K auf Windows/Linux', () => {
    expect(shortcutLabel('k', { platform: 'MacIntel' })).toBe('⌘K');
    expect(shortcutLabel('k', { platform: 'Win32' })).toBe('Ctrl+K');
    expect(shortcutLabel('k', { platform: 'Linux x86_64' })).toBe('Ctrl+K');
    expect(isApplePlatform({ userAgentData: { platform: 'Windows' } })).toBe(false);
  });
});

describe('MÔRA ohne Fenster', () => {
  const planets = ['Finanzen', 'Post & Termine', 'Werkstatt', 'Wissen', 'Wache'];
  it('verbindet Quellen nur mit eindeutig passenden Planeten', () => {
    expect(planetForSource({ title: 'Buchhaltung · Offene Posten' }, planets)).toBe(0);
    expect(planetForSource({ title: 'Kalender · heute' }, planets)).toBe(1);
    expect(planetForSource({ title: 'Irgendwas Unbekanntes' }, planets)).toBeNull();
  });
  it('kürzt lange Antworten ruhig am Satzende', () => {
    const long = 'Erster Satz ist da. '.repeat(40);
    const r = calmExcerpt(long, 100);
    expect(r.truncated).toBe(true);
    expect(r.excerpt.endsWith('.')).toBe(true);
    expect(calmExcerpt('Kurz.').truncated).toBe(false);
  });
});

describe('Kamera Home ↔ Universe', () => {
  it('nah = Universe vergrößert und unscharf, fern = scharf', () => {
    expect(universeLayerFor('far', false).scale).toBe(1);
    expect(universeLayerFor('near', false).scale).toBe(CAMERA.nearScale);
    expect(homeLayerFor('far', false).opacity).toBe(0);
    expect(homeLayerFor('near', false).opacity).toBe(1);
  });
  it('respektiert „Bewegung reduzieren“: keine Skalierung, kurze Blende', () => {
    expect(universeLayerFor('near', true).scale).toBe(1);
    expect(homeLayerFor('near', true).scale).toBe(1);
    expect(cameraTransition(true).duration).toBeLessThan(0.3);
  });
});

describe('Planeten-Inneres', () => {
  it('Monde liegen symmetrisch auf dem Horizont', () => {
    const s = moonSlots(3);
    expect(s[1].x).toBeCloseTo(0.5);
    expect(s[0].x + s[2].x).toBeCloseTo(1);
    expect(moonSlots(0)).toEqual([]);
  });
  it('spricht in Sätzen statt Null-Kacheln', () => {
    expect(interiorSentence(0, 0, 0)).toBe('Dieser Ort ist noch neu.');
    expect(interiorSentence(1, 2, 0)).toBe('Ruhig. Ein Bereich und 2 Dokumente.');
    expect(interiorSentence(0, 0, 1)).toMatch(/Aufmerksamkeit/);
  });
});
