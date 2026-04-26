import { corePost } from '@/lib/api/http';
import type { PerceptionBundle, PerceptionRequest } from '@/lib/types/perception';

/**
 * Fetch the canonical PerceptionBundle from CORE.
 *
 * @param req — request hints (all optional). See spec §2.1.
 * @throws on HTTP error (caller catches and decides fallback strategy).
 */
export async function fetchPerception(req: PerceptionRequest): Promise<PerceptionBundle> {
  return corePost('/v3/mora/perceive', req) as Promise<PerceptionBundle>;
}
