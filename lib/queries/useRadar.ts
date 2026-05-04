// lib/queries/useRadar.ts
// Polls /v3/mora/radar every 60 seconds and syncs results into radarStore.
// Uses useEffect on data (TanStack Query v5 pattern — onSuccess is v4-only).

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { coreGet } from '@/lib/api/http';
import { queryKeys, STALE_TIMES } from '@/lib/queries/queryKeys';
import { useRadarStore } from '@/lib/store/radarStore';

export function useRadar() {
  const { setNotifications } = useRadarStore();

  const query = useQuery({
    queryKey: queryKeys.radar(),
    queryFn: () => coreGet('/v3/mora/radar', { isOptional: true }),
    staleTime: STALE_TIMES.radar,
    refetchInterval: 60 * 1000, // 60 seconds polling
  });

  // v5 pattern: useEffect on data, not onSuccess
  useEffect(() => {
    if (query.data) {
      setNotifications(
        query.data.notifications ?? [],
        query.data.unread_count ?? 0,
      );
    }
  }, [query.data, setNotifications]);

  return query;
}
