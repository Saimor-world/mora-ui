import fs from 'fs';
import path from 'path';
import React from 'react';
import { render } from '@testing-library/react';
import { activityScale } from '@/lib/universe/planetActivity';
import { JadeMora, JADE_MORA_SRC } from '@/components/world/JadeMora';

const root = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('Runde 7 – Raum, Planeten, Jade-MÔRA', () => {
  it('Planetengröße folgt echter Aktivität', () => {
    expect(activityScale(0, false)).toBeLessThan(activityScale(4, false));
    expect(activityScale(4, false)).toBeLessThan(activityScale(4, true));
    expect(activityScale(99, true)).toBeLessThanOrEqual(1.22);
    expect(activityScale(NaN, false)).toBe(0.86);
  });
  it('Scene nutzt die Aktivitätsgröße und treibt die Planeten versetzt', () => {
    const s = read('features/home/cockpit/Scene.tsx');
    expect(s).toMatch(/activityScale\(folderCount, active\)/);
    expect(s).toMatch(/--drift/);
  });
  it('Home hat eine stille Nebelschicht über dem See', () => {
    expect(read('features/home/cockpit/LiveCockpit.tsx')).toMatch(/className="ck-mist" aria-hidden/);
  });
  it('MÔRA im Dock ist die Jade-Variante 01 in ~130px (q5: kleiner), eine Figur', () => {
    const b = read('components/os-shell/BridgeConcept.tsx');
    expect(b).toMatch(/<JadeMora size=\{phone\?84:130\}/);
    expect(b).not.toMatch(/<PixelMora/);
    const { container } = render(<JadeMora size={172} />);
    expect(container.querySelectorAll('.px-mora')).toHaveLength(1);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(JADE_MORA_SRC);
    expect(container.textContent).toBe('');
    expect(fs.existsSync(path.join(root, 'public', JADE_MORA_SRC))).toBe(true);
  });
  it('alle neuen Bewegungen respektieren prefers-reduced-motion', () => {
    const css = read('components/os-shell/bridge-concept.css');
    const r7 = css.slice(css.indexOf('Runde 7'));
    const rm = r7.slice(r7.lastIndexOf('prefers-reduced-motion'));
    for (const sel of ['.ck-mist i', '.glass-orb', '.jade-mora', '.jade-mora__glow']) expect(rm).toContain(sel);
  });
});
