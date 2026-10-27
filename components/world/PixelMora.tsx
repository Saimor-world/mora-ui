'use client';
import React, { useEffect, useRef, useState } from 'react';
import type { SpiritMood } from './MoraSpirit';
import { isNight, SPIRIT_LABEL } from './MoraSpirit';
import { decide, type Intent, type RoamPoint } from '@/lib/mora/pixelBrain';
import { wardrobeLayers, type Wardrobe } from '@/lib/mora/traits';
import { useWardrobe } from '@/lib/mora/useWardrobe';

const GRID = 40;
const SRC = '/mora/pixel/';
/** Grundkörper; Accessoires kommen aus der gemeinsamen Trait-Datei (lib/mora/mora-traits.json). */
function Layers({ eyes = 'eyes', wardrobe }: { eyes?: string; wardrobe: Wardrobe }) {
  const t = wardrobeLayers(wardrobe);
  const aura = t.filter((l) => l.slot === 'aura'); const rest = t.filter((l) => l.slot !== 'aura');
  return (<>
    {aura.map((l) => <img key={l.src} src={l.src} alt="" className="px-mora__l px-mora__aura" draggable={false} />)}
    {['body', 'light', 'face', eyes].map((b, i) => <img key={i} src={`${SRC}${b}.png`} alt="" className={`px-mora__l px-mora__${i === 3 ? 'eyes' : b}`} draggable={false} />)}
    {rest.map((l) => <img key={l.src} src={l.src} alt="" className={`px-mora__l px-mora__t-${l.slot}`} draggable={false} />)}
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
};

/** Statisches Pixel-MÔRA-Zeichen (Dock, Einstiege). */
export function PixelMoraMark({ size = 32, active = false, wardrobe }: { size?: number; active?: boolean; wardrobe?: Wardrobe }) {
  const [mine] = useWardrobe();
  return (
    <span className="px-mora px-mora--mark" data-testid="mora-mark" data-active={active ? 'true' : undefined} style={{ width: size, height: size }} aria-hidden>
      <Layers wardrobe={wardrobe ?? mine} />
    </span>
  );
}

export function PixelMora({ size, mood, target, phone = false, reduced = false, roam = [], fresh = null, wardrobe }: PixelMoraProps) {
  const [mine] = useWardrobe();
  const scale = Math.max(1, Math.round((size * 1.6) / GRID));
  const px = GRID * scale;
  const night = mood === 'night' || (mood === 'idle' && isNight());
  const busy = mood === 'thinking' || mood === 'speaking' || mood === 'listening' || mood === 'waiting';
  const flying = !!target;
  const [eyes, setEyes] = useState<'eyes' | 'eyes_closed' | 'eyes_l' | 'eyes_r'>('eyes');
  const [happy, setHappy] = useState(false);
  const [pose, setPose] = useState({ x: 0, y: 0, tilt: 0 });
  const box = useRef<HTMLSpanElement>(null);
  const goal = useRef({ x: 0, y: 0 });
  const cur = useRef({ x: 0, y: 0 });
  const look = useRef<0 | -1 | 1>(0);
  const live = useRef({ roam, fresh, night, busy, flying });
  live.current = { roam, fresh, night, busy, flying };

  // Entscheidungen: eigener Takt, aus echtem Zustand.
  useEffect(() => {
    if (reduced) return;
    let last: Intent | undefined; let t: ReturnType<typeof setTimeout>;
    const step = () => {
      const s = live.current;
      if (s.flying) { goal.current = { x: 0, y: 0 }; t = setTimeout(step, 1500); return; }
      const i = decide({ points: s.roam, fresh: s.fresh, night: s.night, busy: s.busy }, Math.random, last);
      if (i.kind === 'look' && last?.id === i.id) { last = { ...i, kind: 'visit' }; } else last = i;
      goal.current = { x: i.x, y: i.y };
      t = setTimeout(step, i.ms);
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
      const q = (v: number) => Math.round(v / scale) * scale;
      const tilt = Math.abs(vx) > 0.15 ? Math.sign(vx) * 8 : 0;
      setPose((p) => (p.x === q(c.x) && p.y === q(c.y) && p.tilt === tilt ? p : { x: q(c.x), y: q(c.y), tilt }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, scale]);

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
        <Layers eyes={eyes} wardrobe={wardrobe ?? mine} />
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
export function PixelMoraStage({ wardrobe, scale = 6, hop = 0, turn = 0, reduced = false }: { wardrobe: Wardrobe; scale?: number; hop?: number; turn?: number; reduced?: boolean }) {
  const [eyes, setEyes] = useState<'eyes' | 'eyes_closed'>('eyes');
  useEffect(() => {
    if (reduced) return;
    let t: ReturnType<typeof setTimeout>;
    const blink = () => { setEyes('eyes_closed'); setTimeout(() => setEyes('eyes'), 140); t = setTimeout(blink, 2400 + Math.random() * 3000); };
    t = setTimeout(blink, 1600); return () => clearTimeout(t);
  }, [reduced]);
  const px = GRID * scale;
  return (
    <span className="px-mora px-mora--stage" data-testid="mora-stage" data-hop={hop} data-turn={turn} style={{ width: px, height: px }} aria-hidden>
      <span key={`h${hop}`} className={`px-mora__bob${hop ? ' px-mora__bob--hop' : ''}`}>
        <span key={`t${turn}`} className={`px-mora__turn${turn ? ' px-mora__turn--go' : ''}`}>
          <Layers eyes={eyes} wardrobe={wardrobe} />
        </span>
      </span>
    </span>
  );
}
