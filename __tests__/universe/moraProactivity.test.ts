import { deriveMoraNudges, PROACTIVITY_RULES, shouldAutoFly } from '@/lib/universe/moraProactivity';

const now = new Date('2026-10-20T08:00:00+02:00');

describe('Proactive MÔRA', () => {
  it('never marks a mail or invoice as a self-fly', () => {
    const nudges = deriveMoraNudges({
      now,
      mail: [{ id: 'm1', subject: 'Anfrage: Produktdemo', from: 'kunde@beispiel.de', date: '2026-10-19T14:00:00+02:00' }],
      openInvoices: 2,
    });
    expect(nudges.length).toBeGreaterThan(0);
    expect(nudges.filter((n) => n.kind === 'mail' || n.kind === 'invoice').every((n) => n.fly === false)).toBe(true);
    expect(PROACTIVITY_RULES.neverAutoSend).toBe(true);
    expect(PROACTIVITY_RULES.neverAutoMutate).toBe(true);
  });

  it('flies only for a meeting in the next 12 minutes', () => {
    const nudges = deriveMoraNudges({
      now,
      calendar: [{ id: 'c1', title: 'Standup', date: '2026-10-20T08:10:00+02:00' }],
    });
    expect(nudges[0].fly).toBe(true);
    expect(nudges[0].title).toMatch(/Standup/);
    expect(shouldAutoFly(nudges)?.planetId).toBe('sys:post');
  });

  it('flies for a critical incident, not a warning', () => {
    const warning = deriveMoraNudges({
      now,
      incidents: [{ id: 'w', title: 'Login', severity: 'warning', status: 'open' }],
    });
    expect(shouldAutoFly(warning)).toBeNull();
    const critical = deriveMoraNudges({
      now,
      incidents: [{ id: 'c', title: 'Datenbank', severity: 'critical', status: 'open' }],
    });
    expect(shouldAutoFly(critical)?.kind).toBe('incident');
  });

  it('caps suggestions at three', () => {
    const nudges = deriveMoraNudges({
      now,
      calendar: [{ id: 'c1', title: 'Standup', date: '2026-10-20T08:10:00+02:00' }],
      mail: [{ id: 'm1', subject: 'Anfrage', from: 'a', date: '2026-10-19T08:00:00+02:00' }],
      incidents: [{ id: 'c', title: 'Down', severity: 'critical', status: 'open' }],
      dueToday: [{ id: 't1', title: 'API' }],
      openInvoices: 2,
    });
    expect(nudges.length).toBe(PROACTIVITY_RULES.maxVisible);
  });
});
