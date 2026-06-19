import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLarryArtifacts } from '@/lib/queries/useLarryArtifacts';
import * as larryClient from '@/lib/api/larryClient';

jest.mock('@/lib/api/larryClient', () => ({
  fetchLarryArtifacts: jest.fn().mockResolvedValue([
    {
      id: 'e37c550f',
      type: 'larry.canvas',
      kind: 'canvas',
      title: 'Ops Canvas',
      owner: 'Marius',
    },
  ]),
}));

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useLarryArtifacts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches workspace artifacts for a company', async () => {
    const { result } = renderHook(() => useLarryArtifacts('co-1', 8), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(larryClient.fetchLarryArtifacts).toHaveBeenCalledWith('co-1', 8);
  });

  it('is disabled when companyId is missing', () => {
    const { result } = renderHook(() => useLarryArtifacts(null), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
