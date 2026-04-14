import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFolders, useCreateFolder, useUpdateFolder, useDeleteFolder } from '@/lib/queries/useFolders';
import * as orgClient from '@/lib/api/orgClient';

jest.mock('@/lib/api/orgClient', () => ({
  fetchFolders: jest.fn().mockResolvedValue([
    { id: 'f1', name: 'Docs', space_id: 's1', company_id: 'c1' },
  ]),
  createFolder: jest.fn().mockResolvedValue({ id: 'f2', name: 'Notes', space_id: 's1', company_id: 'c1' }),
  updateFolder: jest.fn().mockResolvedValue({ id: 'f1', name: 'Documents', space_id: 's1', company_id: 'c1' }),
  deleteFolder: jest.fn().mockResolvedValue(undefined),
}));

const makeWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useFolders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches folders for a space', async () => {
    const { result } = renderHook(() => useFolders('s1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('Docs');
    expect(orgClient.fetchFolders).toHaveBeenCalledWith('s1');
  });

  it('is disabled when spaceId is null', () => {
    const { result } = renderHook(() => useFolders(null), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('is disabled when spaceId is undefined', () => {
    const { result } = renderHook(() => useFolders(undefined), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateFolder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls createFolder and invalidates folders + tree queries', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCreateFolder('s1', 'c1'), { wrapper });

    await result.current.mutateAsync({ name: 'Notes', space_id: 's1' });

    expect(orgClient.createFolder).toHaveBeenCalledWith({ name: 'Notes', space_id: 's1' });
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['folders', 's1'] }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['tree', 'c1'] }));
  });
});

describe('useUpdateFolder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls updateFolder and invalidates folders + tree queries', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdateFolder('s1', 'c1'), { wrapper });

    await result.current.mutateAsync({ id: 'f1', payload: { name: 'Documents' } });

    expect(orgClient.updateFolder).toHaveBeenCalledWith('f1', { name: 'Documents' });
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['folders', 's1'] }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['tree', 'c1'] }));
  });
});

describe('useDeleteFolder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls deleteFolder and invalidates folders + tree queries', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useDeleteFolder('s1', 'c1'), { wrapper });

    await result.current.mutateAsync('f1');

    expect(orgClient.deleteFolder).toHaveBeenCalledWith('f1');
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['folders', 's1'] }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['tree', 'c1'] }));
  });
});
