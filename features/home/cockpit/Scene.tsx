'use client';
import React from 'react';
import { GlassOrb, glassVariantFor } from '@/components/world/GlassOrb';
import { PixelSphere } from '@/components/universe/PlanetSphere';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';
import { stripFiktiv } from '@/lib/demo/morgenrot/stripFiktiv';

/** Planetensystem der Firma: Abteilungen als Glas- oder Pixel-Planeten auf einer ruhigen Ellipse um das Café. */
const SLOTS = [
  { x: 18, y: 54, size: 120 }, { x: 49, y: 22, size: 146 },
  { x: 82, y: 48, size: 116 }, { x: 58, y: 78, size: 108 },
];

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
  return (
    <div className={`ck-sys${compact ? ' ck-sys--compact' : ''}${strip ? ' ck-sys--strip' : ''}`} data-testid="planet-system">
      <svg className="ck-sys__orbit" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <ellipse cx="50" cy="49" rx="33" ry="28" />
        <ellipse className="ck-sys__orbit2" cx="50" cy="49" rx="44" ry="37" />
      </svg>
      <div className="ck-sys__core" aria-hidden><span />{stripFiktiv(company) || company}</div>
      {planets.map((p, i) => {
        const s = SLOTS[i % SLOTS.length];
        const folderCount = p.moons?.length ?? 0;
        const orbSize = strip ? 48 : compact ? Math.round(s.size * 0.9) : s.size;
        const tint = tintForGlass(p.glass);
        const cleanTitle = stripFiktiv(p.title) || p.title;

        return (
          <button
            key={p.id}
            type="button"
            className="ck-planet"
            style={{ left: `${s.x}%`, top: `${s.y}%`, ['--strip-x' as string]: `${((i + .5) / planets.length) * 100}%` }}
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
              <GlassOrb size={orbSize} variant={glassVariantFor(cleanTitle)} />
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
                    <div
                      style={{
                        width: 90,
                        height: 90,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        position: 'relative',
                        marginBottom: 6,
                        imageRendering: 'pixelated',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                      }}
                    >
                      <PixelSphere size={90} lit={0.8} tint={tint} variant="A" seed={i + 20} />
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
      <div className="ck-horizon" style={{ ['--glass' as string]: `url(/universe/glass/half.png)` }}>
        <div className="ck-horizon__img" />
      </div>
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
