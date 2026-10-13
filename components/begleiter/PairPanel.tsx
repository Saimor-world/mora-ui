'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '@/lib/begleiter/api';
import { qrPath } from '@/lib/begleiter/qr';
import type { Device } from '@/lib/begleiter/api';

// Universe → Einstellungen → Handy verbinden. Nur hinter NEXT_PUBLIC_UNIVERSE_V2 eingebunden.
export function PairPanel() {
  const [pair, setPair] = useState<{ url: string; expires_at: string } | null>(null);
  const [left, setLeft] = useState(0);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => { api.listDevices().then(setDevices).catch(() => setDevices(null)); }, []);
  useEffect(load, [load]);
  useEffect(() => {
    if (!pair) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((new Date(pair.expires_at).getTime() - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { setPair(null); load(); }
    }, 500);
    return () => clearInterval(t);
  }, [pair, load]);

  const qr = useMemo(() => (pair ? qrPath(pair.url) : null), [pair]);
  const start = async () => {
    setErr(null);
    try { const p = await api.startPairing(); setPair(p); setLeft(p.ttl_seconds); } catch (e) { setErr(e instanceof Error ? e.message : 'CORE nicht erreichbar'); }
  };
  const active = (devices ?? []).filter((d) => !d.revoked_at);

  return (
    <div data-testid="pair-panel" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 40, alignItems: 'start', padding: '8px 4px' }}>
      <div>
        <div style={{ font: "11px 'Space Mono', monospace", letterSpacing: '.18em', color: '#D6A848', textTransform: 'uppercase' }}>Begleiter</div>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, lineHeight: 1.08, color: '#F7F4E9', margin: '14px 0 0', fontWeight: 400 }}>
          Dein Handy als <i style={{ color: '#D6A848' }}>Schlüssel.</i>
        </h3>
        <p style={{ color: 'rgba(247,244,233,.6)', fontSize: 14, lineHeight: 1.6, marginTop: 14, maxWidth: 420 }}>
          Unterwegs gibst du MÔRAs Vorschläge mit Face ID frei. Jede Freigabe wird vom Handy einzeln unterschrieben. Wallet und öffentliche Beiträge sind vom Handy aus gesperrt.
        </p>
        <div style={{ height: 1, background: 'rgba(214,168,72,.22)', margin: '24px 0 14px' }} />
        <div style={{ font: "11px 'Space Mono', monospace", letterSpacing: '.18em', color: 'rgba(247,244,233,.5)', textTransform: 'uppercase' }}>
          Verbundene Geräte · {devices === null ? '–' : active.length}
        </div>
        {devices === null && <p style={{ color: 'rgba(247,244,233,.45)', fontSize: 13, marginTop: 10 }}>Nicht verbunden mit CORE.</p>}
        {devices !== null && active.length === 0 && <p style={{ color: 'rgba(247,244,233,.45)', fontSize: 13, marginTop: 10 }}>Noch kein Handy verbunden.</p>}
        {active.map((d) => (
          <div key={d.id} data-testid="device-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(247,244,233,.08)' }}>
            <div>
              <div style={{ color: '#F7F4E9', fontSize: 15 }}>{d.name}</div>
              <div style={{ color: 'rgba(247,244,233,.45)', fontSize: 12, marginTop: 3 }}>
                {d.last_used_at ? `zuletzt ${new Date(d.last_used_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}` : 'noch nie benutzt'}
              </div>
            </div>
            <button onClick={() => api.revokeDevice(d.id).then(load)} style={{ background: 'none', border: '1px solid rgba(247,244,233,.2)', color: '#F7F4E9', borderRadius: 20, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>Trennen</button>
          </div>
        ))}
        {err && <p role="alert" style={{ color: '#E8A08A', fontSize: 13, marginTop: 12 }}>{err}</p>}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 260, height: 260, borderRadius: 24, background: qr ? '#F7F4E9' : 'rgba(247,244,233,.03)', border: '1px solid rgba(214,168,72,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
          {qr ? (
            <svg data-testid="pair-qr" viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`} width="100%" height="100%" shapeRendering="crispEdges" aria-label="Kopplungscode">
              <path d={qr.d} fill="#050706" />
            </svg>
          ) : (
            <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#F7E2A6,#D6A848 45%,#5A3F10)', boxShadow: '0 0 60px rgba(214,168,72,.35)' }} />
          )}
        </div>
        {qr ? (
          <div style={{ font: "11px 'Space Mono', monospace", letterSpacing: '.15em', color: '#D6A848', marginTop: 16 }} data-testid="pair-countdown">
            GILT NOCH {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} · NUR EINMAL
          </div>
        ) : (
          <button onClick={start} data-testid="pair-start" style={{ marginTop: 18, width: '100%', background: '#D6A848', color: '#050706', border: 0, borderRadius: 30, padding: '14px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Handy verbinden
          </button>
        )}
      </div>
    </div>
  );
}
