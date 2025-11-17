'use client';

import { useQuery } from '@tanstack/react-query';
import { getMindloopSynthesis, type MindloopSynthesisResponse } from '@/lib/api/mindloop';
import { isSemanticEnabled } from '@/lib/api/semantic';
import { useHealthCheck } from './useApi';
import { getHealthFlags } from '@/lib/health';

type UseMindloopOptions = {
  enabled?: boolean;
};

export function useMindloopSynthesis(options?: UseMindloopOptions) {
  const { data: health } = useHealthCheck();
  const { isOnline } = getHealthFlags(health?.status);
  const allow = options?.enabled ?? true;

  const query = useQuery<MindloopSynthesisResponse | null>({
    queryKey: ['mindloopSynthesis'],
    queryFn: async ({ signal }) => getMindloopSynthesis(signal),
    enabled: isSemanticEnabled() && isOnline && allow,
    refetchInterval: 8000,
    staleTime: 5000,
  });

  return {
    items: query.data?.items ?? [],
    summary: query.data?.summary,
    isLoading: query.isLoading,
    error: query.error,
  };
}
