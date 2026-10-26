import { nightReport, rollVisit, visitDelay, VISIT_DELAY_MS } from '@/lib/nightwatch/visit';

describe('Nightwatch visit timing', () => {
  const morning = new Date(2026, 9, 26, 8, 0);
  it('flies in five minutes after the first open of the day', () => {
    const s = rollVisit(null, morning);
    expect(visitDelay(s, morning, false)).toBe(VISIT_DELAY_MS);
    const later = new Date(morning.getTime() + 2 * 60_000);
    expect(visitDelay(rollVisit(s, later), later, false)).toBe(3 * 60_000);
  });
  it('comes at once on a critical incident, even after dismissal', () => {
    const s = { ...rollVisit(null, morning), dismissed: true };
    expect(visitDelay(s, morning, false)).toBeNull();
    expect(visitDelay(s, morning, true)).toBe(0);
  });
  it('starts a fresh day', () => {
    const s = { ...rollVisit(null, morning), dismissed: true };
    const next = new Date(2026, 9, 27, 7, 0);
    expect(rollVisit(s, next)).toEqual({ day: '2026-10-27', firstOpenAt: next.getTime(), dismissed: false });
  });
});

describe('Nightwatch night report', () => {
  const now = new Date('2026-10-26T07:00:00Z');
  it('never claims calm without data', () => {
    expect(nightReport(null, now)[0].tone).toBe('warn');
  });
  it('builds at most three points from incidents', () => {
    const pts = nightReport([
      { id: '1', title: 'CORE-API langsam', severity: 'critical', status: 'open' },
      { id: '2', title: 'Backup verzögert', severity: 'warning', status: 'open' },
      { id: '3', title: 'Zertifikat', status: 'resolved', updated_at: '2026-10-26T02:00:00Z' },
    ], now, 72);
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ tone: 'crit', text: 'Kritisch: CORE-API langsam.' });
    expect(pts[2].text).toContain('über Nacht gelöst');
  });
  it('reports a quiet night', () => {
    expect(nightReport([], now, 95).map((p) => p.tone)).toEqual(['ok', 'ok', 'ok']);
  });
});
