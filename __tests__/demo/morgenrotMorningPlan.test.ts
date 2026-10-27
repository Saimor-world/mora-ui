import { MORGENROT_SEED, FICTIONAL_NOTICE } from '@/lib/demo/morgenrot/seed';
import { JOB_ROLES } from '@/lib/demo/morgenrot/jobRoles';
import { buildMorningPlans, isMorningPlanDue } from '@/lib/demo/morgenrot/morningPlan';
import { hasMinRole } from '@/lib/auth/roles';

const DAY = '2026-10-28';

describe('Café Morgenrot seed', () => {
  it('is clearly marked fictional', () => {
    expect(MORGENROT_SEED.company.fictional).toBe(true);
    expect(MORGENROT_SEED.company.name).toContain('FIKTIV');
    expect(FICTIONAL_NOTICE).toMatch(/fiktiv/i);
    MORGENROT_SEED.people.filter((p) => p.id !== 'marius').forEach((p) => expect(p.fictional).toBe(true));
  });

  it('has owner + three staff with system and job roles', () => {
    const byId = Object.fromEntries(MORGENROT_SEED.people.map((p) => [p.id, p]));
    expect(byId.marius.systemRole).toBe('owner');
    expect(byId.lena).toMatchObject({ systemRole: 'manager', jobRole: 'service' });
    expect(byId.tarek).toMatchObject({ systemRole: 'member', jobRole: 'kueche' });
    expect(byId.jonas).toMatchObject({ systemRole: 'member', jobRole: 'aushilfe' });
    expect(Object.keys(JOB_ROLES).sort()).toEqual(['aushilfe', 'inhaber', 'kueche', 'service']);
  });
});

describe('morning plan job', () => {
  const plans = buildMorningPlans(MORGENROT_SEED, DAY);
  const get = (id: string) => plans.find((p) => p.personId === id)!;

  it('writes one plan per person', () => {
    expect(plans).toHaveLength(4);
  });

  it('staff only see their own shift and tasks', () => {
    const tarek = get('tarek');
    expect(tarek.shift).toEqual({ start: '06:30', end: '14:30' });
    expect(tarek.tasks.every((t) => t.assignee === 'tarek')).toBe(true);
    expect(tarek.team).toBeUndefined();
  });

  it('owner gets team overview incl. open approvals', () => {
    const m = get('marius');
    expect(hasMinRole(MORGENROT_SEED.people[0].systemRole, 'owner')).toBe(true);
    expect(m.team?.map((t) => t.personId).sort()).toEqual(['jonas', 'lena', 'tarek']);
    expect(m.approvals.length).toBeGreaterThan(0);
  });

  it('person without shift gets a free day', () => {
    const j = buildMorningPlans(MORGENROT_SEED, '2026-10-29').find((p) => p.personId === 'jonas')!;
    expect(j.shift).toBeNull();
    expect(j.greeting).toMatch(/frei/i);
  });

  it('is due only at 07:00 Europe/Berlin', () => {
    expect(isMorningPlanDue(new Date('2026-10-28T06:00:00Z'))).toBe(true); // 07:00 CET
    expect(isMorningPlanDue(new Date('2026-10-28T07:00:00Z'))).toBe(false);
    expect(isMorningPlanDue(new Date('2026-07-01T05:00:00Z'))).toBe(true); // 07:00 CEST
  });
});
