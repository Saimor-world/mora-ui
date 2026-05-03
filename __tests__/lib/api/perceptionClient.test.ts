/**
 * Tests for perceptionClient.
 * Mocks the corePost I/O boundary per saimor-test-patterns.
 */
import { fetchPerception } from '@/lib/api/perceptionClient';
import { corePost } from '@/lib/api/http';

jest.mock('@/lib/api/http', () => ({
  corePost: jest.fn(),
}));

const mockCorePost = corePost as jest.MockedFunction<typeof corePost>;

const validBundle = {
  version: 'v1' as const,
  issued_at: '2026-04-25T12:00:00Z',
  identity: {
    user_id: 'u_1', name: 'A', role: 'owner' as const, tenant_id: 't',
    active_company: { id: 'c', name: 'C' },
  },
  scope: { company: null, department: null, space: null, folder: null },
  active_object: null,
  recent_activity: { navigations: [], edits: [], open_panes: [], drafts: [] },
  relevant_memory: [],
  recent_tool_runs: [],
  capabilities: {
    tools_available: [], tools_degraded: [], providers_active: [], memory_writable: true,
  },
};

describe('fetchPerception', () => {
  beforeEach(() => {
    mockCorePost.mockReset();
  });

  it('posts to /v3/mora/perceive with the request body', async () => {
    mockCorePost.mockResolvedValueOnce(validBundle);
    await fetchPerception({ query: 'test', active_pane: { type: 'finder', data: { folder_id: 'f1' } } });
    expect(mockCorePost).toHaveBeenCalledWith(
      '/v3/mora/perceive',
      { query: 'test', active_pane: { type: 'finder', data: { folder_id: 'f1' } } }
    );
  });

  it('returns the parsed bundle on success', async () => {
    mockCorePost.mockResolvedValueOnce(validBundle);
    const bundle = await fetchPerception({});
    expect(bundle.version).toBe('v1');
    expect(bundle.identity.user_id).toBe('u_1');
  });

  it('throws on HTTP error', async () => {
    mockCorePost.mockRejectedValueOnce(new Error('500 Internal Server Error'));
    await expect(fetchPerception({})).rejects.toThrow('500 Internal Server Error');
  });

  it('handles empty request body', async () => {
    mockCorePost.mockResolvedValueOnce(validBundle);
    await fetchPerception({});
    expect(mockCorePost).toHaveBeenCalledWith('/v3/mora/perceive', {});
  });
});
