import { useQuery } from '@tanstack/react-query';
import { fetchCompanies } from '@/lib/api/orgClient';
import { queryKeys, STALE_TIMES } from './queryKeys';

interface UseCompaniesOptions {
  enabled?: boolean;
  includeDemo?: boolean;
}

export function useCompanies(options?: UseCompaniesOptions) {
  return useQuery({
    queryKey: [...queryKeys.companies(), options?.includeDemo],
    queryFn: () => fetchCompanies(options?.includeDemo),
    staleTime: STALE_TIMES.companies,
    refetchOnWindowFocus: false,
    enabled: options?.enabled !== false,
  });
}
