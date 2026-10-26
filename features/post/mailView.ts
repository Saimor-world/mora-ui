import type { PostMessage } from './data/usePost';

/** "Lea Beispiel <lea@x.de>" → "Lea Beispiel"; bare address → local part, capitalised. */
export function senderName(m: Pick<PostMessage, 'from' | 'from_addr'>): string {
  const raw = String(m.from || m.from_addr || '').trim();
  if (!raw) return 'Unbekannt';
  const named = raw.match(/^"?([^"<]+?)"?\s*<[^>]+>$/);
  if (named) return named[1].trim();
  if (raw.includes('@')) {
    const local = raw.split('@')[0].replace(/[._-]+/g, ' ').trim();
    return local ? local.replace(/\b\w/g, (c) => c.toUpperCase()) : raw;
  }
  return raw;
}

export function senderAddress(m: Pick<PostMessage, 'from' | 'from_addr'>): string {
  if (m.from_addr) return m.from_addr;
  const inner = String(m.from || '').match(/<([^>]+)>/);
  return inner ? inner[1] : String(m.from || '');
}

/** Short German mail time: "14:05" today, "Gestern", weekday this week, else "12.10.". */
export function mailTime(iso: string | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  if (diff <= 0) return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'Gestern';
  if (diff < 7) return d.toLocaleDateString('de-DE', { weekday: 'short' });
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export type MailFilter = 'all' | 'unread';

/** Newest first; "unread" keeps only messages CORE marks read === false. */
export function visibleMail(items: PostMessage[], filter: MailFilter): PostMessage[] {
  const list = filter === 'unread' ? items.filter((m) => m.read === false) : items.slice();
  return list.sort((a, b) => (Date.parse(b.date || '') || 0) - (Date.parse(a.date || '') || 0));
}

export function unreadCount(items: PostMessage[]): number {
  return items.filter((m) => m.read === false).length;
}
