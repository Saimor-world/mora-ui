import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCompanies } from '@/lib/queries/useCompanies';
import * as orgClient from '@/lib/api/orgClient';

jest.mock('@/lib/api/orgClient', () => ({
  fetchCompanies: jest.fn().mockResolvedValue([
    { id: 'c1', name: 'Acme', is_demo: false, tenant_id: 'tenant-1' },
  ]),
}));

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useCompanies', () => {
  it('fetches companies list', async () => {
    const { result } = renderHook(() => useCompanies(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].name).toBe('Acme');
  });

  it('passes includeDemo to fetchCompanies when provided', async () => {
    const { result } = renderHook(
      () => useCompanies({ includeDemo: true }),
      { wrapper: makeWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(orgClient.fetchCompanies).toHaveBeenCalledWith(true);
  });

  it('is disabled when enabled: false', () => {
    const { result } = renderHook(
      () => useCompanies({ enabled: false }),
      { wrapper: makeWrapper() }
    );
    expect(result.current.fetchStatus).toBe('idle');
  });
});
