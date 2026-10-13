// Begleiter – Universe-Seite der Kopplung. Gleicher Vertrag wie PR #118 (lib/begleiter/api.ts):
// CORE über den bestehenden Proxy /api/core/v3/begleiter/*. Wird mit #118 durch dessen api.ts ersetzt.
export const BEGLEITER_BASE = '/api/core/v3/begleiter';

export type BegleiterDevice = { id: string; name: string; created_at: string; last_used_at: string | null; revoked_at: string | null };
export type PairStart = { token: string; url: string; expires_at: string; ttl_seconds: number };

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BEGLEITER_BASE}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((body as { detail?: string }).detail || `Fehler ${r.status}`);
  return body as T;
}

export const startPairing = () => j<PairStart>('/pair/start', { method: 'POST' });
export const listDevices = () => j<BegleiterDevice[]>('/devices');
export const revokeDevice = (id: string) => j<BegleiterDevice>(`/devices/${encodeURIComponent(id)}`, { method: 'DELETE' });
