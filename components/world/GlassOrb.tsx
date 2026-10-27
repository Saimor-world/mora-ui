import React from 'react';

/** Fünf gedämpfte Glasplaneten (transparente PNGs, Licht oben links). Reihenfolge = Abwechslung im Bild. */
export const GLASS_VARIANTS = ['bluegrey', 'lavender', 'sage', 'champagne', 'paleblue'] as const;
export type GlassVariant = (typeof GLASS_VARIANTS)[number];

/** Stabile Zuordnung: gleicher Name, gleiche Farbe (kein Springen zwischen Ladevorgängen). */
export function glassVariantFor(key: string): GlassVariant {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return GLASS_VARIANTS[h % GLASS_VARIANTS.length];
}

/** Die Scheibe füllt 78 % der Bilddatei, der Rest ist Glanz und Schatten: so groß wie `size` ist die sichtbare Kugel. */
const DISC = 0.78;

export function GlassOrb({ size, variant, className, children }: { size: number; variant: GlassVariant; className?: string; children?: React.ReactNode }) {
  const full = Math.round(size / DISC);
  return (
    <span className={`glass-orb${className ? ` ${className}` : ''}`} style={{ width: size, height: size }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/universe/glass/${variant}.png`} alt="" width={full} height={full} draggable={false} style={{ width: full, height: full, left: (size - full) / 2, top: (size - full) / 2 }} />
      {children}
    </span>
  );
}
