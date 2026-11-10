import { deptWork } from '@/lib/universe/deptWork';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';

const planet = {
  id: 'dept-growth', title: 'Growth', jobRoles: [], glass: 'sage', position: { x: 50, y: 50 },
  moons: [
    { id: 'f-brief', title: 'Strategic Briefings', files: [
      { id: 'n-q1', name: 'Q1 Expansion Roadmap', meta: 'document', body: [] },
      { id: 't1', name: 'Roadmap Q1 mit Zahlen nachziehen', meta: 'überfällig', body: [] },
    ] },
    { id: 'f-empty', title: 'Leer', files: [] },
  ],
} as unknown as DemoPlanet;

describe('deptWork', () => {
  const tasks = [
    { id: 't1', title: 'Roadmap Q1 mit Zahlen nachziehen', status: 'backlog', due_date: '2026-11-06', folder_id: 'f-brief' },
    { id: 't2', title: 'Briefing an Partner schicken', status: 'backlog', due_date: '2026-11-09', folder_id: 'f-brief' },
    { id: 't3', title: 'Erledigt', status: 'done', due_date: '2026-11-01', folder_id: 'f-brief' },
    { id: 't4', title: 'Ohne Ordner', status: 'backlog', due_date: null, folder_id: null, department_id: 'dept-growth' },
    { id: 't5', title: 'Andere Abteilung', status: 'backlog', due_date: null, folder_id: 'f-other' },
  ];
  const w = deptWork(planet, tasks as never, '2026-11-09');

  it('trennt Dokumente von Aufgaben im Ordner', () => {
    expect(w.moons.get('f-brief')!.docs.map((d) => d.id)).toEqual(['n-q1']);
  });
  it('zählt offene und überfällige Aufgaben je Ordner, überfällig zuerst', () => {
    const m = w.moons.get('f-brief')!;
    expect(m.open.map((t) => t.id)).toEqual(['t1', 't2']);
    expect(m.overdue).toBe(1);
    expect(m.open[1].dueToday).toBe(true);
    expect(m.done.map((t) => t.id)).toEqual(['t3']);
  });
  it('nimmt Aufgaben mit department_id ohne Ordner als lose Aufgaben der Abteilung', () => {
    expect(w.loose.map((t) => t.id)).toEqual(['t4']);
    expect(w.open).toBe(3);
    expect(w.overdue).toBe(1);
  });
  it('erfindet nichts für leere Ordner', () => {
    expect(w.moons.get('f-empty')).toEqual({ docs: [], open: [], done: [], overdue: 0 });
  });
});
