'use client';

/**
 * Universe v2 – drei stilisierte Design-Richtungen für die Planetenkörper (Review-Varianten).
 * Ein Regler: PLANET_DIRECTION_DEFAULT ('matte' bleibt Standard).
 *  keramik – Keramik & Glasur: matte Keramik, Glasurbänder, Sprenkel, ein Planet mit feinem Craquelé
 *  atlas   – Gravur / Atlas: Sternatlas-Kupferstich, Schraffur-Schatten, Breitenlinien, Krater/Sturmwirbel
 *  mineral – Mineral & Nebelglas: gefrostetes Mineral, innere Schichten, Aurora-Streifen, Wolkenschleier, ein Staubring
 * Alles statisches SVG (Verläufe, Muster, eine billige feTurbulence), per circle-clip exakt rund, kein Canvas, kein Blur.
 * Override für Review/QA: localStorage 'uv2-direction' oder NEXT_PUBLIC_UV2_DIRECTION.
 */
import React, { useId } from 'react';

export type PlanetDirection = 'matte' | 'keramik' | 'atlas' | 'mineral';
export const PLANET_DIRECTION_DEFAULT: PlanetDirection = 'matte';
const DIRS: PlanetDirection[] = ['matte', 'keramik', 'atlas', 'mineral'];
const isDir = (v: unknown): v is PlanetDirection => DIRS.includes(v as PlanetDirection);

export function usePlanetDirection(): PlanetDirection {
  const env = process.env.NEXT_PUBLIC_UV2_DIRECTION;
  const [d, setD] = React.useState<PlanetDirection>(isDir(env) ? env : PLANET_DIRECTION_DEFAULT);
  React.useEffect(() => { try { const v = window.localStorage.getItem('uv2-direction'); if (isDir(v)) setD(v); } catch { /* ignore */ } }, []);
  return d;
}

type RGB = [number, number, number];
type Tone = { base: RGB; light: RGB; shade: RGB; detail: RGB };
const PALETTES: Record<Exclude<PlanetDirection, 'matte'>, Record<string, Tone>> = {
  keramik: {
    sand: { base: [212, 184, 146], light: [236, 216, 184], shade: [96, 76, 56], detail: [246, 232, 206] },
    terracotta: { base: [190, 112, 88], light: [220, 150, 124], shade: [84, 42, 32], detail: [236, 196, 172] },
    sage: { base: [146, 160, 134], light: [184, 196, 172], shade: [56, 66, 52], detail: [218, 226, 204] },
    slate: { base: [132, 146, 164], light: [174, 186, 202], shade: [48, 56, 70], detail: [210, 220, 232] },
    plum: { base: [130, 100, 122], light: [168, 138, 158], shade: [50, 36, 48], detail: [206, 184, 198] },
  },
  atlas: {
    ivory: { base: [226, 216, 192], light: [244, 236, 216], shade: [70, 64, 56], detail: [40, 44, 58] },
    rust: { base: [164, 88, 58], light: [198, 124, 90], shade: [58, 28, 18], detail: [236, 214, 176] },
    gold: { base: [196, 164, 98], light: [226, 200, 140], shade: [74, 58, 30], detail: [48, 40, 28] },
    ink: { base: [58, 78, 116], light: [92, 114, 154], shade: [16, 22, 38], detail: [212, 196, 150] },
    bone: { base: [200, 192, 176], light: [228, 222, 208], shade: [64, 60, 54], detail: [52, 50, 60] },
  },
  mineral: {
    amber: { base: [184, 126, 54], light: [222, 172, 100], shade: [64, 38, 14], detail: [250, 220, 160] },
    amethyst: { base: [104, 74, 140], light: [152, 124, 186], shade: [32, 20, 50], detail: [214, 190, 240] },
    moss: { base: [92, 116, 64], light: [140, 164, 104], shade: [28, 38, 18], detail: [206, 226, 170] },
    teal: { base: [38, 112, 116], light: [96, 170, 168], shade: [10, 38, 44], detail: [170, 232, 222] },
    ice: { base: [156, 182, 200], light: [206, 224, 236], shade: [50, 66, 84], detail: [240, 248, 255] },
  },
};
// Bereich → Paletten-Index (stabil je Bereich, gleiche Zuordnung in allen Richtungen)
function slot(name: string): number {
  const n = name.toLowerCase();
  if (/finanz|finance|geld|buchhalt/.test(n)) return 3;
  if (/vertrieb|sales|verkauf/.test(n)) return 1;
  if (/personal|hr|people|team/.test(n)) return 0;
  if (/marketing|growth|wissen|knowledge/.test(n)) return 2;
  if (/operations|betrieb|ops/.test(n)) return 4;
  return hash(n) % 5;
}
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number) { let a = seed || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const c = (x: RGB, a = 1) => `rgba(${x[0]},${x[1]},${x[2]},${a})`;

export function PlanetDirectionBody({ size, lit, name, dir }: { size: number; lit?: number; name: string; dir: Exclude<PlanetDirection, 'matte'> }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pal = PALETTES[dir];
  const keys = Object.keys(pal);
  const idx = slot(name);
  const t = pal[keys[idx]];
  const h = hash(name);
  const r = rng(h);
  const a = lit ?? (-135 * Math.PI) / 180;
  const dx = Math.cos(a), dy = Math.sin(a);
  const lx = 50 + dx * 28, ly = 50 + dy * 28;
  const id = (k: string) => `${uid}${k}`;
  // Licht → Schatten-Achse (für Terminator / Schraffur-Maske)
  const tx1 = 50 + dx * 50, ty1 = 50 + dy * 50, tx2 = 50 - dx * 50, ty2 = 50 - dy * 50;
  const tilt = Math.round((r() - 0.5) * 24);
  const defs: React.ReactNode[] = [
    <clipPath key="clip" id={id('clip')}><circle cx="50" cy="50" r="50" /></clipPath>,
    <radialGradient key="body" id={id('body')} cx={`${lx}%`} cy={`${ly}%`} r="78%"><stop offset="0" stopColor={c(t.light)} /><stop offset="0.45" stopColor={c(t.base)} /><stop offset="1" stopColor={c(t.shade)} /></radialGradient>,
    <linearGradient key="term" id={id('term')} gradientUnits="userSpaceOnUse" x1={tx1} y1={ty1} x2={tx2} y2={ty2}><stop offset="0.42" stopColor="#000" stopOpacity="0" /><stop offset="0.72" stopColor="#000" stopOpacity={dir === 'atlas' ? 0.25 : 0.38} /><stop offset="1" stopColor="#000" stopOpacity={dir === 'atlas' ? 0.5 : 0.7} /></linearGradient>,
  ];
  const layers: React.ReactNode[] = [];
  const before: React.ReactNode[] = [];
  const after: React.ReactNode[] = [];

  if (dir === 'keramik') {
    defs.push(<filter key="spk" id={id('spk')} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed={h % 97} /><feColorMatrix values={`0 0 0 0 ${t.shade[0] / 255}  0 0 0 0 ${t.shade[1] / 255}  0 0 0 0 ${t.shade[2] / 255}  0 0 0 9 -6.2`} /></filter>);
    const bands = 2 + (h % 3);
    for (let i = 0; i < bands; i++) {
      const y = 22 + r() * 56, w = 3 + r() * 9, light = r() > 0.45;
      layers.push(<rect key={`b${i}`} x="-10" y={y} width="120" height={w} fill={c(light ? t.detail : t.shade, light ? 0.16 : 0.13)} transform={`rotate(${tilt} 50 50)`} />);
      layers.push(<rect key={`bl${i}`} x="-10" y={y} width="120" height="0.5" fill={c(t.detail, 0.22)} transform={`rotate(${tilt} 50 50)`} />);
    }
    layers.push(<rect key="spk" x="0" y="0" width="100" height="100" filter={`url(#${id('spk')})`} opacity="0.55" />);
    if (idx === 0) { // Personal (Sand): feines Craquelé
      const paths: string[] = [];
      for (let i = 0; i < 11; i++) { let x = r() * 100, y = r() * 100; let d = `M${x.toFixed(1)} ${y.toFixed(1)}`; for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 22; y += (r() - 0.5) * 22; d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; } paths.push(d); }
      layers.push(<path key="crk" d={paths.join(' ')} fill="none" stroke={c(t.shade, 0.5)} strokeWidth="0.55" strokeLinejoin="round" />);
    }
    // Glasur-Pooling am unteren Rand
    layers.push(<ellipse key="pool" cx="50" cy="104" rx="62" ry="22" fill={c(t.detail, 0.1)} />);
  }

  if (dir === 'atlas') {
    const ink = t.detail;
    defs.push(<pattern key="hat" id={id('hat')} width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform={`rotate(${Math.round((a * 180) / Math.PI) + 45})`}><line x1="0" y1="0" x2="0" y2="2.2" stroke={c(t.shade, 1)} strokeWidth="0.8" /></pattern>);
    defs.push(<pattern key="hat2" id={id('hat2')} width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform={`rotate(${Math.round((a * 180) / Math.PI) - 45})`}><line x1="0" y1="0" x2="0" y2="2.2" stroke={c(t.shade, 1)} strokeWidth="0.6" /></pattern>);
    defs.push(<linearGradient key="hm" id={id('hm')} gradientUnits="userSpaceOnUse" x1={tx1} y1={ty1} x2={tx2} y2={ty2}><stop offset="0.38" stopColor="#fff" stopOpacity="0" /><stop offset="0.7" stopColor="#fff" stopOpacity="0.85" /><stop offset="1" stopColor="#fff" stopOpacity="1" /></linearGradient>);
    defs.push(<linearGradient key="hm2" id={id('hm2')} gradientUnits="userSpaceOnUse" x1={tx1} y1={ty1} x2={tx2} y2={ty2}><stop offset="0.66" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" stopOpacity="0.9" /></linearGradient>);
    defs.push(<mask key="m" id={id('m')}><rect width="100" height="100" fill={`url(#${id('hm')})`} /></mask>);
    defs.push(<mask key="m2" id={id('m2')}><rect width="100" height="100" fill={`url(#${id('hm2')})`} /></mask>);
    // Breitenlinien (Ellipsen-Bögen) + ein Meridian
    for (const y of [-30, -12, 8, 26]) {
      const ry = Math.sqrt(Math.max(0, 50 * 50 - y * y));
      layers.push(<ellipse key={`lat${y}`} cx="50" cy={50 + y} rx={ry} ry={ry * 0.16} fill="none" stroke={c(ink, 0.38)} strokeWidth="0.4" transform={`rotate(${tilt} 50 50)`} />);
    }
    layers.push(<ellipse key="mer" cx="50" cy="50" rx={18 + (h % 14)} ry="50" fill="none" stroke={c(ink, 0.26)} strokeWidth="0.35" strokeDasharray="1.2 1.4" transform={`rotate(${tilt} 50 50)`} />);
    if (idx % 2 === 0) { // Krater
      const n = 4 + (h % 4);
      for (let i = 0; i < n; i++) { const cx = 20 + r() * 60, cy = 20 + r() * 60, rr = 1.6 + r() * 4.5; layers.push(<g key={`cr${i}`}><circle cx={cx} cy={cy} r={rr} fill="none" stroke={c(ink, 0.5)} strokeWidth="0.4" /><path d={`M${cx - rr * 0.7} ${cy + rr * 0.3} A${rr} ${rr} 0 0 0 ${cx + rr * 0.7} ${cy + rr * 0.3}`} fill="none" stroke={c(ink, 0.35)} strokeWidth="0.3" /></g>); }
    } else { // Sturmwirbel
      const cx = 36 + r() * 28, cy = 40 + r() * 22; let d = `M${cx} ${cy}`;
      for (let k = 1; k < 34; k++) { const ang = k * 0.5, rad = k * 0.42; d += ` L${(cx + Math.cos(ang) * rad * 1.5).toFixed(2)} ${(cy + Math.sin(ang) * rad * 0.8).toFixed(2)}`; }
      layers.push(<path key="storm" d={d} fill="none" stroke={c(ink, 0.5)} strokeWidth="0.4" strokeLinecap="round" />);
    }
    layers.push(<rect key="h1" width="100" height="100" fill={`url(#${id('hat')})`} mask={`url(#${id('m')})`} />);
    layers.push(<rect key="h2" width="100" height="100" fill={`url(#${id('hat2')})`} mask={`url(#${id('m2')})`} />);
    after.push(<circle key="out" cx="50" cy="50" r="49.6" fill="none" stroke={c([214, 190, 130], 0.7)} strokeWidth="0.5" />);
    after.push(<circle key="out2" cx="50" cy="50" r="52.2" fill="none" stroke={c([214, 190, 130], 0.22)} strokeWidth="0.3" strokeDasharray="0.6 1.8" />);
  }

  if (dir === 'mineral') {
    defs.push(<filter key="wisp" id={id('wisp')} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.035 0.11" numOctaves="2" seed={h % 89} /><feColorMatrix values={`0 0 0 0 ${t.detail[0] / 255}  0 0 0 0 ${t.detail[1] / 255}  0 0 0 0 ${t.detail[2] / 255}  0 0 0 2.4 -1.25`} /></filter>);
    defs.push(<linearGradient key="aur" id={id('aur')} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={c(t.detail, 0)} /><stop offset="0.5" stopColor={c(t.detail, 0.5)} /><stop offset="1" stopColor={c(t.detail, 0)} /></linearGradient>);
    // innere Schichten (Achat-artig, versetzt)
    const ox = (r() - 0.5) * 20, oy = (r() - 0.5) * 20;
    for (let i = 0; i < 4; i++) layers.push(<circle key={`ly${i}`} cx={50 + ox} cy={50 + oy} r={44 - i * 10} fill="none" stroke={c(i % 2 ? t.shade : t.light, 0.16)} strokeWidth={3 + i} />);
    // Aurora-Streifen
    for (let i = 0; i < 2 + (h % 2); i++) {
      const y = 28 + r() * 40, amp = 3 + r() * 5;
      layers.push(<path key={`au${i}`} d={`M-5 ${y} C 25 ${y - amp}, 45 ${y + amp}, 65 ${y - amp * 0.6} S 100 ${y + amp * 0.4}, 105 ${y}`} fill="none" stroke={`url(#${id('aur')})`} strokeWidth={1 + r() * 1.6} opacity="0.6" transform={`rotate(${tilt} 50 50)`} />);
    }
    layers.push(<rect key="wisp" width="100" height="100" filter={`url(#${id('wisp')})`} opacity="0.32" transform={`rotate(${tilt} 50 50)`} />);
    // gefrostete Innenkante (scharf, nicht geblurt)
    defs.push(<radialGradient key="frost" id={id('frost')} cx="50%" cy="50%" r="50%"><stop offset="0.86" stopColor={c(t.detail, 0)} /><stop offset="1" stopColor={c(t.detail, 0.2)} /></radialGradient>);
    after.push(<circle key="fr" cx="50" cy="50" r="50" fill={`url(#${id('frost')})`} />);
    if (idx === 2) { // Staubring (Marketing/Wissen)
      const ring = (front: boolean) => <ellipse cx="50" cy="50" rx="76" ry="13" fill="none" stroke={c(t.detail, front ? 0.5 : 0.2)} strokeWidth="0.9" strokeDasharray="0.4 1.3" strokeLinecap="round" transform="rotate(-14 50 50)" clipPath={front ? `url(#${id('fc')})` : undefined} />;
      defs.push(<clipPath key="fc" id={id('fc')}><rect x="-40" y="50" width="180" height="60" transform="rotate(-14 50 50)" /></clipPath>);
      before.push(<g key="rb">{ring(false)}</g>);
      after.push(<g key="rf">{ring(true)}</g>);
    }
  }

  return (
    <span className="uv2-pl" aria-hidden data-uv2-direction={dir} style={{ ['--uv2-pl-edge' as any]: t.light.join(',') }}>
      <svg className="uv2-pl-body" viewBox="0 0 100 100" width={size} height={size} style={{ overflow: 'visible', borderRadius: 0 }}>
        <defs>{defs}</defs>
        {before}
        <g clipPath={`url(#${id('clip')})`}>
          <rect width="100" height="100" fill={`url(#${id('body')})`} />
          {layers}
          <rect width="100" height="100" fill={`url(#${id('term')})`} />
        </g>
        {after}
      </svg>
      <span className="uv2-pl-rim" style={{ boxShadow: `inset ${(-dx * 1).toFixed(2)}px ${(-dy * 1).toFixed(2)}px 0 0 ${c(t.light.map((v) => Math.min(255, v + 26)) as RGB, 0.72)}` }} />
    </span>
  );
}
