import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSpaces,
  createSpace,
  updateSpace,
  deleteSpace,
  CreateSpacePayload,
  UpdateSpacePayload,
} from '@/lib/api/orgClient';
import { queryKeys, STALE_TIMES } from './queryKeys';

export function useSpaces(departmentId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.spaces(departmentId),
    queryFn: () => fetchSpaces(departmentId!),
    staleTime: STALE_TIMES.spaces,
    refetchOnWindowFocus: false,
    enabled: !!departmentId,
  });
}

export function useCreateSpace(departmentId: string | null | undefined, companyId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSpacePayload) => createSpace(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.spaces(departmentId) });
      qc.invalidateQueries({ queryKey: queryKeys.tree(companyId) });
    },
  });
}

export function useUpdateSpace(departmentId: string | null | undefined, companyId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSpacePayload }) =>
      updateSpace(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.spaces(departmentId) });
      qc.invalidateQueries({ queryKey: queryKeys.tree(companyId) });
    },
  });
}

export function useDeleteSpace(departmentId: string | null | undefined, companyId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSpace(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.spaces(departmentId) });
      qc.invalidateQueries({ queryKey: queryKeys.tree(companyId) });
    },
  });
}
