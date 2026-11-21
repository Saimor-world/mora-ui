'use client';
import { useQuery } from '@tanstack/react-query';
import { coreGet, normalizeList } from '@/lib/api/http';
import { useDemoScopeActive } from '@/lib/demo/demoSourceGuard';
import { useScopeCompanyId } from '@/lib/demo/demoStore';
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
  const user = useSessionStore((s) => s.user?.id);
  const demo = useDemoScopeActive();
  return useQuery({
    queryKey: ['os', 'post', 'inbox', tenant, user, demo],
    // Demo-Bühne: kein echtes Postfach.
    queryFn: () => (demo ? Promise.resolve<PostMessage[]>([]) : readList<PostMessage>('/v3/mail/messages', ['messages', 'items', 'data'])),
    enabled: Boolean(tenant),
    staleTime: 60_000,
  });
}

export function usePostCalendar() {
  const tenant = useSessionStore((s) => s.user?.tenant_id ?? null);
  const user = useSessionStore((s) => s.user?.id);
  const demo = useDemoScopeActive();
  return useQuery({
    queryKey: ['os', 'post', 'calendar', tenant, user, demo],
    queryFn: () => demo ? Promise.resolve<PostEvent[]>([]) : readList<PostEvent>('/v3/calendar/events', ['events', 'appointments', 'calendar', 'data']),
    enabled: Boolean(tenant),
    staleTime: 60_000,
  });
}

export function useOriginalMail(id: string | null, live: boolean) {
  const user = useSessionStore(s => s.user);
  const company = useScopeCompanyId();
  return useQuery({
    queryKey: ['os', 'post', 'original', user?.tenant_id, user?.id, company, id],
    enabled: Boolean(live && id && user?.tenant_id && user.id),
    retry: false,
    queryFn: async (): Promise<PostMessage> => {
      if (!id) throw new Error('Nachrichtenkennung fehlt');
      const mail = await coreGet(`/v3/mail/messages/${encodeURIComponent(id)}`, { throwAuthErrors: true });
      if (!mail || mail.id !== id) throw new Error('Originalmail nicht verfügbar');
      return mail;
    },
  });
}
