'use client';
import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';
import { useDataScopeKey } from '@/lib/store/dataScope';
import { useDemoStore, useScopeCompanyId } from '@/lib/demo/demoStore';
import { companyPath } from '@/lib/api/companyPath';

/**
 * V1.8 MÔRA-Mail-Zusammenfassung aus CORE (`GET /v3/connections/mail/summary`).
 * Regelbasiert (keine KI), gebaut nur aus den Nachrichten, die beim verifizierten
 * Abruf in CORE gespeichert wurden. Jede Gruppe trägt Quellverweise.
 */
export interface MailRef { uid: string; message_id: string; subject: string; from: string; date: string }
export interface MailGroup { key: string; label: string; count: number; refs: MailRef[] }
export interface MailSummary {
  method: 'regelbasiert' | string;
  basis?: string;
  status: 'ok' | 'empty' | string;
  verified_at?: string | null;
  total: number;
  headline: string;
  groups: MailGroup[];
  other?: { count: number; refs: MailRef[] };
  source?: { provider?: string; account_hint?: string; dev_only?: boolean };
}

/** Antwort von `POST /v3/connections/{id}/connect`. */
export interface ConnectResult { status?: string; confirmed?: boolean; fetched?: number; verified_at?: string; dev_only?: boolean; provider?: string }

/**
 * Ehrliche Auswertung der Connect-Antwort. `null` heißt: CORE war nicht erreichbar
 * (corePost liefert dann null) – das ist ein Fehler, kein Erfolg. Für E-Mail zählt
 * nur `status: connected` UND `confirmed: true`.
 */
export function checkConnectResult(group: string, res: unknown): { ok: true } | { ok: false; reason: string } {
  if (res == null) return { ok: false, reason: 'CORE nicht erreichbar (keine Antwort).' };
  const r = res as ConnectResult;
  if (group === 'mail') {
    if (r.status === 'connected' && r.confirmed === true) return { ok: true };
    return { ok: false, reason: 'CORE hat die Verbindung nicht bestätigt.' };
  }
  if (r.status && /error|failed|invalid/i.test(r.status)) return { ok: false, reason: r.status };
  return { ok: true };
}

/** Neueste Referenz über alle Gruppen (das „erste echte Signal“). */
export function newestRef(s: MailSummary | null | undefined): MailRef | null {
  if (!s) return null;
  const all = [...s.groups.flatMap((g) => g.refs), ...(s.other?.refs || [])];
  return all.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))[0] ?? null;
}

/** Absender ohne Adresse: „Buchhaltung Musterlieferant <x@y>“ → „Buchhaltung Musterlieferant“. */
export function senderName(from: string): string {
  const m = /^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/.exec(from || '');
  return (m ? m[1] : from || '').trim();
}

export function useMailSummary(enabled: boolean) {
  const scope = useDataScopeKey();
  const company = useScopeCompanyId();
  const demo = useDemoStore((s) => s.demoCompanyId);
  return useQuery({
    queryKey: ['os', 'mail-summary', scope],
    queryFn: async (): Promise<MailSummary | null> => {
      const result = await coreGet(companyPath('/v3/connections/mail/summary', company), { throwAuthErrors: true });
      if (result == null) return null;
      if (!Array.isArray(result.groups) || typeof result.headline !== 'string' || !result.groups.every((g: MailGroup) => g && Array.isArray(g.refs))) throw new Error('Zusammenfassung nicht bestätigt');
      return result as MailSummary;
    },
    enabled: enabled && !demo,
    staleTime: 30_000,
    retry: false,
  });
}
