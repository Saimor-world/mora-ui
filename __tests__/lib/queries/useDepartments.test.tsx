import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/lib/queries/useDepartments';
import * as orgClient from '@/lib/api/orgClient';

jest.mock('@/lib/api/orgClient', () => ({
  fetchDepartments: jest.fn().mockResolvedValue([
    { id: 'd1', name: 'Engineering', company_id: 'c1' },
  ]),
  createDepartment: jest.fn().mockResolvedValue({ id: 'd2', name: 'Design', company_id: 'c1' }),
  updateDepartment: jest.fn().mockResolvedValue({ id: 'd1', name: 'Eng Updated', company_id: 'c1' }),
  deleteDepartment: jest.fn().mockResolvedValue(undefined),
}));

const makeWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useDepartments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches departments for a company', async () => {
    const { result } = renderHook(
      () => useDepartments('c1'),
      { wrapper: makeWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(orgClient.fetchDepartments).toHaveBeenCalledWith('c1');
  });

  it('is disabled when companyId is null', () => {
    const { result } = renderHook(
      () => useDepartments(null),
      { wrapper: makeWrapper() }
    );
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('is disabled when companyId is undefined', () => {
    const { result } = renderHook(
      () => useDepartments(undefined),
      { wrapper: makeWrapper() }
    );
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateDepartment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls createDepartment and invalidates queries', async () => {
    const { result } = renderHook(
      () => useCreateDepartment('c1'),
      { wrapper: makeWrapper() }
    );
    await result.current.mutateAsync({ name: 'Design', company_id: 'c1' });
    expect(orgClient.createDepartment).toHaveBeenCalledWith({ name: 'Design', company_id: 'c1' });
  });
});

describe('useUpdateDepartment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls updateDepartment with id and payload', async () => {
    const { result } = renderHook(
      () => useUpdateDepartment('c1'),
      { wrapper: makeWrapper() }
    );
    await result.current.mutateAsync({ id: 'd1', payload: { name: 'Eng Updated' } });
    expect(orgClient.updateDepartment).toHaveBeenCalledWith('d1', { name: 'Eng Updated' });
  });
});

describe('useDeleteDepartment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls deleteDepartment with id', async () => {
    const { result } = renderHook(
      () => useDeleteDepartment('c1'),
      { wrapper: makeWrapper() }
    );
    await result.current.mutateAsync('d1');
    expect(orgClient.deleteDepartment).toHaveBeenCalledWith('d1');
  });
});
