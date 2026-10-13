/**
 * Universe v2 – echte Freigabe über CORE.
 * Zwei Wege, die es in CORE gibt:
 *  - Universe-Vorschläge (PR #113): POST /v3/universe/proposals/{id}/approve|reject
 *  - Bestätigungspflichtige Aktionen: POST /v3/actions/confirm|reject (confirm_token)
 * Freigeben ist nur möglich, wenn CORE ausdrücklich einen verifizierten
 * Ausführungsweg meldet (execution.verified === true). Sonst bleibt der Knopf aus.
 */
import { corePost } from '@/lib/api/coreClient';

export type Approvable = {
  id: string;
  confirm_token?: string;
  confirmation_token?: string;
  execution?: { verified?: boolean; endpoint?: string };
};

export type ApproveOutcome =
  | { state: 'done'; verified: boolean; detail?: string }
  | { state: 'rejected' }
  | { state: 'failed'; detail: string };

const ALLOWED = /^\/v3\/(universe\/proposals\/[\w-]+\/approve|actions\/confirm)$/;

export function approvalEndpoint(p: Approvable): string | null {
  if (p.execution?.verified !== true) return null;
  const ep = p.execution.endpoint;
  if (ep && ALLOWED.test(ep)) return ep;
  if (p.confirm_token || p.confirmation_token) return '/v3/actions/confirm';
  if (/^uv_[\w]+$/.test(p.id)) return `/v3/universe/proposals/${p.id}/approve`;
  return null;
}

export function canApprove(p: Approvable | null | undefined): boolean {
  return !!p && approvalEndpoint(p) !== null;
}

export function readOutcome(raw: unknown): ApproveOutcome {
  const r = (raw && typeof raw === 'object' && 'data' in (raw as object) ? (raw as { data: unknown }).data : raw) as Record<string, any> | null;
  if (!r || typeof r !== 'object') return { state: 'failed', detail: 'Keine Antwort von CORE.' };
  if (r.status === 'rejected') return { state: 'rejected' };
  if (r.status === 'failed' || r.result?.ok === false || r.success === false) {
    return { state: 'failed', detail: String(r.result?.error || r.error || r.message || 'Ausführung fehlgeschlagen.') };
  }
  if (r.status === 'done' || r.status === 'executed' || r.status === 'confirmed' || r.success === true || r.result?.ok === true) {
    return { state: 'done', verified: r.result?.verified === true || r.verified === true };
  }
  return { state: 'failed', detail: 'CORE hat den Ausgang nicht bestätigt.' };
}

export async function approve(p: Approvable): Promise<ApproveOutcome> {
  const ep = approvalEndpoint(p);
  if (!ep) return { state: 'failed', detail: 'Kein verifizierter Ausführungsweg.' };
  try {
    const token = p.confirm_token || p.confirmation_token;
    const raw = await corePost(ep, ep === '/v3/actions/confirm' ? { confirm_token: token } : {});
    return readOutcome(raw);
  } catch (e) {
    return { state: 'failed', detail: e instanceof Error && e.message ? e.message : 'CORE nicht erreichbar.' };
  }
}

export function approveLabel(o: ApproveOutcome): string {
  if (o.state === 'done') return o.verified ? 'Ausgeführt und geprüft.' : 'Ausgeführt – Ergebnis noch nicht bestätigt.';
  if (o.state === 'rejected') return 'Abgelehnt.';
  return `Nicht ausgeführt: ${o.detail}`;
}
