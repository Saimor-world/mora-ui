import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSpaces, useCreateSpace, useUpdateSpace, useDeleteSpace } from '@/lib/queries/useSpaces';
import * as orgClient from '@/lib/api/orgClient';

jest.mock('@/lib/api/orgClient', () => ({
  fetchSpaces: jest.fn().mockResolvedValue([
    { id: 's1', name: 'Backend', department_id: 'd1' },
  ]),
  createSpace: jest.fn().mockResolvedValue({ id: 's2', name: 'Frontend', department_id: 'd1' }),
  updateSpace: jest.fn().mockResolvedValue({ id: 's1', name: 'API', department_id: 'd1' }),
  deleteSpace: jest.fn().mockResolvedValue(undefined),
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

describe('useSpaces', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches spaces for a department', async () => {
    const { result } = renderHook(
      () => useSpaces('d1'),
      { wrapper: makeWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(orgClient.fetchSpaces).toHaveBeenCalledWith('d1');
  });

  it('is disabled when departmentId is null', () => {
    const { result } = renderHook(
      () => useSpaces(null),
      { wrapper: makeWrapper() }
    );
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('is disabled when departmentId is undefined', () => {
    const { result } = renderHook(
      () => useSpaces(undefined),
      { wrapper: makeWrapper() }
    );
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateSpace', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls createSpace and invalidates spaces + tree queries', async () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCreateSpace('d1', 'c1'), { wrapper });
    await result.current.mutateAsync({ name: 'Frontend', department_id: 'd1' });

    expect(orgClient.createSpace).toHaveBeenCalledWith({ name: 'Frontend', department_id: 'd1' });
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: expect.arrayContaining(['spaces']) }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: expect.arrayContaining(['tree']) }));
  });
});

describe('useUpdateSpace', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls updateSpace with id and payload', async () => {
    const { result } = renderHook(
      () => useUpdateSpace('d1', 'c1'),
      { wrapper: makeWrapper() }
    );
    await result.current.mutateAsync({ id: 's1', payload: { name: 'API' } });
    expect(orgClient.updateSpace).toHaveBeenCalledWith('s1', { name: 'API' });
  });
});

describe('useDeleteSpace', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls deleteSpace with id', async () => {
    const { result } = renderHook(
      () => useDeleteSpace('d1', 'c1'),
      { wrapper: makeWrapper() }
    );
    await result.current.mutateAsync('s1');
    expect(orgClient.deleteSpace).toHaveBeenCalledWith('s1');
  });
});
