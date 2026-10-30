import React from 'react';
import { useQuery, QueryClient, QueryClientContext } from '@tanstack/react-query';
import { fetchAllNightwatchIncidents, fetchNightwatchIncidents } from '@/lib/api/nightwatchClient';
import { queryKeys, STALE_TIMES } from './queryKeys';

const fallbackQueryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
    },
});

/** Cached Nightwatch incidents — survives Home ↔ Universe widget remounts. */
export function useNightwatchIncidents(includeResolved = true) {
    const client = React.useContext(QueryClientContext) || fallbackQueryClient;
    return useQuery({
        queryKey: queryKeys.nightwatchIncidents(includeResolved),
        queryFn: () => includeResolved ? fetchAllNightwatchIncidents() : fetchNightwatchIncidents(),
        staleTime: STALE_TIMES.nightwatchIncidents,
        refetchOnWindowFocus: true,
        placeholderData: (previous) => previous,
    }, client);
}
