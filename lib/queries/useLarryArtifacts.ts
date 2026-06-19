import { useQuery } from '@tanstack/react-query';
import { fetchLarryArtifacts } from '@/lib/api/larryClient';
import { queryKeys, STALE_TIMES } from './queryKeys';

export function useLarryArtifacts(companyId: string | null | undefined, limit = 12) {
    return useQuery({
        queryKey: queryKeys.larryArtifacts(companyId, limit),
        queryFn: () => fetchLarryArtifacts(companyId, limit),
        staleTime: STALE_TIMES.larryArtifacts,
        refetchOnWindowFocus: true,
        enabled: !!companyId,
    });
}
