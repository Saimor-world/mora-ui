import { useQuery } from '@tanstack/react-query';
import { fetchNightwatchMonitors } from '@/lib/api/nightwatchClient';
import { queryKeys, STALE_TIMES } from './queryKeys';

/** Cached Nightwatch monitors — shared by glance widget and Nightwatch app. */
export function useNightwatchMonitors() {
    return useQuery({
        queryKey: queryKeys.nightwatchMonitors(),
        queryFn: () => fetchNightwatchMonitors(),
        staleTime: STALE_TIMES.nightwatchIncidents,
        refetchOnWindowFocus: true,
        placeholderData: (previous) => previous,
    });
}
