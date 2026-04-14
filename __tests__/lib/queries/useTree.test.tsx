import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTree } from '@/lib/queries/useTree';
import * as orgClient from '@/lib/api/orgClient';

jest.mock('@/lib/api/orgClient', () => ({
  fetchTree: jest.fn().mockResolvedValue([
    { id: 'd1', type: 'department', name: 'Engineering', children: [] },
  ]),
}));

const makeWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useTree', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches tree for a company', async () => {
    const { result } = renderHook(
      () => useTree('c1'),
      { wrapper: makeWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].name).toBe('Engineering');
    expect(orgClient.fetchTree).toHaveBeenCalledWith(undefined, 'c1');
  });

  it('is disabled when companyId is null', () => {
    const { result } = renderHook(
      () => useTree(null),
      { wrapper: makeWrapper() }
    );
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('is disabled when companyId is undefined', () => {
    const { result } = renderHook(
      () => useTree(undefined),
      { wrapper: makeWrapper() }
    );
    expect(result.current.fetchStatus).toBe('idle');
  });
});
