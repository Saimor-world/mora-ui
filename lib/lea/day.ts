/**
 * Der Tag eines Betriebs aus echten Terminen und Aufgaben (Handy-Home V4).
 * Reine Funktionen: was heute ansteht, was als Nächstes kommt, was nur heute zählt.
 */
import { hm, localISO, plural, shortDate, todaysEvents, upcomingEvents, type WorldEvent, type WorldTask } from './world';

export interface DayTask { id: string; title: string; meta: string; overdue: boolean }
export interface Day {
  today: WorldEvent[];
  next: WorldEvent | null;
  /** Minuten bis zum nächsten Termin, nur wenn er heute ist. */
  minutesToNext: number | null;
  onlyToday: DayTask[];
}

/** Name hinter dem Gedankenstrich („Maniküre – Sophie“ → „Sophie“), sonst der ganze Titel. */
export function personOf(title: string): string {
  const parts = title.split(/\s+[–-]\s+/);
  return (parts.length > 1 ? parts[parts.length - 1] : title).trim();
}

/** Was vor dem Gedankenstrich steht („Maniküre – Sophie“ → „Maniküre“), sonst ''. */
export function serviceOf(title: string): string {
  const parts = title.split(/\s+[–-]\s+/);
  return parts.length > 1 ? parts.slice(0, -1).join(' – ').trim() : '';
}

export function buildDay(events: WorldEvent[], tasks: WorldTask[], now = new Date(), timeZone?: string): Day {
  const iso = localISO(now, timeZone);
  const next = upcomingEvents(events, now, timeZone)[0] ?? null;
  let minutesToNext: number | null = null;
  if (next && next.date === iso && next.time) {
    const [h, m] = next.time.split(':').map(Number);
    const [hour, minute] = hm(now, timeZone).split(':').map(Number);
    minutesToNext = Math.max(0, h * 60 + m - (hour * 60 + minute));
  }
  const onlyToday = tasks
    .filter((t) => t.status !== 'done' && t.due_date && t.due_date <= iso)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
    .map((t) => {
      const overdue = String(t.due_date) < iso;
      return { id: t.id, title: t.title, overdue, meta: overdue ? `überfällig seit ${shortDate(String(t.due_date))}` : 'heute fällig' };
    });
  return { today: todaysEvents(events, now, timeZone), next, minutesToNext, onlyToday };
}

/** MÔRAs Satz für den Tag: nur was belegt ist. */
export function daySentence(day: Day, now = new Date(), timeZone?: string): string {
  // An unknown end cannot prove a completed appointment; never invent 60 minutes.
  const endOf = (e: WorldEvent) => { if (!e.time || e.duration == null) return '23:59'; const [h, m] = e.time.split(':').map(Number); const t = Math.min(h * 60 + m + e.duration, 23 * 60 + 59); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const left = day.today.filter((e) => endOf(e) > hm(now, timeZone)).length;
  if (!day.today.length) return day.next ? `Heute ist nichts eingetragen. Der nächste Termin ist am ${shortDate(day.next.date)}.` : 'Heute ist nichts eingetragen.';
  if (!left) return day.today.length === 1 ? 'Dein Termin heute ist vorbei.' : `Alle ${day.today.length} Termine von heute sind vorbei.`;
  const next = day.next && day.next.date === localISO(now, timeZone) ? ` Als Nächstes um ${day.next.time} ${personOf(day.next.title)}.` : '';
  return `Heute ${left === day.today.length ? plural(left, 'Termin', 'Termine') : `noch ${plural(left, 'Termin', 'Termine')}`}.${next}`;
}

export function inMinutes(min: number): string {
  if (min < 1) return 'jetzt';
  if (min < 60) return `in ${min} Min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `in ${h} Std ${m} Min` : `in ${h} Std`;
}

/**
 * Kalender-Kachel: heutige Termine ohne die abgeschlossenen; der nächste offene
 * (ein laufender zählt als offen). Status kommt aus CORE (dayStore).
 */
export function nextOpenToday(
  events: WorldEvent[],
  phases: Record<string, 'geplant' | 'laeuft' | 'erledigt'>,
  now = new Date(),
  timeZone?: string,
): { next: WorldEvent | null; open: number; total: number } {
  const today = todaysEvents(events, now, timeZone);
  const open = today.filter((e) => phases[e.id] !== 'erledigt');
  return { next: open[0] ?? null, open: open.length, total: today.length };
}
