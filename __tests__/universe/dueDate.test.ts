import { dueText, monthGrid } from '@/features/universe/ui/DueDate';

describe('DueDate (deutscher Datumswähler)', () => {
  it('zeigt heute, morgen und sonst Wochentag + TT.MM. – nie mm/dd/yyyy', () => {
    expect(dueText('2026-11-09', '2026-11-09')).toBe('heute');
    expect(dueText('2026-11-10', '2026-11-09')).toBe('morgen');
    expect(dueText('2026-11-12', '2026-11-09')).toMatch(/^Do\.? 12\.11\.$/);
    expect(dueText('2026-11-12', '2026-11-09')).not.toMatch(/\//);
  });
  it('baut Monate ab Montag', () => {
    const nov = monthGrid(2026, 10); // November 2026 beginnt an einem Sonntag
    expect(nov.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(nov.filter(Boolean)).toHaveLength(30);
    expect(nov.length % 7).toBe(0);
  });
});
