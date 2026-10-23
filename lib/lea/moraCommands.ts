/**
 * MÔRA versteht einfache Tages-Sätze und führt sie über die bestehenden Aktionen aus:
 *  „hak Herbstrot ab“ → Aufgabe erledigt · „Herbstrot wieder offen“ → zurück
 *  „Michelle ist da“ → Termin läuft · „Michelle fertig“ / „Termin abschließen“ → erledigt
 *  „@Termine“ / „zeig Termine“ / „geh zu Aufgaben“ → Bereich ansteuern
 * Reine Funktion: kein Treffer → null (dann geht der Satz als Frage an MÔRA).
 * Mehrdeutig → { kind: 'ambiguous' }, damit nie die falsche Aufgabe abgehakt wird.
 */
import { personOf } from './day';
import type { WorldEvent, WorldTask } from './world';

export type DayCommand =
  | { kind: 'done'; task: WorldTask }
  | { kind: 'reopen'; task: WorldTask }
  | { kind: 'arrived'; event: WorldEvent }
  | { kind: 'finish'; event: WorldEvent }
  | { kind: 'jump'; planetId: string; name: string }
  | { kind: 'ambiguous'; what: string; options: string[] }
  | { kind: 'unknown-target'; what: string };

export interface CommandContext {
  tasks: WorldTask[];
  /** Heutige Termine (sortiert). */
  todayEvents: WorldEvent[];
  planets: { id: string; name: string }[];
  /** Termin, der läuft bzw. als letzter überfällig ist (für „Termin abschließen“ ohne Namen). */
  running?: WorldEvent | null;
  stale?: WorldEvent | null;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9@ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['hak', 'hake', 'abhaken', 'ab', 'die', 'der', 'das', 'den', 'aufgabe', 'bitte', 'mal', 'ist', 'erledigt', 'fertig', 'als', 'markier', 'markiere', 'wieder', 'offen', 'da', 'termin', 'mit', 'abschliessen', 'schliess', 'schliesse', 'zeig', 'zeige', 'geh', 'gehe', 'zu', 'zum', 'zur', 'oeffne', 'offne', 'mir', 'und', 'ich', 'habe', 'hab', 'gemacht', 'angekommen', 'jetzt', 'gerade']);
const words = (s: string) => norm(s).split(' ').filter((w) => w.length > 1 && !STOP.has(w));

/** Bester Treffer per Wortüberlappung (auch Teilwörter ≥4 Zeichen: „herbstrot“ ~ „Herbstrot“). */
function best<T>(query: string[], items: T[], label: (t: T) => string): { hit: T | null; ties: T[] } {
  if (!query.length) return { hit: null, ties: [] };
  const scored = items.map((it) => {
    const ws = words(label(it));
    const score = query.reduce((n, q) => n + (ws.some((w) => w === q) ? 2 : ws.some((w) => q.length >= 4 && (w.startsWith(q) || q.startsWith(w) && w.length >= 4)) ? 1 : 0), 0);
    return { it, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  if (!scored.length) return { hit: null, ties: [] };
  const ties = scored.filter((x) => x.score === scored[0].score).map((x) => x.it);
  return { hit: ties.length === 1 ? ties[0] : null, ties };
}

export function parseDayCommand(text: string, ctx: CommandContext): DayCommand | null {
  const t = norm(text);
  if (!t) return null;
  const q = words(text);

  // Bereich ansteuern: „@Termine“, „zeig Termine“, „geh zu Aufgaben“, „öffne Material“.
  const at = /@(\S+)/.exec(text);
  const jumpVerb = /^(zeig|zeige|geh|gehe|oeffne|offne|zoom)\b/.test(t);
  if (at || jumpVerb) {
    const query = at ? words(at[1]) : q;
    const { hit, ties } = best(query, ctx.planets, (p) => p.name);
    if (hit) return { kind: 'jump', planetId: hit.id, name: hit.name };
    if (ties.length > 1) return { kind: 'ambiguous', what: 'Bereich', options: ties.map((p) => p.name) };
    if (at) return { kind: 'unknown-target', what: at[1] };
  }

  const isArrived = /\b(ist da|sind da|angekommen|ist jetzt da)\b/.test(t);
  const isFinish = /\b(abschliessen|abgeschlossen|fertig|ist durch|termin erledigt)\b/.test(t) && !/\bhak/.test(t);
  if (isArrived || (isFinish && (ctx.todayEvents.length > 0))) {
    const byName = best(q, ctx.todayEvents, (e) => personOf(e.title));
    const ev = byName.hit ?? (q.length === 0 && isFinish ? ctx.running ?? ctx.stale ?? null : null);
    if (ev) return isArrived ? { kind: 'arrived', event: ev } : { kind: 'finish', event: ev };
    if (byName.ties.length > 1) return { kind: 'ambiguous', what: 'Termin', options: byName.ties.map((e) => personOf(e.title)) };
    if (isArrived) return { kind: 'unknown-target', what: q.join(' ') || 'Termin' };
  }

  const isDone = /\b(hak|hake|abhaken|abgehakt|erledigt|gemacht)\b/.test(t);
  const isReopen = /\bwieder offen\b|\bzurueck\b|\brueckgaengig\b/.test(t);
  if (isDone || isReopen) {
    const pool = ctx.tasks.filter((x) => (isReopen ? x.status === 'done' : x.status !== 'done'));
    const { hit, ties } = best(q, pool, (x) => x.title);
    if (hit) return isReopen ? { kind: 'reopen', task: hit } : { kind: 'done', task: hit };
    if (ties.length > 1) return { kind: 'ambiguous', what: 'Aufgabe', options: ties.map((x) => x.title) };
    if (q.length) return { kind: 'unknown-target', what: q.join(' ') };
  }
  return null;
}
