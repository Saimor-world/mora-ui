import { useQuery } from '@tanstack/react-query';
import { fetchAllNightwatchIncidents, fetchNightwatchIncidents } from '@/lib/api/nightwatchClient';
import { queryKeys, STALE_TIMES } from './queryKeys';

/** Cached Nightwatch incidents — survives Home ↔ Universe widget remounts. */
export function useNightwatchIncidents(includeResolved = true) {
    return useQuery({
        queryKey: queryKeys.nightwatchIncidents(includeResolved),
        queryFn: () => includeResolved ? fetchAllNightwatchIncidents() : fetchNightwatchIncidents(),
        staleTime: STALE_TIMES.nightwatchIncidents,
        refetchOnWindowFocus: true,
        placeholderData: (previous) => previous,
    });
}
