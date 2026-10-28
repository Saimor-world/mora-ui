'use client';
import React from 'react';
import { GlassOrb } from '@/components/world/GlassOrb';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';

/** Planetensystem der Firma: Abteilungen als Glasplaneten auf einer ruhigen Ellipse um das Café. */
const SLOTS: Record<string, { x: number; y: number; size: number }> = {
  verwaltung: { x: 50, y: 21, size: 118 },
  service: { x: 17, y: 50, size: 112 },
  kueche: { x: 83, y: 50, size: 112 },
  aushilfe: { x: 50, y: 77, size: 96 },
};

export function PlanetSystem({ planets, onOpen, attention, company, compact }: { planets: DemoPlanet[]; onOpen: (id: string) => void; attention: Set<string>; company: string; compact?: boolean }) {
  return (
    <div className={compact ? 'ck-sys ck-sys--compact' : 'ck-sys'} data-testid="planet-system">
      <svg className="ck-sys__orbit" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <ellipse cx="50" cy="49" rx="33" ry="28" />
        <ellipse className="ck-sys__orbit2" cx="50" cy="49" rx="44" ry="37" />
      </svg>
      <div className="ck-sys__core" aria-hidden><span />{company}</div>
      {planets.map((p) => {
        const s = SLOTS[p.id] ?? { x: 50, y: 50, size: 100 };
        return (
          <button key={p.id} type="button" className="ck-planet" style={{ left: `${s.x}%`, top: `${s.y}%` }} onClick={() => onOpen(p.id)} data-testid={`open-${p.id}`}>
            <GlassOrb size={compact ? Math.round(s.size * 0.62) : s.size} variant={p.glass} />
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
            const y = 30 + Math.pow((t - 0.5) * 2, 2) * 12;
            return (
              <button key={m.id} type="button" className="ck-moon" aria-pressed={activeMoon === m.id} style={{ left: `${x}%`, top: `${y}%` }} onClick={() => onMoon(m.id)} data-testid={`moon-${m.id}`}>
                <GlassOrb size={60} variant={planet.glass} />
                <b>{m.title}</b><small>{m.files.length} {m.files.length === 1 ? 'Eintrag' : 'Einträge'}</small>
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="ck-horizon" style={{ ['--glass' as string]: `url(/universe/glass/half.png)` }}>
        <div className="ck-horizon__img" />
        <div className="ck-horizon__title">{planet.title}</div>
      </div>
    </div>
  );
}
