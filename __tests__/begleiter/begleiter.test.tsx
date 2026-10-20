import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { b64uDecode, b64uEncode } from '@/lib/begleiter/api';
import { qrPath } from '@/lib/begleiter/qr';
import { subscribePush } from '@/lib/begleiter/push';

let params = new URLSearchParams();
let v2 = true;
jest.mock('next/navigation', () => ({ useSearchParams: () => params }));
jest.mock('@/lib/universe/morgen', () => ({ isUniverseV2Enabled: () => v2 }));

import BegleiterApp, { HoldButton, PLANET } from '@/components/begleiter/BegleiterApp';
import { PairPanel } from '@/components/begleiter/PairPanel';

describe('Begleiter – Bausteine', () => {
  it('base64url hin und zurück, ohne Padding', () => {
    const b = new Uint8Array([0, 251, 255, 1, 2]);
    const s = b64uEncode(b);
    expect(s).not.toMatch(/[+/=]/);
    expect(Array.from(b64uDecode(s))).toEqual(Array.from(b));
  });

  it('QR-Code ist ein echtes quadratisches Raster', () => {
    const q = qrPath('https://hq.saimor.world/begleiter?pair=abc');
    expect(q.size).toBeGreaterThanOrEqual(21);
    expect(q.d.length).toBeGreaterThan(100);
  });

  it('Push ohne Worker/Gerät: unsupported', async () => {
    expect((await subscribePush(null)).state).toBe('unsupported');
  });

  it('jede sichere Tat hat einen Planeten', () => {
    expect(PLANET['mora.note.create']).toBe('Planet Wissen');
  });
});

describe('Begleiter – Bildschirme', () => {
  beforeEach(() => { localStorage.clear(); v2 = true; });

  it('Flag aus: nichts sichtbar außer Hinweis', () => {
    v2 = false; params = new URLSearchParams();
    render(<BegleiterApp />);
    expect(screen.getByText(/eingeschaltet/)).toBeInTheDocument();
  });

  it('ungekoppelt: Anleitung statt Daten', () => {
    params = new URLSearchParams();
    render(<BegleiterApp />);
    expect(screen.getByText(/noch fremd/)).toBeInTheDocument();
  });

  it('mit Kopplungscode: Kopplungsbildschirm', () => {
    params = new URLSearchParams('pair=tok123');
    render(<BegleiterApp />);
    expect(screen.getByTestId('pair-btn')).toHaveTextContent('Mit Face ID verbinden');
    expect(screen.getByText(/2 Minuten/)).toBeInTheDocument();
  });

  it('gekoppelt: erst Face ID, dann Daten', () => {
    params = new URLSearchParams();
    localStorage.setItem('saimor.begleiter.device', JSON.stringify({ device_id: 'd', credential_id: 'c', name: 'iPhone' }));
    render(<BegleiterApp />);
    expect(screen.getByTestId('unlock-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('proposal-title')).toBeNull();
  });

  it('demo=1: Inbox mit denselben Begleiter-Vorschlägen, ohne Face ID', () => {
    params = new URLSearchParams('demo=1');
    render(<BegleiterApp />);
    expect(screen.getByTestId('begleiter')).toBeInTheDocument();
    expect(screen.getByText(/MÔRA braucht/)).toBeInTheDocument();
    expect(screen.getByTestId('proposal-title')).toHaveTextContent(/Atelier Nord/);
    expect(screen.getByTestId('hold-approve')).toHaveTextContent(/Halten zum Freigeben/);
  });
});

describe('Halten zum Freigeben', () => {
  it('kurzes Tippen löst nichts aus, Tastatur (Barrierefreiheit) schon', () => {
    const done = jest.fn();
    render(<HoldButton onDone={done}>Halten</HoldButton>);
    const b = screen.getByTestId('hold-approve');
    fireEvent.pointerDown(b); fireEvent.pointerUp(b);
    expect(done).not.toHaveBeenCalled();
    fireEvent.keyDown(b, { key: 'Enter' });
    expect(done).toHaveBeenCalledTimes(1);
  });
});

describe('PairPanel (Universe)', () => {
  afterEach(() => { (global as unknown as { fetch?: unknown }).fetch = undefined; });

  it('zeigt Geräte und erzeugt einen QR mit Countdown', async () => {
    const calls: string[] = [];
    (global as unknown as { fetch: unknown }).fetch = jest.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith('/devices')) return { ok: true, json: async () => [{ id: 'dev_1', name: 'iPhone', created_at: '', last_used_at: null, revoked_at: null }] };
      return { ok: true, json: async () => ({ token: 't', url: 'https://hq.saimor.world/begleiter?pair=t', expires_at: new Date(Date.now() + 120000).toISOString(), ttl_seconds: 120 }) };
    });
    render(<PairPanel />);
    expect(await screen.findByText('iPhone')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByTestId('pair-start')); });
    await waitFor(() => expect(screen.getByTestId('pair-qr')).toBeInTheDocument());
    expect(calls).toContain('POST /api/core/v3/begleiter/pair/start');
  });
});
