import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  CreateFolderPayload,
  UpdateFolderPayload,
} from '@/lib/api/orgClient';
import { queryKeys, STALE_TIMES } from './queryKeys';

export function useFolders(spaceId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.folders(spaceId),
    queryFn: () => fetchFolders(spaceId!),
    staleTime: STALE_TIMES.folders,
    refetchOnWindowFocus: false,
    enabled: !!spaceId,
  });
}

export function useCreateFolder(spaceId: string | null | undefined, companyId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFolderPayload) => createFolder(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.folders(spaceId) });
      qc.invalidateQueries({ queryKey: queryKeys.tree(companyId) });
    },
  });
}

export function useUpdateFolder(spaceId: string | null | undefined, companyId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFolderPayload }) =>
      updateFolder(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.folders(spaceId) });
      qc.invalidateQueries({ queryKey: queryKeys.tree(companyId) });
    },
  });
}

export function useDeleteFolder(spaceId: string | null | undefined, companyId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.folders(spaceId) });
      qc.invalidateQueries({ queryKey: queryKeys.tree(companyId) });
    },
  });
}
