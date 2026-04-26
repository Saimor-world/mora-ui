import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMoraPerception } from '@/lib/queries/useMoraPerception';
import { fetchPerception } from '@/lib/api/perceptionClient';
import type { PerceptionBundle } from '@/lib/types/perception';

jest.mock('@/lib/api/perceptionClient', () => ({
  fetchPerception: jest.fn(),
}));

const mockFetch = fetchPerception as jest.MockedFunction<typeof fetchPerception>;

const validBundle: PerceptionBundle = {
  version: 'v1',
  issued_at: '2026-04-25T12:00:00Z',
  identity: {
    user_id: 'u_1', name: 'A', role: 'owner', tenant_id: 't',
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

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useMoraPerception', () => {
  beforeEach(() => mockFetch.mockReset());

  it('fetches the bundle on mount', async () => {
    mockFetch.mockResolvedValueOnce(validBundle);
    const { result } = renderHook(() => useMoraPerception(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(validBundle);
    expect(mockFetch).toHaveBeenCalledWith({});
  });

  it('passes query and active_pane through to fetcher', async () => {
    mockFetch.mockResolvedValueOnce(validBundle);
    const { result } = renderHook(
      () => useMoraPerception({ query: 'hello', active_pane: { type: 'finder', data: { folder_id: 'f1' } } }),
      { wrapper: makeWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith({
      query: 'hello',
      active_pane: { type: 'finder', data: { folder_id: 'f1' } },
    });
  });

  it('returns isError true when fetch rejects', async () => {
    // Reject every call — hook has retry:1 so it tries twice before erroring.
    mockFetch.mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => useMoraPerception(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
  });
});
