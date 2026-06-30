'use client';

import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';
import { describeMoraEngine, type MoraEngine } from '@/lib/mora/describeMoraEngine';

/**
 * Reads CORE's /v3/system/api-management and reduces it to the current Môra
 * engine (provider + model + residency). Returns null when unavailable (e.g.
 * the viewer lacks governance access) so the badge simply hides.
 */
export function useMoraEngine(): MoraEngine | null {
  const { data } = useQuery({
    queryKey: ['mora', 'engine'],
    queryFn: () => coreGet('/v3/system/api-management', { isOptional: true }),
    staleTime: 120_000,
    retry: false,
  });
  return describeMoraEngine(data ?? null);
}
