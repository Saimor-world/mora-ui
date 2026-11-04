import React from 'react';
import { render } from '@testing-library/react';
import { PlanetSystem } from '@/features/home/cockpit/Scene';
import { homeMycelium } from '@/lib/universe/homeMycelium';
import { demoTodaySnapshot } from '@/lib/demo/morgenrot/demoToday';

const P = [['d-mkt', 'Marketing'], ['d-kueche', 'Küche'], ['d-einkauf', 'Einkauf'], ['d-verw', 'Verwaltung']]
  .map(([id, title]) => ({ id, title, jobRoles: [], glass: 'sage' as const, moons: [] }));

it('links departments that work on the same thing (demo: Herbstkarte, Lieferung)', () => {
  const t = homeMycelium(P, demoTodaySnapshot('demo-morgenrot', 'u', 't'));
  expect(t.map((x) => [x.a, x.b].sort().join('~')).sort()).toEqual(['d-einkauf~d-kueche', 'd-kueche~d-mkt']);
  expect(homeMycelium(P, null)).toEqual([]);
});
it('sky shows fine mycelium threads and a quiet constellation', () => {
  const threads = homeMycelium(P, demoTodaySnapshot('demo-morgenrot', 'u', 't'));
  const { container } = render(<PlanetSystem planets={P} attention={new Set()} company="X" compact threads={threads} onOpen={() => {}} />);
  expect(container.querySelectorAll('[data-testid=mycelium] path')).toHaveLength(2);
  expect(container.querySelectorAll('[data-testid=constellation] i').length).toBe(3);
});
it('no shared work → no threads drawn', () => {
  const { container } = render(<PlanetSystem planets={P} attention={new Set()} company="X" compact threads={[]} onOpen={() => {}} />);
  expect(container.querySelector('[data-testid=mycelium]')).toBeNull();
});
it('mycelium and stars stand still under reduced motion', () => {
  const css = require('fs').readFileSync(require('path').join(process.cwd(), 'components/os-shell/bridge-concept.css'), 'utf8');
  const rm = css.slice(css.lastIndexOf('prefers-reduced-motion'));
  expect(rm).toMatch(/\.ck-myc path, \.ck-constellation i \{ animation:none/);
});
