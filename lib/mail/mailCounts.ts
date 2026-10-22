/**
 * Die eine Mail-Zahl: CORE liefert unread_count + total (nur dieser User).
 * Home, Universe-Planet und Post zeigen genau diese Zahl. Eine lokale Liste
 * (Stichprobe) wird nie zur Gesamtzahl hochgerechnet.
 */
export type MailCounts = { unread_count: number | null; total: number | null };

export function parseMailCounts(raw: unknown): MailCounts | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
  const out = { unread_count: num(r.unread_count), total: num(r.total) };
  return out.unread_count === null && out.total === null ? null : out;
}

/** Filter-Beschriftungen in Post: Server-Zahl gewinnt, Liste nur als Rückfall mit klarer Bedeutung. */
export function mailFilterLabels(counts: MailCounts | null, listLength: number, listUnread: number) {
  return {
    all: typeof counts?.total === 'number' ? `Alle ${counts.total}` : `Alle ${listLength}`,
    unread: typeof counts?.unread_count === 'number' ? `Ungelesen ${counts.unread_count}` : `Ungelesen ${listUnread}`,
  };
}
