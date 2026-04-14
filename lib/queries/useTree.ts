import { useQuery } from '@tanstack/react-query';
import { fetchTree } from '@/lib/api/orgClient';
import { queryKeys, STALE_TIMES } from './queryKeys';

export function useTree(companyId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.tree(companyId),
    queryFn: () => fetchTree(undefined, companyId!),
    staleTime: STALE_TIMES.tree,
    refetchOnWindowFocus: false,
    enabled: !!companyId,
  });
}
