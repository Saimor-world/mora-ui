import { aeroOrbPaint, aeroPalette, glassHue, planetMaterial, planetMaterialKey } from '@/components/universe/PlanetSphere';

const AREAS: Array<[string, string]> = [
  ['Wissen', 'wissen'],
  ['Markt', 'markt'],
  ['Finanzen', 'finanzen'],
  ['Werkstatt', 'werkstatt'],
  ['Betrieb', 'betrieb'],
  ['R&D', 'rd'],
  ['Wache', 'wache'],
  ['Post & Termine', 'post'],
];

describe('Universe Glass – Bereichsfarben', () => {
  it('ordnet jeden benannten Bereich einem eigenen Material zu', () => {
    expect(AREAS.map(([name]) => planetMaterialKey(name))).toEqual(AREAS.map(([, key]) => key));
  });

  it('Verteilungsbalken und Glaskugel teilen denselben Tageston', () => {
    for (const [name] of AREAS) {
      const day = planetMaterial(name).day;
      const hue = glassHue(name);
      expect(day.startsWith('#')).toBe(true);
      expect(hue).toHaveLength(3);
      expect(hue.every((c) => c >= 90 && c <= 245)).toBe(true);
    }
  });

  it('Töne bleiben unterscheidbar, nicht graubeige', () => {
    const hues = AREAS.map(([name]) => glassHue(name));
    for (let i = 0; i < hues.length; i++) {
      for (let j = i + 1; j < hues.length; j++) {
        const d = Math.hypot(hues[i][0] - hues[j][0], hues[i][1] - hues[j][1], hues[i][2] - hues[j][2]);
        expect(d).toBeGreaterThan(28);
      }
    }
  });

  it('Wissen bleibt violett und Betrieb bleibt rose, nicht mondgrau', () => {
    const wissen = glassHue('Wissen');
    const betrieb = glassHue('Betrieb');
    expect(wissen[2]).toBeGreaterThan(wissen[1] + 24);
    expect(betrieb[0]).toBeGreaterThan(betrieb[1] + 12);
  });

  it('Aero-Palette folgt aero.html', () => {
    expect(aeroPalette('Wissen').c).toBe('#8b5cf6');
    expect(aeroPalette('Markt').c).toBe('#e23ca8');
    expect(aeroPalette('Finanzen').c).toBe('#f2b51d');
    expect(aeroPalette('Werkstatt').c).toBe('#f08a1c');
    expect(aeroPalette('Betrieb').c).toBe('#f06a8a');
    expect(aeroPalette('R&D').c).toBe('#2fbf5a');
    expect(aeroPalette('Wache').c).toBe('#14b3b0');
    expect(aeroPalette('Post & Termine').c).toBe('#3b82f6');
  });

  it('Aero-Orbs tragen die Konzeptfarbe direkt im Verlauf', () => {
    const paint = aeroOrbPaint('Werkstatt');
    expect(String(paint.backgroundImage)).toContain('#f08a1c');
    expect(String(paint.backgroundImage)).toContain('#ffc27a');
    expect(String(paint.backgroundColor)).toBe('#f08a1c');
    expect(String(aeroOrbPaint('Betrieb').backgroundImage)).toContain('#f06a8a');
  });
});
