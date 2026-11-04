import { deriveLiveAttention } from '@/features/home/cockpit/coreAdapter';
import type { TodaySnapshot } from '@/lib/api/todayClient';

describe('Live home attention destinations', () => {
  const snapshot = {
    mail: { unread_count: 2 },
    calendar: { events: [{ id: 'event-service-1', title: 'Schicht Service', time: '14:00', is_open: true }] },
    tasks: { due_today: [{ id: 'task-kitchen-1', title: 'Bestellung Küche' }] },
  } as unknown as TodaySnapshot;

  it('routes mail, calendar and task attention only to registered native surfaces', () => {
    const navigate = jest.fn();
    const { items } = deriveLiveAttention(snapshot, navigate);

    const mail = items.find(item => item.id === 'live-mail');
    const calendar = items.find(item => item.id === 'live-cal');
    const task = items.find(item => item.id === 'live-task');
    expect(mail).toBeDefined();
    expect(calendar).toBeDefined();
    expect(task).toBeDefined();

    mail?.onAction?.();
    calendar?.onAction?.();
    task?.onAction?.();
    expect(navigate.mock.calls).toEqual([['post'], ['post'], ['today']]);
  });

  it('does not claim a generic calendar link can assign a shift or complete a task', () => {
    const { items } = deriveLiveAttention(snapshot, jest.fn());
    expect(items.find(item => item.id === 'live-cal')?.action).toBe('Kalender ansehen');
    expect(items.find(item => item.id === 'live-task')?.action).toBe('Aufgabe ansehen');
  });
});
