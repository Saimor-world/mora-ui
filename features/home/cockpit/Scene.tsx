'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GlassOrb } from '@/components/world/GlassOrb';
import { PixelSphere } from '@/components/universe/PlanetSphere';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';
import { stripFiktiv } from '@/lib/demo/morgenrot/stripFiktiv';
import { layoutOrbits, placeOnOrbit, type PlanetLabel } from '@/lib/universe/worldOrbits';
import { PixelPlanet, PixelMoon } from '@/components/world/PixelPlanet';
import { planetKind, seedOf } from '@/lib/universe/pixelArt';
import { toneSlot } from '@/lib/universe/matteTone';

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
}: {
  planets: DemoPlanet[];
  onOpen: (id: string) => void;
  attention: Set<string>;
  company: string;
  compact?: boolean;
  strip?: boolean;
  style?: 'glas' | 'pixel';
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

  return (
    <div
      ref={containerRef}
      className={`ck-sys${compact ? ' ck-sys--compact' : ''}${strip ? ' ck-sys--strip' : ''}`}
      data-testid="planet-system"
    >
      <svg className="ck-sys__orbit" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <ellipse cx="50" cy="49" rx="33" ry="28" />
        <ellipse className="ck-sys__orbit2" cx="50" cy="49" rx="44" ry="37" />
      </svg>
      <div className="ck-sys__core" aria-hidden><span />{stripFiktiv(company) || company}</div>
      {planets.map((p, i) => {
        const s = slots[i] ?? { x: size.width / 2, y: size.height / 2, size: 100 };
        const folderCount = p.moons?.length ?? 0;
        const orbSize = strip ? 48 : compact ? Math.round(s.size * 0.9) : s.size;
        const tint = tintForGlass(p.glass);
        const cleanTitle = stripFiktiv(p.title) || p.title;

        return (
          <button
            key={p.id}
            type="button"
            className="ck-planet"
            style={{
              left: `${s.x}px`,
              top: `${s.y}px`,
              ['--strip-x' as string]: `${((i + 0.5) / planets.length) * 100}%`,
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
            ) : (
              <GlassOrb size={orbSize} variant={p.glass} />
            )}
            <b>{cleanTitle}{attention.has(p.id) ? <i aria-label="braucht dich" /> : null}</b>
            <small>{folderCount > 0 ? `${folderCount} ${folderCount === 1 ? 'Ordner' : 'Ordner'}` : 'Noch keine Ordner'}</small>
          </button>
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
}: {
  planet: DemoPlanet;
  showMoons: boolean;
  onMoon: (id: string) => void;
  activeMoon: string | null;
  onOpenDept?: () => void;
  style?: 'glas' | 'pixel';
}) {
  const n = planet.moons?.length ?? 0;
  const tint = tintForGlass(planet.glass);
  const cleanPlanetTitle = stripFiktiv(planet.title) || planet.title;

  return (
    <div className="ck-open" data-testid={`planet-${planet.id}`}>
      {showMoons ? (
        n > 0 ? (
          <div className="ck-moons">
            {planet.moons.map((m, i) => {
              const t = n === 1 ? 0.5 : i / (n - 1);
              const x = 50 + (t - 0.5) * (n > 3 ? 64 : 48);
              const y = 36 + Math.pow((t - 0.5) * 2, 2) * 18;
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
                    cursor: isError ? 'not-allowed' : 'pointer',
                    opacity: isError ? 0.65 : 1,
                  }}
                  onClick={isError ? undefined : () => onMoon(m.id)}
                  data-testid={`moon-${m.id}`}
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
                    <GlassOrb size={90} variant={planet.glass} />
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
