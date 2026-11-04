import type { TodaySnapshot } from '@/lib/api/todayClient';

export type DayMoon = { id: string; kind: 'task' | 'mail' | 'event'; title: string; when?: string; taskId?: string; objectId?: string };

/** Monde je Abteilung aus dem Tagesstand: Aufgaben, Termine, Post – höchstens vier pro Planet. */
export function dayMoonsFor(snapshot: TodaySnapshot | null | undefined, max = 4): Map<string, DayMoon[]> {
  const map = new Map<string, DayMoon[]>();
  if (!snapshot) return map;
  const push = (dept: string | null | undefined, m: DayMoon) => {
    if (!dept) return;
    const l = map.get(dept) ?? [];
    if (l.length < max && !l.some((x) => x.id === m.id)) l.push(m);
    map.set(dept, l);
  };
  const tasks = [...(snapshot.tasks?.overdue ?? []), ...(snapshot.tasks?.due_today ?? []), ...(snapshot.tasks?.items ?? [])];
  tasks.filter((t) => t.status !== 'done').forEach((t) => push(t.department_id, { id: `t-${t.id}`, kind: 'task', title: t.title, when: t.due_date ?? undefined, taskId: t.id, objectId: t.id }));
  (snapshot.calendar?.events ?? []).forEach((e, i) => {
    const ev = e as { id?: string; title?: string; time?: string; department_id?: string | null };
    push(ev.department_id, { id: `e-${ev.id ?? i}`, kind: 'event', title: ev.title ?? '', when: ev.time, objectId: ev.id });
  });
  (snapshot.mail?.items ?? []).forEach((m, i) => {
    const mail = m as { id?: string; subject?: string; department_id?: string | null };
    push(mail.department_id, { id: `m-${mail.id ?? i}`, kind: 'mail', title: mail.subject ?? '', objectId: mail.id });
  });
  return map;
}
