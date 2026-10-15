import type { LandscapeInput } from './landscape';
import { DEMO_CALENDAR, DEMO_DEPARTMENTS, DEMO_MAIL, DEMO_MINDLOOP, DEMO_TASKS } from '@/lib/os-prototype/demoPack';

/** Local preview only (no CORE session): das Demo-Paket „Simple Coffee Group“ (saimor-core, pack 'coffee'). */
export function sampleLandscapeInput(): Omit<LandscapeInput, 'finance' | 'labs'> {
  return {
    sample: true,
    tasks: { open: DEMO_TASKS.length, overdue: 1, dueToday: 1, titles: [...DEMO_TASKS] },
    calendar: { titles: DEMO_CALENDAR.map((e) => e.title) },
    mail: { unread: DEMO_MAIL.filter((m) => !m.read).length, subjects: DEMO_MAIL.map((m) => m.subject) },
    memories: { count: DEMO_MINDLOOP.length, titles: DEMO_MINDLOOP.map((m) => m.title.replace(/^Môra:\s*/, '').slice(0, 48)) },
    spaces: { names: DEMO_DEPARTMENTS.map((d) => d.name) },
    connections: { configured: [], missing: ['E-Mail', 'Kalender', 'Cloud-Speicher', 'Feeds'] },
  };
}
