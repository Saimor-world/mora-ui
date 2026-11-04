import fs from 'fs';
import path from 'path';
// jsdom hat kein Layout: wir prüfen die letzte wirksame Desktop-Regel für das Mittelfeld.
it('centre panel sits at the bottom of the heart column on desktop (margin-top:auto)', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'components/os-shell/bridge-concept.css'), 'utf8');
  const rules = [...css.matchAll(/\.bridge__heart > \.bridge__field\s*\{([^}]*)\}/g)].map((m) => m[1]);
  expect(rules.length).toBeGreaterThan(0);
  expect(rules[rules.length - 1]).toMatch(/margin-top:\s*auto/);
});

it('MÔRA gets a lake reflection image on desktop, but stays the single MÔRA', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'components/os-shell/bridge-concept.css'), 'utf8');
  expect(css).toMatch(/\.bridge__mora-reflect\s*\{[^}]*scaleY\(-/);
  const tsx = fs.readFileSync(path.join(process.cwd(), 'components/os-shell/BridgeConcept.tsx'), 'utf8');
  expect(tsx).toMatch(/mora-reflection/);
});
