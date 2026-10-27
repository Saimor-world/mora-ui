import React from 'react';

/** Fünf gedämpfte Glasplaneten (transparente PNGs, Licht oben links). Reihenfolge = Abwechslung im Bild. */
export const GLASS_VARIANTS = ['bluegrey', 'lavender', 'sage', 'champagne', 'paleblue'] as const;
export type GlassVariant = (typeof GLASS_VARIANTS)[number];

/** Eigene Materialien für die drei benannten Abteilungen (R&D, Roadmap, Research): Glaskörper plus feiner Lichtring. Zuordnung nur über den echten Namen. */
export type GlassMaterial = 'rnd' | 'roadmap' | 'research';
const MATERIAL_VARIANT: Record<GlassMaterial, GlassVariant> = { rnd: 'paleblue', roadmap: 'bluegrey', research: 'sage' };
export function glassMaterialFor(name: string): GlassMaterial | null {
  const n = name.trim().toLowerCase();
  if (/^(r\s*(&|und|and)\s*d|rnd|forschung\s*&\s*entwicklung)$/.test(n)) return 'rnd';
  if (/^roadmap$/.test(n)) return 'roadmap';
  if (/^(research|recherche)$/.test(n)) return 'research';
  return null;
}

/** Stabile Zuordnung: gleicher Name, gleiche Farbe (kein Springen zwischen Ladevorgängen). */
export function glassVariantFor(key: string): GlassVariant {
  const mat = glassMaterialFor(key);
  if (mat) return MATERIAL_VARIANT[mat];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return GLASS_VARIANTS[h % GLASS_VARIANTS.length];
}

/** Die Scheibe füllt 78 % der Bilddatei, der Rest ist Glanz und Schatten: so groß wie `size` ist die sichtbare Kugel. */
const DISC = 0.78;

export function GlassOrb({ size, variant, material, className, children }: { size: number; variant: GlassVariant; material?: GlassMaterial | null; className?: string; children?: React.ReactNode }) {
  const full = Math.round(size / DISC);
  return (
    <span className={`glass-orb${className ? ` ${className}` : ''}`} style={{ width: size, height: size }} aria-hidden>
      {material ? <Ring material={material} half="back" /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/universe/glass/${variant}.png`} alt="" width={full} height={full} draggable={false} style={{ width: full, height: full, left: (size - full) / 2, top: (size - full) / 2 }} />
      {material ? <Ring material={material} half="front" /> : null}
      {children}
    </span>
  );
}

/** Lichtring: hintere Hälfte hinter, vordere Hälfte vor der Glaskugel (beides reines SVG, scharf in jeder Größe). */
function Ring({ material, half }: { material: GlassMaterial; half: 'back' | 'front' }) {
  const id = `gr-${material}-${half}`;
  return (
    <svg className={`glass-orb__ring glass-orb__ring--${material} glass-orb__ring--${half}`} viewBox="-100 -60 200 120" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor="var(--ring-a)" stopOpacity=".2" />
          <stop offset=".5" stopColor="var(--ring-b)" />
          <stop offset="1" stopColor="var(--ring-a)" stopOpacity=".25" />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <rect x="-100" y={half === 'back' ? -60 : 0} width="200" height="60" transform="rotate(-18)" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-c)`}>
        <ellipse cx="0" cy="0" rx="92" ry="25" transform="rotate(-18)" fill="none" stroke={`url(#${id})`} strokeWidth={half === 'back' ? 1 : 1.7} opacity={half === 'back' ? 0.55 : 1} />
      </g>
    </svg>
  );
}
