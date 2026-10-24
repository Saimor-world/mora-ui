import { nextOpenToday } from '@/lib/lea/day';

describe('Kalender-Kachel: nächster offener Termin', () => {
  const now = new Date('2026-10-24T14:30:00');
  const ev = (id: string, time: string, date = '2026-10-24') => ({ id, title: id, date, time }) as any;
  const events = [ev('sophie', '10:00'), ev('demir', '13:00'), ev('jana', '15:30'), ev('michelle', '09:30', '2026-10-25')];
  it('skips abgeschlossene and shows the next open one', () => {
    const r = nextOpenToday(events, { sophie: 'erledigt', demir: 'erledigt' }, now);
    expect(r.next?.id).toBe('jana'); expect(r.open).toBe(1); expect(r.total).toBe(3);
  });
  it('counts a running appointment as open', () => {
    expect(nextOpenToday(events, { sophie: 'laeuft' }, now).next?.id).toBe('sophie');
  });
  it('reports none open when all are done', () => {
    const r = nextOpenToday(events, { sophie: 'erledigt', demir: 'erledigt', jana: 'erledigt' }, now);
    expect(r.next).toBeNull(); expect(r.total).toBe(3);
  });
});
