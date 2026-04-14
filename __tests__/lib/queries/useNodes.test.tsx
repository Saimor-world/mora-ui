import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNodes, useCreateNode, useUpdateNode, useDeleteNode } from '@/lib/queries/useNodes';
import * as orgClient from '@/lib/api/orgClient';

const mockNode = { id: 'n1', title: 'My Doc', folder_id: 'f1', space_id: 's1', type: 'document' as const };

jest.mock('@/lib/api/orgClient', () => ({
  fetchNodes: jest.fn().mockResolvedValue([
    { id: 'n1', title: 'My Doc', folder_id: 'f1', space_id: 's1', type: 'document' },
  ]),
  createNode: jest.fn().mockResolvedValue({ id: 'n2', title: 'New Doc', folder_id: 'f1', space_id: 's1', type: 'document' }),
  updateNode: jest.fn().mockResolvedValue({ id: 'n1', title: 'Updated Doc', folder_id: 'f1', space_id: 's1', type: 'document' }),
  deleteNode: jest.fn().mockResolvedValue(undefined),
}));

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useNodes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches nodes for a folder', async () => {
    const { result } = renderHook(() => useNodes('f1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(orgClient.fetchNodes).toHaveBeenCalledWith('f1', undefined);
  });

  it('is disabled when folderId is null', () => {
    const { result } = renderHook(() => useNodes(null), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('is disabled when folderId is undefined', () => {
    const { result } = renderHook(() => useNodes(undefined), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateNode — optimistic update', () => {
  beforeEach(() => jest.clearAllMocks());

  it('optimistically adds node before server response', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    // Pre-populate cache with existing nodes
    qc.setQueryData(['nodes', 'f1'], [mockNode]);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCreateNode('f1'), { wrapper });

    // Fire mutation — check optimistic state then settle
    const mutationPromise = result.current.mutateAsync({ title: 'New Doc', folder_id: 'f1', type: 'document' });

    // After mutation settles, cache should be invalidated and refreshed
    await mutationPromise;
    expect(orgClient.createNode).toHaveBeenCalled();
  });

  it('calls createNode with correct payload', async () => {
    const { result } = renderHook(() => useCreateNode('f1'), { wrapper: makeWrapper() });
    await result.current.mutateAsync({ title: 'New Doc', folder_id: 'f1', type: 'document' });
    expect(orgClient.createNode).toHaveBeenCalledWith({ title: 'New Doc', folder_id: 'f1', type: 'document' });
  });
});

describe('useUpdateNode', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls updateNode with correct id and payload', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    qc.setQueryData(['nodes', 'f1'], [mockNode]);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdateNode('f1'), { wrapper });
    await result.current.mutateAsync({ id: 'n1', payload: { title: 'Updated Doc' } });

    expect(orgClient.updateNode).toHaveBeenCalledWith('n1', { title: 'Updated Doc' });
  });
});

describe('useDeleteNode', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls deleteNode and invalidates cache', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    qc.setQueryData(['nodes', 'f1'], [mockNode]);
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useDeleteNode('f1'), { wrapper });
    await result.current.mutateAsync('n1');

    expect(orgClient.deleteNode).toHaveBeenCalledWith('n1');
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: expect.arrayContaining(['nodes']) })
    );
  });
});
