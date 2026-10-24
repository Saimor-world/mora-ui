/**
 * Die Welt eines Betriebs: Planeten und Monde nur aus echten Daten.
 *
 * Planet = Abteilung aus CORE (/v3/tree). Monde = die Bereiche (Spaces), die darin
 * wirklich angelegt sind. Bei einer Termin-Abteilung zählen die kommenden Termine
 * mit. Keine Vorlagen, keine Branchen-Templates, keine System-Planeten.
 * Das Material jedes Planeten kommt aus matteTone(name) (visual-v1).
 */
import { matteTone, type MatteTone } from '@/lib/universe/matteTone';

export interface WorldEvent { id: string; title: string; date: string; time?: string; duration?: number }
export interface WorldTask { id: string; title: string; status: string; due_date?: string | null }
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
  return input.departments
    .filter((d) => d && d.id && d.name)
    .map((d, idx) => {
      const spaces = d.spaces ?? [];
      const moons: WorldMoon[] = spaces.map((s) => ({ id: s.id, label: s.name, count: folderCount(s) }));
      let weight = spaces.length + moons.reduce((n, m) => n + m.count, 0);
      let meta = spaces.length ? plural(spaces.length, 'Bereich', 'Bereiche') : 'noch leer';
      if (isCalendarDept(d) && upcoming.length) {
        weight += upcoming.length;
        meta = plural(upcoming.length, 'Termin kommt', 'Termine kommen');
      }
      return { id: d.id, name: d.name, tone: matteTone(d.name, { count: weight }, idx), weight, meta, moons };
    });
}
