import React from 'react';
import { render } from '@testing-library/react';
import { PlanetOrbit, sourcePositions } from '@/components/world/WorldUniverse';
import { canPreviewRole, visiblePlanetIds } from '@/components/os-shell/RolePreview';
import { layoutOrbits, placeOnOrbit } from '@/lib/universe/worldOrbits';

// Beispiel-Daten, keine echten Kundinnen.
describe('PlanetOrbit', () => {
  it('zeichnet Monde, Sterne und Leuchtlinien', () => {
    const orbit = { moons: [{ id: 'm1', label: 'Kalender', stars: [{ id: 's1', label: 'A', kind: 'event' }, { id: 's2', label: 'B', kind: 'event' }] }], stars: [{ id: 't1', label: 'X', kind: 'task', overdue: true }] };
    const { container } = render(<PlanetOrbit orbit={orbit} size={80} phone={false} />);
    expect(container.querySelectorAll('.wd-moondot')).toHaveLength(1);
    expect(container.querySelectorAll('.wd-stardot').length).toBe(1); // Mond-Inhalte stecken in der Mondgröße, nicht in Punkten
    expect(container.querySelectorAll('.wd-sublink').length).toBeGreaterThanOrEqual(1);
    expect(container.textContent).toContain('Kalender');
  });
  it('rendert nichts ohne Inhalte und kappt Überlauf mit +N', () => {
    expect(render(<PlanetOrbit orbit={{ moons: [], stars: [] }} size={80} phone={false} />).container.innerHTML).toBe('');
    const moons = Array.from({ length: 9 }, (_, i) => ({ id: `m${i}`, label: `O${i}`, stars: [] }));
    const { container } = render(<PlanetOrbit orbit={{ moons, stars: [] }} size={80} phone={false} />);
    expect(container.querySelectorAll('.wd-moondot')).toHaveLength(6);
    expect(container.textContent).toContain('+3');
  });
});

describe('Quellen-Ring', () => {
  const layout = layoutOrbits({ width: 1440, height: 760, weights: [3, 1, 2], phone: false });
  const planets = layout.slots.map((s) => placeOnOrbit(layout, s));
  it('legt Quellen auf die obere Ringhälfte, mit Abstand zu Planeten und zueinander', () => {
    const pts = sourcePositions(layout, 3, planets);
    expect(pts).toHaveLength(3);
    for (const p of pts) {
      expect(p.y).toBeLessThan(layout.cy);
      for (const q of planets) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(130);
    }
    expect(new Set(pts.map((p) => Math.round(p.x))).size).toBe(3);
  });
  it('rückt aus, wenn ein Planet genau auf dem Standardplatz liegt', () => {
    const base = sourcePositions(layout, 1, []);
    const moved = sourcePositions(layout, 1, [{ x: base[0].x, y: base[0].y }]);
    expect(Math.hypot(moved[0].x - base[0].x, moved[0].y - base[0].y)).toBeGreaterThanOrEqual(130);
  });
});

describe('Rollen-Vorschau', () => {
  const planets = [{ id: 'd1', kind: 'department' }, { id: 'd2', kind: 'department' }, { id: 'tasks', kind: 'tasks' }];
  it('Inhaberin sieht alles', () => expect(visiblePlanetIds('owner', planets, null, 'tasks')).toBeNull());
  it('Abteilung/Mitglied: aktive (sonst erste) Abteilung + Aufgaben', () => {
    expect([...visiblePlanetIds('member', planets, null, 'tasks')!]).toEqual(['d1', 'tasks']);
    expect([...visiblePlanetIds('department', planets, 'd2', 'tasks')!]).toEqual(['d2', 'tasks']);
  });
  it('nur Inhaber-Rollen dürfen umschalten', () => {
    expect(canPreviewRole('Owner')).toBe(true);
    expect(canPreviewRole('member')).toBe(false);
    expect(canPreviewRole('')).toBe(false);
  });
});
