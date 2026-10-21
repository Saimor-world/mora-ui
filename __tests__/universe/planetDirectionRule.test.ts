import { directionFor, CATEGORY_DIRECTION } from '@/components/universe/PlanetDirections';

// ~30 Abteilungsnamen aus Café, Blumenladen, Tattoo-/Nagelstudio, Handwerk, Agentur, Software, Kommune
const CASES: [string, 'keramik' | 'atlas' | 'mineral'][] = [
  ['Kasse', 'mineral'], ['Bestellungen', 'mineral'], ['Lager', 'mineral'], ['Einkauf', 'mineral'],
  ['Social Media', 'mineral'], ['Buchhaltung', 'mineral'], ['Finanzen', 'mineral'], ['Lieferungen', 'mineral'],
  ['Online-Shop Daten', 'mineral'], ['Marketing', 'mineral'], ['Operations', 'mineral'],
  ['Termine', 'keramik'], ['Buchungen', 'keramik'], ['Personal', 'keramik'], ['Kunden', 'keramik'],
  ['Werkstatt', 'keramik'], ['Vertrieb', 'keramik'], ['Service', 'keramik'], ['Küche', 'keramik'],
  ['Floristik', 'keramik'], ['Tattoo Studio', 'keramik'], ['Nail Studio', 'keramik'], ['Team', 'keramik'],
  ['Portfolio', 'atlas'], ['Rezepte & HACCP', 'atlas'], ['Wissen', 'atlas'], ['Strategie', 'atlas'],
  ['Recht & Verträge', 'atlas'], ['Archiv', 'atlas'], ['Auftragsplanung', 'atlas'], ['Schulungen', 'atlas'],
];

describe('planet style direction rule', () => {
  it.each(CASES)('%s → %s', (name, dir) => {
    expect(directionFor(name)).toBe(dir);
  });

  it('explicit category wins over the name', () => {
    expect(directionFor('Kasse', 'management')).toBe('atlas');
    expect(directionFor('Irgendwas', 'system:finanzen')).toBe('mineral');
    expect(directionFor('Irgendwas', 'hr')).toBe('keramik');
    for (const d of Object.values(CATEGORY_DIRECTION)) expect(['keramik', 'atlas', 'mineral']).toContain(d);
  });

  it('is stable for unknown names and the hash fallback is balanced', () => {
    expect(directionFor('Zorblax')).toBe(directionFor('Zorblax'));
    const counts = { keramik: 0, atlas: 0, mineral: 0 };
    for (let i = 0; i < 300; i++) counts[directionFor(`Bereich ${i} xq`)]++;
    for (const v of Object.values(counts)) { expect(v).toBeGreaterThan(70); expect(v).toBeLessThan(130); }
  });

  it('no direction dominates the sample set', () => {
    const counts = { keramik: 0, atlas: 0, mineral: 0 };
    for (const [n] of CASES) counts[directionFor(n)]++;
    for (const v of Object.values(counts)) expect(v / CASES.length).toBeLessThan(0.45);
  });
});
