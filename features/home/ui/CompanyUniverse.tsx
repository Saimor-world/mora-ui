'use client';
import React, { useState } from 'react';
import { Folder } from 'lucide-react';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';

/** Ruhiges Firmen-Universum: Planeten = Abteilungen, Monde = Ordner. Kein Weltraum-Jargon. */
export function CompanyUniverse({ planets, initial, onBack, company }: { planets: DemoPlanet[]; initial: string | null; onBack?: () => void; company: string }) {
  const [open, setOpen] = useState<string | null>(initial);
  const planet = planets.find((p) => p.id === open) ?? null;
  return (
    <div className="hm-uni" data-testid="company-universe">
      <div className="hm-uni__head">
        {onBack ? <button type="button" className="hm-link" onClick={onBack}>← Home</button> : <span />}
        <div className="hm-crumb">{company}{planet ? <> <span>›</span> {planet.title}</> : null}</div>
      </div>
      {planet ? (
        <div className="hm-planet" data-testid={`planet-${planet.id}`}>
          <div className="hm-orb hm-orb--xl" style={{ ['--hue' as string]: planet.hue }} />
          <h2 className="hm-h2">{planet.title}</h2>
          <div className="hm-moons">
            {planet.moons.map((m) => (
              <div key={m.id} className="hm-moon"><Folder size={18} strokeWidth={1.6} /><span>{m.title}</span><em>{m.count}</em></div>
            ))}
          </div>
          {planets.length > 1 ? <button type="button" className="hm-link" onClick={() => setOpen(null)}>Alle Bereiche</button> : null}
        </div>
      ) : (
        <div className="hm-sys">
          {planets.map((p, i) => (
            <button key={p.id} type="button" className="hm-sys__p" style={{ ['--hue' as string]: p.hue, ['--i' as string]: i }} onClick={() => setOpen(p.id)} data-testid={`open-${p.id}`}>
              <div className="hm-orb" /><b>{p.title}</b><span>{p.moons.length} Ordner</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
