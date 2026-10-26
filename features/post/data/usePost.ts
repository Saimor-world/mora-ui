'use client';
import { useQuery } from '@tanstack/react-query';
import { coreGet, normalizeList } from '@/lib/api/http';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useScopeCompanyId } from '@/lib/demo/demoStore';
import { useDataScopeKey } from '@/lib/store/dataScope';
import { companyPath } from '@/lib/api/companyPath';

/** Same CORE contracts the legacy Mail / Calendar apps read — wrapped as React Query. */
export interface PostMessage { id: string; subject?: string; from_addr?: string; from?: string; date?: string; snippet?: string; body_text?: string; read?: boolean }
export interface PostEvent { id: string; title: string; date: string; time?: string; duration?: number }

/** null = CORE gave no answer (offline / not configured) — never shown as "empty". */
async function readList<T>(path: string, keys: string[]): Promise<T[] | null> {
  const data = await coreGet(path, { isOptional: true, throwAuthErrors: true });
  if (data == null) return null;
  return normalizeList<T>(data, keys);
}

export function usePostInbox() {
  const tenant = useSessionStore((s) => s.user?.tenant_id ?? null);
  const company = useScopeCompanyId();
  const scope = useDataScopeKey();
  return useQuery({
    queryKey: ['os', 'post', 'inbox', scope],
    queryFn: () => readList<PostMessage>(companyPath('/v3/mail/messages', company), ['messages', 'items', 'data']),
    enabled: Boolean(tenant && company),
    staleTime: 60_000,
  });
}

export function usePostCalendar() {
  const tenant = useSessionStore((s) => s.user?.tenant_id ?? null);
  const company = useScopeCompanyId();
  const scope = useDataScopeKey();
  return useQuery({
    queryKey: ['os', 'post', 'calendar', scope],
    queryFn: () => readList<PostEvent>(companyPath('/v3/calendar/events', company), ['events', 'appointments', 'calendar', 'data']),
    enabled: Boolean(tenant && company),
    staleTime: 60_000,
  });
}
