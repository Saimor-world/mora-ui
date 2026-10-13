'use client';

/**
 * Universe v2 – Planetenkörper mit echter Kugeltiefe.
 *
 * Schichten (unten → oben):
 *  1. Material je Bereich (Grundton + Oberflächenstruktur aus SVG-Rauschen,
 *     langsam verschoben = sanfte Rotation; reduced-motion: steht still)
 *  2. Terminator (Tag/Nacht-Grenze, Licht von oben links)
 *  3. Randverdunkelung (limb darkening)
 *  4. Atmosphärensaum: feine helle Sichel auf der Lichtseite, kein Glow-Klumpen
 *  5. Orbitring: haarfeine, geneigte Ellipse (vorne über, hinten unter dem Körper)
 */
import React, { useId } from 'react';

type Material = {
  /** Tag-, Mittel-, Nachtton */
  day: string; mid: string; night: string;
  /** Rauschen: Grundfrequenz x/y (Bänder = flaches y), Oktaven */
  fx: number; fy: number; oct: number;
  /** Strukturkontrast 0..1 */
  relief: number;
  /** Atmosphäre (rgb) */
  atmo: string;
  ring?: boolean;
};

const MATERIALS: Record<string, Material> = {
  // Finanzen: warmes Gold-Ocker mit Wolkenbändern (Gasriese)
  finanzen: { day: '#e9cf95', mid: '#a7793a', night: '#2a1a0b', fx: 0.35, fy: 9, oct: 3, relief: 0.55, atmo: '247,226,180', ring: true },
  // Post & Termine: tiefer Ozean mit Wolkenschleiern
  post: { day: '#9cc4d8', mid: '#2f5f7c', night: '#06121c', fx: 2.4, fy: 2.4, oct: 4, relief: 0.45, atmo: '170,215,240' },
  // Werkstatt: Kupfer/Rost, felsig
  werkstatt: { day: '#d9a07a', mid: '#7c4126', night: '#1a0b05', fx: 3.2, fy: 3.2, oct: 5, relief: 0.7, atmo: '240,190,160' },
  // Wissen: Indigo-Marmor
  wissen: { day: '#b9b2dc', mid: '#4d4782', night: '#0c0a1c', fx: 1.6, fy: 3.4, oct: 4, relief: 0.5, atmo: '205,200,245' },
  // Wache: Eis/Tiefsee-Teal, ruhig
  wache: { day: '#bfe0da', mid: '#3d7470', night: '#061413', fx: 0.8, fy: 6, oct: 3, relief: 0.4, atmo: '190,235,228' },
  default: { day: '#d9d3c2', mid: '#6b6656', night: '#0e0d0a', fx: 2, fy: 3, oct: 4, relief: 0.45, atmo: '247,244,233' },
};

export function planetMaterialKey(name: string): keyof typeof MATERIALS {
  const n = name.toLowerCase();
  if (/finanz|wirtschaft|finance|buchhalt/.test(n)) return 'finanzen';
  if (/post|termin|kalender|mail/.test(n)) return 'post';
  if (/werkstatt|engineering|technik|product|produkt/.test(n)) return 'werkstatt';
  if (/wissen|knowledge|doku/.test(n)) return 'wissen';
  if (/wache|watch|sicherheit/.test(n)) return 'wache';
  return 'default';
}

export function PlanetSphere({ name, size, selected = false, seed = 1, glyph: Glyph }: { name: string; size: number; selected?: boolean; seed?: number; glyph?: React.ComponentType<any> }) {
  const uid = useId().replace(/:/g, '');
  const m = MATERIALS[planetMaterialKey(name)];
  const ringW = size * 1.9;
  const ringH = size * 0.42;
  return (
    <span className="uv2-planet absolute inset-0 block" data-planet-material={planetMaterialKey(name)} aria-hidden>
      {/* Ring hinten (hinter dem Körper) */}
      {m.ring && (
        <svg className="pointer-events-none absolute left-1/2 top-1/2" width={ringW} height={ringH} style={{ transform: 'translate(-50%,-50%) rotate(-14deg)', overflow: 'visible' }}>
          <ellipse cx={ringW / 2} cy={ringH / 2} rx={ringW / 2 - 1} ry={ringH / 2 - 1} fill="none" stroke={`rgba(${m.atmo},0.22)`} strokeWidth={0.75} />
          <ellipse cx={ringW / 2} cy={ringH / 2} rx={ringW / 2 - 7} ry={ringH / 2 - 4} fill="none" stroke={`rgba(${m.atmo},0.1)`} strokeWidth={2.5} />
        </svg>
      )}

      {/* Körper */}
      <span className="absolute inset-0 overflow-hidden rounded-full" style={{ background: m.night, boxShadow: `0 ${size * 0.18}px ${size * 0.5}px rgba(0,0,0,0.55)` }}>
        <svg className="uv2-planet-surface absolute inset-0 h-full" width="200%" viewBox="0 0 200 100" preserveAspectRatio="none" style={{ ['--uv2-rot' as any]: `${60 + (seed % 40)}s` }}>
          <defs>
            <filter id={`n${uid}`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency={`${m.fx / 100} ${m.fy / 100}`} numOctaves={m.oct} seed={seed % 97} stitchTiles="stitch" />
              <feColorMatrix type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${m.relief * 1.6} 0 0 0 ${-m.relief * 0.55}`} />
            </filter>
            <linearGradient id={`b${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={m.mid} />
              <stop offset="0.5" stopColor={m.day} />
              <stop offset="1" stopColor={m.mid} />
            </linearGradient>
          </defs>
          <rect width="200" height="100" fill={`url(#b${uid})`} />
          <rect width="200" height="100" filter={`url(#n${uid})`} style={{ mixBlendMode: 'overlay' }} />
          <rect width="200" height="100" filter={`url(#n${uid})`} opacity={0.5} style={{ mixBlendMode: 'multiply' }} />
        </svg>
        {/* Bereichszeichen: in die Oberfläche geprägt – unter Terminator & Randverdunkelung, darum gleich beleuchtet */}
        {Glyph && (
          <span data-testid="uv2-planet-glyph" className="uv2-planet-glyph absolute inset-0 flex items-center justify-center">
            <Glyph size={Math.round(size * 0.34)} strokeWidth={1.1} absoluteStrokeWidth
              style={{ color: 'rgba(255,250,236,0.62)', mixBlendMode: 'overlay', filter: 'drop-shadow(0 -0.6px 0 rgba(0,0,0,0.55)) drop-shadow(0 0.6px 0 rgba(255,248,230,0.45))' }} />
          </span>
        )}
        {/* Terminator: Licht oben links, Nacht unten rechts – weicher Übergang */}
        <span className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle at 30% 26%, rgba(255,250,235,0.20) 0%, rgba(255,250,235,0) 34%), linear-gradient(128deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.5) 52%, rgba(0,0,0,0.82) 66%, ${m.night} 86%)` }} />
        {/* Randverdunkelung */}
        <span className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 42% 40%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.42) 78%, rgba(0,0,0,0.8) 100%)' }} />
        {/* Atmosphäre: feiner Saum auf der Lichtseite */}
        <span className="absolute inset-0 rounded-full" style={{ boxShadow: `inset ${size * 0.035}px ${size * 0.035}px ${size * 0.06}px rgba(${m.atmo},0.38), inset 0 0 0 0.5px rgba(${m.atmo},0.22)` }} />
      </span>

      {/* Äußerer Atmosphärenschein – sehr leise, nur Lichtseite */}
      <span className="pointer-events-none absolute rounded-full" style={{ inset: -size * 0.06, background: `radial-gradient(circle at 34% 30%, rgba(${m.atmo},${selected ? 0.2 : 0.11}) 0%, rgba(${m.atmo},0) 62%)`, filter: 'blur(2px)' }} />

      {/* Ring vorne (über dem Körper, nur untere Hälfte) */}
      {m.ring && (
        <svg className="pointer-events-none absolute left-1/2 top-1/2" width={ringW} height={ringH} style={{ transform: 'translate(-50%,-50%) rotate(-14deg)', overflow: 'visible', clipPath: 'inset(50% 0 0 0)' }}>
          <ellipse cx={ringW / 2} cy={ringH / 2} rx={ringW / 2 - 1} ry={ringH / 2 - 1} fill="none" stroke={`rgba(${m.atmo},0.5)`} strokeWidth={0.75} />
          <ellipse cx={ringW / 2} cy={ringH / 2} rx={ringW / 2 - 7} ry={ringH / 2 - 4} fill="none" stroke={`rgba(${m.atmo},0.16)`} strokeWidth={2.5} />
        </svg>
      )}

      {/* Auswahl: haarfeiner Goldorbit statt Glow */}
      {selected && <span className="pointer-events-none absolute rounded-full" style={{ inset: -size * 0.16, border: '0.5px solid rgba(214,168,72,0.55)' }} />}
    </span>
  );
}

/** Mondfarbe passend zum Material (Tageston, leicht entsättigt). */
export function planetMoonTone(name: string): { day: string; atmo: string } {
  const m = MATERIALS[planetMaterialKey(name)];
  return { day: m.day, atmo: m.atmo };
}

/** Kleine Mondkugel mit eigener Beleuchtung (Licht oben links), kein Glow. */
export function moonBackground(name: string, freshness = 0.6): string {
  const { day } = planetMoonTone(name);
  return `radial-gradient(circle at 34% 30%, rgba(255,252,240,${(0.5 + freshness * 0.4).toFixed(2)}) 0%, ${day} 38%, rgba(0,0,0,0.85) 100%)`;
}

/**
 * Leise Begleitmonde, wenn ein Bereich noch keine Ordner hat: rein atmosphärisch,
 * nicht klickbar, ohne Namen – echte Ordner bleiben die echten Monde.
 */
export function AmbientMoons({ name, size, seed = 1 }: { name: string; size: number; seed?: number }) {
  const count = 1 + (seed % 2);
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden data-testid="uv2-ambient-moons" style={{ transform: `rotate(-12deg) scaleY(0.36)` }}>
      <span className="absolute left-1/2 top-1/2 rounded-full" style={{ width: size * 1.56, height: size * 1.56, marginLeft: -size * 0.78, marginTop: -size * 0.78, border: '1px solid rgba(247,244,233,0.05)' }} />
      {Array.from({ length: count }).map((_, i) => {
        const d = size * (0.78 + i * 0.2);
        const ms = Math.max(5, Math.round(size * (0.11 - i * 0.025)));
        return (
          <span key={i} className="saimor-moon-orbit absolute left-1/2 top-1/2" style={{ ['--moon-start' as any]: `${(seed * 37 + i * 140) % 360}deg`, ['--moon-distance' as any]: `${d.toFixed(1)}px`, ['--moon-duration' as any]: `${38 + (seed % 17) + i * 21}s` }}>
            <span className="absolute block rounded-full" style={{ width: ms, height: ms, marginLeft: -ms / 2, marginTop: -ms / 2, background: moonBackground(name, 0.5 - i * 0.15), opacity: 0.95 - i * 0.2, transform: 'scaleY(2.78)' }} />
          </span>
        );
      })}
    </span>
  );
}

/** Material eines Planeten für Innenansichten (Horizont). */
export function planetMaterial(name: string) { return MATERIALS[planetMaterialKey(name)]; }
