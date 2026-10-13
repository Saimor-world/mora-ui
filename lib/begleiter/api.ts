// Begleiter – Handy ↔ Universe. Spricht CORE über den bestehenden Proxy /api/core/v3/begleiter/*.
export const BASE = '/api/core/v3/begleiter';

export type Proposal = { id: string; label: string; reason?: string; sources?: string[]; undo?: string; risk?: string; tool?: string; created_at?: string };
export type Device = { id: string; name: string; created_at: string; last_used_at: string | null; revoked_at: string | null };
export type StoredDevice = { device_id: string; credential_id: string; name: string };
export type Decision = { id: string; status: string; execution?: { verified: boolean; check?: string }; result?: Record<string, unknown> };
export type Purpose = 'inbox' | 'approve' | 'reject';

const LS = 'saimor.begleiter.device';

export function b64uEncode(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  b.forEach((x) => { s += String.fromCharCode(x); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64uDecode(s: string): Uint8Array<ArrayBuffer> {
  const p = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(p);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function loadDevice(): StoredDevice | null {
  try { const v = localStorage.getItem(LS); return v ? (JSON.parse(v) as StoredDevice) : null; } catch { return null; }
}
export function saveDevice(d: StoredDevice | null) {
  if (d) localStorage.setItem(LS, JSON.stringify(d)); else localStorage.removeItem(LS);
}

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((body as { detail?: string }).detail || `Fehler ${r.status}`);
  return body as T;
}

// Universe-Seite (eingeloggt)
export const startPairing = () => j<{ token: string; url: string; expires_at: string; ttl_seconds: number }>('/pair/start', { method: 'POST' });
export const listDevices = () => j<Device[]>('/devices');
export const revokeDevice = (id: string) => j<Device>(`/devices/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Handy-Seite: Passkey anlegen und koppeln
export async function pairThisPhone(token: string, name: string): Promise<StoredDevice> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Saimôr', id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'Saimôr Begleiter', displayName: name },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      authenticatorSelection: { userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('Kein Passkey angelegt');
  const resp = cred.response as AuthenticatorAttestationResponse;
  const spki = resp.getPublicKey?.();
  if (!spki) throw new Error('Dieses Gerät liefert keinen öffentlichen Schlüssel');
  const credential_id = b64uEncode(cred.rawId);
  const out = await j<{ device_id: string; name: string }>('/pair/complete', {
    method: 'POST', body: JSON.stringify({ token, device_name: name, credential_id, public_key: b64uEncode(spki), alg: -7 }),
  });
  const dev = { device_id: out.device_id, credential_id, name: out.name };
  saveDevice(dev);
  return dev;
}

// Jede Handlung: Challenge holen → Face ID → signierte Assertion
async function signed(dev: StoredDevice, purpose: Purpose, proposalId?: string) {
  const ch = await j<{ challenge_id: string; challenge: string; rp_id: string }>('/challenge', {
    method: 'POST', body: JSON.stringify({ device_id: dev.device_id, purpose, proposal_id: proposalId }),
  });
  const a = (await navigator.credentials.get({
    publicKey: {
      challenge: b64uDecode(ch.challenge), rpId: ch.rp_id, userVerification: 'required', timeout: 60000,
      allowCredentials: [{ type: 'public-key', id: b64uDecode(dev.credential_id) }],
    },
  })) as PublicKeyCredential | null;
  if (!a) throw new Error('Face ID abgebrochen');
  const r = a.response as AuthenticatorAssertionResponse;
  return {
    device_id: dev.device_id, challenge_id: ch.challenge_id, credential_id: b64uEncode(a.rawId),
    authenticator_data: b64uEncode(r.authenticatorData), client_data_json: b64uEncode(r.clientDataJSON), signature: b64uEncode(r.signature),
  };
}

export async function openInbox(dev: StoredDevice) {
  return j<{ device: string; proposals: Proposal[] }>('/inbox', { method: 'POST', body: JSON.stringify(await signed(dev, 'inbox')) });
}

export async function decide(dev: StoredDevice, proposalId: string, decision: 'approve' | 'reject') {
  const a = await signed(dev, decision, proposalId);
  return j<Decision>('/decide', { method: 'POST', body: JSON.stringify({ ...a, decision }) });
}
