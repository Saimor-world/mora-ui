import { useQuery } from '@tanstack/react-query';
import { fetchPerception } from '@/lib/api/perceptionClient';
import { queryKeys, STALE_TIMES } from './queryKeys';
import type { PerceptionBundle, PerceptionRequest } from '@/lib/types/perception';

/**
 * useMoraPerception
 *
 * Fetches the canonical PerceptionBundle from CORE. Cached 30s
 * (spec §2.2). Invalidation patterns:
 *  - Navigation changes → bump the query key part by passing fresh `query`
 *    or active_pane shape from caller.
 *  - Tool execution → invalidateQueries({ queryKey: ['perception'] }).
 *  - Pane focus → caller may pass active_pane to vary the key.
 *
 * In v1 we use a simple JSON-key strategy: the request body becomes the
 * query key suffix. This means changing query/active_pane fetches a fresh
 * bundle. Empty request → key is `["perception","{}"]`.
 *
 * See: docs/superpowers/specs/2026-04-25-real-mora-design.md §2.2
 */
export function useMoraPerception(req: PerceptionRequest = {}) {
  const key = JSON.stringify(req);
  return useQuery<PerceptionBundle>({
    queryKey: queryKeys.perception(key),
    queryFn: () => fetchPerception(req),
    staleTime: STALE_TIMES.perception,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
