/**
 * Sofortfixes: Aufgaben ohne Abteilung/Ordner haben genau einen festen Ort, und Unterordner sowie Bereiche
 * ohne Ordner gehen auf dem Weg von CORE nach Home nicht verloren.
 */
import { deptWork, unassignedHomeId } from '@/lib/universe/deptWork';
import { coreTreeToPlanets } from '@/features/home/cockpit/coreAdapter';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';

const planet = (id: string, moons: string[] = []): DemoPlanet =>
  ({ id, title: id, jobRoles: [], glass: 'sage', moons: moons.map((m) => ({ id: m, title: m, files: [] })) } as unknown as DemoPlanet);

describe('Aufgabe ohne Abteilung und Ordner', () => {
  const planets = [planet('d-a', ['f-a']), planet('d-b', ['f-b']), planet('d-c')];
  const tasks = [
    { id: 't-frei', title: 'Neue Aufgabe ohne Ort', status: 'backlog', due_date: null, folder_id: null, department_id: null },
    { id: 't-b', title: 'In B', status: 'backlog', due_date: null, folder_id: 'f-b' },
  ];
  const opts = { knownDeptIds: planets.map((p) => p.id), knownFolderIds: ['f-a', 'f-b'] };

  it('landet in genau einer Abteilung – derselben, die Home und Heute ansteuern – egal welche gerade offen ist', () => {
    const home = unassignedHomeId(planets);
    expect(home).toBe('d-a');
    const holders = planets.filter((p) => {
      const w = deptWork(p, tasks as never, '2026-11-14', { ...opts, includeUnassigned: p.id === home });
      return w.loose.some((t) => t.id === 't-frei');
    }).map((p) => p.id);
    expect(holders).toEqual([home]);
  });
  it('der feste Ort ist nie „Ohne Abteilung“, der Aufgaben-Planet oder ein Sammelplanet', () => {
    expect(unassignedHomeId([{ id: 'ohne-abteilung', name: 'Ohne Abteilung' }, { id: 'aufgaben', name: 'Aufgaben' }, { id: 'x', name: 'Ohne Abteilung' }, { id: 'd-real', name: 'Laden' }])).toBe('d-real');
    expect(unassignedHomeId([])).toBeNull();
  });
});

describe('CORE-Baum → Home-Planeten', () => {
  it('behält Unterordner als eigene Monde und macht sie nie zu „Dateien“', () => {
    const [p] = coreTreeToPlanets([{
      id: 'd-k', name: 'Küche', spaces: [{ id: 'sp-k', name: 'Küche', folders: [{
        id: 'f-rez', name: 'Rezepte', nodes: [
          { id: 'n-teig', title: 'Teigansatz', type: 'note' },
          { id: 'f-rez-winter', name: 'Winter', type: 'folder', nodes: [{ id: 'n-glueh', title: 'Glühwein', type: 'note' }] },
        ],
      }] }],
    }]);
    expect(p.moons.map((m) => m.id)).toEqual(['f-rez', 'f-rez-winter']);
    expect(p.moons[0].files.map((f) => f.id)).toEqual(['n-teig']);
    expect(p.moons[1].files.map((f) => f.id)).toEqual(['n-glueh']);
  });
  it('behält einen Bereich ohne Ordner neben einem Bereich mit Ordnern', () => {
    const [p] = coreTreeToPlanets([{
      id: 'd-s', name: 'Service', spaces: [
        { id: 'sp-gast', name: 'Gastraum', folders: [{ id: 'f-tische', name: 'Tische', nodes: [] }] },
        { id: 'sp-terrasse', name: 'Terrasse', folders: [] },
      ],
    }]);
    expect(p.moons.map((m) => m.id)).toEqual(['f-tische', 'sp-terrasse']);
  });
});
