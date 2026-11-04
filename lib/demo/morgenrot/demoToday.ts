import type { TodaySnapshot } from '@/lib/api/todayClient';

/** Fiktiver Café-Morgenrot-Tag. Nur für Demo-Scopes (`demo-*`), nie mit echten Quellen gemischt. */
export function demoTodaySnapshot(companyId: string, userId: string, tenantId: string, now = new Date()): TodaySnapshot {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now);
  const iso = now.toISOString();
  const meta = (source: string) => ({
    status: 'ok' as const, source, connection: 'demo', complete: true, as_of: iso, stale_after_seconds: 3600,
    scope: { level: 'company' as const, tenant_id: tenantId, user_id: userId, company_id: companyId },
  });
  const at = (h: string) => `${date}T${h}:00`;
  const mails: Array<[string, string, string, string]> = [
    ['Neue Bestellung: 3× Flat White to go', 'Theke · Kasse 2', 'd-theke', '07:42'],
    ['Lieferung Hafermilch Do 07:30 bestätigt', 'Biomolkerei Alpen', 'd-einkauf', '07:15'],
    ['Catering-Anfrage Hochzeit Sa (80 Pers.)', 'Julia Berger', 'd-cat', '06:58'],
    ['Tischreservierung Fr 18 Uhr, 12 Pers.', 'Lauftreff Nord', 'd-service', '06:40'],
    ['Rechnung Kaffeerösterei Oktober', 'Rösterei Kern', 'd-verw', '06:05'],
  ];
  const events: Array<[string, string, string]> = [
    ['Lieferung Bäckerei Sonnkorn', '07:30', 'd-kueche'],
    ['Mittagsservice – 24 Reservierungen', '12:00', 'd-service'],
    ['Verkostung Herbstkarte', '15:00', 'd-kueche'],
    ['Teamrunde Service', '17:30', 'd-service'],
  ];
  const task = (id: string, title: string, dept: string, due: string | null) => ({ id, title, status: 'open', due_date: due, department_id: dept });
  return {
    status: 'ok', date, timezone: 'Europe/Berlin', generated_at: iso,
    requested_scope: { tenant_id: tenantId, user_id: userId, company_id: companyId, level: 'company' },
    mail: { ...meta('demo'), inbox_loaded: mails.length, sample_limit: 20, unread_count: 23, total: 64,
      items: mails.map(([subject, from, department_id, t], i) => ({ id: `demo-m${i}`, subject, from, from_addr: from, read: false, received_at: at(t), department_id })) },
    calendar: { ...meta('demo'), date, count: events.length,
      next_event: null,
      events: events.map(([title, time, department_id], i) => ({ id: `demo-e${i}`, title, date, time, start: at(time), department_id })) },
    tasks: { ...meta('demo'), counts: { open: 5, in_progress: 1, due_today: 3, overdue: 1 },
      due_today: [task('demo-t0', 'Milch nachbestellen', 'd-einkauf', date), task('demo-t1', 'Kuchenvitrine auffüllen', 'd-kueche', date), task('demo-t2', 'Tische Terrasse eindecken', 'd-service', date)],
      overdue: [task('demo-t3', 'Angebot Hochzeit Berger', 'd-cat', '2026-11-02')],
      items: [task('demo-t4', 'Instagram: Herbstkarte posten', 'd-mkt', null)] },
    nightwatch: { ...meta('demo'), open_incidents: 0, health_score: 100, incidents: [] },
  } as unknown as TodaySnapshot;
}
