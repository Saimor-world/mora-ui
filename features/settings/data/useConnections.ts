'use client';
import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';
import type { IntegrationsOverview } from '@/lib/hooks/useIntegrationsOverview';
import { useSessionStore } from '@/lib/store/sessionStore';

/** Same contract as the legacy Integrations app (/v3/integrations/overview), as React Query. */
export function useConnectionsOverview() {
  const tenant = useSessionStore((s) => s.user?.tenant_id ?? null);
  return useQuery({
    queryKey: ['os', 'settings', 'integrations-overview', tenant],
    queryFn: async () => (await coreGet('/v3/integrations/overview', { isOptional: true, throwAuthErrors: true })) as IntegrationsOverview | null,
    enabled: Boolean(tenant),
    staleTime: 60_000,
  });
}

export type ConnectionRow = { id: string; label: string; state: 'configured' | 'not_configured' | 'unknown'; detail?: string };

/** Only "eingerichtet" when CORE says configured — never "verbunden" by assumption. */
export function connectionRows(o: IntegrationsOverview | null | undefined): ConnectionRow[] {
  const row = (id: string, label: string, v?: { configured?: boolean; status?: string; provider?: string }): ConnectionRow => ({
    id, label,
    state: v?.configured === true ? 'configured' : v?.configured === false ? 'not_configured' : 'unknown',
    detail: [v?.provider, v?.status].filter(Boolean).join(' · ') || undefined,
  });
  return [
    row('mail', 'E-Mail', o?.mail),
    row('calendar', 'Kalender', o?.calendar),
    row('cloud', 'Cloud-Speicher', o?.cloud_storage),
    row('rss', 'Feeds', o?.rss),
    { id: 'assistant', label: 'MÔRA-Provider', state: o?.assistant ? ((o.assistant.healthy_provider_count ?? 0) > 0 ? 'configured' : 'not_configured') : 'unknown', detail: o?.assistant?.recommended_provider || undefined },
  ];
}
