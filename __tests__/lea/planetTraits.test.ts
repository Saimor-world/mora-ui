import { planetTraits } from '@/lib/lea/world';

describe('planetTraits – Besonderheiten nur aus Daten', () => {
  const now = new Date('2026-10-24T12:00:00');
  it('zählt Ordner, Aktivität (7 Tage), offene und überfällige Aufgaben', () => {
    const t = planetTraits('d1', ['f1', 'f2'],
      [{ folder_id: 'f1', created_at: '2026-10-23T10:00:00Z' }, { folder_id: 'f2', created_at: '2026-08-01T10:00:00Z' }, { folder_id: 'x', created_at: '2026-10-23T10:00:00Z' }],
      [{ id: 'a', title: 'A', status: 'backlog', folder_id: 'f1', due_date: '2026-10-20' }, { id: 'b', title: 'B', status: 'backlog', folder_id: 'f2' }, { id: 'c', title: 'C', status: 'done', folder_id: 'f2', due_date: '2026-10-01' }, { id: 'd', title: 'D', status: 'backlog' }],
      now);
    expect(t).toMatchObject({ folders: 2, activity: 1 / 8, open: 2, overdue: 1 });
  });
  it('leerer Planet hat keine Besonderheiten außer der Oberfläche, Oberfläche ist stabil', () => {
    const a = planetTraits('d9', [], [], [], now);
    expect(a).toMatchObject({ folders: 0, activity: 0, open: 0, overdue: 0 });
    expect(planetTraits('d9', [], [], [], now).texture).toBe(a.texture);
  });
});

describe('planetTraits · Post je Planet', () => {
  const now = new Date('2026-10-26T12:00:00Z');
  it('zählt nur Mail-Knoten im Bereich der letzten 24 h, ungelesen nur mit belegtem read', () => {
    const t = planetTraits('d1', ['f1'], [
      { folder_id: 'f1', type: 'mail_message', created_at: '2026-10-26T08:00:00Z', metadata: { read: false } },
      { folder_id: 'f1', type: 'mail_message', created_at: '2026-10-26T09:00:00Z' },
      { folder_id: 'f1', type: 'mail_message', created_at: '2026-10-20T09:00:00Z', metadata: { read: false } },
      { folder_id: 'f2', type: 'mail_message', created_at: '2026-10-26T09:00:00Z' },
      { folder_id: 'f1', type: 'note', created_at: '2026-10-26T09:00:00Z' },
    ], [], now);
    expect(t.newMails).toBe(2);
    expect(t.unreadMails).toBe(1);
  });
  it('ohne Zuordnung keine erfundene Zahl', () => {
    const t = planetTraits('d1', ['f1'], [{ folder_id: 'f1', type: 'note', created_at: '2026-10-26T09:00:00Z' }], [], now);
    expect(t.newMails).toBeUndefined();
    expect(t.unreadMails).toBeUndefined();
  });
});
