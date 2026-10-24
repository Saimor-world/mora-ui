/**
 * Der Tag mit dem, was Lea heute schon getan hat: Terminstatus (dayStore) und
 * erledigte Aufgaben (CORE). Reine Funktionen, damit Home und Universe dasselbe sagen.
 */
import type { EventPhase } from './dayStore';
import { personOf, serviceOf } from './day';
import { hm, localISO, plural, shortDate, type WorldEvent, type WorldTask } from './world';

export interface LiveTask { task: WorldTask; overdue: boolean; meta: string }
export interface LiveDay {
  running: WorldEvent | null;
  /** Heute geplant, Zeit vorbei, aber nicht abgeschlossen. */
  stale: WorldEvent | null;
  /** Was nach dem offenen Termin kommt (für die Tageskarte). */
  ahead: string | null;
  next: WorldEvent | null;
  minutesToNext: number | null;
  open: LiveTask[];
  doneToday: WorldTask[];
  /** Heute gab es Termine und alle sind abgeschlossen. */
  doneTodayEvents: boolean;
  tomorrow: WorldTask[];
  sentence: string;
}

export function phaseOf(e: WorldEvent, phases: Record<string, EventPhase>): EventPhase {
  return phases[e.id] ?? 'geplant';
}

export function buildLiveDay(events: WorldEvent[], tasks: WorldTask[], phases: Record<string, EventPhase>, now = new Date()): LiveDay {
  const iso = localISO(now);
  const t = new Date(now); t.setDate(t.getDate() + 1);
  const tomorrowIso = localISO(t);
  const time = hm(now);
  const today = events.filter((e) => e.date === iso).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  const running = today.find((e) => phaseOf(e, phases) === 'laeuft') ?? null;
  const endOf = (e: WorldEvent) => { if (!e.time) return '23:59'; const [h, m] = e.time.split(':').map(Number); const t = h * 60 + m + (e.duration ?? 60); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const stale = running ? null : today.find((e) => phaseOf(e, phases) === 'geplant' && endOf(e) < time) ?? null;
  const next = running ? null : (
    today.find((e) => phaseOf(e, phases) === 'geplant' && (e.time ?? '23:59') >= time)
    ?? [...events].filter((e) => e.date > iso).sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`))[0]
    ?? null
  );
  let minutesToNext: number | null = null;
  if (next && next.date === iso && next.time) {
    const [h, m] = next.time.split(':').map(Number);
    minutesToNext = Math.max(0, h * 60 + m - (now.getHours() * 60 + now.getMinutes()));
  }
  const open = tasks
    .filter((x) => x.status !== 'done' && x.due_date && x.due_date <= iso)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
    .map((x) => {
      const overdue = String(x.due_date) < iso;
      return { task: x, overdue, meta: overdue ? `überfällig seit ${shortDate(String(x.due_date))}` : 'heute fällig' };
    });
  const doneToday = tasks.filter((x) => x.status === 'done' && x.due_date && x.due_date <= iso);
  const tomorrow = tasks.filter((x) => x.status !== 'done' && x.due_date === tomorrowIso);

  let sentence: string;
  const openNames = open.map((o) => o.task.title.split(':')[0]);
  if (stale && !running) sentence = `Der Termin mit ${personOf(stale.title)} um ${stale.time} ist noch nicht abgeschlossen.`;
  else if (running) sentence = `${personOf(running.title)} ist da. Ich halte dir den Rest fern, bis ihr fertig seid.`;
  else if (next && next.date === iso) sentence = `${next.time ? `Um ${next.time} ` : ''}kommt ${personOf(next.title)}${serviceOf(next.title) ? ` zum ${serviceOf(next.title)}` : ''}.${open.length ? ` Offen: ${plural(open.length, 'Aufgabe', 'Aufgaben')}.` : ' Sonst ist heute alles erledigt.'}`;
  else if (open.length) sentence = `Heute kommt niemand mehr. Offen: ${openNames.join(' und ')}.`;
  else sentence = tomorrow.length ? 'Heute ist alles erledigt. Morgen steht schon etwas drin.' : 'Heute ist alles erledigt. Magst du morgen planen?';
  const doneTodayEvents = today.length > 0 && today.every((e) => phaseOf(e, phases) === 'erledigt');
  // Ergänzt die Termin-Karte statt sie zu wiederholen: was danach kommt.
  let ahead: string | null = null;
  if (stale && !running) {
    const parts: string[] = [];
    if (next && next.date === iso) parts.push(`Um ${next.time ?? ''} kommt ${personOf(next.title)}.`.replace(/\s+/g, ' '));
    if (next && next.date === tomorrowIso) parts.push(`Morgen${next.time ? ` um ${next.time}` : ''} kommt ${personOf(next.title)}.`);
    else if (next && next.date > iso && next.date !== tomorrowIso) parts.push(`Nächster Termin: ${shortDate(next.date)}${next.time ? `, ${next.time}` : ''}.`);
    ahead = parts.length ? `Nach dem Abschluss: ${parts.join(' ')}` : tomorrow.length ? 'Nach dem Abschluss ist heute nichts mehr im Kalender. Für morgen steht schon etwas an.' : 'Nach dem Abschluss ist dein Tag frei – magst du morgen planen?';
  }
  return { doneTodayEvents, running, stale, next, minutesToNext, open, doneToday, tomorrow, sentence, ahead };
}

/** Kurze Zeile für einen Termin-Planeten im Universe. */
export function calendarMeta(day: LiveDay): string | null {
  if (day.running) return `${personOf(day.running.title)} · läuft gerade`;
  if (day.next && day.next.date === localISO()) return `heute ${day.next.time ?? ''} ${personOf(day.next.title)}`.replace(/\s+/g, ' ').trim();
  if (day.doneTodayEvents) return 'heute erledigt';
  return null;
}
