'use client';

/**
 * Einstellungen · Raum (Universe V2).
 * A: the room – live preview with a draggable sun (light/time = ritual scene), MÔRA voice dial,
 *    sound bars (ambient volume), quiet orb (quiet hours).
 * B: a MÔRA line inside the room – plain German requests are applied live, then kept or undone.
 * C: Gefüge – every section as a body on an orbit around MÔRA.
 * Every section of the classic settings stays reachable through the rail and the Gefüge.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RITUAL_SCENES, type RitualSceneId } from '@/lib/os/ritualMode';
import { PRESENCE_KEYS, readQuietHours, readVoiceWarmth, voiceLabel } from '@/lib/os/presence';

export interface RaumSection { id: string; label: string }

interface Props {
  sections: RaumSection[];
  onOpen: (id: string) => void;
  scene: RitualSceneId;
  autoTime: boolean;
  onScene: (id: RitualSceneId) => void;
  onToggleAuto: () => void;
  ambientOn: boolean;
  volume: number; // 0..1
  onToggleAmbient: () => void;
  onVolume: (v: number) => void;
  saveSetting: (u: Record<string, unknown>) => void;
}

const SUN_X: Record<RitualSceneId, number> = { flow: 0.16, build: 0.4, lounge: 0.66, night: 0.88 };
const SCENE_TIME: Record<RitualSceneId, string> = { flow: 'morgen', build: 'tag', lounge: 'abend', night: 'nacht' };
const SCENE_KELVIN: Record<RitualSceneId, number> = { flow: 5200, build: 5600, lounge: 3200, night: 2400 };
const sceneFromX = (x: number): RitualSceneId => (x < 0.28 ? 'flow' : x < 0.53 ? 'build' : x < 0.78 ? 'lounge' : 'night');
const arcY = (x: number) => 1 - 4 * x * (1 - x); // 0 at top, 1 at ends

type Snap = { scene: RitualSceneId; volume: number; ambientOn: boolean; warmth: number; quiet: number | null };

export function RaumV2(p: Props) {
  const [view, setView] = useState<'raum' | 'gefuege'>('raum');
  const [warmth, setWarmthState] = useState<number>(() => readVoiceWarmth());
  const [quiet, setQuietState] = useState<number | null>(() => readQuietHours().from);
  const [ask, setAsk] = useState('');
  const [pending, setPending] = useState<{ snap: Snap; chips: string[] } | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setWarmth = useCallback((v: number) => {
    const w = Math.round(Math.min(100, Math.max(0, v)));
    setWarmthState(w);
    try { localStorage.setItem(PRESENCE_KEYS.warmth, String(w)); } catch { /* ignore */ }
    p.saveSetting({ moraVoiceWarmth: w });
  }, [p]);
  const setQuiet = useCallback((h: number | null) => {
    setQuietState(h);
    try { if (h === null) localStorage.removeItem(PRESENCE_KEYS.quietFrom); else localStorage.setItem(PRESENCE_KEYS.quietFrom, String(h)); } catch { /* ignore */ }
    p.saveSetting({ quietHoursFrom: h });
  }, [p]);

  const sunX = SUN_X[p.scene];
  const accent = RITUAL_SCENES[p.scene].accentHex;

  const onSunPointer = (e: React.PointerEvent) => {
    const el = stageRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(0.95, Math.max(0.05, (e.clientX - r.left) / r.width));
    const next = sceneFromX(x);
    if (next !== p.scene) p.onScene(next);
  };

  // ── B: MÔRA line ─────────────────────────────────────────────
  const apply = () => {
    const t = ask.trim().toLowerCase(); if (!t) return;
    const snap: Snap = { scene: p.scene, volume: p.volume, ambientOn: p.ambientOn, warmth, quiet };
    const chips: string[] = [];
    const sec = p.sections.find((s) => t.includes(s.label.toLowerCase().split(' ')[0]));
    if (/stimme/.test(t)) {
      if (/wärmer|weicher|tiefer|warm/.test(t)) { setWarmth(warmth + 25); chips.push(`Stimme ${voiceLabel(Math.min(100, warmth + 25))}`); }
      else if (/klarer|heller|frischer|klar/.test(t)) { setWarmth(warmth - 25); chips.push(`Stimme ${voiceLabel(Math.max(0, warmth - 25))}`); }
    } else if (/wärmer|abend|gemütlich|lounge/.test(t)) { p.onScene('lounge'); chips.push(`Licht ${SCENE_KELVIN[p.scene]} → ${SCENE_KELVIN.lounge} K`); }
    else if (/nacht|dunkler|dunkel/.test(t)) { p.onScene('night'); chips.push(`Licht → Nacht`); }
    else if (/morgen|frisch/.test(t)) { p.onScene('flow'); chips.push('Licht → Morgen'); }
    else if (/heller|tag|fokus|arbeit/.test(t)) { p.onScene('build'); chips.push('Licht → Tag'); }
    if (/leiser/.test(t)) { p.onVolume(Math.max(0, p.volume - 0.2)); chips.push(`Klang ${Math.round(p.volume * 100)} → ${Math.round(Math.max(0, p.volume - 0.2) * 100)}`); }
    if (/lauter/.test(t)) { p.onVolume(Math.min(1, p.volume + 0.2)); chips.push(`Klang ${Math.round(p.volume * 100)} → ${Math.round(Math.min(1, p.volume + 0.2) * 100)}`); }
    if (/(musik|klang) (an|ein)|spiel/.test(t) && !p.ambientOn) { p.onToggleAmbient(); chips.push('Klang an'); }
    if (/(musik|klang) aus/.test(t) && p.ambientOn) { p.onToggleAmbient(); chips.push('Klang aus'); }
    const q = t.match(/(still|ruhe|stille)\D*(\d{1,2})/);
    if (q) { setQuiet(Number(q[2]) % 24); chips.push(`Stille ab ${Number(q[2]) % 24}:00`); }
    else if (/keine (stille|ruhe)/.test(t)) { setQuiet(null); chips.push('Stille aus'); }
    setHeard(ask.trim()); setAsk('');
    if (chips.length) { setPending({ snap, chips }); return; }
    if (sec) { p.onOpen(sec.id); return; }
    setPending({ snap, chips: ['Nicht verstanden – versuch „abends wärmer“, „leiser“ oder „Stille ab 22“'] });
  };
  const keep = () => setPending(null);
  const undo = () => {
    if (!pending) return; const s = pending.snap;
    if (s.scene !== p.scene) p.onScene(s.scene);
    if (s.volume !== p.volume) p.onVolume(s.volume);
    if (s.ambientOn !== p.ambientOn) p.onToggleAmbient();
    if (s.warmth !== warmth) setWarmth(s.warmth);
    if (s.quiet !== quiet) setQuiet(s.quiet);
    setPending(null);
  };

  const bars = useMemo(() => Array.from({ length: 18 }, (_, i) => 0.35 + 0.65 * Math.abs(Math.sin(i * 1.7 + 0.6))), []);
  const vol = Math.round(p.volume * 100);
  const quietCycle = [null, 21, 22, 23] as (number | null)[];

  return (
    <div className="uv2-raum" data-testid="settings-raum" style={{ ['--raum-accent' as string]: accent }}>
      <div className="uv2-raum__top">
        <span className="uv2-raum__crumb">Einstellungen · {view === 'raum' ? 'Raum' : 'Gefüge'}</span>
        <div className="uv2-seg" role="radiogroup" aria-label="Ansicht">
          <button type="button" role="radio" aria-checked={view === 'raum'} data-on={view === 'raum' ? '' : undefined} onClick={() => setView('raum')}>Raum</button>
          <button type="button" role="radio" aria-checked={view === 'gefuege'} data-on={view === 'gefuege' ? '' : undefined} onClick={() => setView('gefuege')} data-testid="raum-to-gefuege">Gefüge</button>
        </div>
      </div>

      {view === 'raum' ? (
        <div className="uv2-raum__body">
          <div className="uv2-raum__left">
            <h2 className="uv2-raum__title">Forme<br /><i>deinen Raum.</i></h2>
            <Dial value={warmth} onChange={setWarmth} />
            <span className="uv2-raum__cap">Stimme · {voiceLabel(warmth)}</span>
          </div>

          <div className="uv2-raum__stage" ref={stageRef} data-scene={p.scene}
            onPointerMove={(e) => { if (dragging.current) onSunPointer(e); }}
            onPointerUp={() => { dragging.current = false; }} onPointerLeave={() => { dragging.current = false; }}>
            <div className="uv2-raum__sky" />
            <div className="uv2-raum__tint" />
            <span className="uv2-raum__planet" style={{ left: '40%', top: '38%', width: 120, height: 120, background: `radial-gradient(circle at 35% 30%, #F4D48C, #B07A2A 55%, #2a1a08)` }} />
            <span className="uv2-raum__planet" style={{ left: '20%', top: '22%', width: 46, height: 46, background: 'radial-gradient(circle at 35% 30%, #9fd0d8, #1f4a5a 60%, #05141a)' }} />
            <span className="uv2-raum__planet" style={{ left: '70%', top: '62%', width: 60, height: 60, background: 'radial-gradient(circle at 35% 30%, #e0a07a, #7a3a1e 60%, #1a0a04)' }} />
            <span className="uv2-raum__planet" style={{ left: '62%', top: '16%', width: 32, height: 32, background: 'radial-gradient(circle at 35% 30%, #b9b4f0, #3a3a7a 60%, #0a0a1a)' }} />
            <svg className="uv2-raum__arc" viewBox="0 0 100 60" preserveAspectRatio="none"><path d="M5 56 Q50 -50 95 56" /></svg>
            <button type="button" className="uv2-raum__sun" aria-label={`Licht: ${SCENE_TIME[p.scene]}. Ziehen zum Ändern`} data-testid="raum-sun"
              style={{ left: `${sunX * 100}%`, top: `${8 + arcY(sunX) * 78}%` }}
              onPointerDown={(e) => { dragging.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
              onPointerMove={(e) => { if (dragging.current) onSunPointer(e); }}
              onPointerUp={() => { dragging.current = false; }}
              onKeyDown={(e) => {
                const order: RitualSceneId[] = ['flow', 'build', 'lounge', 'night']; const i = order.indexOf(p.scene);
                if (e.key === 'ArrowRight' && i < 3) p.onScene(order[i + 1]); if (e.key === 'ArrowLeft' && i > 0) p.onScene(order[i - 1]);
              }} />
            <span className="uv2-raum__suncap" style={{ left: `${sunX * 100}%`, top: `${8 + arcY(sunX) * 78 + 9}%` }}>{SCENE_TIME[p.scene]} · {SCENE_KELVIN[p.scene]} K</span>
            <span className="uv2-raum__live">Live-Vorschau</span>
            <button type="button" className="uv2-raum__auto" data-on={p.autoTime ? '' : undefined} onClick={p.onToggleAuto}>{p.autoTime ? 'Folgt der Uhr' : 'Fest'}</button>
          </div>

          <div className="uv2-raum__right">
            <div className="uv2-raum__sound" role="slider" aria-label="Klang" aria-valuemin={0} aria-valuemax={100} aria-valuenow={vol} tabIndex={0} data-testid="raum-sound"
              onKeyDown={(e) => { if (e.key === 'ArrowUp') p.onVolume(Math.min(1, p.volume + 0.05)); if (e.key === 'ArrowDown') p.onVolume(Math.max(0, p.volume - 0.05)); }}
              onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); p.onVolume(Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height))); }}>
              {bars.map((h, i) => <i key={i} style={{ height: `${h * 100}%`, opacity: (i / bars.length) <= p.volume ? 0.9 : 0.18 }} />)}
            </div>
            <button type="button" className="uv2-raum__cap uv2-raum__cap--btn" onClick={p.onToggleAmbient}>Klang · {p.ambientOn ? vol : 'aus'}</button>
            <button type="button" className="uv2-raum__quiet" data-on={quiet !== null ? '' : undefined} data-testid="raum-quiet"
              onClick={() => setQuiet(quietCycle[(quietCycle.indexOf(quiet) + 1) % quietCycle.length])} aria-label="Stille">
              <span className="uv2-raum__quiet-halo" /><span className="uv2-raum__quiet-core" />
            </button>
            <span className="uv2-raum__cap">{quiet === null ? 'Stille aus' : `Stille ab ${quiet}:00`}</span>
          </div>

          <div className="uv2-raum__mora">
            {pending ? (
              <div className="uv2-raum__pending" data-testid="raum-pending">
                {heard && <span className="uv2-raum__heard">„{heard}“</span>}
                <div className="uv2-raum__chips">{pending.chips.map((c) => <span key={c} className="uv2-raum__chip">{c}</span>)}</div>
                <button type="button" className="uv2-pill" data-primary="" onClick={keep}>Behalten</button>
                <button type="button" className="uv2-pill" onClick={undo}>Zurück</button>
              </div>
            ) : (
              <form className="uv2-raum__ask" onSubmit={(e) => { e.preventDefault(); apply(); }}>
                <span className="uv2-raum__orb" aria-hidden />
                <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Sag MÔRA, wie es sein soll …" aria-label="MÔRA sagen, was sich ändern soll" data-testid="raum-ask" />
              </form>
            )}
          </div>

          <nav className="uv2-raum__rail" aria-label="Bereiche">
            {p.sections.map((s) => (
              <button key={s.id} type="button" onClick={() => p.onOpen(s.id)} data-on={s.id === 'appearance' || s.id === 'audio' ? '' : undefined} data-testid={`raum-rail-${s.id}`}><b /><span>{s.label}</span></button>
            ))}
          </nav>
        </div>
      ) : (
        <Gefuege sections={p.sections} onOpen={p.onOpen} onRaum={() => setView('raum')} />
      )}
    </div>
  );
}

function Dial({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const drag = useRef(false);
  const fromPointer = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect(); if (!r) return;
    const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)); // -pi..pi, 0 = right
    let deg = (a * 180) / Math.PI + 90; if (deg < 0) deg += 360; // 0 = top
    onChange(Math.round((deg / 360) * 100));
  };
  const C = 2 * Math.PI * 48;
  return (
    <svg ref={ref} className="uv2-raum__dial" viewBox="0 0 120 120" role="slider" aria-label="MÔRA-Stimme" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} tabIndex={0}
      data-testid="raum-dial"
      onPointerDown={(e) => { drag.current = true; (e.currentTarget as Element).setPointerCapture?.(e.pointerId); fromPointer(e); }}
      onPointerMove={(e) => { if (drag.current) fromPointer(e); }} onPointerUp={() => { drag.current = false; }}
      onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(100, value + 5)); if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(0, value - 5)); }}>
      <circle cx="60" cy="60" r="56" className="uv2-raum__dial-bg" />
      <circle cx="60" cy="60" r="48" className="uv2-raum__dial-track" />
      <circle cx="60" cy="60" r="48" className="uv2-raum__dial-val" strokeDasharray={`${(value / 100) * C} ${C}`} transform="rotate(-90 60 60)" />
      <text x="60" y="67" textAnchor="middle" className="uv2-raum__dial-text">MÔRA</text>
    </svg>
  );
}

function Gefuege({ sections, onOpen, onRaum }: { sections: RaumSection[]; onOpen: (id: string) => void; onRaum: () => void }) {
  const W = 900, H = 520, cx = W / 2, cy = H / 2;
  const rings = [[150, 93], [250, 155], [345, 213]];
  const nodes = sections.map((s, i) => {
    const ring = rings[i % 3];
    const ang = (i / sections.length) * Math.PI * 2 + (i % 3) * 0.7 - 1.2;
    return { ...s, x: cx + Math.cos(ang) * ring[0], y: cy + Math.sin(ang) * ring[1] };
  });
  return (
    <div className="uv2-gefuege" data-testid="settings-gefuege">
      <svg viewBox={`0 0 ${W} ${H}`} className="uv2-gefuege__svg">
        <defs><filter id="uv2glow"><feGaussianBlur stdDeviation="4" /></filter></defs>
        {rings.map(([rx, ry]) => <ellipse key={rx} cx={cx} cy={cy} rx={rx} ry={ry} className="uv2-gefuege__ring" />)}
        {nodes.map((n) => (
          <g key={n.id} className="uv2-gefuege__node" role="button" tabIndex={0} aria-label={n.label} data-testid={`gefuege-${n.id}`}
            onClick={() => onOpen(n.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(n.id); }}>
            <line x1={cx} y1={cy} x2={n.x} y2={n.y} className="uv2-gefuege__ray" />
            <circle cx={n.x} cy={n.y} r={16} className="uv2-gefuege__halo" filter="url(#uv2glow)" />
            <circle cx={n.x} cy={n.y} r={6} className="uv2-gefuege__dot" />
            <text x={n.x} y={n.y + 24} textAnchor="middle" className="uv2-gefuege__label">{n.label.toUpperCase()}</text>
          </g>
        ))}
        <g role="button" tabIndex={0} aria-label="Raum" className="uv2-gefuege__core" onClick={onRaum} onKeyDown={(e) => { if (e.key === 'Enter') onRaum(); }}>
          <circle cx={cx} cy={cy} r={56} />
          <text x={cx} y={cy + 12} textAnchor="middle">M</text>
        </g>
      </svg>
    </div>
  );
}
