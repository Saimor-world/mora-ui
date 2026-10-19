import { scopeUniverseModel } from '@/lib/universe/access';
import type { UniverseModel } from '@/lib/universe/planetModel';

it('keeps membership restrictions when CORE returns a wider Universe snapshot', () => {
  const snapshot = {
    planets: [
      { key: 'system:post', kind: 'system', moons: [
        { key: 'source:google_mail' }, { key: 'dept:member' }, { key: 'dept:locked' }, { key: 'dept:private' },
      ] },
      ...['member', 'locked', 'private'].map(id => ({ key: `dept:${id}`, department_id: id, kind: 'domain', moons: [] })),
    ],
    clusters: [
      { key: 'cluster:mixed', members: ['dept:member', 'dept:private'] },
      { key: 'cluster:hidden', members: ['dept:private'] },
    ],
  } as UniverseModel;
  const result = scopeUniverseModel(snapshot, new Map([['member', 'open'], ['locked', 'locked']]));
  expect(result.planets.map(planet => planet.key)).toEqual(['system:post', 'dept:member', 'dept:locked']);
  expect(result.planets[0].moons.map(moon => moon.key)).toEqual(['source:google_mail', 'dept:member']);
  expect(result.clusters).toEqual([{ key: 'cluster:mixed', members: ['dept:member'] }]);
  expect(snapshot.planets).toHaveLength(4);
  expect(snapshot.clusters[0].members).toHaveLength(2);
});

it('shows no department or department moon before membership is known', () => {
  const snapshot = { planets: [
    { key: 'system:post', kind: 'system', moons: [{ key: 'dept:private' }] },
    { key: 'dept:private', kind: 'domain', moons: [] },
  ], clusters: [{ key: 'cluster:hidden', members: ['dept:private'] }] } as UniverseModel;
  const result = scopeUniverseModel(snapshot, new Map());
  expect(result.planets.map(planet => planet.key)).toEqual(['system:post']);
  expect(result.planets[0].moons).toEqual([]);
  expect(result.clusters).toEqual([]);
});
