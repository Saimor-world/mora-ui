import { groupThoughts } from '@/features/mora/ui/AgentFeed';
import { folderLabel } from '@/lib/lea/finder';

describe('Phase 6c', () => {
  it('bündelt gleiche Gedanken', () => {
    const t = (ts: string) => ({ ts, type: 'user_interaction', thought: 'Scanning index for exact match' }) as never;
    const g = groupThoughts([t('2026-10-23T10:00:00Z'), t('2026-10-23T12:00:00Z'), t('2026-10-23T11:00:00Z')]);
    expect(g).toHaveLength(1);
    expect(g[0].count).toBe(3);
    expect((g[0].last as { ts: string }).ts).toBe('2026-10-23T12:00:00Z');
  });
  it('zeigt Systemordner deutsch, nur Anzeige', () => {
    const f = { name: 'Calendar', description: 'Company calendar events' };
    expect(folderLabel(f)).toBe('Kalender');
    expect(f.name).toBe('Calendar');
    expect(folderLabel({ name: 'Calendar', description: 'eigener Ordner' })).toBe('Calendar');
  });
});
