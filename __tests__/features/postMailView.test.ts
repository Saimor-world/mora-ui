import { mailTime, senderAddress, senderName, unreadCount, visibleMail } from '@/features/post/mailView';

describe('post mail view helpers', () => {
  it('shows a person, not a raw header', () => {
    expect(senderName({ from: 'Lea Beispiel <lea@beispiel.test>' })).toBe('Lea Beispiel');
    expect(senderName({ from_addr: 'lea.k@beispiel.test' })).toBe('Lea K');
    expect(senderName({})).toBe('Unbekannt');
    expect(senderAddress({ from: 'Lea <lea@beispiel.test>' })).toBe('lea@beispiel.test');
  });

  it('formats mail times relative to now', () => {
    const now = new Date(2026, 9, 26, 18, 0);
    expect(mailTime(new Date(2026, 9, 26, 9, 5).toISOString(), now)).toBe('09:05');
    expect(mailTime(new Date(2026, 9, 25, 9, 5).toISOString(), now)).toBe('Gestern');
    expect(mailTime(new Date(2026, 8, 1).toISOString(), now)).toBe('01.09.');
    expect(mailTime('kaputt', now)).toBe('');
  });

  it('filters unread and sorts newest first', () => {
    const items = [
      { id: 'a', date: '2026-10-20T10:00:00Z', read: true },
      { id: 'b', date: '2026-10-25T10:00:00Z', read: false },
      { id: 'c', date: '2026-10-22T10:00:00Z', read: false },
    ];
    expect(visibleMail(items, 'all').map((m) => m.id)).toEqual(['b', 'c', 'a']);
    expect(visibleMail(items, 'unread').map((m) => m.id)).toEqual(['b', 'c']);
    expect(unreadCount(items)).toBe(2);
  });
});
