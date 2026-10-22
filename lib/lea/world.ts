/**
 * Lea-Welt: Planeten und Monde nur aus echten Daten (stylebook 22.10.2026).
 *
 * Planet = Abteilung aus CORE. Monde = was darin wirklich liegt: Bereiche (Spaces),
 * bei einer Termin-Abteilung die kommenden Termine. Offene Aufgaben ergeben einen
 * eigenen Planeten "Aufgaben", aber nur wenn es welche gibt. Keine Vorlagen,
 * keine System-Planeten (Wache, Markt, Labs ...).
 */
import { MATTE_TONES, matteTone, type MatteTone } from '@/lib/universe/stylebookPlanets';

export interface WorldEvent { id: string; title: string; date: string; time?: string; duration?: number }
export interface WorldTask { id: string; title: string; status: string; due_date?: string | null }
export interface WorldSpace { id: string; name: string; folder_count?: number }
export interface WorldDepartment { id: string; name: string; slug?: string; spaces?: WorldSpace[] }

export interface WorldMoon { id: string; label: string; meta?: string; count: number }
export interface WorldItem { id: string; title: string; meta: string; when?: string }
export interface WorldPlanet {
  id: string;
  name: string;
  kind: 'department' | 'tasks';
  tone: MatteTone;
  /** Gewicht aus echten Daten (Bereiche, Termine, Aufgaben). */
  weight: number;
  /** Ruhige Zeile unter dem Namen. */
  meta: string;
  summary: string;
  moons: WorldMoon[];
  items: WorldItem[];
  stats: { label: string; value: number }[];
}

const isCalendarDept = (d: WorldDepartment) => /termin|kalender|buchung/i.test(`${d.slug ?? ''} ${d.name}`);

export function localISO(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

export function upcomingEvents(events: WorldEvent[], now = new Date()): WorldEvent[] {
  const today = localISO(now);
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return [...events]
    .filter((e) => e.date > today || (e.date === today && (e.time ?? '23:59') >= hm))
    .sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`));
}

export function plural(n: number, one: string, many: string) { return `${n} ${n === 1 ? one : many}`; }

export function buildWorld(input: { departments: WorldDepartment[]; events: WorldEvent[]; tasks: WorldTask[]; now?: Date }): WorldPlanet[] {
  const now = input.now ?? new Date();
  const today = localISO(now);
  const upcoming = upcomingEvents(input.events, now);
  const todays = input.events.filter((e) => e.date === today);
  const open = input.tasks.filter((t) => t.status !== 'done');
  const planets: WorldPlanet[] = input.departments.map((d) => {
    const spaces = d.spaces ?? [];
    const moons: WorldMoon[] = spaces.map((s) => ({ id: s.id, label: s.name, count: s.folder_count ?? 0 }));
    const items: WorldItem[] = [];
    const stats = [{ label: 'Bereiche', value: spaces.length }];
    let summary = spaces.length ? `${plural(spaces.length, 'Bereich', 'Bereiche')} in dieser Abteilung.` : 'Noch keine Bereiche. Lege den ersten an oder frag MÔRA.';
    let meta = spaces.length ? plural(spaces.length, 'Bereich', 'Bereiche') : 'noch leer';
    let weight = spaces.length;
    if (isCalendarDept(d)) {
      upcoming.slice(0, 4).forEach((e) => moons.push({ id: e.id, label: e.title.split(' – ')[1] ?? e.title, meta: e.time, count: 1 }));
      input.events
        .slice()
        .sort((a, b) => `${b.date} ${b.time ?? ''}`.localeCompare(`${a.date} ${a.time ?? ''}`))
        .slice(0, 4)
        .forEach((e) => items.push({ id: e.id, title: e.title, meta: e.time ? `${e.time} Uhr` : 'ganztägig', when: shortDate(e.date) }));
      stats.unshift({ label: 'Heute', value: todays.length }, { label: 'Kommend', value: upcoming.length });
      const next = upcoming[0];
      summary = `Heute ${plural(todays.length, 'Termin', 'Termine')}.` + (next ? ` Als Nächstes ${next.date === today ? 'heute' : shortDate(next.date)} um ${next.time}: ${next.title}.` : ' Danach ist nichts eingetragen.');
      meta = plural(upcoming.length, 'Termin kommt', 'Termine kommen');
      weight += input.events.length;
    }
    return { id: d.id, name: d.name, kind: 'department', tone: matteTone(d.name), weight, meta, summary, moons, items, stats };
  });
  if (open.length) {
    const dueToday = open.filter((t) => t.due_date && t.due_date <= today);
    planets.push({
      id: 'world-tasks',
      name: 'Aufgaben',
      kind: 'tasks',
      tone: matteTone('Aufgaben'),
      weight: open.length,
      meta: plural(open.length, 'offen', 'offen'),
      summary: `${plural(open.length, 'offene Aufgabe', 'offene Aufgaben')}` + (dueToday.length ? `, ${dueToday.length} davon heute fällig oder überfällig.` : '.'),
      moons: open.slice(0, 4).map((t) => ({ id: t.id, label: t.title.split(':')[0].split(' ').slice(0, 2).join(' '), meta: t.due_date ? shortDate(t.due_date) : undefined, count: 1 })),
      items: open.slice(0, 4).map((t) => ({ id: t.id, title: t.title, meta: t.due_date ? (t.due_date < today ? `überfällig seit ${shortDate(t.due_date)}` : t.due_date === today ? 'heute fällig' : `fällig ${shortDate(t.due_date)}`) : 'ohne Datum', when: t.due_date ? shortDate(t.due_date) : undefined })),
      stats: [{ label: 'Offen', value: open.length }, { label: 'Heute fällig', value: dueToday.length }],
    });
  }
  // Nachbarn sollen sich unterscheiden: Töne der Reihe nach, ab dem Ton des ersten Namens.
  const offset = MATTE_TONES.findIndex((t) => t.key === (planets[0]?.tone.key ?? 'sand'));
  return planets.map((p, i) => {
    const t = MATTE_TONES[(offset + i) % MATTE_TONES.length];
    return { ...p, tone: { ...t, background: `radial-gradient(circle at 35% 30%, ${t.light}, ${t.dark} 70%)` } };
  });
}
