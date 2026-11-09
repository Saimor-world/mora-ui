'use client';
import { SemanticConstellation } from '@/components/visual/SemanticConstellation';
import type { MyceliumThread } from '@/lib/universe/homeMycelium';
import { activityScale } from '@/lib/universe/planetActivity';
import { skyLayout } from '@/lib/universe/skyLayout';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GlassOrb, glassVariantFor } from '@/components/world/GlassOrb';
import { PixelSphere } from '@/components/universe/PlanetSphere';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';
import { stripFiktiv } from '@/lib/demo/morgenrot/stripFiktiv';
import { layoutOrbits, placeOnOrbit, type PlanetLabel } from '@/lib/universe/worldOrbits';
import { PixelPlanet, PixelMoon } from '@/components/world/PixelPlanet';
import type { DayMoon } from '@/lib/universe/dayMoons';
import { planetKind, seedOf } from '@/lib/universe/pixelArt';
import { toneSlot } from '@/lib/universe/matteTone';

/** Größe des offenen Planeten in der Abteilung; Home fliegt genau auf diese Größe zu (nahtlose Übergabe). */
export const OPEN_PLANET_SIZE = 260;

/**
 * Die Farbe jedes Planeten, wie sie das Universe zeigt (bridge-concept.css färbt dort nach Position 7n+k;
 * Planet i ist dort Kind i+3). Home und die Abteilung von innen benutzen genau diese Farbe.
 */
const PLANET_HUES: [number, number, string][] = [
  [75, 1.3, '190,170,255'], [0, 1.35, '120,200,255'], [40, 1.4, '140,160,255'], [-50, 1.5, '120,230,190'],
  [110, 1.3, '220,150,230'], [170, 1.3, '255,190,130'], [-90, 1.4, '150,230,140'],
];
export function planetColor(index: number): React.CSSProperties {
  const [h, sat, glow] = PLANET_HUES[(Math.max(0, index) + 3) % 7];
  return { ['--pf' as string]: `hue-rotate(${h}deg) saturate(${sat})`, ['--pg' as string]: `rgba(${glow},.32)` };
}

export interface PlanetSlot {
  x: number;
  y: number;
  size: number;
  angle?: number;
  ring?: number;
}

/**
 * Berechnet für n Planeten dynamische, kollisionsfreie Positionen über layoutOrbits.
 * Verhindert Überlappungen von Planeten und Labels bei beliebig vielen Abteilungen.
 */
export function computePlanetSlots(
  planets: Array<{ id: string; title: string; moons?: unknown[] }>,
  options?: { width?: number; height?: number; phone?: boolean; compact?: boolean }
): PlanetSlot[] {
  const n = planets.length;
  if (n === 0) return [];

  const width = Math.max(300, options?.width ?? 1200);
  const height = Math.max(240, options?.height ?? 680);
  const phone = options?.phone ?? width <= 820;
  const compact = options?.compact ?? false;

  const weights = planets.map((_, i) => 50 + (i % 3) * 10);
  const labels: PlanetLabel[] = planets.map((p) => ({
    name: stripFiktiv(p.title) || p.title,
    moons: p.moons?.length ?? 0,
  }));

  const layout = layoutOrbits({
    width,
    height,
    weights,
    phone,
    labels,
    moraBase: 0,
    calm: false,
    planetMul: compact ? 0.8 : 1,
  });

  const slots: PlanetSlot[] = layout.slots.map((slot) => {
    const pt = placeOnOrbit(layout, slot);
    return {
      x: Math.round(pt.x),
      y: Math.round(pt.y),
      size: slot.size,
      angle: slot.angle,
      ring: slot.ring,
    };
  });

  // Feinschliff: Garantiert Kollisionsfreiheit aller Bounding-Boxen (Kugeln und Beschriftungen)
  for (let pass = 0; pass < 20; pass++) {
    let moved = false;
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i];
        const b = slots[j];
        const rA = a.size / 2;
        const rB = b.size / 2;
        const titleA = planets[i].title;
        const titleB = planets[j].title;
        const wA = Math.min(phone ? 104 : 140, Math.max(60, titleA.length * 7));
        const wB = Math.min(phone ? 104 : 140, Math.max(60, titleB.length * 7));
        const h = 36;
        const boxesA = [
          { x0: a.x - rA, y0: a.y - rA, x1: a.x + rA, y1: a.y + rA },
          { x0: a.x - wA / 2, y0: a.y + rA + 4, x1: a.x + wA / 2, y1: a.y + rA + 4 + h },
        ];
        const boxesB = [
          { x0: b.x - rB, y0: b.y - rB, x1: b.x + rB, y1: b.y + rB },
          { x0: b.x - wB / 2, y0: b.y + rB + 4, x1: b.x + wB / 2, y1: b.y + rB + 4 + h },
        ];
        let hasOv = false;
        for (const ba of boxesA) {
          for (const bb of boxesB) {
            const ovW = Math.min(ba.x1, bb.x1) - Math.max(ba.x0, bb.x0);
            const ovH = Math.min(ba.y1, bb.y1) - Math.max(ba.y0, bb.y0);
            if (ovW > 0 && ovH > 0) {
              hasOv = true;
              break;
            }
          }
          if (hasOv) break;
        }
        if (hasOv) {
          const dx = a.x - b.x || 1;
          const dy = a.y - b.y || 1;
          const d = Math.hypot(dx, dy) || 1;
          const push = 3;
          a.x = Math.round(Math.max(rA + 4, Math.min(width - rA - 4, a.x + (dx / d) * push)));
          a.y = Math.round(Math.max(rA + 4, Math.min(height - rA - h - 8, a.y + (dy / d) * push)));
          b.x = Math.round(Math.max(rB + 4, Math.min(width - rB - 4, b.x - (dx / d) * push)));
          b.y = Math.round(Math.max(rB + 4, Math.min(height - rB - h - 8, b.y - (dy / d) * push)));
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  return slots;
}

function tintForGlass(glass: DemoPlanet['glass']): string {
  switch (glass) {
    case 'champagne': return '#F4D694';
    case 'sage': return '#86DCC9';
    case 'lavender': return '#A899E6';
    case 'bluegrey': return '#8CA8B5';
    default: return '#7EC9DC';
  }
}

export function PlanetSystem({
  planets,
  onOpen,
  attention,
  company,
  compact,
  strip,
  style = 'glas',
  signals,
  moons,
  onTaskDone,
  onMoonOpen,
  threads,
  marks,
  scale = 1,
  skyScale = 1,
}: {
  threads?: MyceliumThread[];
  /** Leise Zeichen je Planet aus echten Daten: Zahl überfälliger Aufgaben, Ring bei offener Nachtwache. */
  marks?: Map<string, { overdue: number; watch: boolean }>;
  /** Universe: Planeten größer und näher. */
  scale?: number;
  /** Home-Himmel: Planeten größer (Layout rechnet mit der echten Größe). */
  skyScale?: number;
  moons?: Map<string, DayMoon[]>;
  onTaskDone?: (taskId: string) => void;
  onMoonOpen?: (kind: DayMoon['kind']) => void;
  planets: DemoPlanet[];
  onOpen: (id: string) => void;
  attention: Set<string>;
  company: string;
  compact?: boolean;
  strip?: boolean;
  style?: 'glas' | 'pixel';
  signals?: Map<string, { isAlarm: boolean; reason: string }>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: compact ? 600 : 1200,
    height: compact ? 450 : 680,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const slots = useMemo(() => {
    return computePlanetSlots(planets, {
      width: size.width,
      height: size.height,
      phone: size.width <= 820,
      compact,
    });
  }, [planets, size.width, size.height, compact]);

  // Desktop-Home: ganzer Himmel, Tiefe nach echter Aktivität (Signal > Aufmerksamkeit > Ordner).
  const skySlots = useMemo(() => {
    if (!compact || strip || size.width < 600) return null;
    const weights = planets.map((p) => (signals?.get(p.id) ? 2 : 0) + (attention.has(p.id) ? 1 : 0) + Math.min(8, p.moons?.length ?? 0) / 8);
    return skyLayout(weights, size.width, size.height, skyScale);
  }, [planets, signals, attention, compact, strip, size.width, size.height, skyScale]);

  return (
    <div
      ref={containerRef}
      onPointerMove={skySlots ? (e) => { const el = e.currentTarget, r = el.getBoundingClientRect(); el.style.setProperty('--px', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3)); el.style.setProperty('--py', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3)); } : undefined}
      className={`ck-sys${compact ? ' ck-sys--compact' : ''}${strip ? ' ck-sys--strip' : ''}${scale > 1 ? ' ck-sys--big' : ''}`}
      data-testid="planet-system"
    >
      <svg className="ck-sys__orbit" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <ellipse cx="50" cy="49" rx="33" ry="28" />
        <ellipse className="ck-sys__orbit2" cx="50" cy="49" rx="44" ry="37" />
      </svg>
      {skySlots ? <SkyWeave planets={planets} slots={skySlots} threads={threads} width={size.width} height={size.height} /> : null}
      {skySlots ? null : <div className="ck-sys__core" aria-hidden><span />{stripFiktiv(company) || company}</div>}
      {planets.map((p, i) => {
        const sky = skySlots?.[i];
        const s = sky ?? slots[i] ?? { x: size.width / 2, y: size.height / 2, size: 100 };
        const folderCount = p.moons?.length ?? 0;
        const tint = tintForGlass(p.glass);
        const cleanTitle = stripFiktiv(p.title) || p.title;
        const active = !!(signals?.get(p.id) || attention.has(p.id));
        const orbSize = strip ? 48 : Math.round((sky ? sky.size : (compact ? s.size * 0.9 : s.size) * activityScale(folderCount, active)) * scale);
        const mark = marks?.get(p.id);

        const pm = !strip ? moons?.get(p.id) : undefined;
        return (
          <React.Fragment key={p.id}>
          {pm?.length ? <DayMoons moons={pm} x={s.x} y={s.y} r={orbSize / 2 + 16} onTaskDone={onTaskDone} onOpen={onMoonOpen} /> : null}
          <button
            type="button"
            className={active ? 'ck-planet ck-planet--active' : 'ck-planet'}
            data-active={active ? 'true' : undefined}
            data-watch={mark?.watch ? 'true' : undefined}
            data-planet-key={p.id}
            data-depth={sky ? (sky.depth >= 0.5 ? 'near' : 'far') : undefined}
            style={{
              left: `${s.x}px`,
              top: `${s.y}px`,
              ['--strip-x' as string]: `${((i + 0.5) / planets.length) * 100}%`,
              ['--drift' as string]: `${-(i * 2.7).toFixed(1)}s`,
              ...(sky ? { zIndex: 1 + Math.round(sky.depth * 10), ['--pd' as string]: (3 + 9 * sky.depth).toFixed(1) } : null),
              ['--orb' as string]: `${orbSize}px`,
              ...(skyScale > 1 ? planetColor(i) : null),
            }}
            onClick={() => onOpen(p.id)}
            data-testid={`open-${p.id}`}
          >
            {style === 'pixel' ? (
              <div
                style={{
                  width: orbSize,
                  height: orbSize,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  position: 'relative',
                  marginBottom: 6,
                  imageRendering: 'pixelated',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}
              >
                <PixelSphere size={orbSize} lit={0.8} tint={tint} variant="A" seed={i + 1} />
              </div>
            ) : sky ? (
              <GlassOrb size={orbSize} variant={glassVariantFor(cleanTitle)} className={skyScale > 1 ? 'ck-opal ck-opal--true' : 'ck-opal'}>
                <span className="ck-opal__milk" data-testid="planet-opal" aria-hidden />
                <span className="ck-opal__iris" aria-hidden />
                <span className="ck-opal__spec" aria-hidden />
              </GlassOrb>
            ) : (
              <GlassOrb size={orbSize} variant={glassVariantFor(cleanTitle)} />
            )}
            {mark?.watch ? <span className="ck-planet__ring" data-testid={`planet-ring-${p.id}`} aria-hidden /> : null}
            {mark?.overdue ? <span className="ck-planet__count" data-testid={`planet-count-${p.id}`} aria-label={`${mark.overdue} überfällig`}>{mark.overdue}</span> : null}
            <b>{cleanTitle}</b>
            {(() => {
              const sig = signals?.get(p.id) ?? null;
              if (!sig) return null;
              return (
                <span
                  className="ck-planet__signal"
                  data-testid={`planet-signal-${p.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 3,
                    fontSize: 11,
                    lineHeight: 1.2,
                    color: sig.isAlarm ? '#f87171' : '#fbbf24',
                    maxWidth: 150,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <i
                    style={{
                      display: 'inline-block',
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: sig.isAlarm ? '#ef4444' : '#f59e0b',
                      boxShadow: sig.isAlarm ? '0 0 6px rgba(239,68,68,0.7)' : '0 0 6px rgba(245,158,11,0.6)',
                      flexShrink: 0,
                    }}
                    aria-hidden
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sig.reason}
                  </span>
                </span>
              );
            })()}
          </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

const MOON_ICON: Record<DayMoon['kind'], string> = { task: '◯', mail: '✉', event: '◷' };

/** Monde = Tagesdinge der Abteilung. Antippen klappt sie an Ort und Stelle auf; Aufgaben lassen sich abhaken. */
export function DayMoons({ moons, x, y, r, onTaskDone, onOpen }: { moons: DayMoon[]; x: number; y: number; r: number; onTaskDone?: (taskId: string) => void; onOpen?: (kind: DayMoon['kind']) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(() => new Set());
  return (
    <div className="ck-daymoons" style={{ left: x, top: y }} data-testid="day-moons">
      {moons.map((m, i) => {
        const a = -Math.PI / 2 + Math.PI * 0.32 + (i * Math.PI * 0.36);
        const isDone = done.has(m.id);
        const isOpen = open === m.id;
        return (
          <div key={m.id} className="ck-daymoon" data-kind={m.kind} data-open={isOpen ? 'true' : undefined} data-done={isDone ? 'true' : undefined}
            style={{ ['--mx' as string]: `${Math.cos(a) * r}px`, ['--my' as string]: `${Math.sin(a) * r}px`, ['--md' as string]: `${-i * 1.3}s` }}>
            <button type="button" className="ck-daymoon__orb" aria-label={m.title} aria-expanded={isOpen}
              data-testid={`day-moon-${m.id}`} onClick={() => setOpen(isOpen ? null : m.id)} />
            {isOpen ? (
              <div className="ck-daymoon__card" data-testid={`day-moon-card-${m.id}`}>
                <span aria-hidden>{MOON_ICON[m.kind]}</span>
                <b>{m.title}</b>
                {m.when ? <time>{m.when}</time> : null}
                {m.kind === 'task' && m.taskId ? (
                  <button type="button" className="ck-daymoon__act" aria-pressed={isDone} aria-label="Erledigt" data-testid={`day-moon-done-${m.id}`}
                    onClick={() => { if (!isDone) { setDone((d) => new Set(d).add(m.id)); onTaskDone?.(m.taskId!); } }}>✓</button>
                ) : onOpen ? (
                  <button type="button" className="ck-daymoon__act" aria-label="Öffnen" onClick={() => onOpen(m.kind)}>→</button>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Geöffneter Planet (Horizont) mit seinen Ordnern als Monde darüber. */
export function OpenPlanet({
  planet,
  showMoons,
  onMoon,
  activeMoon,
  onOpenDept,
  style = 'glas',
  moonMarks,
  leaving,
  colorIndex,
}: {
  planet: DemoPlanet;
  showMoons: boolean;
  onMoon: (id: string) => void;
  activeMoon: string | null;
  onOpenDept?: () => void;
  style?: 'glas' | 'pixel';
  /** Leise Zeichen je Mond (Ordner) aus echten Daten: Aufgaben mit folder_id, Nachtwache mit node_id. */
  moonMarks?: Map<string, { overdue: number; watch: boolean }>;
  /** Rückflug: Monde ziehen sich zurück, bevor die Kamera hinausfährt. */
  leaving?: boolean;
  /** Position im Universe → dieselbe Planetenfarbe innen wie außen. */
  colorIndex?: number;
}) {
  const n = planet.moons?.length ?? 0;
  const tint = tintForGlass(planet.glass);
  const cleanPlanetTitle = stripFiktiv(planet.title) || planet.title;

  return (
    <div className={`ck-open ck-open--orbit${leaving ? ' is-leaving' : ''}`} data-testid={`planet-${planet.id}`} style={colorIndex !== undefined ? planetColor(colorIndex) : undefined}>
      {style !== 'pixel' && showMoons && n > 0 ? <i className="ck-open__path" aria-hidden /> : null}
      {style !== 'pixel' ? (
        <div className="ck-open__core" aria-hidden>
          <GlassOrb size={OPEN_PLANET_SIZE} variant={glassVariantFor(cleanPlanetTitle)} className="ck-opal ck-opal--true">
            <span className="ck-opal__milk" aria-hidden />
            <span className="ck-opal__iris" aria-hidden />
            <span className="ck-opal__spec" aria-hidden />
          </GlassOrb>
        </div>
      ) : null}
      {showMoons ? (
        n > 0 ? (
          <div className="ck-moons">
            {planet.moons.map((m, i) => {
              // Monde (echte Ordner/Spaces) kreisen um den Planeten – derselbe Raum wie Home.
              const deg = n <= 3 ? (n === 1 ? 180 : 196 + i * (148 / (n - 1))) : 270 + (i * 360) / n;
              const a = (deg * Math.PI) / 180;
              const x = 50 + Math.cos(a) * 25;
              const y = 30 + Math.sin(a) * 19;
              const mark = moonMarks?.get(m.id);
              const t = n === 1 ? 0.5 : i / (n - 1);
              const phoneY = 30 + Math.pow((t - 0.5) * 2, 2) * (n > 3 ? 36 : 18);
              const isError = Boolean(m.loadError || m.disabled);
              return (
                <button
                  key={m.id}
                  type="button"
                  className="ck-moon"
                  aria-pressed={activeMoon === m.id}
                  disabled={isError}
                  style={{
                    left: `${x}%`,
                    ['--moon-y' as string]: `${y}%`,
                    ['--moon-y-phone' as string]: `${phoneY}%`,
                    ['--i' as string]: i,
                    ['--orb' as string]: '96px',
                    cursor: isError ? 'not-allowed' : 'pointer',
                    opacity: isError ? 0.65 : 1,
                  }}
                  onClick={isError ? undefined : () => onMoon(m.id)}
                  data-testid={`moon-${m.id}`}
                  data-watch={mark?.watch ? 'true' : undefined}
                  title={isError ? (m.hint || 'Ordner gerade nicht ladbar') : undefined}
                >
                  {style === 'pixel' ? (
                    <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <PixelMoon
                        kind={planetKind(cleanPlanetTitle, toneSlot(cleanPlanetTitle))}
                        d={44}
                        x={22}
                        y={22}
                        seed={seedOf(m.id)}
                        light={{ x: -0.6, y: -0.6 }}
                        tasks={m.files.some((f) => f.name.toLowerCase().includes('aufgabe'))}
                      />
                    </div>
                  ) : (
                    <span className="ck-moon__body">
                      <GlassOrb size={96} variant={glassVariantFor(cleanPlanetTitle)} className="ck-opal ck-opal--true" />
                      {/* Die echten Einträge des Ordners als kleine Begleiter. */}
                      {m.files.slice(0, 6).map((f, k, all) => {
                        // oben links auf der Bahn, frei von Zahl (oben rechts) und Beschriftung (unten)
                        const b = ((188 + (k + 0.5) * (96 / all.length)) * Math.PI) / 180;
                        return <i key={f.id} className="ck-moon__doc" title={f.name} style={{ ['--bx' as string]: `${Math.cos(b) * 66}px`, ['--by' as string]: `${Math.sin(b) * 60}px` }} aria-hidden />;
                      })}
                      {mark?.watch ? <span className="ck-planet__ring" data-testid={`moon-ring-${m.id}`} aria-hidden /> : null}
                      {mark?.overdue ? <span className="ck-planet__count" data-testid={`moon-count-${m.id}`} aria-label={`${mark.overdue} überfällig`}>{mark.overdue}</span> : null}
                    </span>
                  )}
                  <b>{stripFiktiv(m.title) || m.title}</b>
                  <small style={isError ? { color: 'var(--amber, #f59e0b)' } : undefined}>
                    {isError ? (m.hint || 'Ordner gerade nicht ladbar') : `${m.files.length} ${m.files.length === 1 ? 'Eintrag' : 'Einträge'}`}
                  </small>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="ck-empty-horizon" style={{ position: 'absolute', top: 110, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', zIndex: 10 }}>
            <p style={{ color: 'var(--mute)', margin: '0 0 12px', fontSize: 14 }}>Noch keine Ordner in {cleanPlanetTitle}.</p>
            {onOpenDept ? (
              <button type="button" className="ck-btn ck-btn--p" onClick={onOpenDept}>
                Abteilung ansehen
              </button>
            ) : null}
          </div>
        )
      ) : null}
      {style === 'pixel' ? (
        <div className="ck-horizon ck-horizon--pixel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', overflow: 'hidden' }}>
          <div style={{ transform: 'translateY(42%) scale(2.6)', imageRendering: 'pixelated' }}>
            <PixelPlanet
              kind={planetKind(cleanPlanetTitle, toneSlot(cleanPlanetTitle))}
              size={360}
              seed={seedOf(planet.id)}
              light={{ x: -0.6, y: -0.6 }}
              folders={n}
              activity={1}
              open={1}
            />
          </div>
        </div>
      ) : (
        <div className="ck-horizon" style={{ ['--glass' as string]: `url(/universe/glass/half.png)` }}>
          <div className="ck-horizon__img" />
        </div>
      )}
      <h2
        className="ck-horizon__title"
        style={onOpenDept ? { cursor: 'pointer' } : undefined}
        onClick={onOpenDept}
        title="Details zu dieser Abteilung öffnen"
      >
        {cleanPlanetTitle}
      </h2>
    </div>
  );
}

/** Myzel + Sternbild: feine Fäden zwischen Bereichen mit gemeinsamer Arbeit, darüber ein stilles Sternbild. */
function SkyWeave({ planets, slots, threads, width, height }: {
  planets: DemoPlanet[]; slots: { x: number; y: number; size: number }[]; threads?: MyceliumThread[]; width: number; height: number;
}) {
  const idx = new Map(planets.map((p, i) => [p.id, i]));
  const paths = (threads ?? []).flatMap((t) => {
    const a = slots[idx.get(t.a) ?? -1], b = slots[idx.get(t.b) ?? -1];
    if (!a || !b) return [];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + Math.hypot(b.x - a.x, b.y - a.y) * 0.18;
    // feine Seitenfäden: kurze Abzweige an zwei Stellen entlang des Fadens
    const at = (u: number) => ({ x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * mx + u * u * b.x, y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * my + u * u * b.y });
    const fil = [0.32, 0.68].map((u, k) => {
      const p0 = at(u), p1 = at(u + 0.02), dx = p1.x - p0.x, dy = p1.y - p0.y, l = Math.hypot(dx, dy) || 1, s = (k ? -1 : 1) * 22;
      return `M ${p0.x} ${p0.y} q ${dx / l * 10 - dy / l * s * 0.5} ${dy / l * 10 + dx / l * s * 0.5} ${dx / l * 6 - dy / l * s} ${dy / l * 6 + dx / l * s}`;
    }).join(' ');
    return [{ id: `${t.a}~${t.b}`, d: `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`, fil, w: t.weight }];
  });
  // Sternbild in den Lücken zwischen den Planeten, nie auf ihnen.
  const band = Math.round(Math.min(96, height * 0.11));
  const xs = slots.slice(0, planets.length).map((s) => s.x).sort((a, b) => a - b);
  const stars = xs.slice(1).map((x, i) => ({ id: `s${i}`, x: (xs[i] + x) / 2, y: band * (0.35 + 0.45 * (((i * 37) % 7) / 6)), weight: 0.35 + 0.4 * (((i * 53) % 5) / 4) }));
  return (
    <>
      {paths.length ? (
        <svg className="ck-myc" data-testid="mycelium" width={width} height={height} aria-hidden>
          {paths.map((p, i) => (
            <g key={p.id} style={{ ['--w' as string]: p.w.toFixed(2) }}>
              <path d={p.d} style={{ animationDelay: `${-i * 2.3}s` }} />
              <path className="ck-myc__fil" d={p.fil} style={{ animationDelay: `${-i * 3.1}s` }} />
              <path className="ck-myc__pulse" d={p.d} pathLength={100} style={{ animationDelay: `${-i * 6}s` }} />
            </g>
          ))}
        </svg>
      ) : null}
      {stars.length > 1 ? (
        <div className="ck-constellation" data-testid="constellation" style={{ height: band }} aria-hidden>
          <SemanticConstellation center={{ x: width / 2, y: band * 0.2 }} satellites={stars} />
          <svg className="ck-constellation__lines" width={width} height={band}>
            <polyline points={stars.map((s) => `${s.x},${s.y}`).join(' ')} />
          </svg>
          {stars.map((s) => <i key={s.id} style={{ left: s.x, top: s.y, opacity: s.weight }} />)}
        </div>
      ) : null}
    </>
  );
}
