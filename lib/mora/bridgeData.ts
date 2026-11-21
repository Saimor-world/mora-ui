import type { TodaySnapshot, TodaySourceMeta } from '@/lib/api/todayClient';

/**
 * Alles, was die Brücke zeigt, kommt aus genau einem Snapshot (/v3/today).
 * Fehlt eine Quelle, liefern die Helfer null bzw. leere Listen – nie erfundene Werte.
 */
export const sourceReady = (source?: TodaySourceMeta | null) =>
  !!source && !!source.complete && (source.status === 'ok' || source.status === 'empty');

/** „[FIKTIV] Reservierung …“ → „Reservierung …“ */
export function cleanTitle(title: string): string {
  return title.replace(/\[(fiktiv)\]|\((fiktiv)\)/gi, '').replace(/\s{2,}/g, ' ').trim();
}

function shorten(text: string, max = 22): string {
  const t = cleanTitle(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 10 ? cut.slice(0, lastSpace) : cut).replace(/[\s,:–-]+$/, '')}…`;
}

const NEEDS_YOU = /krank|ausfall|fällt aus|verzug|verspät|defekt|rechnung|mahnung|reklamation|beschwerde|dringend|freigabe|storn/i;

/** Die eine Mail-Zahl: CORE unread_count, sonst die ungelesenen geladenen Mails, sonst Briefing-Kennzahl. */
export function mailCounts(snapshot: TodaySnapshot | null, briefingUnread?: number | null): { unread: number | null; needsYou: number } {
  if (!snapshot || !sourceReady(snapshot.mail)) return { unread: typeof briefingUnread === 'number' ? briefingUnread : null, needsYou: 0 };
  const items = snapshot.mail.items ?? [];
  const unreadItems = items.filter((m) => m.read !== true);
  const unread =
    typeof snapshot.mail.unread_count === 'number' ? snapshot.mail.unread_count
      : typeof briefingUnread === 'number' ? briefingUnread
        : unreadItems.length;
  const needsYou = unreadItems.filter((m) => NEEDS_YOU.test(`${m.subject ?? ''}`)).length;
  return { unread, needsYou };
}

/** Only the calendar entry itself can mark its shift as open. */
function openShifts(snapshot: TodaySnapshot | null) {
  if (!snapshot || !sourceReady(snapshot.calendar)) return [];
  return snapshot.calendar.events.filter(e =>
    e.date === snapshot.date && /schicht/i.test(e.title) &&
    (e.is_open === true || e.open === true || /^(open|offen)$/i.test(e.status || e.phase || ''))
  );
}

function openShiftLabel(shift: { time?: string }) {
  return shift.time ? `Schicht um ${shift.time} offen` : 'Offene Schicht';
}

export type DayMark = { id: string; minute: number; time: string; label: string; problem: boolean };
export const DAY_START = 6 * 60;
export const DAY_END = 22 * 60;

const toMinute = (time?: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(time ?? '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
export const hhmm = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

/**
 * Höchstens `max` beschriftete Punkte zwischen 6 und 22 Uhr: zuerst Probleme (offene Schicht),
 * dann was als Nächstes kommt, aufgefüllt mit Früherem. Eine Uhrzeit nur einmal.
 */
export function dayMarks(snapshot: TodaySnapshot | null, now: number, max = 5): DayMark[] {
  if (!snapshot || !sourceReady(snapshot.calendar)) return [];
  const open = openShifts(snapshot);
  const all = snapshot.calendar.events
    .filter((e) => e.date === snapshot.date && e.title)
    .map((e) => {
      const minute = toMinute(e.time);
      const isOpen = open.some(x => x.id === e.id);
      return minute === null || minute < DAY_START || minute > DAY_END ? null
        : { id: e.id, minute, time: hhmm(minute), label: isOpen ? `Offen · ${shorten(e.title)}` : shorten(e.title), problem: isOpen };
    })
    .filter((x): x is DayMark => x !== null)
    .sort((a, b) => a.minute - b.minute);
  const picked: DayMark[] = [];
  const take = (m: DayMark) => { if (picked.length < max && !picked.some((p) => p.minute === m.minute || p.id === m.id)) picked.push(m); };
  all.filter((m) => m.problem).forEach(take);
  all.filter((m) => m.minute >= now).forEach(take);
  [...all].reverse().forEach(take);
  return picked.sort((a, b) => a.minute - b.minute);
}

export type Station = { id: 'post' | 'today' | 'team' | 'nightwatch'; label: string; value: string; detail: string; tone: 'calm' | 'amber' | 'red'; progress?: number; count?: number };

export function stations(snapshot: TodaySnapshot | null, briefingUnread?: number | null): Station[] {
  const mail = mailCounts(snapshot, briefingUnread);
  const post: Station = mail.unread === null
    ? { id: 'post', label: 'Post', value: 'Offline', detail: 'Postfach nicht verbunden', tone: 'calm' }
    : { id: 'post', label: 'Post', value: String(mail.unread), detail: mail.needsYou ? `${mail.needsYou} ${mail.needsYou === 1 ? 'braucht' : 'brauchen'} dich` : mail.unread ? 'ungelesen' : 'Alles gelesen', tone: mail.needsYou ? 'amber' : 'calm' };

  let today: Station = { id: 'today', label: 'Heute', value: 'Offline', detail: 'Aufgaben nicht verbunden', tone: 'calm' };
  if (snapshot && sourceReady(snapshot.tasks)) {
    const tasks = snapshot.tasks;
    const due = tasks.counts.due_today ?? tasks.due_today.filter(t => t.status !== 'done').length;
    const overdue = tasks.counts.overdue ?? tasks.overdue.filter(t => t.status !== 'done').length;
    today = {
      id: 'today', label: 'Heute', count: due + overdue, value: due + overdue ? `${due + overdue} fällig` : 'Nichts fällig',
      detail: overdue ? `${overdue} überfällig · ${due} heute fällig` : `${due} heute fällig`,
      tone: overdue ? 'amber' : 'calm',
    };
  }

  let team: Station = { id: 'team', label: 'Team', value: 'Offline', detail: 'Schichtplan nicht verbunden', tone: 'calm' };
  if (snapshot && sourceReady(snapshot.calendar)) {
    const shifts = snapshot.calendar.events.filter((e) => e.date === snapshot.date && /schicht/i.test(e.title)).length;
    const open = openShifts(snapshot);
    team = open.length
      ? { id: 'team', label: 'Team', value: `${open.length} offen`, detail: 'Im Schichtplan als offen markiert', tone: 'amber' }
      : { id: 'team', label: 'Team', value: `${shifts} ${shifts === 1 ? 'Schicht' : 'Schichten'}`, detail: 'Heute im Kalender', tone: 'calm' };
  }

  let night: Station = { id: 'nightwatch', label: 'Nachtwache', value: 'Offline', detail: 'Nicht verbunden', tone: 'calm' };
  if (snapshot && sourceReady(snapshot.nightwatch)) {
    const n = snapshot.nightwatch.open_incidents ?? snapshot.nightwatch.incidents.length;
    const critical = snapshot.nightwatch.incidents.some((i) => /critical|fatal/i.test(String(i.severity ?? '')));
    night = n
      ? { id: 'nightwatch', label: 'Nachtwache', value: `${n} ${n === 1 ? 'Vorfall' : 'Vorfälle'}`, detail: 'Bitte ansehen', tone: critical ? 'red' : 'amber' }
      : { id: 'nightwatch', label: 'Nachtwache', value: 'Ruhig', detail: 'Die Nacht war ruhig', tone: 'calm' };
  }
  return [post, today, team, night];
}

/** Ein Satz von MÔRA, nur aus echten Daten. */
export function moraLine(snapshot: TodaySnapshot | null, now: number, briefingUnread?: number | null): string {
  if (!snapshot) return '';
  const shift = openShifts(snapshot)[0];
  if (shift) return `${openShiftLabel(shift)}.`;
  const mail = mailCounts(snapshot, briefingUnread);
  if (mail.needsYou) return `${mail.needsYou} ${mail.needsYou === 1 ? 'Mail braucht' : 'Mails brauchen'} dich.`;
  const next = dayMarks(snapshot, now, 10).find((m) => m.minute >= now);
  if (next) return `Als Nächstes: ${next.time} ${next.label}.`;
  return '';
}

/** Morgen-Briefing: warm, kurz, höchstens zwei Sätze, Mail-Zahl aus derselben Quelle wie das Dock. */
export function warmBriefing(snapshot: TodaySnapshot | null, briefingUnread?: number | null, hour = 8): string | null {
  if (!snapshot) return null;
  const greet = hour < 11 ? 'Guten Morgen.' : hour < 18 ? 'Hallo.' : 'Guten Abend.';
  const mail = mailCounts(snapshot, briefingUnread);
  const parts: string[] = [];
  if (mail.unread !== null) parts.push(mail.unread ? `${mail.unread} ${mail.unread === 1 ? 'Mail wartet' : 'Mails warten'}${mail.needsYou ? `, ${mail.needsYou} ${mail.needsYou === 1 ? 'braucht' : 'brauchen'} dich` : ''}` : 'Keine ungelesenen Mails');
  const shift = openShifts(snapshot)[0];
  const quiet = sourceReady(snapshot.nightwatch) && !(snapshot.nightwatch.open_incidents ?? 0);
  const second = shift ? `${openShiftLabel(shift)}.` : quiet ? 'Die Nacht war ruhig.' : '';
  const first = parts.length ? `${greet} ${parts[0]}.` : greet;
  return second ? `${first} ${second}` : first;
}

/** Die eine Hologramm-Karte, die MÔRA auf der Bühne zeigt – nur aus echten Daten, mit echten Aktionen. */
export type StageCard = {
  id: string;
  /** Echte Fakten statt Erklärung, z. B. die Absender. */
  facts?: string[];
  kind: 'shift' | 'mail' | 'nightwatch' | 'next';
  urgent: boolean;
  eyebrow: string;
  title: string;
  detail: string;
  primary: { label: string; target: 'calendar' | 'post' | 'nightwatch' };
};
export function stageCard(snapshot: TodaySnapshot | null, now: number, briefingUnread?: number | null): StageCard | null {
  if (!snapshot) return null;
  const shift = openShifts(snapshot)[0];
  if (shift) return {
    id: `shift:${shift.id}`, kind: 'shift', urgent: true, eyebrow: 'Team · Schichtplan',
    title: openShiftLabel(shift), detail: cleanTitle(shift.title),
    primary: { label: 'Schicht öffnen', target: 'calendar' },
  };
  if (sourceReady(snapshot.nightwatch)) {
    const n = snapshot.nightwatch.open_incidents ?? snapshot.nightwatch.incidents.length;
    if (n) return { id: `nw:${n}`, kind: 'nightwatch', urgent: true, eyebrow: 'Betrieb · Nachtwache', title: `${n} ${n === 1 ? 'Vorfall' : 'Vorfälle'} offen`, detail: snapshot.nightwatch.incidents[0]?.title ?? 'Bitte ansehen.', primary: { label: 'Ansehen', target: 'nightwatch' } };
  }
  const mail = mailCounts(snapshot, briefingUnread);
  if (mail.needsYou) return { id: `mail:${mail.needsYou}`, facts: mailSenders(snapshot, mail.needsYou), kind: 'mail', urgent: true, eyebrow: 'Kommunikation · Post', title: `${mail.needsYou} ${mail.needsYou === 1 ? 'Mail braucht' : 'Mails brauchen'} dich`, detail: 'Antwort oder Entscheidung nötig.', primary: { label: 'Zur Post', target: 'post' } };
  const next = dayMarks(snapshot, now, 10).find((m) => m.minute >= now);
  if (next) return { id: `next:${next.id}`, kind: 'next', urgent: false, eyebrow: 'Als Nächstes', title: `${next.time} ${next.label}`, detail: 'Heute im Kalender.', primary: { label: 'Im Kalender', target: 'calendar' } };
  return null;
}

/** Besetzung heute: Schichten als Balken 6–22 Uhr, Ausfälle markiert. Höchstens `max` Zeilen. */
export type ShiftBar = { id: string; name: string; start: number; end: number | null; open: boolean };
export function shiftCoverage(snapshot: TodaySnapshot | null, max = 4): ShiftBar[] {
  if (!snapshot || !sourceReady(snapshot.calendar)) return [];
  const open = openShifts(snapshot);
  return snapshot.calendar.events
    .filter((e) => e.date === snapshot.date && /schicht/i.test(e.title))
    .map((e) => {
      const start = toMinute(e.time);
      if (start === null) return null;
      const name = cleanTitle(e.title);
      return { id: e.id, name, start, end: typeof e.duration === 'number' ? Math.min(DAY_END, start + e.duration) : null, open: open.some(s => s.id === e.id) };
    })
    .filter((x): x is ShiftBar => x !== null)
    .sort((a, b) => Number(b.open) - Number(a.open) || a.start - b.start)
    .slice(0, max)
    .sort((a, b) => a.start - b.start);
}

/** Eine Zeile in einem Dock-Instrument: echte Einträge aus dem Snapshot, nie aufgefüllt. */
export type InstrumentLine = { id: string; lead: string; text: string; tone?: 'amber' | 'muted' };

export function instrumentLines(snapshot: TodaySnapshot | null, id: 'post' | 'today' | 'team' | 'next', now: number, max = 3): InstrumentLine[] {
  if (!snapshot) return [];
  if (id === 'post') {
    if (!sourceReady(snapshot.mail)) return [];
    const items = snapshot.mail.items ?? [];
    return [...items.filter((m) => m.read !== true), ...items.filter((m) => m.read === true)].slice(0, max)
      .map((m) => ({ id: m.id, lead: senderName(m.from_addr) || 'Mail', text: cleanTitle(m.subject ?? '(ohne Betreff)'), tone: m.read === true ? 'muted' as const : NEEDS_YOU.test(m.subject ?? '') ? 'amber' as const : undefined }));
  }
  if (id === 'today') {
    if (!sourceReady(snapshot.tasks)) return [];
    const seen = new Set<string>();
    const list = [...snapshot.tasks.overdue.map((t) => ({ t, late: true })), ...snapshot.tasks.due_today.map((t) => ({ t, late: false }))];
    return list.filter(({ t }) => t.status !== 'done' && !seen.has(t.id) && seen.add(t.id)).slice(0, max)
      .map(({ t, late }) => ({ id: t.id, lead: late ? 'Überfällig' : t.status === 'in_progress' ? 'Läuft' : 'Heute', text: cleanTitle(t.title), tone: late ? 'amber' as const : undefined }));
  }
  if (!sourceReady(snapshot.calendar)) return [];
  if (id === 'team') {
    const open = openShifts(snapshot);
    const bars = shiftCoverage(snapshot, max);
    if (bars.length) return bars.map(b => ({
      id: b.id, lead: hhmm(b.start),
      text: b.open ? `${b.name} · offen` : b.end === null ? b.name : `${b.name} bis ${hhmm(b.end)}`,
      tone: b.open ? 'amber' as const : undefined,
    }));
    return open.slice(0, max).map(s => ({ id: s.id, lead: s.time ?? 'Heute', text: `${cleanTitle(s.title)} · offen`, tone: 'amber' as const }));
  }
  return dayMarks(snapshot, now, 12).filter((m) => m.minute >= now).slice(0, max)
    .map((m) => ({ id: m.id, lead: m.time, text: m.label, tone: m.problem ? 'amber' as const : undefined }));
}

/** „in 25 min“, „in 2 h 10 min“ – nur für Termine heute, die noch kommen. */
export function untilText(snapshot: TodaySnapshot | null, now: number): string | null {
  const next = snapshot && sourceReady(snapshot.calendar) ? dayMarks(snapshot, now, 12).find((m) => m.minute >= now) : undefined;
  if (!next) return null;
  const d = next.minute - now;
  if (d < 1) return 'jetzt';
  return d < 60 ? `in ${d} min` : `in ${Math.floor(d / 60)} h${d % 60 ? ` ${d % 60} min` : ''}`;
}

/** „1 Mail“, „9 Mails“ – Zahl plus Einheit, sonst nichts. */
export const countLabel = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const ddmm = (iso?: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}.${m[2]}.` : null;
};

/** Was heute wirklich zählt: höchstens `max` Karten, jede nur Name + Zahl/Datum, alles aus dem Snapshot. */
export type FocusCard = { id: string; label: string; value: string; tone: 'calm' | 'amber' | 'red'; target: 'post' | 'tasks' | 'calendar' | 'nightwatch' };
export function focusCards(snapshot: TodaySnapshot | null, briefingUnread?: number | null, max = 3): FocusCard[] {
  if (!snapshot) return [];
  const out: FocusCard[] = [];
  if (sourceReady(snapshot.nightwatch)) {
    const n = snapshot.nightwatch.open_incidents ?? snapshot.nightwatch.incidents.length;
    const critical = snapshot.nightwatch.incidents.some((i) => /critical|fatal/i.test(String(i.severity ?? '')));
    if (n) out.push({ id: 'nightwatch', label: 'Nachtwache', value: `${n} offen`, tone: critical ? 'red' : 'amber', target: 'nightwatch' });
  }
  for (const shift of openShifts(snapshot)) out.push({ id: `shift:${shift.id}`, label: cleanTitle(shift.title), value: openShiftLabel(shift), tone: 'amber', target: 'calendar' });
  const mail = mailCounts(snapshot, briefingUnread);
  if (mail.needsYou) out.push({ id: 'post', label: 'Post', value: `${mail.needsYou} ${mail.needsYou === 1 ? 'braucht' : 'brauchen'} dich`, tone: 'amber', target: 'post' });
  if (sourceReady(snapshot.tasks)) {
    const overdueIds = new Set(snapshot.tasks.overdue.map((t) => t.id));
    const seen = new Set<string>();
    [...snapshot.tasks.overdue, ...snapshot.tasks.due_today, ...snapshot.tasks.items]
      .filter((t) => t.status !== 'done' && ddmm(t.due_date) && !seen.has(t.id) && seen.add(t.id))
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
      .forEach((t) => {
        const late = overdueIds.has(t.id) || t.is_overdue === true;
        out.push({ id: `task:${t.id}`, label: shorten(t.title, 20), value: `${late ? 'überfällig' : 'Frist'} ${ddmm(t.due_date)}`, tone: late ? 'amber' : 'calm', target: 'tasks' });
      });
  }
  return out.slice(0, max);
}

/** Als-Nächstes-Dock: eine Liste kommender Termine – Zahl und Zeilen kommen beide daraus. Heute nur Uhrzeit, sonst „Do 05.11. 14:00“. */
export type UpcomingEvent = { id: string; when: string; label: string };
const WEEKDAY = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export function upcomingEvents(snapshot: TodaySnapshot | null, now: number): UpcomingEvent[] {
  if (!snapshot || !sourceReady(snapshot.calendar)) return [];
  const today = snapshot.date;
  return snapshot.calendar.events
    .filter((e) => e.title && e.date && /^\d{4}-\d{2}-\d{2}/.test(e.date))
    .map((e) => ({ e, minute: toMinute(e.time) }))
    .filter(({ e, minute }) => e.date > today || (e.date === today && (minute === null || minute >= now)))
    .sort((a, b) => a.e.date.localeCompare(b.e.date) || (a.minute ?? -1) - (b.minute ?? -1))
    .map(({ e, minute }) => {
      const time = minute === null ? '' : hhmm(minute);
      const [y, mo, d] = e.date.slice(0, 10).split('-').map(Number);
      const day = `${WEEKDAY[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]} ${String(d).padStart(2, '0')}.${String(mo).padStart(2, '0')}.`;
      return { id: e.id, when: e.date === today ? time || 'Heute' : [day, time].filter(Boolean).join(' '), label: shorten(e.title) };
    });
}

/** Anzeigename aus „Name <a@b>“ oder der Adresse. */
export function senderName(from?: string | null): string | null {
  const f = (from ?? '').trim(); if (!f) return null;
  const m = f.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/); if (m) return m[1].trim();
  const local = f.replace(/^<|>$/g, '').split('@')[0]; return local ? local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null;
}
export function mailSenders(snapshot: TodaySnapshot, n: number): string[] {
  const names: string[] = [];
  for (const it of (snapshot.mail?.items ?? []).filter((m) => m.read !== true && NEEDS_YOU.test(`${m.subject ?? ''}`))) { const s = senderName(it.from_addr); if (s && !names.includes(s)) names.push(s); if (names.length >= Math.min(3, n)) break; }
  return names;
}
