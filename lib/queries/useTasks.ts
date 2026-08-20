import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';
import { normalizeList } from '@/lib/api/http';
import { queryKeys, STALE_TIMES } from './queryKeys';

export type BusinessTask = {
  id: string;
  title: string;
  status: 'backlog' | 'in_progress' | 'done' | string;
  priority?: 'low' | 'medium' | 'high' | string;
  due_date?: string;
};

export function useTasks(companyId?: string | null) {
  return useQuery<BusinessTask[]>({
    queryKey: queryKeys.tasks(companyId),
    queryFn: async () => {
      const query = companyId ? `?company_id=${encodeURIComponent(companyId)}` : '';
      const payload = await coreGet(`/v3/tasks${query}`, { isOptional: true });
      return normalizeList<BusinessTask>(payload, ['tasks', 'items', 'data']);
    },
    enabled: Boolean(companyId),
    staleTime: STALE_TIMES.tasks,
    refetchOnWindowFocus: true,
  });
}