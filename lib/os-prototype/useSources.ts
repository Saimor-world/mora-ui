'use client';
import { useQuery } from '@tanstack/react-query';
import { coreGet, getCoreBaseUrl } from '@/lib/api/http';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useNavStore } from '@/lib/store/navStore';

/**
 * V1.6 Quellen aus CORE (`GET /v3/connections`).
 * Der Status kommt ausschließlich von CORE: connected | available | setup_required.
 * Demo-Konten bekommen von CORE bewusst eine leere Liste („boundary“).
 */
export type SourceStatus = 'connected' | 'available' | 'setup_required' | string;
export interface SourceField { name: string; label: string; type: string; required?: boolean; placeholder?: string; autocomplete?: string; default?: string; options?: Array<{ value: string; label: string }> }
export interface SourceAction { kind: 'oauth' | 'credentials' | string; provider: string; field_schema?: SourceField[]; note?: string }
export interface SourceEntry { id: string; label: string; group: string; status: SourceStatus; detail: string; source?: string; action?: SourceAction; account_hint?: string; capabilities?: string[] }
/** coreGet entpackt das v3-Envelope bereits ({data, meta} → data). */
export interface SourcesResponse { connections?: SourceEntry[]; boundary?: string }

export const SOURCE_GROUP_LABEL: Record<string, string> = {
  calendar: 'Kalender', cloud: 'Cloud-Dateien', mail: 'E-Mail', creator: 'Werkzeuge', payments: 'Zahlungen',
};

export const STATUS_LABEL: Record<string, string> = {
  connected: 'verbunden', available: 'bereit zum Verbinden', setup_required: 'Server-Einrichtung fehlt',
};

/** Pass the selected workspace to CORE for server-side authorization.
 * The mail connector itself remains user-owned; the query parameter is a
 * requested viewing context, not an ownership claim.
 */
export function connectionReadPath(companyId: string | null): string {
  return companyId ? `/v3/connections?company_id=${encodeURIComponent(companyId)}` : '/v3/connections';
}

export function useSources(enabled: boolean) {
  const tenant = useSessionStore((s) => s.user?.tenant_id ?? null);
  const userId = useSessionStore((s) => s.user?.id ?? null);
  const generation = useSessionStore((s) => s.sessionGeneration);
  const company = useNavStore((s) => s.activeCompanyId);
  return useQuery({
    // Never reuse one person's connector evidence after a principal/company switch.
    queryKey: ['os', 'sources', tenant, userId, generation, company],
    queryFn: async () => {
      const result: unknown = await coreGet(connectionReadPath(company), { throwAuthErrors: true });
      // coreGet can return null on network failure. Never convert that into a
      // successful empty connection list or a misleading demo state.
      if (!result || typeof result !== 'object' || !Array.isArray((result as SourcesResponse).connections)) {
        throw new Error('CORE hat keinen gültigen Quellenstatus geliefert.');
      }
      return result as SourcesResponse;
    },
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function connectedSources(list: SourceEntry[] | undefined): SourceEntry[] {
  return (list || []).filter((s) => s.status === 'connected');
}

/** Verbinden nur gegen einen lokalen CORE (nie Produktion aus dem Prototyp). */
export function isLocalCore(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  const base = getCoreBaseUrl();
  const localPage = host === 'localhost' || host === '127.0.0.1';
  const localBase = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(base);
  return localPage && localBase;
}
