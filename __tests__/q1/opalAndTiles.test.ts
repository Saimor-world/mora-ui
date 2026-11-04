import fs from 'fs';
import path from 'path';
const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
it('sky planets are milky opal glass (GlassOrb + milk/iris/spec), not matte jewel spheres', () => {
  const scene = read('features/home/cockpit/Scene.tsx');
  expect(scene).toMatch(/className="ck-opal"/);
  expect(scene).not.toMatch(/<JewelSphere/);
  const css = read('features/home/cockpit.css');
  for (const k of ['ck-opal__milk', 'ck-opal__iris', 'ck-opal__spec']) expect(css).toContain(`.${k}`);
});
it('dock tiles fill their top half with up to two real lines', () => {
  const tsx = read('components/os-shell/BridgeConcept.tsx');
  expect(tsx).toMatch(/bridge__stage-lines[\s\S]*g\.lines\.slice\(0,2\)/);
});
it('phone shows at most two focus cards so none runs into MÔRA', () => {
  expect(read('features/home/cockpit/LiveCockpit.tsx')).toMatch(/<HomeFocus cards=\{focus\.slice\(0, 2\)\}/);
});
