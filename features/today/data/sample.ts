import type { TodaySnapshot, TodayTask } from '@/lib/api/todayClient';
import { DEMO_CALENDAR, DEMO_MAIL, DEMO_TASKS } from '@/lib/os-prototype/demoPack';

/**
 * Lokale Vorschau ohne CORE-Sitzung: das bestehende Demo-Paket „Simple Coffee
 * Group“ (saimor-core, pack 'coffee') als Tagesbild. Fiktiv, in der UI als
 * „Beispiel“ markiert. Nie mit Sitzung, nie außerhalb von localhost.
 */
export function sampleTodaySnapshot(now = new Date()): TodaySnapshot {
  const date = now.toISOString().slice(0, 10);
  const meta = (source: string) => ({
    status: 'ok' as const, source, scope: { level: 'user' as const, tenant_id: 'demo-coffee' }, connection: 'demo', complete: true, as_of: now.toISOString(), stale_after_seconds: 900,
  });
  const tasks: TodayTask[] = DEMO_TASKS.map((title, i) => ({ id: `demo-task-${i + 1}`, title, status: (i === 0 ? 'in_progress' : 'backlog') as 'in_progress' | 'backlog', priority: (i < 2 ? 'high' : 'medium') as 'high' | 'medium', due_date: i === 2 ? null : date }));
  return {
    status: 'ok', date, timezone: 'Europe/Berlin', generated_at: now.toISOString(),
    requested_scope: { tenant_id: 'demo-coffee', user_id: 'demo', company_id: 'demo-coffee' },
    mail: { ...meta('demo-mail'), inbox_loaded: DEMO_MAIL.length, sample_limit: 5, items: DEMO_MAIL.map((m) => ({ id: m.id, subject: m.subject, from_addr: m.from, date, snippet: m.snippet, read: m.read })) },
    calendar: { ...meta('demo-calendar'), date, count: DEMO_CALENDAR.length, next_event: { id: DEMO_CALENDAR[0].id, title: DEMO_CALENDAR[0].title, date, time: DEMO_CALENDAR[0].time, duration: DEMO_CALENDAR[0].duration },
      events: DEMO_CALENDAR.map((e) => ({ id: e.id, title: e.title, date, time: e.time, duration: e.duration })) },
    tasks: { ...meta('demo-tasks'), counts: { open: DEMO_TASKS.length, in_progress: 1, due_today: 1, overdue: 1 },
      items: tasks, due_today: [tasks[0]], overdue: [tasks[2]] },
    nightwatch: { ...meta('demo-nightwatch'), open_incidents: 0, health_score: 98, incidents: [] },
  };
}
