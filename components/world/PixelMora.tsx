'use client';
import React, { useEffect, useRef, useState } from 'react';
import type { SpiritMood } from './MoraSpirit';
import { isNight, SPIRIT_LABEL } from './MoraSpirit';
import { decide, type Intent, type RoamPoint } from '@/lib/mora/pixelBrain';
import { wardrobeLayers, type Tier, type Wardrobe } from '@/lib/mora/traits';
import { useFounder, useWardrobe } from '@/lib/mora/useWardrobe';

const SRC = '/mora/pixel/';
type Eyes = 'eyes' | 'eyes_closed' | 'eyes_l' | 'eyes_r';
const EYE_FILE: Record<Eyes, string> = { eyes: '', eyes_closed: '_closed', eyes_l: '_l', eyes_r: '_r' };
/** Welche Bildstufe zu einer Anzeigegröße (px) passt: 48 Dock, 80 Universum, 96 großes Universum, 140 Bühne. */
export function tierFor(px: number): Tier { return px <= 56 ? 48 : px <= 88 ? 80 : px <= 112 ? 96 : 140; }
/** Geräte-Pixelverhältnis (Retina): erst nach dem Mount gesetzt, damit Server und Client gleich rendern. Höchstens 2, weil die größte Stufe 140 px = 280 Gerätepixel schon reicht. */
export function useDpr(): number {
  const [d, setD] = useState(1);
  useEffect(() => { setD(Math.min(2, Math.max(1, window.devicePixelRatio || 1))); }, []);
  return d;
}
/** Bildstufe für Anzeigegröße in CSS-px auf diesem Bildschirm (Retina: doppelt so viele Gerätepixel). */
export function tierForDpr(px: number, dpr: number): Tier { return tierFor(Math.round(px * dpr)); }
/** Kugel (Körper) relativ zur Bildfläche: Radius ≈ 36 % der Kante (aus dem Sprite gemessen). */
export const MORA_R = 0.3625;
/** Grundkörper (ein Bild je Augenzustand, glattes Final-Set; Gründer-Konto mit echter Blüte); Accessoires aus lib/mora/mora-traits.json.
 *  Reihenfolge: Aura, Ebenen hinter dem Körper (Schalenden, Bügel, Kette), Körper, Ebenen davor. */
function Layers({ eyes = 'eyes', wardrobe, tier, bare = false }: { eyes?: Eyes; wardrobe: Wardrobe; tier: Tier; bare?: boolean }) {
  const founder = useFounder();
  const t = bare ? [] : wardrobeLayers(wardrobe, { founder, tier });
  const aura = t.filter((l) => l.slot === 'aura'); const rest = t.filter((l) => l.slot !== 'aura');
  const base = founder ? 'founder' : 'sprite';
  return (<>
    {aura.map((l) => <img key={l.src} src={l.src} alt="" className="px-mora__l px-mora__aura" draggable={false} />)}
    {rest.filter((l) => l.back).map((l) => <img key={l.back} src={l.back} alt="" className={`px-mora__l px-mora__back px-mora__t-${l.slot}`} draggable={false} />)}
    {(Object.keys(EYE_FILE) as Eyes[]).map((e) => <img key={e} src={`${SRC}t${tier}/${base}${EYE_FILE[e]}.png`} alt="" className="px-mora__l px-mora__base" data-eyes={e} data-on={e === eyes ? 'true' : 'false'} draggable={false} />)}
    {rest.map((l) => l.frames
      ? <span key={l.src} className={`px-mora__l px-mora__anim px-mora__t-${l.slot}`} data-frames={l.frames} style={{ backgroundImage: `url(${l.src})`, backgroundSize: `${l.frames * 100}% 100%` }} />
      : <img key={l.src} src={l.src} alt="" className={`px-mora__l px-mora__t-${l.slot}`} draggable={false} />)}
  </>);
}

export type PixelMoraProps = {
  size: number; mood: SpiritMood; target?: { x: number; y: number } | null; phone?: boolean; reduced?: boolean;
  /** Planeten relativ zur Mitte, gewichtet nach echter Aktivität. */
  roam?: RoamPoint[];
  /** Planet mit neuem Ereignis (Puls). */
  fresh?: string | null;
  /** Vorschau (Garderobe): überschreibt die gespeicherte Auswahl. */
  wardrobe?: Wardrobe;
  /** Nur der Körper, ohne Garderobe. */
  bare?: boolean;
};

/** Legacy-Stil: Pixel-MÔRA. Standard ist JadeMora (components/world/JadeMora.tsx). */
/** Statisches Pixel-MÔRA-Zeichen (Dock, Einstiege). */
export function PixelMoraMark({ size = 32, active = false, wardrobe }: { size?: number; active?: boolean; wardrobe?: Wardrobe }) {
  const [mine] = useWardrobe();
  const dpr = useDpr();
  return (
    <span className="px-mora px-mora--mark" data-testid="mora-mark" data-active={active ? 'true' : undefined} style={{ width: size, height: size }} aria-hidden>
      <Layers wardrobe={wardrobe ?? mine} tier={tierForDpr(size, dpr)} />
    </span>
  );
}

export function PixelMora({ size, mood, target, phone = false, reduced = false, roam = [], fresh = null, wardrobe, bare = false }: PixelMoraProps) {
  const [mine] = useWardrobe();
  const px = Math.round(size); // Zeichenfläche in px, Bildstufe passend dazu
  const dpr = useDpr();
  const tier = tierForDpr(px, dpr);
  const night = mood === 'night' || (mood === 'idle' && isNight());
  const busy = mood === 'thinking' || mood === 'speaking' || mood === 'listening' || mood === 'waiting';
  const flying = !!target;
  const [eyes, setEyes] = useState<Eyes>('eyes');
  const [happy, setHappy] = useState(false);
  const [pose, setPose] = useState({ x: 0, y: 0, tilt: 0 });
  const box = useRef<HTMLSpanElement>(null);
  const goal = useRef({ x: 0, y: 0 });
  const cur = useRef({ x: 0, y: 0 });
  const look = useRef<0 | -1 | 1>(0);
  const moraR = MORA_R * px;
  const live = useRef({ roam, fresh, night, busy, flying, moraR });
  live.current = { roam, fresh, night, busy, flying, moraR };

  // Entscheidungen: eigener Takt, aus echtem Zustand.
  useEffect(() => {
    if (reduced) return;
    let last: Intent | undefined; let t: ReturnType<typeof setTimeout>;
    const step = () => {
      const s = live.current;
      if (s.flying) { goal.current = { x: 0, y: 0 }; t = setTimeout(step, 1500); return; }
      const i = decide({ points: s.roam, fresh: s.fresh, night: s.night, busy: s.busy, moraR: s.moraR }, Math.random, last);
      if (i.kind === 'look' && last?.id === i.id) { last = { ...i, kind: 'visit' }; } else last = i;
      goal.current = { x: i.x, y: i.y };
      t = setTimeout(step, Math.round(i.ms * 1.6));
    };
    t = setTimeout(step, 1200);
    return () => clearTimeout(t);
  }, [reduced]);

  // Bewegung: weich, auf Pixelraster gerundet.
  useEffect(() => {
    if (reduced) { setPose({ x: 0, y: 0, tilt: 0 }); return; }
    let raf = 0; let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - prev); prev = now;
      const k = 1 - Math.exp(-dt / 900);
      const c = cur.current; const g = goal.current;
      const vx = (g.x - c.x) * k; c.x += vx; c.y += (g.y - c.y) * k;
      const q = (v: number) => Math.round(v);
      const tilt = Math.abs(vx) > 0.15 ? Math.sign(vx) * 8 : 0;
      setPose((p) => (p.x === q(c.x) && p.y === q(c.y) && p.tilt === tilt ? p : { x: q(c.x), y: q(c.y), tilt }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  // Blinzeln und Blick zum Cursor.
  useEffect(() => {
    if (night) { setEyes('eyes_closed'); return; }
    let t: ReturnType<typeof setTimeout>;
    const blink = () => { setEyes('eyes_closed'); setTimeout(() => setEyes(look.current < 0 ? 'eyes_l' : look.current > 0 ? 'eyes_r' : 'eyes'), 140); t = setTimeout(blink, 2600 + Math.random() * 3800); };
    if (!reduced) t = setTimeout(blink, 2000); else setEyes('eyes');
    const onMove = (e: PointerEvent) => {
      const r = box.current?.getBoundingClientRect(); if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2); const dy = e.clientY - (r.top + r.height / 2);
      const n: 0 | -1 | 1 = Math.hypot(dx, dy) < 220 ? (dx < -12 ? -1 : dx > 12 ? 1 : 0) : 0;
      if (n !== look.current) { look.current = n; setEyes(n < 0 ? 'eyes_l' : n > 0 ? 'eyes_r' : 'eyes'); }
    };
    window.addEventListener('pointermove', onMove);
    return () => { clearTimeout(t); window.removeEventListener('pointermove', onMove); };
  }, [night, reduced]);

  // Freude bei neuem Ereignis oder fertig.
  useEffect(() => {
    if (reduced || !(mood === 'done' || fresh)) return;
    setHappy(true); const t = setTimeout(() => setHappy(false), 1200); return () => clearTimeout(t);
  }, [mood, fresh, reduced]);

  const moving = pose.tilt !== 0;
  const state = night ? 'sleep' : flying || moving ? 'fly' : busy ? 'work' : happy ? 'happy' : 'idle';
  return (
    <span ref={box} className="px-mora" data-state={state} data-reduced={reduced ? 'true' : undefined} data-testid="mora-spirit" data-figure="pixel"
      style={{ width: px, height: px, transform: `translate(${pose.x}px, ${pose.y}px) rotate(${flying ? 10 : pose.tilt}deg)` }}>
      <span className="px-mora__bob">
        <Layers eyes={eyes} wardrobe={wardrobe ?? mine} tier={tier} bare={bare} />
      </span>
      {night && !reduced ? <span className="px-mora__z" aria-hidden>z</span> : null}
      <span className="sr-only" role="status" aria-live="polite" data-testid="mora-status">{SPIRIT_LABEL[mood]}</span>
    </span>
  );
}

/**
 * Bühnen-Figur der Garderobe: kein Umherfliegen, nur Atmen, Blinzeln, Drehen und ein Freudensprung bei jeder Änderung.
 * `hop` zählt hoch → Sprung; `turn` zählt hoch → einmal herumdrehen.
 */
export function PixelMoraStage({ wardrobe, scale = 2, hop = 0, turn = 0, reduced = false }: { wardrobe: Wardrobe; scale?: number; hop?: number; turn?: number; reduced?: boolean }) {
  const [eyes, setEyes] = useState<Eyes>('eyes');
  useEffect(() => {
    if (reduced) return;
    let t: ReturnType<typeof setTimeout>;
    const blink = () => { setEyes('eyes_closed'); setTimeout(() => setEyes('eyes'), 140); t = setTimeout(blink, 2400 + Math.random() * 3000); };
    t = setTimeout(blink, 1600); return () => clearTimeout(t);
  }, [reduced]);
  const px = 140 * scale;
  return (
    <span className="px-mora px-mora--stage" data-testid="mora-stage" data-hop={hop} data-turn={turn} style={{ width: px, height: px }} aria-hidden>
      <span key={`h${hop}`} className={`px-mora__bob${hop ? ' px-mora__bob--hop' : ''}`}>
        <span key={`t${turn}`} className={`px-mora__turn${turn ? ' px-mora__turn--go' : ''}`}>
          <Layers eyes={eyes} wardrobe={wardrobe} tier={140} />
        </span>
      </span>
    </span>
  );
}
