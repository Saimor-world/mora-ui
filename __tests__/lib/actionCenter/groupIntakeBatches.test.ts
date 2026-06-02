import { groupIntakeBatches } from '@/lib/actionCenter/events';

const intake = (id: string, status: string, ts: string, extra: any = {}): any => ({
  action_id: id,
  status,
  intent: 'create_node_from_file',
  payload: { tool_name: 'create_node_from_file', ...extra },
  timestamp: ts,
  ...extra.top,
});

describe('groupIntakeBatches', () => {
  it('ignores non-intake events', () => {
    const events: any = [{ action_id: 'x', status: 'done', intent: 'other', payload: {}, timestamp: '2026-06-01T00:00:00.000Z' }];
    expect(groupIntakeBatches(events)).toEqual([]);
  });

  it('groups events sharing a batch_id and counts statuses', () => {
    const events = [
      intake('a', 'done', '2026-06-01T08:00:00.000Z', { top: { batch_id: 'b1' }, intake_context: { target_folder_name: 'Angebote' } }),
      intake('b', 'failed', '2026-06-01T08:00:05.000Z', { top: { batch_id: 'b1' }, intake_context: { target_folder_name: 'Angebote' } }),
    ];
    const batches = groupIntakeBatches(events);
    expect(batches).toHaveLength(1);
    expect(batches[0].batchKey).toBe('b1');
    expect(batches[0].confirmed).toBe(1);
    expect(batches[0].failed).toBe(1);
    expect(batches[0].routes).toEqual(['Angebote']); // deduped
    expect(batches[0].events).toHaveLength(2);
  });

  it('time-windows unbatched events within 90s into one group', () => {
    const events = [
      intake('a', 'done', '2026-06-01T08:00:00.000Z'),
      intake('b', 'done', '2026-06-01T08:01:00.000Z'), // +60s -> same group
      intake('c', 'done', '2026-06-01T08:05:00.000Z'), // +4min -> new group
    ];
    const batches = groupIntakeBatches(events);
    expect(batches).toHaveLength(2);
    const sizes = batches.map((b) => b.events.length).sort();
    expect(sizes).toEqual([1, 2]);
  });

  it('sorts batches newest first', () => {
    const events = [
      intake('old', 'done', '2026-06-01T08:00:00.000Z', { top: { batch_id: 'b-old' } }),
      intake('old2', 'done', '2026-06-01T08:00:01.000Z', { top: { batch_id: 'b-old' } }),
      intake('new', 'done', '2026-06-01T09:00:00.000Z', { top: { batch_id: 'b-new' } }),
      intake('new2', 'done', '2026-06-01T09:00:01.000Z', { top: { batch_id: 'b-new' } }),
    ];
    const batches = groupIntakeBatches(events);
    expect(batches[0].batchKey).toBe('b-new');
  });
});
