'use client';
import { useQuery } from '@tanstack/react-query';

export type CoreHealth =
  | { state: 'online'; build: string | null; environment: string | null }
  | { state: 'offline'; build: null; environment: null };

export async function fetchCoreHealth(fetcher: typeof fetch = fetch): Promise<CoreHealth> {
  try {
    const res = await fetcher('/api/core/health', { cache: 'no-store' });
    if (!res.ok) return { state: 'offline', build: null, environment: null };
    const body = await res.json().catch(() => ({}));
    const build = typeof body?.build === 'string' ? body.build
      : typeof body?.build?.git === 'string' ? body.build.git
      : typeof body?.build?.sha === 'string' ? body.build.sha
      : typeof body?.version === 'string' ? body.version : null;
    return { state: 'online', build, environment: typeof body?.environment === 'string' ? body.environment : null };
  } catch {
    return { state: 'offline', build: null, environment: null };
  }
}

/** Shell-level CORE reachability (server state → React Query). */
export function useCoreHealth() {
  return useQuery({ queryKey: ['os', 'core-health'], queryFn: () => fetchCoreHealth(), staleTime: 60_000, refetchInterval: 120_000, retry: 0 });
}
