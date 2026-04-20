import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from '@/lib/api/orgClient';
import { queryKeys, STALE_TIMES } from './queryKeys';

export function useDepartments(companyId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.departments(companyId),
    queryFn: () => fetchDepartments(companyId!),
    staleTime: STALE_TIMES.departments,
    refetchOnWindowFocus: false,
    enabled: !!companyId,
  });
}

export function useCreateDepartment(companyId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDepartmentPayload) => createDepartment(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.departments(companyId) });
      qc.invalidateQueries({ queryKey: queryKeys.tree(companyId) });
    },
  });
}

export function useUpdateDepartment(companyId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDepartmentPayload }) =>
      updateDepartment(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.departments(companyId) });
      qc.invalidateQueries({ queryKey: queryKeys.tree(companyId) });
    },
  });
}

export function useDeleteDepartment(companyId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.departments(companyId) });
      qc.invalidateQueries({ queryKey: queryKeys.tree(companyId) });
    },
  });
}
