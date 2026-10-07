'use client';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { Button, MoraStone, SampleTag, Stack, Status, Surface, Text } from '@/components/os-kit';
import type { Landscape, Planet, PlanetId, Strand } from '../data/landscape';

const PLANET_VAR: Record<PlanetId, string> = {
  today: 'today', post: 'post', finance: 'finance', knowledge: 'knowledge', spaces: 'spaces', connections: 'connections', labs: 'labs',
};
/** Degrees per second; inner ring clockwise, outer ring slower counter-clockwise. */
const RING_SPEED = [360 / 360, -360 / 620] as const;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

function useSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: 1000, h: 640 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize((s) => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: r.width, h: r.height }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** Slow orbit clock (seconds). Stops with reduced motion, while focused or when the tab is hidden. */
function useOrbitClock(running: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      if (acc >= 1 / 30) { const step = acc; acc = 0; if (!document.hidden) setT((v) => v + step); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
  return t;
}

interface Placed { planet: Planet; x: number; y: number; d: number; depth: number }

export interface UniverseLandscapeProps {
  landscape: Landscape;
  sample: boolean;
  onOpenArea: (target: string) => void;
  onAskMora: (text: string) => void;
  initialFocus?: PlanetId | null;
}

export function UniverseLandscape({ landscape, sample, onOpenArea, onAskMora, initialFocus = null }: UniverseLandscapeProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { w, h } = useSize(ref);
  const reduced = usePrefersReducedMotion();
  const [focusId, setFocusId] = useState<PlanetId | null>(initialFocus);
  const [hoverId, setHoverId] = useState<PlanetId | null>(null);
  // Orbit pauses while hovering a planet so it can be read and clicked calmly.
  const t = useOrbitClock(!reduced && !focusId && !hoverId);
  const mobile = w < 640;

  const geo = useMemo(() => {
    const cx = w / 2;
    const cy = h * (mobile ? 0.46 : 0.5);
    const tilt = mobile ? 0.92 : 0.44;
    const rx0 = mobile ? w * 0.27 : Math.min(w * 0.22, 310);
    const rx1 = mobile ? w * 0.43 : Math.min(w * 0.39, 560);
    const ry0 = Math.min(rx0 * (mobile ? tilt : 0.54), h * 0.26);
    const ry1 = Math.min(rx1 * tilt, h * 0.4);
    return { cx, cy, rings: [{ rx: rx0, ry: ry0 }, { rx: rx1, ry: ry1 }], base: mobile ? 44 : 70 };
  }, [w, h, mobile]);

  const placed = useMemo<Placed[]>(() => landscape.planets.map((planet) => {
    const ring = geo.rings[planet.ring];
    const a = ((planet.angle + t * RING_SPEED[planet.ring]) * Math.PI) / 180;
    const depth = (Math.sin(a) + 1) / 2; // 0 back … 1 front
    const scale = 0.82 + depth * 0.3;
    return { planet, x: geo.cx + ring.rx * Math.cos(a), y: geo.cy + ring.ry * Math.sin(a), d: geo.base * planet.size * scale, depth };
  }), [landscape.planets, geo, t]);

  const byId = useMemo(() => new Map(placed.map((p) => [p.planet.id, p])), [placed]);
  const focused = focusId ? byId.get(focusId) ?? null : null;

  // Camera: centre the focused planet in the free space left of the panel (desktop) / above the sheet (mobile).
  const camera = useMemo(() => {
    if (!focused) return { x: 0, y: 0, s: 1 };
    const s = mobile ? 1.5 : 1.7;
    const targetX = mobile ? w / 2 : (w - 420) / 2;
    const targetY = mobile ? h * 0.3 : h / 2;
    return { x: targetX - focused.x * s, y: targetY - focused.y * s, s };
  }, [focused, mobile, w, h]);

  const close = useCallback(() => setFocusId(null), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const strandPath = (s: Strand) => {
    const to = byId.get(s.to);
    const from = s.from === 'mora' ? { x: geo.cx, y: geo.cy } : byId.get(s.from);
    if (!to || !from) return null;
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    // Bow slightly toward the core so strands read as part of one system.
    const qx = mx + (geo.cx - mx) * 0.35;
    const qy = my + (geo.cy - my) * 0.35 - 14;
    return `M ${from.x} ${from.y} Q ${qx} ${qy} ${to.x} ${to.y}`;
  };

  const attention = landscape.attention;

  return (
    <div
      ref={ref}
      className="os-ulx"
      data-testid="universe-landscape"
      data-focus={focusId ?? ''}
      data-motion={!reduced && !focusId ? 'orbit' : 'still'}
      data-layout={mobile ? 'mobile' : 'desktop'}
    >
      <div
        className="os-ulx__stage"
        style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.s})` }}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      >
        <svg className="os-ulx__svg" width={w} height={h} aria-hidden>
          {geo.rings.map((r, i) => (
            <ellipse key={i} cx={geo.cx} cy={geo.cy} rx={r.rx} ry={r.ry} className={i === 0 ? 'os-ulx__orbit' : 'os-ulx__orbit os-ulx__orbit--outer'} />
          ))}
          {landscape.strands.map((s) => {
            const d = strandPath(s);
            if (!d) return null;
            const lit = !focusId || s.to === focusId || s.from === focusId;
            return (
              <path key={s.id} d={d} data-strand={s.id} data-evidence={s.evidence}
                className={`os-ulx__strand os-ulx__strand--${s.evidence}${lit ? '' : ' os-ulx__strand--dim'}`}>
                <title>{s.label}{s.evidence === 'inferred' ? ' (vermutet)' : ''}</title>
              </path>
            );
          })}
        </svg>

        <button type="button" className="os-ulx__core" style={{ left: geo.cx, top: geo.cy }} data-testid="universe-core"
          aria-label="MÔRA – Kern des Universe. Fragen"
          onClick={() => onAskMora(attention ? `Ich bin im Universe. Was steckt hinter „${attention.message}“?` : 'Was zeigt mir das Universe gerade?')}>
          <span className="os-ulx__core-ring" aria-hidden />
          <span className="os-ulx__core-ring os-ulx__core-ring--2" aria-hidden />
          <MoraStone size={mobile ? 58 : 92} thinking={false} />
          <span className="os-ulx__core-label">MÔRA</span>
        </button>

        {placed.map(({ planet, x, y, d, depth }) => {
          const isFocus = planet.id === focusId;
          const dim = Boolean(focusId) && !isFocus;
          const v = PLANET_VAR[planet.id];
          return (
            <div key={planet.id} className="os-ulx__planet-wrap" style={{ left: x, top: y, zIndex: 10 + Math.round(depth * 10) + (isFocus ? 20 : 0), opacity: dim ? 0.14 : 1 }}>
              {isFocus ? (
                <div className="os-ulx__moons" style={{ width: d * 3.1, height: d * 3.1 }} aria-label={`Monde von ${planet.title}`}>
                  {planet.moons.map((m, i) => {
                    const a = (i / Math.max(1, planet.moons.length)) * Math.PI * 2 - Math.PI / 2;
                    return (
                      <span key={m.id} className="os-ulx__moon" style={{ left: `${50 + Math.cos(a) * 46}%`, top: `${50 + Math.sin(a) * 46}%` }} data-moon={m.id}>
                        <span className="os-ulx__moon-dot" aria-hidden /><span className="os-ulx__moon-label">{m.label}</span>
                      </span>
                    );
                  })}
                </div>
              ) : null}
              <button
                type="button"
                className={`os-ulx__planet${isFocus ? ' is-focus' : ''}${hoverId === planet.id ? ' is-hover' : ''}${attention?.planetId === planet.id ? ' is-attention' : ''}`}
                data-planet={planet.id}
                data-tone={planet.tone}
                aria-label={`${planet.title} – ${planet.role}${planet.signals[0] ? ` · ${planet.signals[0].label}` : ''}. Hineinzoomen`}
                aria-pressed={isFocus}
                style={{ width: d, height: d, ['--pl' as string]: `var(--os-planet-${v}-light)`, ['--pd' as string]: `var(--os-planet-${v}-deep)` }}
                onMouseEnter={() => setHoverId(planet.id)}
                onMouseLeave={() => setHoverId((cur) => (cur === planet.id ? null : cur))}
                onFocus={() => setHoverId(planet.id)}
                onBlur={() => setHoverId(null)}
                onClick={(e) => { e.stopPropagation(); setFocusId(isFocus ? null : planet.id); }}
              >
                <span className="os-ulx__sphere" aria-hidden />
                {!isFocus && planet.moons.slice(0, mobile ? 2 : 3).map((m, i) => (
                  <span key={m.id} className="os-ulx__satellite" aria-hidden style={{ ['--r' as string]: `${d * 0.72}px`, ['--start' as string]: `${(i * 360) / Math.min(mobile ? 2 : 3, planet.moons.length)}deg` }} />
                ))}
                {planet.signals.length ? <span className={`os-ulx__signal os-ulx__signal--${planet.signals[0].tone}`} aria-hidden /> : null}
              </button>
              <div className="os-ulx__label" style={{ top: d / 2 + 8, visibility: dim ? 'hidden' : undefined }}>
                <span className="os-ulx__name">{planet.title}</span>
                {!mobile || isFocus ? <span className="os-ulx__role">{hoverId === planet.id && planet.signals[0] ? planet.signals[0].label : planet.role}</span> : null}
              </div>
            </div>
          );
        })}
      </div>

      {!focused && attention ? (
        <button type="button" className="os-ulx__attention" data-testid="universe-attention" onClick={() => setFocusId(attention.planetId)}>
          <MoraStone size={18} halo={false} />
          <span>MÔRA schaut auf <strong>{attention.message}</strong></span>
          {sample ? <SampleTag /> : null}
        </button>
      ) : null}

      {!focused ? (
        <div className="os-ulx__legend" aria-hidden>
          <span><i className="os-ulx__key os-ulx__key--assigned" />belegt</span>
          <span><i className="os-ulx__key os-ulx__key--inferred" />vermutet</span>
          <span><i className="os-ulx__key os-ulx__key--signal" />Signal</span>
        </div>
      ) : null}

      {focused ? (
        <Surface padding={5} variant="strong" className="os-ulx__detail" data-testid="universe-detail" aria-label={`${focused.planet.title} – Details`}>
          <Stack gap={3}>
            <Stack direction="row" justify="space-between" align="flex-start" gap={2}>
              <Stack gap={1} className="min-w-0">
                <Stack direction="row" gap={2} align="center"><Text variant="eyebrow">{focused.planet.role}</Text>{focused.planet.sample ? <SampleTag /> : null}</Stack>
                <Text variant="display" as="h2" className="os-ulx__detail-title">{focused.planet.title}</Text>
              </Stack>
              <Button variant="ghost" iconOnly aria-label="Zurück zur Übersicht" icon={<X size={16} />} onClick={close} />
            </Stack>
            <Text>{focused.planet.summary}</Text>
            {focused.planet.metrics.length ? (
              <div className="os-ulx__metrics">
                {focused.planet.metrics.map((m) => (
                  <div key={m.label}><Text variant="title" as="div">{m.value}</Text><Text variant="meta">{m.label}</Text></div>
                ))}
              </div>
            ) : null}
            {focused.planet.signals.length ? (
              <Stack direction="row" gap={2} wrap>{focused.planet.signals.map((s) => <Status key={s.id} tone={s.tone}>{s.label}</Status>)}</Stack>
            ) : null}
            {focused.planet.moons.length ? (
              <div>
                <Text variant="eyebrow" className="mb-2">Monde</Text>
                <div className="os-list">{focused.planet.moons.map((m) => <div key={m.id} className="os-list-row"><Text tone="default" className="truncate">{m.label}</Text></div>)}</div>
              </div>
            ) : null}
            {landscape.strands.filter((s) => s.to === focused.planet.id || s.from === focused.planet.id).map((s) => (
              <Text key={s.id} variant="meta">{s.evidence === 'inferred' ? '┄ vermutet: ' : '— belegt: '}{s.label}</Text>
            ))}
            <Stack direction="row" gap={2} wrap>
              <Button variant="primary" icon={<ArrowRight size={14} />} onClick={() => onOpenArea(focused.planet.target)} data-testid="universe-open-area">Bereich öffnen</Button>
              <Button variant="ghost" onClick={() => onAskMora(`Erkläre mir ${focused.planet.title} im Universe: was ist dort gerade wichtig?`)}>MÔRA fragen</Button>
            </Stack>
          </Stack>
        </Surface>
      ) : null}
    </div>
  );
}
