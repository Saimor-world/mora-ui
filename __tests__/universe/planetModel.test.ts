import { placeUniverse, planetDiameter, bodyMeta, departmentIdOf, glyphFor, type UniverseModel } from '@/lib/universe/planetModel';
import { Orbit, Wallet } from 'lucide-react';

const look = (a: string, g: string, seed = 1) => ({ archetype: a, hue: 40, glyph: g, seed });
const sys = (cap: string, angle: number, state: any = 'active') => ({ key: `system:${cap}`, kind: 'system' as const, capability: cap, label: cap, state, size: 'M' as const, brightness: 1, score: 1, ring: 1, angle, look: look('ocean', 'mail'), moons: [], more_moons: 0, counts: {} });
const dom = (id: string, extra: any = {}) => ({ key: `dept:${id}`, kind: 'domain' as const, department_id: id, label: id, state: 'active' as const, size: 'S' as const, brightness: 1, score: 1, ring: 2, look: look('pearl', 'box'), moons: [], more_moons: 0, counts: { docs: 2, spaces: 1 }, ...extra });

const model = (planets: any[], clusters: any[] = []): UniverseModel => ({ company: { id: 'c', name: 'X', sector: 'live', industry_template: 'generic', template_label: 'Allgemein' }, edition: 'customer', model_version: 1, planets, clusters, belt: null, suggestions: [] });

describe('Planeten-Modell UI', () => {
  it('Systeme innen, Domänen außen, gejointe/geclusterte nicht doppelt', () => {
    const m = model([sys('finanzen', 0), sys('post', 72), dom('a'), dom('b', { joins: 'system:finanzen' }), dom('s1', { cluster: 'cluster:store' })],
      [{ key: 'cluster:store', domain_type: 'store', label: 'Stores (3)', members: ['dept:s1'], score: 1, look: look('sand-dune', 'store'), size: 'M' }]);
    const placed = placeUniverse(m);
    expect(placed.map((p) => p.id).sort()).toEqual(['cluster:store', 'dept:a', 'system:finanzen', 'system:post']);
    const fin = placed.find((p) => p.id === 'system:finanzen')!;
    const a = placed.find((p) => p.id === 'dept:a')!;
    const d = (p: { x: number; y: number }) => Math.hypot(p.x - 50, p.y - 50);
    expect(d(fin)).toBeLessThan(d(a));
    placed.forEach((p) => { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(100); });
  });
  it('Keime klein, System höchstens L, Meta ehrlich', () => {
    expect(planetDiameter('S', 'seed', 'domain')).toBeLessThan(planetDiameter('S', 'active', 'domain'));
    expect(planetDiameter('XL', 'active', 'system')).toBe(planetDiameter('S', 'active', 'system'));
    expect(planetDiameter('XL', 'active', 'domain')).toBeLessThan(planetDiameter('S', 'active', 'system'));
    expect(bodyMeta(sys('markt', 0, 'seed') as any, null)).toBe('verbinden');
    expect(bodyMeta(dom('a') as any, null)).toBe('1 Bereich · 2 Dokumente');
  });
  it('Zeichen aus dem Katalog, nie das Standard-Gebäude', () => {
    expect(glyphFor('wallet')).toBe(Wallet);
    expect(glyphFor('unbekannt')).toBe(Orbit);
    expect(departmentIdOf('dept:42')).toBe('42');
    expect(departmentIdOf('system:post')).toBeNull();
  });
});
