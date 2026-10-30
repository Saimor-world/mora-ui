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

export type Absence = { name: string; shiftTime: string | null; shiftId: string | null };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Krankmeldung/Ausfall aus der Post, verknüpft mit der Schicht im Kalender (über den Vornamen). */
export function absences(snapshot: TodaySnapshot | null): Absence[] {
  if (!snapshot || !sourceReady(snapshot.mail)) return [];
  const out: Absence[] = [];
  for (const m of snapshot.mail.items ?? []) {
    if (!/krank|fällt .*aus|ausfall|nicht da/i.test(m.subject ?? '')) continue;
    const local = (m.from_addr ?? '').split('@')[0] ?? '';
    const first = local.split(/[._-]/)[0];
    if (!first || first.length < 2) continue;
    const shift = sourceReady(snapshot.calendar)
      ? snapshot.calendar.events.find((e) => e.date === snapshot.date && /schicht/i.test(e.title) && new RegExp(`\\b${first}\\b`, 'i').test(e.title))
      : undefined;
    if (!out.some((a) => a.name.toLowerCase() === first.toLowerCase())) out.push({ name: cap(first), shiftTime: shift?.time ?? null, shiftId: shift?.id ?? null });
  }
  return out;
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
  const absent = absences(snapshot);
  const all = snapshot.calendar.events
    .filter((e) => e.date === snapshot.date && e.title)
    .map((e) => {
      const minute = toMinute(e.time);
      const a = absent.find((x) => x.shiftId === e.id);
      return minute === null || minute < DAY_START || minute > DAY_END ? null
        : { id: e.id, minute, time: hhmm(minute), label: a ? `Schicht offen · ${a.name}` : shorten(e.title), problem: !!a };
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

export type Station = { id: 'post' | 'today' | 'team' | 'nightwatch'; label: string; value: string; detail: string; tone: 'calm' | 'amber' | 'red'; progress?: number };

export function stations(snapshot: TodaySnapshot | null, briefingUnread?: number | null): Station[] {
  const mail = mailCounts(snapshot, briefingUnread);
  const post: Station = mail.unread === null
    ? { id: 'post', label: 'Post', value: 'Offline', detail: 'Postfach nicht verbunden', tone: 'calm' }
    : { id: 'post', label: 'Post', value: String(mail.unread), detail: mail.needsYou ? `${mail.needsYou} ${mail.needsYou === 1 ? 'braucht' : 'brauchen'} dich` : mail.unread ? 'ungelesen' : 'Alles gelesen', tone: mail.needsYou ? 'amber' : 'calm' };

  let today: Station = { id: 'today', label: 'Heute', value: 'Offline', detail: 'Aufgaben nicht verbunden', tone: 'calm' };
  if (snapshot && sourceReady(snapshot.tasks)) {
    const open = snapshot.tasks.counts.open ?? snapshot.tasks.items.filter((t) => t.status !== 'done').length;
    const done = snapshot.tasks.items.filter((t) => t.status === 'done').length;
    const overdue = snapshot.tasks.counts.overdue ?? 0;
    const due = snapshot.tasks.counts.due_today ?? 0;
    today = { id: 'today', label: 'Heute', value: String(open), detail: overdue ? `${overdue} überfällig` : open ? `${due} heute fällig` : 'Alles erledigt', tone: overdue ? 'amber' : 'calm', progress: open + done ? done / (open + done) : 1 };
  }

  let team: Station = { id: 'team', label: 'Team', value: 'Offline', detail: 'Schichtplan nicht verbunden', tone: 'calm' };
  if (snapshot && sourceReady(snapshot.calendar)) {
    const shifts = snapshot.calendar.events.filter((e) => e.date === snapshot.date && /schicht/i.test(e.title)).length;
    const absent = absences(snapshot);
    team = absent.length
      ? { id: 'team', label: 'Team', value: `${absent.length} Ausfall`, detail: `${absent.map((a) => a.name).join(', ')} krank`, tone: 'amber' }
      : { id: 'team', label: 'Team', value: shifts ? `${shifts} Schichten` : 'Frei', detail: shifts ? 'Alle da' : 'Heute keine Schicht', tone: 'calm' };
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
  if (!snapshot) return 'Ich sammle gerade deinen Tag.';
  const absent = absences(snapshot)[0];
  if (absent) return absent.shiftTime ? `${absent.name} fällt heute aus, die Schicht um ${absent.shiftTime} ist offen.` : `${absent.name} hat sich heute krankgemeldet.`;
  const mail = mailCounts(snapshot, briefingUnread);
  if (mail.needsYou) return `${mail.needsYou} ${mail.needsYou === 1 ? 'Mail braucht' : 'Mails brauchen'} dich.`;
  const next = dayMarks(snapshot, now, 10).find((m) => m.minute >= now);
  if (next) return `Als Nächstes: ${next.time} ${next.label}.`;
  return 'Alles ruhig. Ich behalte den Tag im Blick.';
}

/** Morgen-Briefing: warm, kurz, höchstens zwei Sätze, Mail-Zahl aus derselben Quelle wie das Dock. */
export function warmBriefing(snapshot: TodaySnapshot | null, briefingUnread?: number | null, hour = 8): string | null {
  if (!snapshot) return null;
  const greet = hour < 11 ? 'Guten Morgen.' : hour < 18 ? 'Hallo.' : 'Guten Abend.';
  const mail = mailCounts(snapshot, briefingUnread);
  const parts: string[] = [];
  if (mail.unread !== null) parts.push(mail.unread ? `${mail.unread} ${mail.unread === 1 ? 'Mail wartet' : 'Mails warten'}${mail.needsYou ? `, ${mail.needsYou} ${mail.needsYou === 1 ? 'braucht' : 'brauchen'} dich` : ''}` : 'Der Posteingang ist leer');
  const absent = absences(snapshot)[0];
  const quiet = sourceReady(snapshot.nightwatch) && !(snapshot.nightwatch.open_incidents ?? 0);
  const second = absent ? `${absent.name} fällt aus${absent.shiftTime ? `, die Schicht um ${absent.shiftTime} ist offen` : ''}.` : quiet ? 'Die Nacht war ruhig.' : '';
  const first = parts.length ? `${greet} ${parts[0]}.` : greet;
  return second ? `${first} ${second}` : first;
}

/** Die eine Hologramm-Karte, die MÔRA auf der Bühne zeigt – nur aus echten Daten, mit echten Aktionen. */
export type StageCard = {
  id: string;
  kind: 'shift' | 'mail' | 'nightwatch' | 'next';
  urgent: boolean;
  eyebrow: string;
  title: string;
  detail: string;
  primary: { label: string; target: 'calendar' | 'post' | 'nightwatch' };
};
export function stageCard(snapshot: TodaySnapshot | null, now: number, briefingUnread?: number | null): StageCard | null {
  if (!snapshot) return null;
  const absent = absences(snapshot)[0];
  if (absent) return {
    id: `shift:${absent.shiftId ?? absent.name}`, kind: 'shift', urgent: true, eyebrow: 'Team · Ausfall',
    title: absent.shiftTime ? `Schicht ${absent.shiftTime} offen` : `${absent.name} fällt aus`,
    detail: absent.shiftTime ? `${absent.name} ist krank gemeldet.` : 'Krankmeldung in der Post.',
    primary: { label: 'Schicht öffnen', target: 'calendar' },
  };
  if (sourceReady(snapshot.nightwatch)) {
    const n = snapshot.nightwatch.open_incidents ?? snapshot.nightwatch.incidents.length;
    if (n) return { id: `nw:${n}`, kind: 'nightwatch', urgent: true, eyebrow: 'Betrieb · Nachtwache', title: `${n} ${n === 1 ? 'Vorfall' : 'Vorfälle'} offen`, detail: snapshot.nightwatch.incidents[0]?.title ?? 'Bitte ansehen.', primary: { label: 'Ansehen', target: 'nightwatch' } };
  }
  const mail = mailCounts(snapshot, briefingUnread);
  if (mail.needsYou) return { id: `mail:${mail.needsYou}`, kind: 'mail', urgent: true, eyebrow: 'Kommunikation · Post', title: `${mail.needsYou} ${mail.needsYou === 1 ? 'Mail braucht' : 'Mails brauchen'} dich`, detail: 'Antwort oder Entscheidung nötig.', primary: { label: 'Zur Post', target: 'post' } };
  const next = dayMarks(snapshot, now, 10).find((m) => m.minute >= now);
  if (next) return { id: `next:${next.id}`, kind: 'next', urgent: false, eyebrow: 'Als Nächstes', title: `${next.time} ${next.label}`, detail: 'Heute im Kalender.', primary: { label: 'Im Kalender', target: 'calendar' } };
  return null;
}

/** Besetzung heute: Schichten als Balken 6–22 Uhr, Ausfälle markiert. Höchstens `max` Zeilen. */
export type ShiftBar = { id: string; name: string; start: number; end: number; absent: boolean };
export function shiftCoverage(snapshot: TodaySnapshot | null, max = 4): ShiftBar[] {
  if (!snapshot || !sourceReady(snapshot.calendar)) return [];
  const absent = absences(snapshot);
  return snapshot.calendar.events
    .filter((e) => e.date === snapshot.date && /schicht/i.test(e.title))
    .map((e) => {
      const start = toMinute(e.time);
      if (start === null) return null;
      const name = cleanTitle(e.title).replace(/^schicht\s*/i, '').split(/\s+/)[0] ?? '';
      return { id: e.id, name, start, end: Math.min(DAY_END, start + (e.duration ?? 480)), absent: absent.some((a) => a.shiftId === e.id) };
    })
    .filter((x): x is ShiftBar => x !== null)
    .sort((a, b) => Number(b.absent) - Number(a.absent) || a.start - b.start)
    .slice(0, max)
    .sort((a, b) => a.start - b.start);
}

/** Eine Zeile in einem Dock-Instrument: echte Einträge aus dem Snapshot, nie aufgefüllt. */
export type InstrumentLine = { id: string; lead: string; text: string; tone?: 'amber' | 'muted' };

const sender = (from?: string) => {
  const local = (from ?? '').split('@')[0] ?? '';
  const first = local.split(/[._-]/)[0] ?? '';
  return first.length > 1 ? cap(first) : '';
};

export function instrumentLines(snapshot: TodaySnapshot | null, id: 'post' | 'today' | 'team' | 'next', now: number, max = 3): InstrumentLine[] {
  if (!snapshot) return [];
  if (id === 'post') {
    if (!sourceReady(snapshot.mail)) return [];
    const items = snapshot.mail.items ?? [];
    return [...items.filter((m) => m.read !== true), ...items.filter((m) => m.read === true)].slice(0, max)
      .map((m) => ({ id: m.id, lead: sender(m.from_addr) || 'Mail', text: cleanTitle(m.subject ?? '(ohne Betreff)'), tone: m.read === true ? 'muted' as const : NEEDS_YOU.test(m.subject ?? '') ? 'amber' as const : undefined }));
  }
  if (id === 'today') {
    if (!sourceReady(snapshot.tasks)) return [];
    const seen = new Set<string>();
    const list = [...snapshot.tasks.overdue.map((t) => ({ t, late: true })), ...snapshot.tasks.due_today.map((t) => ({ t, late: false })), ...snapshot.tasks.items.filter((t) => t.status !== 'done').map((t) => ({ t, late: false }))];
    return list.filter(({ t }) => t.status !== 'done' && !seen.has(t.id) && seen.add(t.id)).slice(0, max)
      .map(({ t, late }) => ({ id: t.id, lead: late ? 'Überfällig' : t.status === 'in_progress' ? 'Läuft' : 'Heute', text: cleanTitle(t.title), tone: late ? 'amber' as const : undefined }));
  }
  if (!sourceReady(snapshot.calendar)) return [];
  if (id === 'team') {
    const absent = absences(snapshot);
    const bars = shiftCoverage(snapshot, max);
    if (bars.length) return bars.map((b) => ({ id: b.id, lead: hhmm(b.start), text: b.absent ? `${b.name || 'Schicht'} · fällt aus` : `${b.name || 'Schicht'} bis ${hhmm(b.end)}`, tone: b.absent ? 'amber' as const : undefined }));
    return absent.slice(0, max).map((a) => ({ id: `a:${a.name}`, lead: a.shiftTime ?? 'Heute', text: `${a.name} · krank gemeldet`, tone: 'amber' as const }));
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
