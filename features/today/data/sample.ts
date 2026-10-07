import type { TodaySnapshot } from '@/lib/api/todayClient';

/**
 * Clearly labelled SAMPLE snapshot for the local preview only (no CORE session).
 * Generic content — no real people, customers or companies. Never used when a
 * session exists or outside localhost (see lib/os-prototype/flags.ts).
 */
export function sampleTodaySnapshot(now = new Date()): TodaySnapshot {
  const date = now.toISOString().slice(0, 10);
  const meta = (source: string) => ({
    status: 'ok' as const, source, scope: { level: 'user' as const, tenant_id: 'sample' }, connection: 'sample', complete: true, as_of: now.toISOString(), stale_after_seconds: 900,
  });
  return {
    status: 'ok', date, timezone: 'Europe/Berlin', generated_at: now.toISOString(),
    requested_scope: { tenant_id: 'sample', user_id: 'sample', company_id: null },
    mail: { ...meta('sample-mail'), inbox_loaded: 3, sample_limit: 5, items: [
      { id: 's-m1', subject: 'Beispiel: Rückfrage zum Angebot', from_addr: 'kontakt@example.com', date, snippet: 'Kurze Frage zu Punkt 3 …', read: false },
      { id: 's-m2', subject: 'Beispiel: Rechnung Oktober', from_addr: 'buchhaltung@example.com', date, read: false },
      { id: 's-m3', subject: 'Beispiel: Newsletter', from_addr: 'news@example.org', date, read: true },
    ] },
    calendar: { ...meta('sample-calendar'), date, count: 2, next_event: { id: 's-c1', title: 'Beispiel: Wochenplanung', date, time: '10:00', duration: 30 }, events: [
      { id: 's-c1', title: 'Beispiel: Wochenplanung', date, time: '10:00', duration: 30 },
      { id: 's-c2', title: 'Beispiel: Fokuszeit', date, time: '14:00', duration: 90 },
    ] },
    tasks: { ...meta('sample-tasks'), counts: { open: 4, in_progress: 1, due_today: 1, overdue: 1 },
      items: [{ id: 's-t1', title: 'Beispiel: Angebot finalisieren', status: 'in_progress', priority: 'high', due_date: date }],
      due_today: [{ id: 's-t1', title: 'Beispiel: Angebot finalisieren', status: 'in_progress', priority: 'high', due_date: date }],
      overdue: [{ id: 's-t2', title: 'Beispiel: Belege hochladen', status: 'backlog', priority: 'medium', due_date: null }],
    },
    nightwatch: { ...meta('sample-nightwatch'), open_incidents: 0, health_score: 98, incidents: [] },
  };
}
