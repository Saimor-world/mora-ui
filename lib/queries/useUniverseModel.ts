import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';
import type { UniverseModel } from '@/lib/universe/planetModel';

/** CORE /v3/universe – Planeten-Modell v1. Fehlt der Endpunkt (alter CORE), bleibt das alte Feld. */
export function useUniverseModel(companyId: string | null | undefined) {
  return useQuery<UniverseModel | null>({
    queryKey: ['universe-model', companyId ?? null],
    queryFn: async () => {
      const res = await coreGet(`/v3/universe${companyId ? `?company_id=${encodeURIComponent(companyId)}` : ''}`, { isOptional: true });
      const data = (res && (res.data ?? res)) as UniverseModel | null;
      return data && Array.isArray(data.planets) ? data : null;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
    enabled: !!companyId,
  });
}
