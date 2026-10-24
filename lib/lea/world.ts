/**
 * Die Welt eines Betriebs: Planeten und Monde nur aus echten Daten.
 *
 * Planet = Abteilung aus CORE (/v3/tree). Monde = die Bereiche (Spaces), die darin
 * wirklich angelegt sind. Bei einer Termin-Abteilung zählen die kommenden Termine
 * mit. Keine Vorlagen, keine Branchen-Templates, keine System-Planeten.
 * Das Material jedes Planeten kommt aus matteTone(name) (visual-v1).
 */
import { matteTone, toneSlots, type MatteTone } from '@/lib/universe/matteTone';

export interface WorldEvent { id: string; title: string; date: string; time?: string; duration?: number }
export interface WorldTask { id: string; title: string; status: string; due_date?: string | null; folder_id?: string | null; company_id?: string | null }
export interface WorldSpace { id: string; name: string; folder_count?: number; folders?: unknown[] }
export interface WorldDepartment { id: string; name: string; slug?: string; spaces?: WorldSpace[] }

export interface WorldMoon { id: string; label: string; count: number }
/** Kleiner Punkt im Netz: ein echter Eintrag (Datei, Notiz, Termin, Aufgabe). */
export interface WorldDot { id: string; label: string; kind: string; overdue?: boolean; done?: boolean }
/** Was sichtbar um einen Planeten kreist: Ordner (mit ihren Einträgen) und direkte Sterne (Aufgaben). */
export interface WorldOrbit { moons: { id: string; label: string; stars: WorldDot[] }[]; stars: WorldDot[] }
export interface WorldPlanet {
  id: string;
  name: string;
  tone: MatteTone;
  /** Gewicht aus echten Daten (Bereiche, Ordner, Termine). */
  weight: number;
  /** Ruhige Zeile unter dem Namen. */
  meta: string;
  moons: WorldMoon[];
  orbit?: WorldOrbit;
  /** Besonderheiten aus echten Daten (Galaxie v1): Ring = Ordner, Leuchten = Aktivität, Polarlicht = Überfälliges. */
  traits?: PlanetTraits;
}
export interface PlanetTraits { folders: number; activity: number; overdue: number; open: number; texture: 0 | 1 | 2 | 3 }

/** Reine Funktion: Besonderheiten eines Planeten aus Ordnern, Einträgen und Aufgaben. */
export function planetTraits(id: string, folderIds: string[], nodes: { folder_id?: string | null; created_at?: string | null; updated_at?: string | null }[], tasks: WorldTask[], now = new Date()): PlanetTraits {
  const set = new Set(folderIds);
  const week = now.getTime() - 7 * 864e5;
  const today = localISO(now);
  const recent = nodes.filter((n) => n.folder_id && set.has(n.folder_id) && Date.parse(n.updated_at || n.created_at || '') >= week).length;
  const mine = tasks.filter((t) => t.folder_id && set.has(t.folder_id) && !/done|erledigt|closed|completed/i.test(t.status || ''));
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return {
    folders: folderIds.length,
    activity: Math.min(1, recent / 8),
    overdue: mine.filter((t) => t.due_date && t.due_date.slice(0, 10) < today).length,
    open: mine.length,
    texture: (h % 4) as 0 | 1 | 2 | 3,
  };
}

export const isCalendarDept = (d: WorldDepartment) => /termin|kalender|buchung/i.test(`${d.slug ?? ''} ${d.name}`);

export function localISO(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

export function hm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Termine ab jetzt, zeitlich sortiert. */
export function upcomingEvents(events: WorldEvent[], now = new Date()): WorldEvent[] {
  const today = localISO(now);
  const time = hm(now);
  return [...events]
    .filter((e) => e.date > today || (e.date === today && (e.time ?? '23:59') >= time))
    .sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`));
}

/** Termine von heute, zeitlich sortiert (auch die schon vorbei sind). */
export function todaysEvents(events: WorldEvent[], now = new Date()): WorldEvent[] {
  const today = localISO(now);
  return events.filter((e) => e.date === today).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
}

export function plural(n: number, one: string, many: string) { return `${n} ${n === 1 ? one : many}`; }

const folderCount = (s: WorldSpace) => s.folder_count ?? (Array.isArray(s.folders) ? s.folders.length : 0);

export function buildWorld(input: { departments: WorldDepartment[]; events: WorldEvent[]; now?: Date }): WorldPlanet[] {
  const upcoming = upcomingEvents(input.events, input.now ?? new Date());
  const depts = input.departments.filter((d) => d && d.id && d.name);
  const slots = toneSlots(depts.map((d) => d.name));
  return depts
    .map((d, idx) => {
      const spaces = d.spaces ?? [];
      const moons: WorldMoon[] = spaces.map((s) => ({ id: s.id, label: s.name, count: folderCount(s) }));
      let weight = spaces.length + moons.reduce((n, m) => n + m.count, 0);
      let meta = spaces.length ? plural(spaces.length, 'Bereich', 'Bereiche') : 'noch leer';
      if (isCalendarDept(d) && upcoming.length) {
        weight += upcoming.length;
        meta = plural(upcoming.length, 'Termin kommt', 'Termine kommen');
      }
      return { id: d.id, name: d.name, tone: matteTone(d.name, { count: weight }, slots[idx]), weight, meta, moons };
    });
}
