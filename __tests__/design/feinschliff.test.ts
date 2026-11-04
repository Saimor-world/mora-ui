import fs from 'fs';
const css = fs.readFileSync('components/os-shell/bridge-concept.css', 'utf8');
const r5 = css.split('Runde 5')[1] ?? '';
describe('Dock-Feinschliff (Runde 5)', () => {
  it('Haarlinie, Glas und geschichteter Schatten an den Paneelen', () => {
    expect(r5).toMatch(/\.bridge__inst \{[^}]*border:\.5px solid/);
    expect(r5).toMatch(/\.bridge__inst \{[^}]*backdrop-filter:blur/);
  });
  it('Werte skalieren statt abzuschneiden, Zahlen tabellarisch', () => {
    expect(r5).toMatch(/strong \{[^}]*font-size:clamp\(/);
    expect(r5).toMatch(/\.bridge__badge \{[^}]*tabular-nums/);
  });
  it('Fokus sichtbar an Paneelen, Knöpfen und Toolbar', () => {
    expect(r5).toMatch(/\.bridge__comp:focus-visible/);
    expect(r5).toMatch(/\.bridge__app:focus-visible \.bridge__app-icon/);
  });
  it('kein Element verkleinert: Toolbar-Icons bleiben 44px', () => {
    expect(r5).toMatch(/\.bridge__app \{ width:44px; height:44px; \}/);
  });
});
describe('Mittlere Breite', () => {
  it('Wert bekommt Platz: Chevron weicht zwischen 700 und 1180px', () => {
    expect(r5).toMatch(/max-width:1180px\) \{[^}]*\.bridge__chev \{ display:none/);
  });
});
describe('Runde 6 · Bühnen', () => {
  const r6 = css.split('Runde 6')[1] ?? '';
  it('Heldzahl 32–48px, Tönung je Quelle, Konsole', () => {
    expect(r6).toMatch(/strong \{ font:700 clamp\(32px,3\.3vw,48px\)/);
    expect(r6).toMatch(/data-station='today'\] \{ --st:/);
    expect(r6).toMatch(/\.bridge__body::after/);
    expect(r6).toMatch(/prefers-reduced-motion[^}]*bridge__stage-dot \{ animation:none/);
  });
});
