'use client';
import { useQuery } from '@tanstack/react-query';
import { coreGet, normalizeList } from '@/lib/api/http';
import { capturePersonalSourceScope, useDemoScopeActive, usePersonalSourceKey } from '@/lib/demo/demoSourceGuard';
import { useSessionStore } from '@/lib/store/sessionStore';

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
  const demo = useDemoScopeActive();
  const identity = usePersonalSourceKey();
  return useQuery({
    queryKey: ['os', 'post', 'inbox', tenant, demo, identity],
    // Demo-Bühne: kein echtes Postfach.
    queryFn: async () => {
      if (demo) return [] as PostMessage[];
      const current = capturePersonalSourceScope(identity);
      if (!current()) return null;
      const data = await readList<PostMessage>('/v3/mail/messages', ['messages', 'items', 'data']);
      return current() ? data : null;
    },
    enabled: Boolean(tenant),
    staleTime: 60_000,
  });
}

export function usePostCalendar() {
  const tenant = useSessionStore((s) => s.user?.tenant_id ?? null);
  const demo = useDemoScopeActive();
  const identity = usePersonalSourceKey();
  return useQuery({
    queryKey: ['os', 'post', 'calendar', tenant, demo, identity],
    queryFn: async () => {
      if (demo) return [] as PostEvent[];
      const current = capturePersonalSourceScope(identity);
      if (!current()) return null;
      const data = await readList<PostEvent>('/v3/calendar/events', ['events', 'appointments', 'calendar', 'data']);
      return current() ? data : null;
    },
    enabled: Boolean(tenant),
    staleTime: 60_000,
  });
}
