'use client';

import { useQuery } from '@tanstack/react-query';
import { getSemanticEvents, isSemanticEnabled, type SemanticEvent } from '@/lib/api/semantic';
import { useHealthCheck } from './useApi';
import { getHealthFlags } from '@/lib/health';

/**
 * Hook: Semantic Events
 * Polls semantic events from Core API every 8 seconds
 * Only active when:
 * - NEXT_PUBLIC_ENABLE_SEMANTIC=true
 * - Core API is online
 */
export function useSemanticEvents(limit: number = 10) {
  const { data: health } = useHealthCheck();
  const { isOnline } = getHealthFlags(health?.status);

  return useQuery<SemanticEvent[]>({
    queryKey: ['semanticEvents', limit],
    queryFn: async ({ signal }) => {
      const response = await getSemanticEvents(signal, limit);
      return response?.events || [];
    },
    enabled: isSemanticEnabled() && isOnline,
    refetchInterval: 8000, // Poll every 8 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  });
}
