'use client';
import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';

export interface HorizonMail { status: 'ok' | 'unavailable'; items: { id: string; subject: string; from?: string }[] }
export interface HorizonFeed { status: 'ok' | 'unavailable'; items: { id: string; title: string; source?: string }[] }
export interface HorizonSource { key: string; label: string; state: 'connected' | 'empty'; sources: string[] }

function arr(raw: unknown, keys: string[]): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (raw && typeof raw === 'object') for (const k of keys) { const v = (raw as Record<string, unknown>)[k]; if (Array.isArray(v)) return v as Record<string, unknown>[]; }
  return [];
}

/** Systemplaneten, die Kund:innen nicht sehen (Finanzen, Wache: intern). */
const HIDDEN_FOR_CUSTOMERS = new Set(['system:finanzen', 'system:wache']);

/**
 * Horizont-Quellen aus bestehenden CORE-Endpunkten: GET /v3/mail/messages,
 * GET /v3/integrations/rss/items, GET /v3/universe (Systemplaneten = Quellen-Ring).
 * null von CORE heißt „nicht lesbar“, nie „leer“.
 */
export function useHorizonSources(companyId: string | null, enabled: boolean) {
  const on = enabled && Boolean(companyId);
  const q = `company_id=${encodeURIComponent(companyId ?? '')}`;
  const mail = useQuery({
    queryKey: ['lea-world', 'mail', companyId], enabled: on, staleTime: 60_000,
    queryFn: async (): Promise<HorizonMail> => {
      const raw = await coreGet(`/v3/mail/messages?${q}&limit=5`, { isOptional: true });
      if (raw == null) return { status: 'unavailable', items: [] };
      return { status: 'ok', items: arr(raw, ['messages', 'items']).map((m, i) => ({ id: String(m.id ?? i), subject: String(m.subject ?? '(ohne Betreff)'), from: m.from ? String(m.from) : undefined })) };
    },
  });
  const feed = useQuery({
    queryKey: ['lea-world', 'feed', companyId], enabled: on, staleTime: 60_000,
    queryFn: async (): Promise<HorizonFeed> => {
      const raw = await coreGet(`/v3/integrations/rss/items?limit=5&${q}`, { isOptional: true });
      if (raw == null) return { status: 'unavailable', items: [] };
      return { status: 'ok', items: arr(raw, ['items']).map((m, i) => ({ id: String(m.id ?? m.link ?? i), title: String(m.title ?? 'Eintrag'), source: m.source ? String(m.source) : undefined })) };
    },
  });
  const sources = useQuery({
    queryKey: ['lea-world', 'sources', companyId], enabled: on, staleTime: 120_000,
    queryFn: async (): Promise<HorizonSource[] | null> => {
      const raw = await coreGet(`/v3/universe?${q}`, { isOptional: true }) as { planets?: { key?: string; label?: string; kind?: string; moons?: { key?: string; label?: string; status?: string }[] }[] } | null;
      if (!raw) return null;
      return (raw.planets ?? [])
        .filter((p) => p.kind === 'system' && p.key && !HIDDEN_FOR_CUSTOMERS.has(p.key))
        .map((p) => {
          const src = (p.moons ?? []).filter((m) => String(m.key ?? '').startsWith('source:') && m.status !== 'disconnected');
          return { key: p.key!, label: p.label ?? p.key!, state: src.length ? 'connected' : 'empty', sources: src.map((m) => m.label ?? '') };
        });
    },
  });
  return { mail: mail.data ?? null, feed: feed.data ?? null, sources: sources.data ?? null };
}
