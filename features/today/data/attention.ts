import type { TodaySnapshot } from '@/lib/api/todayClient';

export interface AttentionItem {
  id: string;
  title: string;
  reason: string;
  tone: 'warning' | 'critical' | 'info';
  target: 'post' | 'labs' | 'today';
}

/** Derive "was Aufmerksamkeit braucht" from a snapshot — only from readable sources. */
export function deriveAttention(s: TodaySnapshot): AttentionItem[] {
  const out: AttentionItem[] = [];
  const readable = (status: string) => status === 'ok' || status === 'empty';
  if (readable(s.tasks.status)) {
    for (const t of s.tasks.overdue.slice(0, 3)) out.push({ id: `t-${t.id}`, title: t.title, reason: 'Aufgabe überfällig', tone: 'warning', target: 'today' });
  }
  if (readable(s.nightwatch.status)) {
    for (const i of s.nightwatch.incidents.filter((x) => !x.acked).slice(0, 2)) {
      out.push({ id: `n-${i.id}`, title: i.title, reason: 'Offener Vorfall (Nightwatch)', tone: i.severity === 'critical' ? 'critical' : 'warning', target: 'labs' });
    }
  }
  if (readable(s.mail.status)) {
    const unread = s.mail.items.filter((m) => m.read === false).length;
    if (unread > 0) out.push({ id: 'mail-unread', title: `${unread} ungelesene Nachricht${unread === 1 ? '' : 'en'}`, reason: 'Post', tone: 'info', target: 'post' });
  }
  return out;
}

/** MÔRA hints: short, explainable, derived from what is (and is not) known. */
export function deriveHints(s: TodaySnapshot | null): string[] {
  if (!s) return ['Ich sehe gerade keine belegten Daten für heute. Sobald CORE erreichbar ist, fasse ich deinen Tag zusammen.'];
  const hints: string[] = [];
  const missing = (['mail', 'calendar', 'tasks', 'nightwatch'] as const).filter((k) => s[k].status === 'disconnected' || s[k].status === 'unavailable');
  if (missing.length) hints.push(`Nicht verbunden oder nicht verfügbar: ${missing.map(label).join(', ')}. Ich rechne dort nicht mit „nichts“, sondern mit „unbekannt“.`);
  if (s.calendar.next_event) hints.push(`Nächster Termin: ${s.calendar.next_event.title}${s.calendar.next_event.time ? ` um ${s.calendar.next_event.time}` : ''}.`);
  if ((s.tasks.counts.overdue ?? 0) > 0) hints.push('Eine überfällige Aufgabe zuerst klären würde den Tag spürbar entlasten.');
  if (!hints.length) hints.push('Ruhiger Tag – nichts drängt. Gute Zeit für Fokusarbeit.');
  return hints;
}

function label(k: 'mail' | 'calendar' | 'tasks' | 'nightwatch') {
  return { mail: 'Post', calendar: 'Kalender', tasks: 'Aufgaben', nightwatch: 'Nightwatch' }[k];
}
