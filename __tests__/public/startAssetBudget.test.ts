/**
 * @jest-environment node
 */
// Größenbudget für Bilder, die beim OS-Start laden (Aufräumen 11/2026).
// Vorher: Glaskugeln je ~250–310 KB, Eule 324 KB (512×631, angezeigt mit höchstens 76–96 px).
import fs from 'fs';
import path from 'path';

const PUBLIC = path.join(__dirname, '..', '..', 'public');

function pngSize(file: string): { width: number; height: number } {
  const buf = fs.readFileSync(file);
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('Bildbudget OS-Start', () => {
  const ORBS = ['bluegrey', 'champagne', 'lavender', 'paleblue', 'sage'];

  it.each(ORBS)('Glaskugel %s.png bleibt unter 120 KB und behält 512 px (offener Planet bis ~338 CSS-px)', (name) => {
    const file = path.join(PUBLIC, 'universe', 'glass', `${name}.png`);
    expect(fs.statSync(file).size).toBeLessThanOrEqual(120 * 1024);
    expect(pngSize(file)).toEqual({ width: 512, height: 512 });
  });

  it('Eule bleibt unter 60 KB und hat mindestens doppelte Anzeigegröße (96 px → ≥192 px)', () => {
    const file = path.join(PUBLIC, 'nightwatch', 'eule.png');
    expect(fs.statSync(file).size).toBeLessThanOrEqual(60 * 1024);
    const { width, height } = pngSize(file);
    expect(width).toBeGreaterThanOrEqual(192);
    expect(width).toBeLessThanOrEqual(320);
    expect(height / width).toBeCloseTo(631 / 512, 1);
  });

  it('alle Glaskugeln zusammen bleiben unter 600 KB', () => {
    const total = ORBS.reduce((sum, n) => sum + fs.statSync(path.join(PUBLIC, 'universe', 'glass', `${n}.png`)).size, 0);
    expect(total).toBeLessThanOrEqual(600 * 1024);
  });
});
