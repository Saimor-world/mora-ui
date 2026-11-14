import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';
import type { WorldTask } from '@/lib/lea/world';
import { COLLECT_PLANET, TASKS_PLANET } from '@/lib/lea/finder';

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
 * Der eine feste Ort für Aufgaben ohne Abteilung und ohne bekannten Ordner: die erste echte Abteilung.
 * Home, Heute und Universe fragen alle hier – so springt eine solche Aufgabe nie zwischen Orten.
 */
export function unassignedHomeId(planets: ReadonlyArray<{ id: string; name?: string; title?: string }>): string | null {
  const home = planets.find((p) => p && p.id && p.id !== COLLECT_PLANET && p.id !== TASKS_PLANET && !/^ohne[\s-]*abteilung$/i.test(String(p.name ?? p.title ?? '').trim()));
  return home?.id ?? null;
}

export interface DeptWorkOptions {
  /** Wenn true, landen auch Aufgaben ohne bekannte department_id und ohne bekannte folder_id in loose. */
  includeUnassigned?: boolean;
  knownFolderIds?: Iterable<string>;
  knownDeptIds?: Iterable<string>;
}

/**
 * Was in einer Abteilung zu tun ist: je Ordner (Mond) seine Dokumente und Aufgaben (CORE ordnet Aufgaben über
 * folder_id zu), dazu Aufgaben mit department_id ohne bekannten Ordner. Aufgaben stehen im Finder auch als
 * „Dateien“ der Monde – hier werden sie wieder getrennt, damit Dokumente Dokumente bleiben.
 */
export function deptWork(planet: DemoPlanet | null, tasks: WorldTask[], today: string, options?: DeptWorkOptions): DeptWork {
  const moons = new Map<string, MoonWork>();
  if (!planet) return { moons, loose: [], open: 0, overdue: 0 };
  const taskIds = new Set(tasks.map((t) => t.id));
  const moonIds = new Set(planet.moons.map((m) => m.id));
  const allKnownFolders = options?.knownFolderIds ? new Set(options.knownFolderIds) : moonIds;
  const allKnownDepts = options?.knownDeptIds ? new Set(options.knownDeptIds) : new Set([planet.id]);
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
    .filter((t) => {
      if (t.done) return false;
      if (t.folderId && moonIds.has(t.folderId)) return false;
      const deptId = (t.raw as { department_id?: string | null }).department_id ?? null;
      if (deptId === planet.id) return true;
      if (options?.includeUnassigned) {
        const hasKnownFolder = Boolean(t.folderId && allKnownFolders.has(t.folderId));
        const hasKnownDept = Boolean(deptId && allKnownDepts.has(deptId));
        if (!hasKnownFolder && !hasKnownDept) return true;
      }
      return false;
    })
    .sort(byUrgency);
  let open = loose.length, overdue = loose.filter((t) => t.overdue).length;
  moons.forEach((w) => { open += w.open.length; overdue += w.overdue; });
  return { moons, loose, open, overdue };
}
