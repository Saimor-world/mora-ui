'use client';
import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';

export interface PostMessage { id: string; subject?: string; from_addr?: string; from?: string; date?: string; snippet?: string; read?: boolean }
export interface PostEvent { id: string; title: string; date: string; time?: string; duration?: number }

/** Only an actual array or a known list field is an observed (possibly empty) list.
 * normalizeList returns [] for unknown payloads and must not be used for
 * authoritative "nothing received" statements.
 */
export function parsePostList<T>(value: unknown, keys: readonly string[]): T[] | null {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (['error', 'unavailable', 'disconnected', 'partial', 'stale'].includes(String(record.status || '').toLowerCase())) return null;
  for (const key of keys) if (Array.isArray(record[key])) return record[key] as T[];
  return null;
}

export type PostSourceState = 'stale' | 'partial' | 'disconnected' | 'unavailable';

export class PostSourceFailure extends Error {
  constructor(
    public readonly state: PostSourceState,
    public readonly asOf: string | null,
  ) {
    super('CORE source is ' + state);
    this.name = 'PostSourceFailure';
  }
}

/** Preserve the provider's explicit degraded status, never silently map to []. */
export function postSourceFailure(raw: unknown): PostSourceFailure | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;
  const state = v.status;
  if (state !== 'stale' && state !== 'partial' && state !== 'disconnected' && state !== 'unavailable') return null;
  return new PostSourceFailure(state, typeof v.as_of === 'string' ? v.as_of : null);
}

async function readList<T>(path: string, keys: string[]): Promise<T[] | null> {
  const data: unknown = await coreGet(path, { isOptional: true, throwAuthErrors: true });
  const failure = postSourceFailure(data);
  if (failure) throw failure;
  return parsePostList<T>(data, keys);
}

/** A company switch or a new login invalidates both the request and the cache
 * identity. CORE enforces the company_id; the UI never assumes authorization.
 */
function usePostScope() {
  const tenant = useSessionStore((s) => s.user?.tenant_id ?? null);
  const userId = useSessionStore((s) => s.user?.id ?? null);
  const profileCompany = useSessionStore((s) => s.user?.active_company_id ?? null);
  const generation = useSessionStore((s) => s.sessionGeneration);
  const selectedCompany = useNavStore((s) => s.activeCompanyId);
  return { tenant, userId, generation, companyId: selectedCompany || profileCompany };
}

export function usePostInbox(enabled = true) {
  const scope = usePostScope();
  return useQuery({
    queryKey: ['os', 'post', 'inbox', scope.tenant, scope.userId, scope.generation, scope.companyId],
    queryFn: () => readList<PostMessage>(`/v3/mail/messages?company_id=${encodeURIComponent(scope.companyId!)}`, ['messages', 'items', 'data']),
    enabled: enabled && Boolean(scope.tenant && scope.userId && scope.companyId),
    staleTime: 60_000,
    retry: false,
  });
}

export function usePostCalendar(enabled = true) {
  const scope = usePostScope();
  return useQuery({
    queryKey: ['os', 'post', 'calendar', scope.tenant, scope.userId, scope.generation, scope.companyId],
    queryFn: () => readList<PostEvent>(`/v3/calendar/events?company_id=${encodeURIComponent(scope.companyId!)}`, ['events', 'appointments', 'calendar', 'data']),
    enabled: enabled && Boolean(scope.tenant && scope.userId && scope.companyId),
    staleTime: 60_000,
    retry: false,
  });
}
