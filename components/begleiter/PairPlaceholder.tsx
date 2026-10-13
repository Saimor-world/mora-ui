'use client';

/**
 * Einstellungen → Handy verbinden (Universe V2).
 * Platzhalter, bis PR #118 (Begleiter-PWA mit QR-Code und Passkey) in diesen Zweig kommt:
 * gleicher API-Vertrag (pair/start, devices, devices/:id DELETE), echte Aufrufe, kein QR.
 * Statt des QR-Codes steht der Kopplungslink mit Ablaufzeit da.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Smartphone, Link2, Unplug, RefreshCw } from 'lucide-react';
import { TileGrid, Tile } from '@/components/universe/app/Tiles';
import * as api from '@/lib/begleiter/pairContract';

export function PairPlaceholder() {
  const [devices, setDevices] = useState<api.BegleiterDevice[] | null>(null);
  const [pair, setPair] = useState<api.PairStart | null>(null);
  const [left, setLeft] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { api.listDevices().then((d) => setDevices(Array.isArray(d) ? d : [])).catch(() => setDevices(null)); }, []);
  useEffect(load, [load]);
  useEffect(() => {
    if (!pair) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((new Date(pair.expires_at).getTime() - Date.now()) / 1000));
      setLeft(s); if (s === 0) { setPair(null); load(); }
    }, 500);
    return () => clearInterval(t);
  }, [pair, load]);

  const start = async () => {
    setErr(null); setBusy(true);
    try { const p = await api.startPairing(); if (!p?.url || !p.expires_at) throw new Error('CORE liefert keinen Kopplungslink'); setPair(p); setLeft(p.ttl_seconds); } catch (e) { setErr(e instanceof Error ? e.message : 'CORE nicht erreichbar'); } finally { setBusy(false); }
  };
  const active = (devices ?? []).filter((d) => !d.revoked_at);

  return (
    <div className="uv2-pair" data-testid="pair-placeholder">
      <div className="uv2-pair__key" data-on={pair ? '' : undefined}>
        <span className="uv2-pair__phone"><Smartphone /></span>
        {pair ? (
          <>
            <span className="uv2-pair__count" data-testid="pair-countdown">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
            <a className="uv2-pill" href={pair.url} target="_blank" rel="noreferrer" title={pair.url}><Link2 />Kopplungslink</a>
            <small>QR-Code folgt mit #118</small>
          </>
        ) : (
          <button type="button" className="uv2-pill uv2-pill--gold" onClick={() => void start()} disabled={busy} data-testid="pair-start">
            {busy ? <RefreshCw className="animate-spin" /> : <Smartphone />}Handy verbinden
          </button>
        )}
        {err && <small role="alert" className="uv2-pair__err">{err}</small>}
      </div>
      <TileGrid label={`Geräte · ${devices === null ? '–' : active.length}`}>
        {devices === null && <Tile icon={<Unplug />} label="CORE offline" state="warn" onClick={load} />}
        {devices !== null && active.length === 0 && <Tile icon={<Smartphone />} label="Noch keins" state="off" />}
        {active.map((d) => (
          <Tile key={d.id} testId="device-tile" icon={<Smartphone />} label={d.name} state="on">
            <button type="button" className="uv2-pill" onClick={() => api.revokeDevice(d.id).then(load)}>Trennen</button>
          </Tile>
        ))}
      </TileGrid>
    </div>
  );
}
