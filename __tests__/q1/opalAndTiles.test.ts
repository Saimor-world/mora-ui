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
