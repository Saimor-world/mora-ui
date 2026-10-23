/**
 * Finder = Universe. Ein Datenmodell, zwei Ansichten (Universe und Liste).
 *
 * Planet = Abteilung (/v3/tree). Mond = Ordner (/v3/folders, über seinen Bereich der
 * Abteilung zugeordnet – wie lib/universe/moonsFromFolders). Stern = Inhalt im Ordner
 * (/v3/nodes). Bereiche ohne Abteilung landen bei der Abteilung mit gleichem Slug,
 * sonst auf dem Sammel-Planeten „Ohne Abteilung“. Dazu der Planet „Aufgaben“ aus
 * /v3/tasks (Aufgaben sind seine Sterne). Nichts wird erfunden.
 */
import { matteTone, type MatteTone } from '@/lib/universe/matteTone';
import { localISO, shortDate, type WorldTask } from './world';

export interface FSpace { id: string; name: string; slug?: string; department_id?: string | null }
export interface FDept { id: string; name: string; slug?: string; spaces?: FSpace[] }
export interface FFolder { id: string; name?: string; space_id?: string | null; parent_folder_id?: string | null; node_count?: number; updated_at?: string | null }
export interface FNode { id: string; title?: string; name?: string; type?: string; folder_id?: string | null; updated_at?: string | null; created_at?: string | null; metadata?: Record<string, unknown> | null }

export type StarKind = 'event' | 'document' | 'note' | 'task' | 'file' | 'link' | 'other';
export interface Star { id: string; name: string; kind: StarKind; modified?: string | null; hint?: string; done?: boolean; overdue?: boolean; raw?: unknown }
export interface Moon { id: string; name: string; spaceId?: string | null; spaceName?: string; stars: Star[]; count: number; modified?: string | null }
export interface FPlanet {
  id: string;
  name: string;
  kind: 'department' | 'collect' | 'tasks';
  tone: MatteTone;
  /** Bereiche (Spaces) der Abteilung – für „Ordner anlegen“. */
  spaces: FSpace[];
  moons: Moon[];
  /** Sterne direkt am Planeten (nur Aufgaben). */
  stars: Star[];
}

export const TASKS_PLANET = 'aufgaben';
export const COLLECT_PLANET = 'ohne-abteilung';

const KIND_LABEL: Record<StarKind, string> = { event: 'Termin', document: 'Dokument', note: 'Notiz', task: 'Aufgabe', file: 'Datei', link: 'Link', other: 'Eintrag' };
export const kindLabel = (k: StarKind) => KIND_LABEL[k];

function starKind(type?: string, meta?: Record<string, unknown> | null): StarKind {
  const t = (type || '').toLowerCase();
  if (t === 'event' || meta?.subtype === 'calendar_event') return 'event';
  if (t === 'document' || t === 'doc') return 'document';
  if (t === 'note') return 'note';
  if (t === 'task') return 'task';
  if (t === 'file') return 'file';
  if (t === 'link') return 'link';
  return 'other';
}

export function nodeStar(n: FNode): Star {
  const meta = n.metadata ?? null;
  const kind = starKind(n.type, meta);
  const date = typeof meta?.date === 'string' ? (meta.date as string) : null;
  const time = typeof meta?.time === 'string' ? (meta.time as string) : null;
  return {
    id: n.id,
    name: n.title || n.name || 'Ohne Titel',
    kind,
    modified: n.updated_at ?? n.created_at ?? null,
    hint: kind === 'event' && date ? `${shortDate(date)}${time ? ` · ${time}` : ''}` : undefined,
    raw: n,
  };
}

export function taskStar(t: WorldTask, now = new Date()): Star {
  const today = localISO(now);
  const done = t.status === 'done';
  const overdue = !done && Boolean(t.due_date) && (t.due_date as string) < today;
  const hint = done ? 'erledigt' : !t.due_date ? 'ohne Datum' : t.due_date === today ? 'heute fällig' : overdue ? `überfällig seit ${shortDate(t.due_date as string)}` : `fällig ${shortDate(t.due_date as string)}`;
  return { id: t.id, name: t.title, kind: 'task', hint, done, overdue, raw: t };
}

export function buildFinder(input: { departments: FDept[]; unassigned?: FSpace[]; folders: FFolder[]; nodes: FNode[]; tasks?: WorldTask[] | null; now?: Date }): FPlanet[] {
  const depts = input.departments.filter((d) => d && d.id && d.name);
  const spaceOwner: Record<string, string> = {};
  const spacesOf: Record<string, FSpace[]> = {};
  const collect: FSpace[] = [];
  for (const d of depts) {
    spacesOf[d.id] = [...(d.spaces ?? [])];
    for (const s of d.spaces ?? []) spaceOwner[s.id] = d.id;
  }
  for (const s of input.unassigned ?? []) {
    const match = depts.find((d) => (d.slug && s.slug && d.slug === s.slug));
    if (match) { spaceOwner[s.id] = match.id; spacesOf[match.id].push(s); } else { spaceOwner[s.id] = COLLECT_PLANET; collect.push(s); }
  }
  const spaceName: Record<string, string> = {};
  for (const s of [...Object.values(spacesOf).flat(), ...collect]) spaceName[s.id] = s.name;

  const starsByFolder: Record<string, Star[]> = {};
  for (const n of input.nodes) {
    if (!n?.id || !n.folder_id) continue;
    (starsByFolder[n.folder_id] ||= []).push(nodeStar(n));
  }
  const moonsByPlanet: Record<string, Moon[]> = {};
  for (const f of input.folders) {
    if (!f?.id || !f.space_id) continue;
    const owner = spaceOwner[f.space_id];
    if (!owner) continue;
    const stars = (starsByFolder[f.id] ?? []).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    (moonsByPlanet[owner] ||= []).push({ id: f.id, name: f.name || 'Ordner', spaceId: f.space_id, spaceName: spaceName[f.space_id], stars, count: Math.max(stars.length, f.node_count ?? 0), modified: f.updated_at ?? null });
  }

  const planets: FPlanet[] = depts.map((d) => {
    const moons = moonsByPlanet[d.id] ?? [];
    const weight = moons.length + moons.reduce((n, m) => n + m.count, 0);
    return { id: d.id, name: d.name, kind: 'department', tone: matteTone(d.name, { count: weight }), spaces: spacesOf[d.id], moons, stars: [] };
  });
  if (collect.length) {
    const moons = moonsByPlanet[COLLECT_PLANET] ?? [];
    planets.push({ id: COLLECT_PLANET, name: 'Ohne Abteilung', kind: 'collect', tone: matteTone('Ohne Abteilung', { count: moons.length }), spaces: collect, moons, stars: [] });
  }
  if (input.tasks) {
    const stars = input.tasks.map((t) => taskStar(t, input.now)).sort((a, b) => Number(a.done) - Number(b.done) || Number(b.overdue) - Number(a.overdue) || a.name.localeCompare(b.name, 'de'));
    planets.push({ id: TASKS_PLANET, name: 'Aufgaben', kind: 'tasks', tone: matteTone('Aufgaben', { count: stars.length }), spaces: [], moons: [], stars });
  }
  return planets;
}

export function planetCounts(p: FPlanet) {
  const docs = p.moons.reduce((n, m) => n + m.stars.filter((s) => s.kind === 'document' || s.kind === 'file').length, 0);
  const notes = p.moons.reduce((n, m) => n + m.stars.filter((s) => s.kind === 'note').length, 0);
  const events = p.moons.reduce((n, m) => n + m.stars.filter((s) => s.kind === 'event').length, 0);
  const open = p.stars.filter((s) => !s.done).length;
  return { folders: p.moons.length, docs, notes, events, items: p.moons.reduce((n, m) => n + m.count, 0), open, overdue: p.stars.filter((s) => s.overdue).length };
}

export function formatModified(iso?: string | null): string {
  if (!iso) return '–';
  const d = new Date(iso.endsWith('Z') || /[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
