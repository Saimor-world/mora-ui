import { CoreError } from '@/lib/api/http';

/**
 * Shared classification of why a CORE read did not produce data.
 * Every new surface maps a failed/empty query onto exactly one of these, so
 * the UI never shows "connected" or "0 €" when the truth is "we don't know".
 */
export type CoreFailureKind =
  | 'offline'             // network / proxy could not reach CORE (or returned nothing)
  | 'unauthenticated'     // 401 — no confirmed session
  | 'denied'              // 403 — role/tenant not allowed
  | 'contract_missing'    // 404 — the endpoint is not deployed on this CORE build
  | 'backend_error';      // 5xx / unexpected

export function classifyCoreFailure(error: unknown): CoreFailureKind {
  if (error instanceof CoreError) {
    if (error.status === 401) return 'unauthenticated';
    if (error.status === 403) return 'denied';
    if (error.status === 404 || error.status === 405) return 'contract_missing';
    if (error.status === 502 || error.status === 503 || error.status === 504) return 'offline';
    return 'backend_error';
  }
  // coreRequest returns null on network errors; callers convert that into a
  // plain Error ("... is unavailable"), which we treat as offline.
  return 'offline';
}
