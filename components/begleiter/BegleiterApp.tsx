'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { isUniverseV2Enabled } from '@/lib/universe/morgen';
import { UV2_FONTS_HREF } from '@/lib/universe/tokens';
import * as api from '@/lib/begleiter/api';
import { registerWorker } from '@/lib/begleiter/push';
import type { Decision, Proposal, StoredDevice } from '@/lib/begleiter/api';

type View =
  | { k: 'off' } | { k: 'unpaired' } | { k: 'pair'; token: string } | { k: 'locked' }
  | { k: 'inbox'; items: Proposal[] } | { k: 'done'; d: Decision; label: string };

export const PLANET: Record<string, string> = {
  'mora.note.create': 'Planet Wissen',
  'github.rerun_failed_jobs': 'Planet Werkstatt',
};

// Nur lokal, für Bilder und Tests: ?demo=1 auf localhost – keine echten Daten, kein Face ID.
const DEMO: Proposal[] = [
  { id: 'uv_demo1', tool: 'mora.note.create', label: 'Notiz anlegen: Atelier Nord will ein zweites Projekt',
    reason: 'Du hast es heute am Telefon gesagt. Ich halte es in deinem Wissen fest, sonst ändert sich nichts.',
    sources: ['Sprachnotiz 18:05'], undo: 'Notiz löschen.', risk: 'low' },
  { id: 'uv_demo2', tool: 'github.rerun_failed_jobs', label: 'Qualitätsprüfung für MÔRA noch einmal laufen lassen', risk: 'low' },
];

export const HOLD_MS = 900;

export function HoldButton({ onDone, disabled, children }: { onDone: () => void; disabled?: boolean; children: React.ReactNode }) {
  const [p, setP] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef(0);
  const stop = () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; setP(0); };
  const tick = () => {
    const v = Math.min(1, (performance.now() - start.current) / HOLD_MS);
    setP(v);
    if (v >= 1) { raf.current = null; onDone(); setTimeout(() => setP(0), 300); return; }
    raf.current = requestAnimationFrame(tick);
  };
  return (
    <button type="button" className="bgl-btn bgl-gold" disabled={disabled} data-testid="hold-approve"
      style={{ ['--p' as string]: p } as React.CSSProperties}
      onPointerDown={() => { if (disabled) return; start.current = performance.now(); raf.current = requestAnimationFrame(tick); }}
      onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) onDone(); }}
      aria-label="Gedrückt halten zum Freigeben">
      <i className="fill" aria-hidden />
      <span style={{ width: 20, height: 20, border: '2px solid #050706', borderRadius: 6 }} aria-hidden />
      <span>{children}</span>
    </button>
  );
}

export default function BegleiterApp() {
  const sp = useSearchParams();
  const demo = sp.get('demo') === '1' && typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
  const [view, setView] = useState<View>({ k: 'locked' });
  const [dev, setDev] = useState<StoredDevice | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState('iPhone');

  useEffect(() => {
    if (!document.getElementById('uv2-fonts')) {
      const l = document.createElement('link'); l.id = 'uv2-fonts'; l.rel = 'stylesheet'; l.href = UV2_FONTS_HREF; document.head.appendChild(l);
    }
    if (!isUniverseV2Enabled() && !demo) { setView({ k: 'off' }); return; }
    void registerWorker();
    const pair = sp.get('pair');
    const d = demo ? { device_id: 'dev_demo', credential_id: 'x', name: 'iPhone' } : api.loadDevice();
    setDev(d);
    const screen = sp.get('screen');
    if (pair) setView({ k: 'pair', token: pair });
    else if (demo && screen === 'pair') setView({ k: 'pair', token: 'demo' });
    else if (demo && screen === 'done') setView({ k: 'done', d: { id: 'uv_demo1', status: 'done', execution: { verified: true, check: 'readback_sha256' } }, label: DEMO[0].label });
    else if (demo && screen === 'empty') setView({ k: 'inbox', items: [] });
    else if (demo) setView({ k: 'inbox', items: DEMO });
    else setView(d ? { k: 'locked' } : { k: 'unpaired' });
  }, [sp, demo]);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setErr(null);
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : 'Unbekannter Fehler'); } finally { setBusy(false); }
  }, []);

  const doPair = (token: string) => run(async () => {
    const d = demo ? { device_id: 'dev_demo', credential_id: 'x', name } : await api.pairThisPhone(token, name.trim() || 'Handy');
    setDev(d);
    if (!demo) history.replaceState(null, '', '/begleiter');
    setView({ k: 'locked' });
  });
  const unlock = () => run(async () => {
    if (!dev) return;
    const r = demo ? { device: dev.name, proposals: DEMO } : await api.openInbox(dev);
    setView({ k: 'inbox', items: r.proposals });
  });
  const act = (p: Proposal, decision: 'approve' | 'reject', rest: Proposal[]) => run(async () => {
    if (!dev) return;
    const d = demo ? { id: p.id, status: decision === 'approve' ? 'done' : 'rejected', execution: { verified: true, check: 'readback_sha256' } } : await api.decide(dev, p.id, decision);
    if (decision === 'reject') setView({ k: 'inbox', items: rest });
    else setView({ k: 'done', d, label: p.label });
  });

  return (
    <main className="bgl-root" data-testid="begleiter">
      <div className="bgl-col">
        {view.k === 'off' && (<>
          <div className="bgl-k">Begleiter</div>
          <h1 className="bgl-s bgl-h1">Noch nicht<br /><i>eingeschaltet.</i></h1>
          <p className="bgl-m" style={{ marginTop: 18 }}>Der Begleiter gehört zum neuen Universe und ist erst sichtbar, wenn es aktiviert ist.</p>
        </>)}

        {view.k === 'unpaired' && (<>
          <div className="bgl-k">Begleiter · Verbinden</div>
          <h1 className="bgl-s bgl-h1">Dieses Handy ist<br /><i>noch fremd.</i></h1>
          <div className="bgl-steps">
            <div><b>01</b>Öffne am Schreibtisch Einstellungen → Handy verbinden.</div>
            <div><b>02</b>Scanne den goldenen Code mit der Kamera.</div>
            <div><b>03</b>Bestätige mit Face ID. Fertig.</div>
          </div>
        </>)}

        {view.k === 'pair' && (<>
          <div className="bgl-k">Begleiter · Verbinden</div>
          <h1 className="bgl-s bgl-h1">Dieses Handy wird<br /><i>dein Schlüssel.</i></h1>
          <p className="bgl-m" style={{ marginTop: 18 }}>Es bekommt einen eigenen Passkey. Jede Freigabe von hier unterschreibst du mit Face ID, und am Schreibtisch kannst du das Gerät jederzeit wieder trennen.</p>
          <div className="bgl-hr" />
          <label className="bgl-k dim" htmlFor="bgl-name">Name des Geräts</label>
          <input id="bgl-name" className="bgl-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <div className="bgl-ring"><div className="bgl-orb" /></div>
          <div className="bgl-foot">
            <button className="bgl-btn bgl-gold" disabled={busy} onClick={() => doPair(view.token)} data-testid="pair-btn"><span>{busy ? 'Einen Moment …' : 'Mit Face ID verbinden'}</span></button>
            <div className="bgl-sig">Code gilt 2 Minuten · nur einmal</div>
          </div>
        </>)}

        {view.k === 'locked' && (<>
          <div className="bgl-k">Begleiter · {dev?.name ?? 'Handy'}</div>
          <h1 className="bgl-s bgl-h1">Dein Universe<br /><i>wartet.</i></h1>
          <div className="bgl-ring"><div className="bgl-orb" /></div>
          <div className="bgl-foot">
            <button className="bgl-btn bgl-gold" disabled={busy} onClick={unlock} data-testid="unlock-btn"><span>{busy ? 'Einen Moment …' : 'Mit Face ID öffnen'}</span></button>
            <button className="bgl-btn bgl-ghost" style={{ marginTop: 12 }} onClick={() => { api.saveDevice(null); setDev(null); setView({ k: 'unpaired' }); }}>Von diesem Handy trennen</button>
          </div>
        </>)}

        {view.k === 'inbox' && view.items.length === 0 && (<>
          <div className="bgl-k">Begleiter · Freigabe</div>
          <h1 className="bgl-s bgl-h1">Nichts wartet<br /><i>auf dein Ja.</i></h1>
          <p className="bgl-m" style={{ marginTop: 18 }}>Wenn MÔRA etwas vorschlägt, erscheint es hier. Ohne dein Ja passiert nichts.</p>
        </>)}

        {view.k === 'inbox' && view.items.length > 0 && (() => {
          const [p, ...rest] = view.items;
          return (<>
            <div className="bgl-k">Begleiter · Freigabe</div>
            <h1 className="bgl-s bgl-h1">MÔRA braucht<br /><i>dein Ja.</i></h1>
            <div className="bgl-hr" />
            <div className="bgl-k dim">{PLANET[p.tool ?? ''] ?? 'Universe'}</div>
            <div className="bgl-s bgl-title" data-testid="proposal-title">{p.label}</div>
            {p.reason && <p className="bgl-m" style={{ marginTop: 14 }}>{p.reason}</p>}
            {(p.sources?.length || p.undo) && (
              <div className="bgl-src">{p.sources?.length ? `QUELLE · ${p.sources.join(' · ')}` : ''}{p.undo ? `${p.sources?.length ? ' — ' : ''}RÜCKWEG · ${p.undo}` : ''}</div>
            )}
            {err && <div className="bgl-err" role="alert">{err}</div>}
            <div className="bgl-foot">
              <HoldButton disabled={busy} onDone={() => act(p, 'approve', rest)}>{busy ? 'Face ID …' : 'Halten zum Freigeben'}</HoldButton>
              <div className="bgl-row">
                <button className="bgl-btn bgl-ghost" disabled={busy} onClick={() => act(p, 'reject', rest)} data-testid="reject-btn">Ablehnen</button>
                <button className="bgl-btn bgl-ghost" onClick={() => setView({ k: 'inbox', items: [...rest, p] })}>Am Schreibtisch</button>
              </div>
              <div className="bgl-sig">Signiert mit Face ID · 1 von {view.items.length}</div>
            </div>
          </>);
        })()}

        {view.k === 'done' && (<>
          <div className="bgl-k">Begleiter · Erledigt</div>
          <h1 className="bgl-s bgl-h1">{view.d.status === 'done' ? <>Erledigt.<br /><i>Und geprüft.</i></> : view.d.status === 'unverified' ? <>Ausgeführt,<br /><i>nicht bestätigt.</i></> : <>Nicht<br /><i>ausgeführt.</i></>}</h1>
          <div className="bgl-s bgl-title" style={{ marginTop: 24 }}>{view.label}</div>
          <div className="bgl-check" aria-hidden>{view.d.status === 'done' ? '✓' : '!'}</div>
          <div className="bgl-src" style={{ textAlign: 'center' }} data-testid="verify-line">
            {view.d.execution?.verified ? `PRÜFUNG · ${view.d.execution.check === 'readback_sha256' ? 'Notiz neu gelesen, Inhalt identisch' : view.d.execution.check}` : 'PRÜFUNG · ausstehend'}
          </div>
          <div className="bgl-foot">
            <button className="bgl-btn bgl-ghost" onClick={unlock} disabled={busy}>Zurück zu den Freigaben</button>
            <div className="bgl-sig">Im Universe unter LAGE sichtbar</div>
          </div>
        </>)}
      </div>
    </main>
  );
}
