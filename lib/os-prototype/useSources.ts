'use client';
import { useQuery } from '@tanstack/react-query';
import { coreGet, getCoreBaseUrl } from '@/lib/api/http';

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
  return useQuery({
    queryKey: ['os', 'sources'],
    queryFn: async () => (await coreGet('/v3/connections', { throwAuthErrors: true })) as SourcesResponse,
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
