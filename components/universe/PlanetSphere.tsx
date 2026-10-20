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
  /** Oberflächenmerkmal: Wolken, Bänder, Krater, Wirbel, Kristalladern */
  feature?: 'clouds' | 'bands' | 'craters' | 'swirl' | 'veins';
};

const MATERIALS: Record<string, Material> = {
  // Refined Universe Glass tints — distinct, pastel, never grey. Match Verteilung bars.
  finanzen: { day: '#e8d09a', mid: '#c9a050', night: '#3a2a12', fx: 0.35, fy: 9, oct: 3, relief: 0.45, atmo: '247,226,180', feature: 'bands' },
  post: { day: '#8fb4ea', mid: '#3d6cb4', night: '#0e1a30', fx: 2.4, fy: 2.4, oct: 4, relief: 0.4, atmo: '186,214,245', feature: 'clouds' },
  werkstatt: { day: '#e0aa6a', mid: '#c47a30', night: '#2a1808', fx: 3.2, fy: 3.2, oct: 5, relief: 0.5, atmo: '250,214,170', feature: 'craters' },
  wissen: { day: '#c8b4e6', mid: '#7a5aaf', night: '#1a1230', fx: 1.6, fy: 3.4, oct: 4, relief: 0.42, atmo: '220,205,245', feature: 'veins' },
  wache: { day: '#7fd4c8', mid: '#2f8a80', night: '#0a221f', fx: 0.8, fy: 6, oct: 3, relief: 0.35, atmo: '186,236,228', feature: 'clouds' },
  markt: { day: '#e090b8', mid: '#b04a86', night: '#2a1020', fx: 1.4, fy: 2.8, oct: 4, relief: 0.4, atmo: '245,196,220', feature: 'swirl' },
  betrieb: { day: '#f0c4bc', mid: '#c07878', night: '#2a1216', fx: 0.5, fy: 7, oct: 3, relief: 0.38, atmo: '246,210,214', feature: 'bands' },
  rd: { day: '#a8d090', mid: '#5a9450', night: '#122014', fx: 2.8, fy: 2.2, oct: 5, relief: 0.42, atmo: '200,232,190', feature: 'clouds' },
  default: { day: '#d9d3c2', mid: '#6b6656', night: '#0e0d0a', fx: 2, fy: 3, oct: 4, relief: 0.45, atmo: '247,244,233' },
};

/** Planeten-Modell v1: Archetypen vom Server — Farbe folgt dem Bereich, nicht dem Gesteinsnamen. */
const ARCHETYPE_MATERIALS: Record<string, Material> = {
  'gas-gold': MATERIALS.finanzen,
  ocean: MATERIALS.post,
  'marble-indigo': MATERIALS.wissen,
  ice: MATERIALS.wache,
  'copper-rock': MATERIALS.werkstatt,
  forest: MATERIALS.markt,
  coral: MATERIALS.betrieb,
  'nebula-violet': MATERIALS.wissen,
  'sand-dune': MATERIALS.betrieb,
  'crystal-teal': MATERIALS.wache,
  ember: MATERIALS.werkstatt,
  pearl: MATERIALS.rd,
};
export function archetypeMaterial(archetype?: string | null): Material | null {
  return (archetype && ARCHETYPE_MATERIALS[archetype]) || null;
}

export function planetMaterialKey(name: string): keyof typeof MATERIALS {
  const n = name.toLowerCase();
  if (/finanz|wirtschaft|finance|buchhalt/.test(n)) return 'finanzen';
  if (/post|termin|kalender|mail/.test(n)) return 'post';
  if (/werkstatt|engineering|technik|product|produkt/.test(n)) return 'werkstatt';
  if (/wissen|knowledge|doku/.test(n)) return 'wissen';
  if (/wache|watch|sicherheit/.test(n)) return 'wache';
  if (/markt|market|sales|vertrieb/.test(n)) return 'markt';
  if (/betrieb|operations|ops/.test(n)) return 'betrieb';
  if (/r&d|forschung|research/.test(n)) return 'rd';
  return 'default';
}

export function PlanetSphere({ name, size, selected = false, seed = 1, glyph: Glyph, archetype, dim = false, lit }: { name: string; size: number; selected?: boolean; seed?: number; glyph?: React.ComponentType<any>; archetype?: string | null; dim?: boolean | 'seed' | 'sleeping'; /** Richtung zur Sonne (Bogenmaß, Bildschirm) – schaltet die echte Kugelschattierung ein */ lit?: number }) {
  const uid = useId().replace(/:/g, '');
  const m = archetypeMaterial(archetype) || planetMaterial(name);
  const pstyle = usePixelStyle();
  const ringW = size * 1.9;
  const ringH = size * 0.42;
  return (
    <span className="uv2-planet absolute inset-0 block" data-planet-material={archetype || planetMaterialKey(name)} data-planet-dim={dim ? '' : undefined} style={dim ? { filter: dim === 'sleeping' ? 'saturate(0.9) brightness(0.86)' : 'saturate(0.6) brightness(0.74)' } : undefined} aria-hidden>
      {/* Ring hinten (hinter dem Körper) */}
      {m.ring && (
        <svg className="pointer-events-none absolute left-1/2 top-1/2" width={ringW} height={ringH} style={{ transform: 'translate(-50%,-50%) rotate(-14deg)', overflow: 'visible' }}>
          <ellipse cx={ringW / 2} cy={ringH / 2} rx={ringW / 2 - 1} ry={ringH / 2 - 1} fill="none" stroke={`rgba(${m.atmo},0.22)`} strokeWidth={0.75} />
          <ellipse cx={ringW / 2} cy={ringH / 2} rx={ringW / 2 - 7} ry={ringH / 2 - 4} fill="none" stroke={`rgba(${m.atmo},0.1)`} strokeWidth={2.5} />
        </svg>
      )}

      {/* Körper */}
      {pstyle && lit != null && (pstyle === 'J' || pstyle === 'M') ? <WorldSphere size={size} lit={lit} hue={glassHue(name, archetype)} seed={seed} quiet={!!dim} feature={m.feature || 'clouds'} day={m.day} night={m.night} atmo={m.atmo} selected={selected} /> : pstyle && lit != null ? <PixelSphere size={size} lit={lit} tint={planetMaterial(name).day} variant={pstyle} seed={seed} /> : <span className="absolute inset-0 overflow-hidden rounded-full" style={{ background: m.night, boxShadow: `0 ${size * 0.18}px ${size * 0.5}px rgba(0,0,0,0.55)` }}>
        <svg className="uv2-planet-surface absolute inset-0 h-full" width="200%" viewBox="0 0 200 100" preserveAspectRatio="none" style={{ ['--uv2-rot' as any]: `${60 + (seed % 40)}s` }}>
          <defs>
            <filter id={`n${uid}`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency={`${m.fx / 100} ${m.fy / 100}`} numOctaves={m.oct} seed={seed % 97} stitchTiles="stitch" />
              <feColorMatrix type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${m.relief * 1.6} 0 0 0 ${-m.relief * 0.55}`} />
            </filter>
            <linearGradient id={`bd${uid}`} x1="0" y1="0" x2="0" y2="1">
              {[0, .12, .2, .31, .38, .47, .55, .63, .71, .8, .88, 1].map((o, i) => <stop key={i} offset={o} stopColor={i % 2 ? m.day : m.night} stopOpacity={i % 3 === 0 ? 0.5 : 0.25} />)}
            </linearGradient>
            <filter id={`cl${uid}`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.018 0.05" numOctaves={4} seed={(seed % 89) + 3} stitchTiles="stitch" />
              <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2.6 0 0 0 -1.15" />
            </filter>
            <filter id={`sw${uid}`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves={3} seed={(seed % 61) + 5} result="t" />
              <feDisplacementMap in="SourceGraphic" in2="t" scale="40" xChannelSelector="R" yChannelSelector="G" />
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
          {m.feature === 'bands' && <rect width="200" height="100" fill={`url(#bd${uid})`} style={{ mixBlendMode: 'soft-light' }} opacity={0.9} />}
          {m.feature === 'clouds' && <rect width="200" height="100" filter={`url(#cl${uid})`} style={{ mixBlendMode: 'screen' }} opacity={0.42} />}
          {(m.feature === 'swirl' || m.feature === 'veins') && <rect width="200" height="100" fill={m.day} filter={`url(#sw${uid})`} style={{ mixBlendMode: 'soft-light' }} opacity={0.85} />}
          {m.feature === 'craters' && Array.from({ length: 9 }, (_, i) => {
            const h = (seed * (i + 3) * 2654435761) >>> 0; const cx = (h % 200), cy = 18 + ((h >>> 8) % 64), r = 2.5 + ((h >>> 16) % 7);
            return <g key={i}><circle cx={cx} cy={cy} r={r} fill={m.night} opacity={0.32} /><circle cx={cx - r * 0.25} cy={cy - r * 0.25} r={r * 0.8} fill="none" stroke={m.day} strokeWidth={0.5} opacity={0.35} /></g>;
          })}
        </svg>
        {/* Bereichszeichen: in die Oberfläche geprägt – unter Terminator & Randverdunkelung, darum gleich beleuchtet */}
        {Glyph && (
          <span data-testid="uv2-planet-glyph" className="uv2-planet-glyph absolute inset-0 flex items-center justify-center">
            {/* Gravur in zwei Lagen: dunkle Rille (versetzt, multipliziert) + Lichtkante oben links.
                Liest sich auf hellen (Gold, Eis) wie dunklen (Indigo, Kupfer) Materialien. */}
            <Glyph size={Math.round(size * 0.36)} strokeWidth={1.7} absoluteStrokeWidth className="absolute"
              style={{ color: 'rgba(24,14,4,0.55)', mixBlendMode: 'multiply', transform: 'translate(0.6px,0.9px)' }} />
            <Glyph size={Math.round(size * 0.36)} strokeWidth={1.2} absoluteStrokeWidth className="absolute"
              style={{ color: 'rgba(255,251,240,0.78)', mixBlendMode: 'screen', transform: 'translate(-0.4px,-0.5px)' }} />
          </span>
        )}
        {lit == null ? (<>
        {/* Terminator: Licht oben links, Nacht unten rechts – weicher Übergang */}
          <span className="uv2-sun absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle at 30% 26%, rgba(255,250,235,0.20) 0%, rgba(255,250,235,0) 34%), linear-gradient(128deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.5) 52%, rgba(0,0,0,0.82) 66%, ${m.night} 86%)` }} />
          {/* Tageszeit-Tönung: Morgen warm, Abend Amber, Nacht kühl (gesetzt über --uv2-sun-tint) */}
          <span className="uv2-sun-tint absolute inset-0 rounded-full" />
          {/* Randverdunkelung */}
          <span className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 42% 40%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.42) 78%, rgba(0,0,0,0.8) 100%)' }} />
          {/* Atmosphäre: feiner Saum auf der Lichtseite */}
          <span className="absolute inset-0 rounded-full" style={{ boxShadow: `inset ${size * 0.035}px ${size * 0.035}px ${size * 0.06}px rgba(${m.atmo},0.38), inset 0 0 0 0.5px rgba(${m.atmo},0.22)` }} />
  </>) : (<>
          <span className="uv2-sun-tint absolute inset-0 rounded-full" />
          <SphereShade size={size} lit={lit} atmo={m.atmo} night={m.night} />
        </>)}
      </span>}

      {/* Äußerer Atmosphärenschein – sehr leise, nur Lichtseite */}
      {!pstyle && <span className="pointer-events-none absolute rounded-full" style={{ inset: -size * 0.06, background: `radial-gradient(circle at ${lit == null ? '34% 30%' : `${50 + Math.cos(lit) * 22}% ${50 + Math.sin(lit) * 22}%`}, rgba(${m.atmo},${selected ? 0.2 : 0.11}) 0%, rgba(${m.atmo},0) 62%)`, filter: 'blur(2px)' }} />}

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
  const m = planetMaterial(name);
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
/**
 * Material je Bereich. Bekannte Bereiche haben ein kuratiertes Material; jeder
 * andere bekommt ein erzeugtes, stabiles (aus dem Namen) – nie Grau. Der Farbton
 * meidet die kuratierten Töne, damit kein Bereich wie ein anderer aussieht.
 */
const CURATED_HUES = [38, 200, 22, 248, 172];
const PALETTE_HUES = [8, 62, 88, 120, 142, 218, 278, 302, 326, 350];
const generatedCache = new Map<string, Material>();
function hsl(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const x = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + x(f(0)) + x(f(8)) + x(f(4));
}
export function generatedMaterial(name: string): Material {
  const key = name.trim().toLowerCase();
  const hit = generatedCache.get(key);
  if (hit) return hit;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const hue = PALETTE_HUES[h % PALETTE_HUES.length] + ((h >>> 8) % 9) - 4;
  const sat = 40 + ((h >>> 12) % 16);
  const m: Material = {
    day: hsl(hue, sat + 12, 78), mid: hsl(hue, sat + 4, 46), night: hsl(hue, sat, 9),
    fx: 0.6 + ((h >>> 4) % 30) / 10, fy: 1.5 + ((h >>> 9) % 70) / 10, oct: 3 + ((h >>> 3) % 3),
    relief: 0.4 + ((h >>> 6) % 30) / 100,
    atmo: (() => { const c = hsl(hue, sat + 20, 82); return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)).join(','); })(),
  };
  generatedCache.set(key, m);
  return m;
}
void CURATED_HUES;
export function planetMaterial(name: string): Material {
  const k = planetMaterialKey(name);
  return k === 'default' ? generatedMaterial(name) : MATERIALS[k];
}

/**
 * Echte Kugelschattierung (einmal pro Größe/Lichtrichtung gerechnet, gecacht):
 * Lambert zur Sonne, weicher Terminator, Blinn-Glanz, warmes Fresnel-Randlicht auf der
 * Lichtseite und ein kühler Gegenlicht-Saum von der Nebelseite. Liegt über der Oberfläche.
 */
const SHADE_CACHE = new Map<string, string>();
function shadeUrl(px: number, lit: number, atmo: string, night: string): string {
  const key = `${px}|${lit.toFixed(2)}|${atmo}|${night}`;
  const hit = SHADE_CACHE.get(key); if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const cv = document.createElement('canvas'); cv.width = cv.height = px;
  const ctx = cv.getContext('2d'); if (!ctx) return '';
  const img = ctx.createImageData(px, px); const d = img.data;
  const lx0 = Math.cos(lit) * 0.78, ly0 = Math.sin(lit) * 0.78, lz0 = 0.62; const ll = Math.hypot(lx0, ly0, lz0);
  const lx = lx0 / ll, ly = ly0 / ll, lz = lz0 / ll;
  const hx = lx, hy = ly, hz = lz + 1; const hl = Math.hypot(hx, hy, hz);
  const [ar, ag, ab] = atmo.split(',').map(Number);
  const nr = parseInt(night.slice(1, 3), 16) || 10, ng = parseInt(night.slice(3, 5), 16) || 10, nb = parseInt(night.slice(5, 7), 16) || 12;
  const r = px / 2;
  for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
    const u = (x + 0.5 - r) / r, v = (y + 0.5 - r) / r; const q = u * u + v * v; const i = (y * px + x) * 4;
    if (q > 1) { d[i + 3] = 0; continue; }
    const z = Math.sqrt(1 - q);
    const ndl = u * lx + v * ly + z * lz;
    const diff = Math.max(0, ndl);
    const term = 1 / (1 + Math.exp(-ndl * 7)); // weicher Terminator
    const light = 0.1 + 0.9 * Math.pow(diff, 0.85) * term;
    const spec = Math.pow(Math.max(0, (u * hx + v * hy + z * hz) / hl), 46) * 0.55;
    const fres = Math.pow(1 - z, 3);
    const rimLit = fres * Math.max(0, u * lx + v * ly) * 1.25;
    const rimBack = fres * Math.max(0, -(u * lx + v * ly)) * 0.22;
    // dunkel: Nachtfarbe mit Alpha; hell: warmes Licht additiv (vorgemischt in einem Pixel)
    const shadowA = 1 - light;
    const add = spec + rimLit * 0.6;
    const rr = nr * shadowA + (255 * 0.98) * add + ar * rimBack, gg = ng * shadowA + (255 * 0.9) * add + ag * rimBack, bb = nb * shadowA + (255 * 0.72) * add + ab * rimBack;
    const a = Math.min(1, shadowA * 0.92 + add + rimBack);
    const edge = Math.min(1, (1 - Math.sqrt(q)) * r * 1.2);
    d[i] = Math.min(255, rr / Math.max(a, 1e-3)); d[i + 1] = Math.min(255, gg / Math.max(a, 1e-3)); d[i + 2] = Math.min(255, bb / Math.max(a, 1e-3)); d[i + 3] = Math.round(255 * a * edge);
  }
  ctx.putImageData(img, 0, 0);
  const url = cv.toDataURL('image/png'); SHADE_CACHE.set(key, url); return url;
}
function SphereShade({ size, lit, atmo, night }: { size: number; lit: number; atmo: string; night: string }) {
  const [url, setUrl] = React.useState('');
  React.useEffect(() => { setUrl(shadeUrl(Math.round(size * Math.min(2, window.devicePixelRatio || 1)), lit, atmo, night)); }, [size, lit, atmo, night]);
  return <span className="uv2-shade absolute inset-0 rounded-full" style={url ? { backgroundImage: `url(${url})`, backgroundSize: '100% 100%' } : { background: 'radial-gradient(circle at 35% 30%, rgba(0,0,0,0) 30%, rgba(0,0,0,.7) 75%)' }} />;
}

/* ─── Saimôr Universe Glass: default matte translucent style ─── */
type PStyle = 'A' | 'B' | 'C' | 'J' | 'M';
function usePixelStyle(): PStyle | null {
  const [v, setV] = React.useState<PStyle | null>('M');
  React.useEffect(() => {
    const x = (typeof localStorage !== 'undefined' && localStorage.getItem('uv2-planet-style')) || '';
    const st: PStyle | null = x === 'off' ? null : (x === 'A' || x === 'B' || x === 'C' || x === 'J') ? x : 'M';
    if (st) { setV(st); document.documentElement.setAttribute('data-uv2-pstyle', st); }
  }, []);
  return v;
}
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) || 0);
const mix = (a: number[], b: number[], t: number) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function PixelSphere({ size, lit, tint, variant, seed }: { size: number; lit: number; tint: string; variant: PStyle; seed: number }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const cell = variant === 'C' ? Math.max(3, size / 18) : variant === 'B' ? 2.5 : 2;
    const n = Math.max(8, Math.round(size / cell));
    const W = Math.round(size * dpr); cv.width = cv.height = W;
    const c = cv.getContext('2d'); if (!c) return;
    c.clearRect(0, 0, W, W); c.imageSmoothingEnabled = false;
    const t = hex(tint);
    const pal = [[6, 20, 17], [22, 64, 55], [52, 122, 104], [118, 196, 172]].map((p) => mix(p, t, 0.22));
    const gold = [226, 192, 118];
    const lx0 = Math.cos(lit), ly0 = Math.sin(lit), lz0 = 0.35; const ll = Math.hypot(lx0, ly0, lz0);
    const lx = lx0 / ll, ly = ly0 / ll, lz = lz0 / ll;
    const px = W / n;
    // feine Oberfläche: deterministisches Rauschen pro Zelle (ruhig, nicht fleckig)
    const noise = (x: number, y: number) => { const h = Math.sin(x * 12.9898 + y * 78.233 + seed * 0.37) * 43758.5453; return h - Math.floor(h); };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = (x + 0.5) / n * 2 - 1, v = (y + 0.5) / n * 2 - 1; const q = u * u + v * v; if (q > 1) continue;
      const z = Math.sqrt(1 - q);
      const ndl = u * lx + v * ly + z * lz;
      const band = 0.06 * Math.sin((v + seed * 0.01) * 9) + (noise(x, y) - 0.5) * 0.08;
      const sh = Math.max(0, Math.min(1, 0.08 + 0.92 * Math.max(0, ndl) + band * Math.max(0.2, ndl)));
      const rim = Math.pow(1 - z, 3) * Math.max(0, u * lx + v * ly);
      if (variant === 'A') {
        const f = sh * 3; const lo = Math.floor(f); const th = (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
        const lvl = Math.min(3, lo + (f - lo > th ? 1 : 0)); let col = pal[lvl];
        if (sh > 0.9 && th < 0.35) col = gold; if (rim > 0.35 && th < 0.6) col = gold;
        c.fillStyle = `rgb(${col})`; c.fillRect(Math.floor(x * px), Math.floor(y * px), Math.ceil(px), Math.ceil(px));
      } else if (variant === 'B') {
        c.fillStyle = `rgb(${mix(pal[0], pal[1], 0.35 + 0.4 * sh)})`; c.fillRect(x * px, y * px, px + 0.5, px + 0.5);
        const r = px * (0.26 + 0.24 * sh); const col = sh > 0.9 ? gold : mix(pal[1], pal[3], Math.min(1, sh * 1.1));
        c.fillStyle = `rgba(${col},${0.7 + 0.3 * sh})`; c.beginPath(); c.arc((x + 0.5) * px, (y + 0.5) * px, r, 0, Math.PI * 2); c.fill();
      } else {
        const lvl = Math.min(3, Math.floor(sh * 3.6)); let col = pal[lvl];
        if (sh > 0.86 && noise(y, x) > 0.45) col = gold;
        const edge = Math.sqrt(q) > 1 - 1.4 / n; if (edge) col = sh > 0.4 ? mix(gold, pal[3], 0.3) : pal[1];
        c.fillStyle = `rgb(${col})`; c.fillRect(Math.floor(x * px), Math.floor(y * px), Math.ceil(px), Math.ceil(px));
      }
    }
    if (variant === 'B') { c.strokeStyle = 'rgba(232,198,120,0.92)'; c.lineWidth = dpr * 1.1; c.beginPath(); c.arc(W / 2, W / 2, W / 2 - dpr, 0, Math.PI * 2); c.stroke(); }
  }, [size, lit, tint, variant, seed]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" data-pstyle={variant} style={{ imageRendering: variant === 'B' ? 'auto' : 'pixelated', borderRadius: variant === 'B' ? '50%' : undefined, overflow: 'hidden' }} />;
}

/* ─── Universe Glass: Bereichsfarbe = Verteilungsbalken. Name vor Archetyp. ─── */
export function glassHue(name: string, _arch?: string | null): [number, number, number] {
  return hex(planetMaterial(name).day) as [number, number, number];
}
export function areaHue(name: string, arch?: string | null): [number, number, number] {
  return glassHue(name, arch);
}
const WORLD_CACHE = new Map<string, ImageData>();
type SurfaceFeature = NonNullable<Material['feature']>;

function useThemeAttr(): 'dark' | 'light' {
  const [t, setT] = React.useState<'dark' | 'light'>('dark');
  React.useEffect(() => {
    const read = () => setT(document.documentElement.dataset.uv2Theme === 'light' ? 'light' : 'dark');
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-uv2-theme'] });
    return () => mo.disconnect();
  }, []);
  return t;
}

function hash2(x: number, y: number, s: number) {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 17.13) * 43758.5453;
  return n - Math.floor(n);
}
function valueNoise(x: number, y: number, s: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return mixNum(mixNum(hash2(ix, iy, s), hash2(ix + 1, iy, s), ux), mixNum(hash2(ix, iy + 1, s), hash2(ix + 1, iy + 1, s), ux), uy);
}
function fbm(x: number, y: number, s: number, oct = 4) {
  let a = 0, w = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { a += w * valueNoise(x * f, y * f, s + i * 19); w *= 0.5; f *= 2; }
  return a;
}
function mixNum(a: number, b: number, t: number) { return a + (b - a) * t; }

/**
 * Dual-mode planet body.
 * Dark: believable work-tool planets (surface, terminator from the centre, atmosphere).
 * Light: premium glass-marble orbs in the area colour, gold ring, not candy.
 */
function WorldSphere({ size, lit, hue, seed, quiet, feature, day, night, atmo, selected }: {
  size: number; lit: number; hue: [number, number, number]; seed: number; quiet: boolean;
  feature: SurfaceFeature; day: string; night: string; atmo: string; selected: boolean;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const mode = useThemeAttr();
  const h: number[] = quiet ? mix(hue, [236, 232, 224], 0.08) : hue;
  const dayRgb = hex(day);
  const nightRgb = hex(night);
  const atmoRgb = atmo.split(',').map(Number) as [number, number, number];

  React.useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(24, Math.round(size * dpr));
    if (cv.width !== W) { cv.width = W; cv.height = W; }
    const c = cv.getContext('2d'); if (!c) return;
    const key = [W, lit.toFixed(2), h.join(','), seed, quiet, feature, mode, selected ? 1 : 0, day, night].join('|');
    const hit = WORLD_CACHE.get(key);
    if (hit) { c.putImageData(hit, 0, 0); drawRim(); return; }

    const img = c.createImageData(W, W); const d = img.data;
    const lx0 = Math.cos(lit), ly0 = Math.sin(lit), lz0 = 0.58;
    const ll = Math.hypot(lx0, ly0, lz0); const lx = lx0 / ll, ly = ly0 / ll, lz = lz0 / ll;
    const hx = lx, hy = ly, hz = lz + 1; const hl = Math.hypot(hx, hy, hz);
    const r = W / 2;
    const aero = mode === 'light';

    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const u = (x + 0.5 - r) / r, v = (y + 0.5 - r) / r, q = u * u + v * v, i = (y * W + x) * 4;
      if (q > 1) { d[i + 3] = 0; continue; }
      const z = Math.sqrt(1 - q);
      const ndl = u * lx + v * ly + z * lz;
      const term = 1 / (1 + Math.exp(-(ndl + 0.04) * 7.2));
      const dif = Math.max(0, ndl);
      const lon = Math.atan2(u, z);
      const lat = Math.asin(Math.max(-1, Math.min(1, v)));
      const n1 = fbm(lon * 1.6 + seed * 0.01, lat * 2.2, seed, 4);
      const n2 = fbm(lon * 3.1 + 8, lat * 3.4, seed + 11, 3);

      let relief = 0;
      if (feature === 'bands') relief = Math.sin(lat * 9 + n1 * 1.6 + seed * 0.04) * 0.22 + n2 * 0.08;
      else if (feature === 'clouds') relief = Math.pow(Math.max(0, n1 - 0.38), 1.15) * 0.55 - 0.06;
      else if (feature === 'craters') {
        const cN = hash2(Math.floor((lon + 3) * 4.2), Math.floor((lat + 2) * 5.1), seed);
        const crater = Math.max(0, 0.22 - Math.abs(cN - 0.55)) * 1.8;
        relief = n1 * 0.12 - crater * 0.35 + n2 * 0.05;
      } else if (feature === 'veins') {
        const ridge = 1 - Math.abs(n1 * 2 - 1);
        relief = Math.pow(ridge, 7) * 0.85 + n2 * 0.04;
      } else {
        relief = (n1 - 0.5) * 0.28 + Math.sin(lon * 3 + lat * 5 + n2) * 0.08;
      }

      let col: number[];
      if (aero) {
        const marble = mix(mix(h, [248, 250, 252], 0.18), dayRgb, 0.78 + relief * 0.16);
        const k = Math.min(1, 0.28 + 0.72 * term * (0.4 + 0.6 * dif) + relief * 0.14);
        col = mix(mix(dayRgb, [232, 236, 238], 0.12), marble, k);
        const spec = Math.pow(Math.max(0, (u * hx + v * hy + z * hz) / hl), 48) * 0.72;
        const fres = Math.pow(1 - z, 2.4);
        col = mix(col, [255, 252, 248], Math.min(1, spec + fres * Math.max(0, ndl + 0.2) * 0.45));
        col = mix(col, h, fres * 0.18);
        const inner = Math.pow(z, 2.2) * 0.16;
        col = mix(col, mix(h, [255, 255, 255], 0.35), inner);
      } else {
        const litCol = mix(dayRgb, h, 0.08);
        const k = Math.min(1, Math.max(0, term * (0.22 + 0.78 * Math.pow(dif, 0.8)) + relief * 0.2));
        col = k < 0.5 ? mix(nightRgb, mix(nightRgb, litCol, 0.45), k * 2) : mix(mix(nightRgb, litCol, 0.45), litCol, (k - 0.5) * 2);
        if (feature === 'clouds' && relief > 0.08) col = mix(col, mix(h, [255, 252, 245], 0.55), Math.min(0.55, relief));
        if (feature === 'veins' && relief > 0.2) col = mix(col, mix(h, [236, 220, 255], 0.4), Math.min(0.7, relief));
        const fres = Math.pow(1 - z, 2.6);
        const rimLit = fres * Math.max(0, ndl + 0.22) * (selected ? 1.15 : 0.9);
        col = mix(col, mix(atmoRgb, [255, 248, 230], 0.25), Math.min(0.7, rimLit));
        const spec = Math.pow(Math.max(0, (u * hx + v * hy + z * hz) / hl), 70) * 0.28;
        col = mix(col, [255, 246, 220], spec);
        const nightA = (1 - term) * 0.55;
        col = mix(col, nightRgb, nightA);
      }

      const edge = Math.min(1, (1 - Math.sqrt(q)) * r * 1.55);
      const al = aero ? Math.min(1, 0.88 + 0.12 * term) : 1;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = Math.round(255 * edge * al);
    }
    WORLD_CACHE.set(key, img); c.putImageData(img, 0, 0); drawRim();

    function drawRim() {
      if (!c) return;
      const rr = W / 2;
      c.beginPath(); c.arc(rr, rr, rr - dpr * 0.7, 0, Math.PI * 2);
      c.strokeStyle = aero
        ? `rgba(214,168,72,${quiet ? 0.55 : selected ? 0.92 : 0.78})`
        : `rgba(${h.join(',')},${quiet ? 0.28 : selected ? 0.7 : 0.45})`;
      c.lineWidth = dpr * (aero ? 1.15 : 0.85);
      c.stroke();
      if (aero) {
        c.beginPath(); c.arc(rr, rr, rr - dpr * 2.2, 0, Math.PI * 2);
        c.strokeStyle = `rgba(255,252,248,0.35)`;
        c.lineWidth = dpr * 0.6;
        c.stroke();
      }
    }
  }, [size, lit, h.join(','), seed, quiet, feature, mode, selected, day, night, atmoRgb.join(',')]);

  const gx = Math.cos(lit) * size * 0.08, gy = Math.sin(lit) * size * 0.08;
  const aero = mode === 'light';
  return (<>
    <span className="pointer-events-none absolute rounded-full" style={{
      inset: -size * (aero ? 0.1 : 0.07),
      boxShadow: aero
        ? `${gx}px ${gy}px ${size * 0.42}px rgba(${h.join(',')},${quiet ? 0.12 : 0.28}), 0 ${size * 0.08}px ${size * 0.22}px rgba(40,60,80,0.12)`
        : `${gx}px ${gy}px ${size * 0.55}px rgba(${atmo},${quiet ? 0.08 : selected ? 0.28 : 0.16})`,
    }} />
    {aero && <span className="pointer-events-none absolute inset-0 rounded-full" style={{
      backdropFilter: 'blur(2px) saturate(1.08)',
      WebkitBackdropFilter: 'blur(2px) saturate(1.08)',
      boxShadow: `inset 0 0 ${size * 0.18}px rgba(${h.join(',')},.22), inset ${-gx}px ${-gy}px ${size * 0.2}px rgba(255,255,255,.28)`,
    }} />}
    <canvas ref={ref} className="absolute inset-0 h-full w-full rounded-full" data-pstyle={aero ? 'aero' : 'world'} />
  </>);
}
