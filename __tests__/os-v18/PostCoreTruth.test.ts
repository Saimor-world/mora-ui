import { parsePostList } from '@/features/post/data/usePost';
import { connectionReadPath } from '@/lib/os-prototype/useSources';

describe('Post CORE result evidence', () => {
  it('passes an explicit company selector to CORE without inventing mail company ownership', () => {
    expect(connectionReadPath(null)).toBe('/v3/connections');
    expect(connectionReadPath('company a/b')).toBe('/v3/connections?company_id=company%20a%2Fb');
  });

  it('accepts an actual empty list and documented array envelopes', () => {
    expect(parsePostList([], ['messages'])).toEqual([]);
    expect(parsePostList({ messages: [] }, ['messages'])).toEqual([]);
    expect(parsePostList({ events: [{ id: 'event-1' }] }, ['events'])).toEqual([{ id: 'event-1' }]);
  });
  it('never converts failed or unrecognized CORE payloads into an empty mailbox', () => {
    expect(parsePostList(null, ['messages'])).toBeNull();
    expect(parsePostList({}, ['messages'])).toBeNull();
    expect(parsePostList({ success: true }, ['messages'])).toBeNull();
    expect(parsePostList({ status: 'unavailable', messages: [] }, ['messages'])).toBeNull();
    expect(parsePostList({ status: 'partial', messages: [] }, ['messages'])).toBeNull();
    expect(parsePostList({ status: 'stale', messages: [] }, ['messages'])).toBeNull();
    expect(parsePostList({ status: 'error', messages: [] }, ['messages'])).toBeNull();
  });
});
