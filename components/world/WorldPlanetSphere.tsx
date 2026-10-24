import React from 'react';
import type { MatteTone } from '@/lib/universe/matteTone';

/** Matte Kugel aus visual-v1: Klasse und Variablen kommen aus matteTone(name). */
export function WorldPlanetSphere({ tone, size, className, children, light }: { light?: { x: number; y: number }; tone: MatteTone; size: number; className?: string; children?: React.ReactNode }) {
  return (
    <span
      className={`wd-sphere ${tone.className}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size, ...(tone.vars as React.CSSProperties), ...(light ? { '--dx': light.x.toFixed(3), '--dy': light.y.toFixed(3), '--lx': `${(50 + light.x * 26).toFixed(1)}%`, '--ly': `${(50 + light.y * 26).toFixed(1)}%`, '--ox': `${(50 - light.x * 22).toFixed(1)}%`, '--oy': `${(50 - light.y * 22).toFixed(1)}%` } as React.CSSProperties : {}) }}
      aria-hidden
    >
      {children}
    </span>
  );
}
