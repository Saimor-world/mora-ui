import { hasMinRole, isAdmin } from '@/lib/auth/roles';
import { MORGENROT_SEED } from '@/lib/demo/morgenrot/seed';
import { MORGENROT_STRUCTURE } from '@/lib/demo/morgenrot/structure';

/** This is an isolated fictional demo, not a CORE permission check or agent. */
export type HeadChoice = 'accepted' | 'declined' | 'later' | 'code-draft';
export interface HeadRecord { departmentId: string; itemId: string; actorId: string; choice: HeadChoice; at: string }
export function canDecideHead(actorId: string, departmentId: string, choice: HeadChoice): boolean {
  const person = MORGENROT_SEED.people.find(p => p.id === actorId);
  const department = MORGENROT_STRUCTURE.find(p => p.id === departmentId);
  if (!person || !department) return false;
  if (choice === 'code-draft') return isAdmin(person.systemRole);
  return hasMinRole(person.systemRole, 'owner') || (hasMinRole(person.systemRole, 'manager') && department.jobRoles.includes(person.jobRole));
}
export function recordHeadDecision(records: HeadRecord[], record: HeadRecord): HeadRecord[] {
  if (!canDecideHead(record.actorId, record.departmentId, record.choice)) return records;
  return [...records, record];
}
