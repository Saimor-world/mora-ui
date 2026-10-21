/**
 * Proactive MÔRA — rules only (split out of #138).
 * The display (chips next to MÔRA, flying to a planet) needs the presence layer
 * from #138, which is parked; nothing here renders or acts yet.
 *
 * Rules (also in the PR):
 *  1. At most 3 suggestions. UI shows 1 open chip; the rest is a quiet counter.
 *  2. She never sends mail, never mutates tasks, never files, never acks
 *     incidents. Every write needs Marius's OK.
 *  3. She flies to a planet by herself only on a CLEAR trigger
 *     (meeting starting within 12 minutes, or a critical open incident).
 *  4. Suggestions are derived from real live data, never invented.
 *  5. needs/glow still do not auto-fly (see moraPresence).
 */
import type { MailPreviewItem, CalendarPreviewItem } from '@/lib/hooks/useCommunicationLiveData';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';

export const PROACTIVITY_RULES = {
  maxVisible: 3,
  maxOpen: 1,
  neverAutoSend: true,
  neverAutoMutate: true,
  flyOnlyOnClearTrigger: true,
  meetingFlyMinutes: 12,
  inboxAgeHours: 12,
} as const;

export type MoraNudgeKind = 'meeting' | 'mail' | 'incident' | 'task' | 'invoice';
export type MoraNudgeAction = 'open' | 'prep' | 'draft';

export interface MoraNudge {
  id: string;
  kind: MoraNudgeKind;
  title: string;
  detail: string;
  planetId: string;
  fly: boolean;
  action: MoraNudgeAction;
  actionLabel: string;
  source: 'live';
}

export type ProactivityInput = {
  now?: Date;
  mail?: MailPreviewItem[];
  calendar?: CalendarPreviewItem[];
  incidents?: NightwatchIncidentItem[];
  openTasks?: number;
  dueToday?: { id: string; title: string }[];
  openInvoices?: number;
  planetIds?: Partial<Record<'post' | 'wache' | 'werkstatt' | 'finanzen', string>>;
};

const DEFAULT_PLANETS = {
  post: 'sys:post',
  wache: 'sys:wache',
  werkstatt: 'sys:werkstatt',
  finanzen: 'sys:finanzen',
};

function minutesUntil(now: Date, date?: string, time?: string): number | null {
  if (!date) return null;
  const iso = date.includes('T')
    ? date
    : `${date}T${(time || '09:00').slice(0, 5)}:00`;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return (t - now.getTime()) / 60000;
}

function hoursAgo(now: Date, date?: string): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (!Number.isFinite(t)) return null;
  return (now.getTime() - t) / 3600000;
}

function isOpenIncident(incident: NightwatchIncidentItem): boolean {
  return !['resolved', 'closed', 'dismissed'].includes(String(incident.status || 'open').toLowerCase());
}

/** Pure. Returns 0–3 nudges, fly=true only on clear triggers. */
export function deriveMoraNudges(input: ProactivityInput): MoraNudge[] {
  const now = input.now ?? new Date();
  const ids = { ...DEFAULT_PLANETS, ...(input.planetIds || {}) };
  const out: MoraNudge[] = [];

  for (const ev of input.calendar || []) {
    // All-day entries have no start time; never treat them as "starting now".
    if (!ev.time && !(ev.date || '').includes('T')) continue;
    const mins = minutesUntil(now, ev.date, ev.time);
    if (mins == null || mins < -5 || mins > 12) continue;
    const soon = Math.max(0, Math.round(mins));
    out.push({
      id: `meeting:${ev.id}`,
      kind: 'meeting',
      title: `${ev.title} in ${soon} min`,
      detail: 'Soll ich die Vorbereitung öffnen? Es geht nichts raus, bis du OK sagst.',
      planetId: ids.post,
      fly: true,
      action: 'prep',
      actionLabel: 'Vorbereitung',
      source: 'live',
    });
    break;
  }

  for (const incident of input.incidents || []) {
    if (!isOpenIncident(incident) || incident.acked) continue;
    const critical = String(incident.severity || '').toLowerCase() === 'critical';
    if (!critical) continue;
    out.push({
      id: `incident:${incident.id}`,
      kind: 'incident',
      title: incident.title || 'Kritischer Vorfall',
      detail: 'Wache braucht dich. Ich ändere nichts ohne OK.',
      planetId: ids.wache,
      fly: true,
      action: 'open',
      actionLabel: 'Ansehen',
      source: 'live',
    });
    break;
  }

  // The mail preview carries no read/answered flag, so MÔRA only says what is
  // known: the message has been in the inbox for a while. No "unanswered" claim,
  // and no draft exists until someone asks for one.
  for (const mail of input.mail || []) {
    const age = hoursAgo(now, mail.date);
    if (age == null || age < PROACTIVITY_RULES.inboxAgeHours) continue;
    const hours = Math.round(age);
    out.push({
      id: `mail:${mail.id}`,
      kind: 'mail',
      title: `Seit ${hours} h im Eingang`,
      detail: `${mail.subject} — soll ich eine Antwort entwerfen? Gesendet wird nichts.`,
      planetId: ids.post,
      fly: false,
      action: 'draft',
      actionLabel: 'Entwurf',
      source: 'live',
    });
    break;
  }

  const due = (input.dueToday || [])[0];
  if (due) {
    out.push({
      id: `task:${due.id}`,
      kind: 'task',
      title: `Heute fällig: ${due.title}`,
      detail: 'Ich stelle die Werkstatt bereit. Nichts wird abgehakt ohne OK.',
      planetId: ids.werkstatt,
      fly: false,
      action: 'open',
      actionLabel: 'Ansehen',
      source: 'live',
    });
  } else if ((input.openTasks || 0) > 0) {
    out.push({
      id: 'task:open',
      kind: 'task',
      title: `${input.openTasks} offene Aufgaben`,
      detail: 'Werkstatt wartet. Ich rühre nichts an.',
      planetId: ids.werkstatt,
      fly: false,
      action: 'open',
      actionLabel: 'Ansehen',
      source: 'live',
    });
  }

  if ((input.openInvoices || 0) > 0) {
    out.push({
      id: 'invoice:open',
      kind: 'invoice',
      title: `${input.openInvoices} offene Rechnungen`,
      detail: 'Finanzen. Keine Zahlung, bis du OK sagst.',
      planetId: ids.finanzen,
      fly: false,
      action: 'open',
      actionLabel: 'Ansehen',
      source: 'live',
    });
  }

  return out.slice(0, PROACTIVITY_RULES.maxVisible);
}

export function shouldAutoFly(nudges: MoraNudge[]): MoraNudge | null {
  return nudges.find((n) => n.fly) ?? null;
}

/** One open whisper; the rest stay behind a counter so chips never cover planets. */
export function splitOpenNudges(nudges: MoraNudge[], openId?: string | null): { open: MoraNudge | null; rest: MoraNudge[] } {
  if (!nudges.length) return { open: null, rest: [] };
  const idx = Math.max(0, nudges.findIndex((n) => n.id === openId));
  const i = idx === -1 ? 0 : idx;
  return { open: nudges[i], rest: nudges.filter((_, k) => k !== i) };
}
