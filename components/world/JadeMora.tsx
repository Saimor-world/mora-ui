'use client';
/**
 * JadeMora (Issue #187): MÔRA IST der kleine, fast kreisrunde Jade-Stein mit zwei winzigen dunklen Augen und feinem Goldrand.
 * 2.5D, kein WebGL: ein gerendertes Steinbild (public/mora/jade/stone*.png) plus gezeichnete Augen, die sich bewegen.
 * Accessoires sind eigene Ebenen (lib/mora/accessoryAdapter.ts), nie im Steinbild eingebrannt.
 *
 * Gleicher Vertrag wie PixelMora (SpiritFigure): size, mood, target, phone, reduced, roam, fresh, wardrobe, bare;
 * Entscheidungen (wohin schaut/geht MÔRA) kommen weiter aus lib/mora/pixelBrain.ts. Pro Frame wird nur per Ref ein
 * transform/CSS-Variable gesetzt, nie React-State; die Schleife schläft, sobald alles ruht.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { isNight, SPIRIT_LABEL, type SpiritMood } from './MoraSpirit';
import type { PixelMoraProps } from './PixelMora';
import { decide, type Intent } from '@/lib/mora/pixelBrain';
import { jadeMounts, type AccessoryMount } from '@/lib/mora/accessoryAdapter';
import type { Wardrobe } from '@/lib/mora/traits';
import { useWardrobe } from '@/lib/mora/useWardrobe';

/** Körper (Stein) relativ zur Zeichenfläche. */
export const JADE_BODY = 0.88;
/** Radius des Steins relativ zur Zeichenfläche (für Roaming-Abstände). */
export const MORA_R = JADE_BODY / 2;

export type JadeState = 'idle' | 'curious' | 'attentive' | 'thinking' | 'speaking' | 'done' | 'travel' | 'sleep';

const px = (n: number) => `${n}px`;

function Mount({ m, part }: { m: AccessoryMount; part: 'back' | 'front' }) {
  const ring = m.layer === 'ring';
  if (ring ? false : (m.layer === 'back') !== (part === 'back')) return null;
  const x = m.anchor.x + (m.offset?.x ?? 0); const y = m.anchor.y + (m.offset?.y ?? 0);
  const style = { left: `${50 + x * 100}%`, top: `${50 + y * 100}%`, width: `${m.scale * 100}%`, aspectRatio: String(m.aspect), ['--rot' as string]: `${m.rotate ?? 0}deg` } as React.CSSProperties;
  const img = <img src={m.asset} alt="" draggable={false} loading="eager" decoding="async" />;
  return (
    <span className="jm__acc" data-acc={m.id} data-anim={m.animation} data-part={ring ? part : undefined} style={style}>
      {img}
      {m.id === 'gold-orbit' ? <><i className="jm__bead jm__bead--x"><i className="jm__bead jm__bead--y" /></i></> : null}
    </span>
  );
}

/** Zeichnet Stein, Augen und Ebenen. Verhalten (Blick, Blinzeln) steuern Elternkomponenten über CSS-Variablen und data-Attribute. */
function Figure({ size, wardrobe, bare, still = false, eyesRef }: { size: number; wardrobe: Wardrobe; bare: boolean; still?: boolean; eyesRef?: React.Ref<HTMLSpanElement> }) {
  const d = size * JADE_BODY;
  const mounts = useMemo(() => (bare ? [] : jadeMounts(wardrobe)), [wardrobe, bare]);
  const chain = mounts.find((m) => m.chain);
  const gid = `jm-rim-${React.useId().replace(/:/g, '')}`;
  return (
    <span className="jm__fig" style={{ ['--d' as string]: px(d), width: px(size), height: px(size) }}>
      <span className="jm__box">
        {mounts.map((m) => <Mount key={`b-${m.id}`} m={m} part="back" />)}
        <span className="jm__stone">
          <img className="jm__img" src={d <= 56 ? '/mora/jade/stone-160.png' : '/mora/jade/stone.png'} alt="" draggable={false} decoding="async" />
          <span className="jm__light" aria-hidden />
          <svg className="jm__gold" viewBox="0 0 100 100" aria-hidden>
            <defs>
              <linearGradient id={gid} x1="0.1" y1="0" x2="0.9" y2="1">
                <stop offset="0" stopColor="#fff0b8" /><stop offset=".35" stopColor="#f0bd5c" /><stop offset=".7" stopColor="#d99a3c" /><stop offset="1" stopColor="#b8742a" />
              </linearGradient>
            </defs>
            <g className="jm__veins">
              <path d="M79 21c3 5 1 8 4 13s6 6 4 13-1 10 2 14" />
              <path d="M13 70c6 5 10 4 16 6s9 5 14 9 12 5 19 8" />
              <path d="M81 79c-4 3-6 5-9 9" />
            </g>
            <circle className="jm__rim-in" cx="50" cy="50" r="47.6" />
            <circle className="jm__rim-ln" cx="50" cy="50" r="48.4" stroke={`url(#${gid})`} />
          </svg>
          <span className="jm__eyes" ref={eyesRef} data-still={still ? 'true' : undefined}>
            <i className="jm__eye" /><i className="jm__eye" />
          </span>
          {chain ? (
            <svg className="jm__chain" viewBox="-0.5 -0.5 1 1" aria-hidden>
              <path d="M -0.468 0.02 Q -0.3 0.4 0 0.43 Q 0.3 0.4 0.468 0.02" />
            </svg>
          ) : null}
        </span>
        {mounts.map((m) => <Mount key={`f-${m.id}`} m={m} part="front" />)}
      </span>
    </span>
  );
}

/** Statisches Zeichen (Dock, Outfit-Plätze): Stein mit Augen, ohne Bewegung. */
export function JadeMoraMark({ size = 32, active = false, wardrobe }: { size?: number; active?: boolean; wardrobe?: Wardrobe }) {
  const [mine] = useWardrobe();
  return (
    <span className="jm jm--mark" data-testid="mora-mark" data-active={active ? 'true' : undefined} data-figure="jade" style={{ width: size, height: size }} aria-hidden>
      <Figure size={size} wardrobe={wardrobe ?? mine} bare={false} still />
    </span>
  );
}

function stateOf(mood: SpiritMood, night: boolean, flying: boolean, near: boolean): JadeState {
  if (night) return 'sleep';
  if (flying || mood === 'flying') return 'travel';
  if (mood === 'thinking' || mood === 'waiting') return 'thinking';
  if (mood === 'speaking') return 'speaking';
  if (mood === 'done') return 'done';
  if (mood === 'listening') return 'attentive';
  if (near) return 'curious';
  return 'idle';
}

export function JadeMora({ size, mood, target, reduced = false, roam = [], fresh = null, wardrobe, bare = false }: PixelMoraProps) {
  const [mine] = useWardrobe();
  const px0 = Math.round(size);
  const root = useRef<HTMLSpanElement>(null);
  const eyes = useRef<HTMLSpanElement>(null);
  const night = mood === 'night' || (mood === 'idle' && isNight());
  const busy = mood === 'thinking' || mood === 'speaking' || mood === 'listening' || mood === 'waiting';
  const flying = !!target;
  const live = useRef({ roam, fresh, night, busy, flying, mood, d: px0 * JADE_BODY, reduced });
  live.current = { roam, fresh, night, busy, flying, mood, d: px0 * JADE_BODY, reduced };
  const loop = useRef<{ wake: () => void; near: (v: boolean) => void }>({ wake: () => {}, near: () => {} });
  const [nearState, setNear] = React.useState(false);
  const state = stateOf(mood, night, flying, nearState);

  // Entscheidungen: eigener Takt aus echtem Zustand (gleiche Quelle wie PixelMora).
  const goal = useRef({ x: 0, y: 0, look: 0 as number });
  useEffect(() => {
    if (reduced) { goal.current = { x: 0, y: 0, look: 0 }; loop.current.wake(); return; }
    let last: Intent | undefined; let t: ReturnType<typeof setTimeout>;
    const step = () => {
      const s = live.current;
      if (s.flying) { goal.current = { x: 0, y: 0, look: 0 }; loop.current.wake(); t = setTimeout(step, 1500); return; }
      const i = decide({ points: s.roam, fresh: s.fresh, night: s.night, busy: s.busy, moraR: s.d / 2 }, Math.random, last);
      if (i.kind === 'look' && last?.id === i.id) { last = { ...i, kind: 'visit' }; } else last = i;
      goal.current = { x: i.x, y: i.y, look: i.kind === 'look' || i.kind === 'visit' ? 1 : 0 };
      loop.current.wake();
      t = setTimeout(step, Math.round(i.ms * 1.6));
    };
    t = setTimeout(step, 1200);
    return () => clearTimeout(t);
  }, [reduced]);

  // Bewegung, Blick, Blinzeln: ein rAF, schläft bei Ruhe.
  useEffect(() => {
    const el = root.current; const ey = eyes.current; if (!el || !ey) return;
    const cur = { x: 0, y: 0, tilt: 0, gx: 0, gy: 0 };
    const ptr = { x: 0, y: 0, t: 0 };
    let raf = 0; let prev = 0; let nearNow = false;
    const gazeTarget = (): { x: number; y: number } => {
      const s = live.current;
      if (s.reduced || s.night) return { x: 0, y: 0 };
      if (s.mood === 'thinking' || s.mood === 'waiting') return { x: -0.55, y: -0.7 };
      if (s.flying) return { x: 0, y: -0.7 };
      if (performance.now() - ptr.t < 6000) {
        const r = el.getBoundingClientRect(); const dx = ptr.x - (r.left + r.width / 2); const dy = ptr.y - (r.top + r.height / 2);
        const len = Math.hypot(dx, dy) || 1; const k = Math.min(1, len / (s.d * 1.6));
        const n = len < s.d * 3.2; if (n !== nearNow) { nearNow = n; setNear(n); }
        return { x: (dx / len) * k, y: (dy / len) * k * 0.8 };
      }
      if (nearNow) { nearNow = false; setNear(false); }
      const g = goal.current; return g.look ? { x: Math.sign(g.x) * 0.6, y: Math.sign(g.y) * 0.3 } : { x: 0, y: 0 };
    };
    const tick = (now: number) => {
      const dt = Math.min(64, now - (prev || now)); prev = now;
      const s = live.current; const g = goal.current;
      const gt = gazeTarget();
      const k = 1 - Math.exp(-dt / 900); const kg = 1 - Math.exp(-dt / 110);
      const tx = s.reduced ? 0 : g.x; const ty = s.reduced ? 0 : g.y;
      const vx = (tx - cur.x) * k; cur.x += vx; cur.y += (ty - cur.y) * k;
      cur.tilt += ((Math.abs(vx) > 0.12 ? Math.sign(vx) * 7 : 0) - cur.tilt) * (1 - Math.exp(-dt / 260));
      cur.gx += (gt.x - cur.gx) * kg; cur.gy += (gt.y - cur.gy) * kg;
      el.style.transform = `translate3d(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px, 0) rotate(${(s.flying ? 8 : cur.tilt).toFixed(2)}deg)`;
      ey.style.setProperty('--gx', cur.gx.toFixed(3)); ey.style.setProperty('--gy', cur.gy.toFixed(3));
      const settled = Math.abs(tx - cur.x) < 0.05 && Math.abs(ty - cur.y) < 0.05 && Math.abs(cur.tilt) < 0.05 && Math.abs(gt.x - cur.gx) < 0.003 && Math.abs(gt.y - cur.gy) < 0.003;
      raf = settled ? 0 : requestAnimationFrame(tick); if (settled) prev = 0;
    };
    const wake = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); };
    loop.current = { wake, near: () => {} };
    const onMove = (e: PointerEvent) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = performance.now(); wake(); };
    window.addEventListener('pointermove', onMove, { passive: true });
    const onVis = () => { if (!document.hidden) wake(); };
    document.addEventListener('visibilitychange', onVis);
    // Blinzeln: selten, kurz; in Ruhe-Modi aus.
    let bt: ReturnType<typeof setTimeout>; let bo: ReturnType<typeof setTimeout>;
    const blink = () => { el.dataset.blink = 'true'; bo = setTimeout(() => { delete el.dataset.blink; }, 150); bt = setTimeout(blink, 2800 + Math.random() * 4200); };
    if (!live.current.reduced) bt = setTimeout(blink, 1800);
    wake();
    return () => { cancelAnimationFrame(raf); clearTimeout(bt); clearTimeout(bo); window.removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', onVis); loop.current = { wake: () => {}, near: () => {} }; };
  }, [reduced]);

  return (
    <span ref={root} className="jm" data-state={state} data-reduced={reduced ? 'true' : undefined} data-testid="mora-spirit" data-figure="jade" data-mood={mood}
      style={{ width: px0, height: px0 }}>
      <span className="jm__bob">
        <Figure size={px0} wardrobe={wardrobe ?? mine} bare={bare} eyesRef={eyes} />
      </span>
      <span className="sr-only" role="status" aria-live="polite" data-testid="mora-status">{SPIRIT_LABEL[mood]}</span>
    </span>
  );
}

/**
 * Bühnen-Figur der Garderobe: kein Umherfliegen. Atmen, Blinzeln, Blick zum Zeiger, Drehen (`turn` zählt hoch)
 * und ein kleiner Hüpfer bei jeder Änderung (`hop` zählt hoch).
 */
export function JadeMoraStage({ wardrobe, scale = 2, hop = 0, turn = 0, reduced = false }: { wardrobe: Wardrobe; scale?: number; hop?: number; turn?: number; reduced?: boolean }) {
  const size = Math.round(112 * scale);
  const root = useRef<HTMLSpanElement>(null); const eyes = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = root.current; const ey = eyes.current; if (!el || !ey || reduced) return;
    const g = { x: 0, y: 0, tx: 0, ty: 0 }; let raf = 0; let prev = 0; let last = 0;
    const tick = (now: number) => {
      const dt = Math.min(64, now - (prev || now)); prev = now; const k = 1 - Math.exp(-dt / 110);
      g.x += (g.tx - g.x) * k; g.y += (g.ty - g.y) * k;
      ey.style.setProperty('--gx', g.x.toFixed(3)); ey.style.setProperty('--gy', g.y.toFixed(3));
      raf = Math.abs(g.tx - g.x) + Math.abs(g.ty - g.y) < 0.004 ? 0 : requestAnimationFrame(tick); if (!raf) prev = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.timeStamp - last < 16) return; last = e.timeStamp;
      const r = el.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2); const dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy) || 1; const kk = Math.min(1, len / (size * 0.9));
      g.tx = (dx / len) * kk; g.ty = (dy / len) * kk * 0.8; if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    let bt: ReturnType<typeof setTimeout>; let bo: ReturnType<typeof setTimeout>;
    const blink = () => { el.dataset.blink = 'true'; bo = setTimeout(() => { delete el.dataset.blink; }, 150); bt = setTimeout(blink, 2400 + Math.random() * 3200); };
    bt = setTimeout(blink, 1600);
    return () => { cancelAnimationFrame(raf); clearTimeout(bt); clearTimeout(bo); window.removeEventListener('pointermove', onMove); };
  }, [reduced, size]);
  return (
    <span ref={root} className="jm jm--stage" data-state="idle" data-reduced={reduced ? 'true' : undefined} data-testid="mora-stage" data-figure="jade" data-hop={hop} data-turn={turn} style={{ width: size, height: size }} aria-hidden>
      <span key={`h${hop}`} className={`jm__bob${hop ? ' jm__bob--hop' : ''}`}>
        <span key={`t${turn}`} className={`jm__turn${turn ? ' jm__turn--go' : ''}`}>
          <Figure size={size} wardrobe={wardrobe} bare={false} eyesRef={eyes} />
        </span>
      </span>
    </span>
  );
}
