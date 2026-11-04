import fs from 'fs';
import path from 'path';
const css = fs.readFileSync(path.join(process.cwd(), 'components/os-shell/bridge-concept.css'), 'utf8');
const tsx = fs.readFileSync(path.join(process.cwd(), 'components/os-shell/BridgeConcept.tsx'), 'utf8');
const q5 = css.slice(css.indexOf('/* q5 ·'));
it('MÔRA is ~130px on desktop, scaled on phone, reflection follows', () => {
  expect(tsx).toMatch(/<JadeMora size=\{phone\?84:130\}/);
  expect(tsx).toMatch(/jade-01\.png" alt="" width=\{100\} height=\{130\}/);
  expect(q5).toMatch(/\.bridge__mora-reflect \{ width:100px; height:130px;/);
});
it('dock is one flowing glass band: a shared wave surface, borderless tiles that melt in, soft hover flow', () => {
  expect(q5).toMatch(/\.bridge__deck::before \{ content:'';[^}]*backdrop-filter:blur\(26px\)[^}]*mask:radial-gradient/);
  expect(q5).toMatch(/\.bridge__deck \.bridge__inst \{ border-color:transparent !important;[^}]*backdrop-filter:none;[^}]*transition:transform \.7s/);
  expect(q5).toMatch(/\.bridge__deck:has\(\.bridge__inst:hover\)::before/);
});
