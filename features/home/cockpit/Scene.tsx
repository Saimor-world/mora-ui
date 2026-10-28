'use client';
import React from 'react';
import { GlassOrb } from '@/components/world/GlassOrb';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';

/** Planetensystem der Firma: Abteilungen als Glasplaneten auf einer ruhigen Ellipse um das Café. */
const SLOTS = [
  { x: 18, y: 54, size: 120 }, { x: 49, y: 22, size: 146 },
  { x: 82, y: 48, size: 116 }, { x: 58, y: 78, size: 108 },
];

export function PlanetSystem({ planets, onOpen, attention, company, compact, strip }: { planets: DemoPlanet[]; onOpen: (id: string) => void; attention: Set<string>; company: string; compact?: boolean; strip?: boolean }) {
  return (
    <div className={`ck-sys${compact ? ' ck-sys--compact' : ''}${strip ? ' ck-sys--strip' : ''}`} data-testid="planet-system">
      <svg className="ck-sys__orbit" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <ellipse cx="50" cy="49" rx="33" ry="28" />
        <ellipse className="ck-sys__orbit2" cx="50" cy="49" rx="44" ry="37" />
      </svg>
      <div className="ck-sys__core" aria-hidden><span />{company}</div>
      {planets.map((p, i) => {
        const s = SLOTS[i % SLOTS.length];
        return (
          <button key={p.id} type="button" className="ck-planet" style={{ left: `${s.x}%`, top: `${s.y}%`, ['--strip-x' as string]: `${((i + .5) / planets.length) * 100}%` }} onClick={() => onOpen(p.id)} data-testid={`open-${p.id}`}>
            <GlassOrb size={strip ? 48 : compact ? Math.round(s.size * 0.9) : s.size} variant={p.glass} />
            <b>{p.title}{attention.has(p.id) ? <i aria-label="braucht dich" /> : null}</b>
            <small>{p.moons.length} Ordner</small>
          </button>
        );
      })}
    </div>
  );
}

/** Geöffneter Planet (Horizont) mit seinen Ordnern als Monde darüber. */
export function OpenPlanet({ planet, showMoons, onMoon, activeMoon }: { planet: DemoPlanet; showMoons: boolean; onMoon: (id: string) => void; activeMoon: string | null }) {
  const n = planet.moons.length;
  return (
    <div className="ck-open" data-testid={`planet-${planet.id}`}>
      {showMoons ? (
        <div className="ck-moons">
          {planet.moons.map((m, i) => {
            const t = n === 1 ? 0.5 : i / (n - 1);
            const x = 50 + (t - 0.5) * (n > 3 ? 64 : 48);
            const y = 36 + Math.pow((t - 0.5) * 2, 2) * 18;
            const phoneY = 30 + Math.pow((t - 0.5) * 2, 2) * (n > 3 ? 36 : 18);
            return (
              <button key={m.id} type="button" className="ck-moon" aria-pressed={activeMoon === m.id} style={{ left: `${x}%`, ['--moon-y' as string]: `${y}%`, ['--moon-y-phone' as string]: `${phoneY}%` }} onClick={() => onMoon(m.id)} data-testid={`moon-${m.id}`}>
                <GlassOrb size={90} variant={planet.glass} />
                <b>{m.title}</b><small>{m.files.length} {m.files.length === 1 ? 'Eintrag' : 'Einträge'}</small>
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="ck-horizon" style={{ ['--glass' as string]: `url(/universe/glass/half.png)` }}>
        <div className="ck-horizon__img" />
      </div>
      <h2 className="ck-horizon__title">{planet.title}</h2>
    </div>
  );
}
