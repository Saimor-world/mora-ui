'use client';
import { useQuery } from '@tanstack/react-query';
import { coreGet, getCoreBaseUrl } from '@/lib/api/http';
import { useDataScopeKey } from '@/lib/store/dataScope';
import { useDemoStore, useScopeCompanyId } from '@/lib/demo/demoStore';
import { companyPath } from '@/lib/api/companyPath';

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

export function useSources(enabled: boolean) {
  const scope = useDataScopeKey();
  const company = useScopeCompanyId();
  const demo = useDemoStore((s) => s.demoCompanyId);
  return useQuery({
    queryKey: ['os', 'sources', scope],
    queryFn: async (): Promise<SourcesResponse> => {
      const result = await coreGet(companyPath('/v3/connections', company), { throwAuthErrors: true });
      if (!result || !Array.isArray(result.connections)) throw new Error('Quellenstatus nicht bestätigt');
      // An older CORE may ignore company_id. Never render its HQ provider list
      // as connections belonging to a selected demo workspace.
      if (demo && result.connections.length) throw new Error('CORE hat die Trennung des Demo-Arbeitsbereichs nicht bestätigt');
      return result;
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
