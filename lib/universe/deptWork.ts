import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';
import type { WorldTask } from '@/lib/lea/world';

/** Eine Aufgabe, wie die Abteilung sie zeigt – nur Felder, die CORE (/v3/tasks) wirklich liefert. */
export interface WorkTask {
  id: string;
  title: string;
  status: string;
  done: boolean;
  due: string | null;
  overdue: boolean;
  dueToday: boolean;
  folderId: string | null;
  assignee: string | null;
  raw: WorldTask;
}
export interface WorkDoc { id: string; name: string; meta: string }
export interface MoonWork { docs: WorkDoc[]; open: WorkTask[]; done: WorkTask[]; overdue: number }
export interface DeptWork { moons: Map<string, MoonWork>; loose: WorkTask[]; open: number; overdue: number }

export function toWorkTask(t: WorldTask, today: string): WorkTask {
  const done = t.status === 'done';
  const due = t.due_date ? String(t.due_date).slice(0, 10) : null;
  const a = (t as { assignee?: unknown }).assignee;
  return {
    id: t.id, title: t.title, status: t.status, done, due,
    overdue: !done && Boolean(due) && (due as string) < today,
    dueToday: !done && due === today,
    folderId: t.folder_id ?? null,
    assignee: typeof a === 'string' && a.trim() ? a.trim() : null,
    raw: t,
  };
}

/** Überfällig zuerst, dann nach Fälligkeit, ohne Datum zuletzt. */
export function byUrgency(a: WorkTask, b: WorkTask): number {
  return Number(b.overdue) - Number(a.overdue) || (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.title.localeCompare(b.title, 'de');
}

/**
 * Was in einer Abteilung zu tun ist: je Ordner (Mond) seine Dokumente und Aufgaben (CORE ordnet Aufgaben über
 * folder_id zu), dazu Aufgaben mit department_id ohne bekannten Ordner. Aufgaben stehen im Finder auch als
 * „Dateien“ der Monde – hier werden sie wieder getrennt, damit Dokumente Dokumente bleiben.
 */
export function deptWork(planet: DemoPlanet | null, tasks: WorldTask[], today: string): DeptWork {
  const moons = new Map<string, MoonWork>();
  if (!planet) return { moons, loose: [], open: 0, overdue: 0 };
  const taskIds = new Set(tasks.map((t) => t.id));
  const moonIds = new Set(planet.moons.map((m) => m.id));
  const all = tasks.map((t) => toWorkTask(t, today));
  for (const m of planet.moons) {
    const mine = all.filter((t) => t.folderId === m.id);
    const open = mine.filter((t) => !t.done).sort(byUrgency);
    moons.set(m.id, {
      docs: m.files.filter((f) => !taskIds.has(f.id)).map((f) => ({ id: f.id, name: f.name, meta: f.meta })),
      open,
      done: mine.filter((t) => t.done),
      overdue: open.filter((t) => t.overdue).length,
    });
  }
  const loose = all
    .filter((t) => !t.done && (!t.folderId || !moonIds.has(t.folderId)) && (t.raw as { department_id?: string | null }).department_id === planet.id)
    .sort(byUrgency);
  let open = loose.length, overdue = loose.filter((t) => t.overdue).length;
  moons.forEach((w) => { open += w.open.length; overdue += w.overdue; });
  return { moons, loose, open, overdue };
}
