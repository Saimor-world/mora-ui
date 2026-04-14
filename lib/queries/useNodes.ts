import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNodes,
  createNode,
  updateNode,
  deleteNode,
  CreateNodePayload,
  UpdateNodePayload,
} from '@/lib/api/orgClient';
import type { CoreNode } from '@/lib/types/core';
import { queryKeys, STALE_TIMES } from './queryKeys';

interface UseNodesOptions {
  search?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export function useNodes(folderId: string | null | undefined, options?: UseNodesOptions) {
  return useQuery({
    queryKey: queryKeys.nodes(folderId, options),
    queryFn: () => fetchNodes(folderId!, options),
    staleTime: STALE_TIMES.nodes,
    refetchOnWindowFocus: true, // nodes only — returning to a folder shows fresh content
    enabled: !!folderId,
  });
}

// Base prefix key for ALL nodes in this folder (no options).
// exact: false in cancelQueries/invalidateQueries matches ALL variants
// (bare key AND keyed-with-options) regardless of what options the caller passed.
const nodesPrefix = (folderId: string | null | undefined) => ['nodes', folderId] as const;

export function useCreateNode(folderId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateNodePayload) => createNode(payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: nodesPrefix(folderId), exact: false });
      const prev = qc.getQueryData<CoreNode[]>(nodesPrefix(folderId));
      const optimistic: CoreNode = {
        id: `optimistic-${Date.now()}`,
        title: payload.title ?? '',
        folder_id: folderId ?? '',
        space_id: '',
        type: payload.type ?? 'document',
      };
      qc.setQueryData(nodesPrefix(folderId), (old: CoreNode[] = []) => [...old, optimistic]);
      return { prev };
    },
    onError: (_err, _payload, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(nodesPrefix(folderId), ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: nodesPrefix(folderId), exact: false });
    },
  });
}

export function useUpdateNode(folderId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateNodePayload }) =>
      updateNode(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: nodesPrefix(folderId), exact: false });
      const prev = qc.getQueryData<CoreNode[]>(nodesPrefix(folderId));
      qc.setQueryData(nodesPrefix(folderId), (old: CoreNode[] = []) =>
        old.map((n) => (n.id === id ? { ...n, ...payload } : n))
      );
      return { prev };
    },
    onError: (_err, _payload, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(nodesPrefix(folderId), ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: nodesPrefix(folderId), exact: false });
    },
  });
}

export function useDeleteNode(folderId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNode(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: nodesPrefix(folderId), exact: false });
      const prev = qc.getQueryData<CoreNode[]>(nodesPrefix(folderId));
      qc.setQueryData(nodesPrefix(folderId), (old: CoreNode[] = []) =>
        old.filter((n) => n.id !== id)
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(nodesPrefix(folderId), ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: nodesPrefix(folderId), exact: false });
    },
  });
}
