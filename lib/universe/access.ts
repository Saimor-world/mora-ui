import { departmentIdOf, type UniverseModel } from './planetModel';

/** A Universe snapshot describes places; membership still decides which may be shown. */
export function scopeUniverseModel(model: UniverseModel, access: ReadonlyMap<string, 'open' | 'locked'>): UniverseModel {
  const allowedKey = (key: string) => {
    const id = departmentIdOf(key);
    return !!id && access.has(id);
  };
  return {
    ...model,
    planets: model.planets
      .filter(planet => planet.kind === 'system' || access.has(planet.department_id || departmentIdOf(planet.key) || ''))
      .map(planet => ({
        ...planet,
        moons: planet.moons.filter(moon => {
          const id = moon.department_id || departmentIdOf(moon.key);
          return !id || access.get(id) === 'open';
        }),
      })),
    clusters: model.clusters
      .map(cluster => ({ ...cluster, members: cluster.members.filter(allowedKey) }))
      .filter(cluster => cluster.members.length > 0),
  };
}
