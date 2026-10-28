import { hasMinRole } from '@/lib/auth/roles';
import { JOB_ROLES } from './jobRoles';
import type { DemoCompany, DemoTask } from './seed';

export const MORNING_PLAN_HOUR = 7;
export const MORNING_PLAN_TZ = 'Europe/Berlin';

export interface TeamLine { personId: string; name: string; role: string; shift: string }
export interface MorningPlan {
  personId: string;
  name: string;
  jobRole: string;
  date: string;
  greeting: string;
  shift: { start: string; end: string } | null;
  tasks: DemoTask[];
  approvals: DemoTask[];
  team?: TeamLine[];
}

/** true nur in der Stunde 07:xx Europe/Berlin (Sommer- und Winterzeit). */
export function isMorningPlanDue(now: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: MORNING_PLAN_TZ })
    .formatToParts(now);
  const hour = parts.find((p) => p.type === 'hour')?.value;
  return Number(hour) === MORNING_PLAN_HOUR;
}

export function buildMorningPlans(data: DemoCompany, date: string): MorningPlan[] {
  return data.people.map((person) => {
    const shiftRow = data.shifts.find((s) => s.personId === person.id && s.date === date);
    const shift = shiftRow ? { start: shiftRow.start, end: shiftRow.end } : null;
    const mine = data.tasks.filter((t) => t.date === date && t.assignee === person.id);
    const tasks = mine.filter((t) => !t.needsApproval).sort((a, b) => (a.due ?? '99').localeCompare(b.due ?? '99'));
    const approvals = mine.filter((t) => t.needsApproval);
    const first = person.name.split(' ')[0];
    const isLead = hasMinRole(person.systemRole, 'owner');

    let greeting: string;
    if (isLead) greeting = `Guten Morgen ${first}. ${approvals.length} Freigaben warten, das Team ist eingeplant.`;
    else if (shift) greeting = `Guten Morgen ${first}. Deine Schicht: ${shift.start}–${shift.end}, ${tasks.length} Aufgaben.`;
    else greeting = `Guten Morgen ${first}. Heute hast du frei.`;

    const plan: MorningPlan = {
      personId: person.id, name: person.name, jobRole: JOB_ROLES[person.jobRole].label,
      date, greeting, shift, tasks, approvals,
    };
    if (isLead) {
      plan.team = data.people.filter((p) => p.id !== person.id).map((p) => {
        const s = data.shifts.find((x) => x.personId === p.id && x.date === date);
        return { personId: p.id, name: p.name, role: JOB_ROLES[p.jobRole].label, shift: s ? `${s.start}–${s.end}` : 'frei' };
      });
    }
    return plan;
  });
}
